import { databaseError, supabase } from "../../../../../db/supabase";
export const dynamic = "force-dynamic";
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const body = await request.json().catch(() => ({})); const id = (await params).id; const completedOn = typeof body.completedOn === "string" ? body.completedOn : new Date().toISOString().slice(0, 10); const { error } = await supabase().from("habit_checkins").upsert({ habit_id: id, completed_on: completedOn, quantity: Number(body.quantity ?? 1), note: String(body.note ?? "") }, { onConflict: "habit_id,completed_on" }); if (error) throw databaseError(error, "Unable to check in habit"); return Response.json({ completed: true }); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Unable to check in habit" }, { status: 500 }); }
}
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const { error } = await supabase().from("habit_checkins").delete().eq("habit_id", (await params).id).eq("completed_on", new Date().toISOString().slice(0, 10)); if (error) throw databaseError(error, "Unable to undo habit check-in"); return new Response(null, { status: 204 }); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Unable to undo habit check-in" }, { status: 500 }); }
}
