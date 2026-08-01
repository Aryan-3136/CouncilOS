import { databaseError, supabase } from "../../../../db/supabase";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const input = await request.json();
    const { data, error } = await supabase().from("habits").update({ name: input.name, description: input.description, frequency: input.frequency, target_count: input.targetCount, custom_schedule: input.customSchedule, color: input.color }).eq("id", (await params).id).eq("archived", false).select().maybeSingle();
    if (error) throw databaseError(error, "Unable to update habit"); if (!data) throw new Error("Habit not found");
    return Response.json({ habit: { id: String(data.id), name: String(data.name), description: String(data.description ?? ""), frequency: String(data.frequency), targetCount: Number(data.target_count), customSchedule: String(data.custom_schedule ?? ""), color: String(data.color), completedToday: false, createdAt: String(data.created_at), updatedAt: String(data.updated_at) } });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Unable to update habit" }, { status: 500 }); }
}
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const { error } = await supabase().from("habits").update({ archived: true }).eq("id", (await params).id); if (error) throw databaseError(error, "Unable to delete habit"); return new Response(null, { status: 204 }); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Unable to delete habit" }, { status: 500 }); }
}
