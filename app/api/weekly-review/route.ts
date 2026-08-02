import { databaseError, supabase } from "../../../db/supabase";

export const dynamic = "force-dynamic";

const isoDay = (value: Date) => value.toISOString().slice(0, 10);
const daysAgo = (days: number) => { const value = new Date(); value.setUTCDate(value.getUTCDate() - days); return value; };
const weekdayCount = (schedule: string) => new Set([...schedule.toLowerCase().matchAll(/mon|tue|wed|thu|fri|sat|sun/g)].map((match) => match[0])).size;

export async function GET() {
  try {
    const client = supabase(), now = new Date(), currentStart = daysAgo(6), previousStart = daysAgo(13);
    const [tasksResult, habitsResult, checksResult, goalsResult] = await Promise.all([
      client.from("tasks").select("id,title,status,due_date,updated_at,goal_id").eq("archived", false), client.from("habits").select("id,name,frequency,custom_schedule").eq("archived", false), client.from("habit_checkins").select("habit_id,completed_on").gte("completed_on", isoDay(previousStart)), client.from("goals").select("id,title,progress,status,updated_at").eq("archived", false),
    ]);
    for (const result of [tasksResult, habitsResult, checksResult, goalsResult]) if (result.error) throw databaseError(result.error, "Unable to prepare your weekly review");
    const tasks = tasksResult.data ?? [], habits = habitsResult.data ?? [], checks = checksResult.data ?? [], goals = goalsResult.data ?? [];
    const during = (value: string | null, start: Date, end: Date) => Boolean(value && new Date(value) >= start && new Date(value) <= end);
    const completedThisWeek = tasks.filter((task) => task.status === "done" && during(task.updated_at, currentStart, now)); const completedPreviousWeek = tasks.filter((task) => task.status === "done" && during(task.updated_at, previousStart, currentStart)); const taskChange = completedPreviousWeek.length ? Math.round((completedThisWeek.length - completedPreviousWeek.length) / completedPreviousWeek.length * 100) : completedThisWeek.length ? 100 : 0;
    const checkins = new Map<string, string[]>(); for (const check of checks) checkins.set(String(check.habit_id), [...(checkins.get(String(check.habit_id)) ?? []), String(check.completed_on)]);
    const habitsReview = habits.map((habit) => { const expected = habit.frequency === "weekly" ? 1 : habit.frequency === "custom" ? Math.max(1, weekdayCount(String(habit.custom_schedule ?? ""))) : 7; const done = (checkins.get(String(habit.id)) ?? []).filter((date) => date >= isoDay(currentStart)).length; return { id: String(habit.id), name: String(habit.name), checkins: done, expected, consistency: Math.min(100, Math.round(done / expected * 100)) }; });
    const goalItems = goals.map((goal) => { const linked = tasks.filter((task) => String(task.goal_id ?? "") === String(goal.id)), complete = linked.filter((task) => task.status === "done"), progress = linked.length ? Math.round(complete.length / linked.length * 100) : Number(goal.progress ?? 0), completedThisPeriod = complete.filter((task) => during(task.updated_at, currentStart, now)).length, delta = linked.length ? Math.round(completedThisPeriod / linked.length * 100) : 0; return { id: String(goal.id), title: String(goal.title), progress, delta, advanced: completedThisPeriod > 0 || (!linked.length && during(goal.updated_at, currentStart, now)) }; }).filter((goal) => goal.advanced);
    const today = isoDay(now), overdue = tasks.filter((task) => task.status !== "done" && task.due_date && String(task.due_date) < today);
    return Response.json({ period: { start: isoDay(currentStart), end: isoDay(now) }, tasks: { completed: completedThisWeek.length, previousCompleted: completedPreviousWeek.length, change: taskChange, items: completedThisWeek.map((task) => ({ id: String(task.id), title: String(task.title) })) }, habits: habitsReview, goals: goalItems, overdue: { count: overdue.length, items: overdue.slice(0, 5).map((task) => ({ id: String(task.id), title: String(task.title), dueDate: String(task.due_date) })) } });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Unable to prepare your weekly review" }, { status: 500 }); }
}
