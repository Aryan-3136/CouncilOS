import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type Row = Record<string, unknown>;

export class DatabaseConfigurationError extends Error {}

export function supabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secretKey) {
    throw new DatabaseConfigurationError("Supabase is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY in your server environment.");
  }
  return createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

export function databaseError(error: { message: string; code?: string } | null, fallback: string): Error {
  if (!error) return new Error(fallback);
  return new Error(error.message);
}

export async function idForName(client: SupabaseClient, table: "teams" | "projects", name: string) {
  if (!name) return null;
  const { data, error } = await client.from(table).select("id").eq("name", name).eq("archived", false).maybeSingle();
  if (error) throw databaseError(error, `Unable to look up ${table}`);
  if (!data) throw new Error(`${table === "teams" ? "Team" : "Project"} “${name}” does not exist.`);
  return data.id as string;
}

export async function namesById(client: SupabaseClient, ids: { teamIds: string[]; projectIds: string[] }) {
  const [teams, projects] = await Promise.all([
    ids.teamIds.length ? client.from("teams").select("id,name").in("id", ids.teamIds) : Promise.resolve({ data: [] as Row[], error: null }),
    ids.projectIds.length ? client.from("projects").select("id,name").in("id", ids.projectIds) : Promise.resolve({ data: [] as Row[], error: null }),
  ]);
  if (teams.error) throw databaseError(teams.error, "Unable to load teams");
  if (projects.error) throw databaseError(projects.error, "Unable to load projects");
  return {
    teams: new Map((teams.data ?? []).map((row) => [String(row.id), String(row.name)])),
    projects: new Map((projects.data ?? []).map((row) => [String(row.id), String(row.name)])),
  };
}

export function toDateInput(value: unknown) { return value ? String(value) : ""; }
