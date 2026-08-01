import { z } from "zod";
import { databaseError, idForName, namesById, supabase } from "../../../db/supabase";

export const eventSchema = z.object({
  title: z.string().trim().min(1, "An event title is required").max(200), description: z.string().trim().max(5000).default(""),
  startAt: z.string().datetime({ offset: true, message: "Choose a valid start time" }), endAt: z.string().datetime({ offset: true }).or(z.literal("")).default(""),
  venue: z.string().trim().max(500).default(""), budget: z.union([z.coerce.number().min(0).max(9999999999), z.literal("")]).default(""),
  status: z.enum(["draft", "planned", "completed", "cancelled"]).default("planned"), preparationChecklist: z.string().trim().max(10000).default(""), notes: z.string().trim().max(10000).default(""), team: z.string().trim().max(200).default(""),
}).refine((value) => !value.endAt || new Date(value.endAt) >= new Date(value.startAt), { message: "End time must be after the start time", path: ["endAt"] });

export async function serializeEvents(rows: Record<string, unknown>[], client = supabase()) {
  const names = await namesById(client, { teamIds: rows.map((row) => String(row.team_id ?? "")).filter(Boolean), projectIds: [] });
  return rows.map((row) => ({ id: String(row.id), title: String(row.title), description: String(row.description ?? ""), startAt: String(row.start_at), endAt: row.end_at ? String(row.end_at) : "", venue: String(row.venue ?? ""), budget: row.budget === null || row.budget === undefined ? "" : Number(row.budget), status: String(row.status), preparationChecklist: String(row.preparation_checklist ?? ""), notes: String(row.notes ?? ""), team: names.teams.get(String(row.team_id)) ?? "", createdAt: String(row.created_at), updatedAt: String(row.updated_at) }));
}

export async function eventInsert(values: z.infer<typeof eventSchema>) {
  const client = supabase(); const teamId = await idForName(client, "teams", values.team);
  const { data, error } = await client.from("events").insert({ title: values.title, description: values.description, start_at: values.startAt, end_at: values.endAt || null, venue: values.venue, budget: values.budget === "" ? null : values.budget, status: values.status, preparation_checklist: values.preparationChecklist, notes: values.notes, team_id: teamId }).select().single();
  if (error) throw databaseError(error, "Unable to create event"); return { data: data as Record<string, unknown>, client };
}

export async function eventUpdate(id: string, values: z.infer<typeof eventSchema>) {
  const client = supabase(); const teamId = await idForName(client, "teams", values.team);
  const { data, error } = await client.from("events").update({ title: values.title, description: values.description, start_at: values.startAt, end_at: values.endAt || null, venue: values.venue, budget: values.budget === "" ? null : values.budget, status: values.status, preparation_checklist: values.preparationChecklist, notes: values.notes, team_id: teamId }).eq("id", id).eq("archived", false).select().maybeSingle();
  if (error) throw databaseError(error, "Unable to update event"); if (!data) throw new Error("Event not found"); return { data: data as Record<string, unknown>, client };
}
