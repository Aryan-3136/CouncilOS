import type { SupabaseClient } from "@supabase/supabase-js";
import { databaseError } from "../../db/supabase";

const councilTeams = ["Networking & PR", "Alumni Relations", "Creative", "Operations", "Marketing", "Tech"];
export type TeamStatus = { team: string; openCount: number; overdueCount: number; lastActivity: string | null };

export async function teamStatus(client: SupabaseClient): Promise<TeamStatus[]> {
  const [{ data: teams, error: teamError }, { data: tasks, error: taskError }] = await Promise.all([client.from("teams").select("id,name").eq("archived", false), client.from("tasks").select("team_id,status,due_date,updated_at").eq("archived", false)]);
  if (teamError) throw databaseError(teamError, "Unable to load teams"); if (taskError) throw databaseError(taskError, "Unable to load team tasks");
  const today = new Date().toISOString().slice(0, 10), names = new Map((teams ?? []).map((team) => [String(team.id), String(team.name)]));
  const byName = new Map<string, { open: number; overdue: number; last: string | null }>();
  for (const name of [...councilTeams, ...names.values()]) byName.set(name, { open: 0, overdue: 0, last: null });
  for (const task of tasks ?? []) { const name = names.get(String(task.team_id)); if (!name) continue; const item = byName.get(name) ?? { open: 0, overdue: 0, last: null }; if (task.status !== "done") { item.open += 1; if (task.due_date && String(task.due_date) < today) item.overdue += 1; } if (!item.last || String(task.updated_at) > item.last) item.last = String(task.updated_at); byName.set(name, item); }
  return [...byName].map(([team, value]) => ({ team, openCount: value.open, overdueCount: value.overdue, lastActivity: value.last }));
}
