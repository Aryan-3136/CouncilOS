import { supabase } from "../../../../db/supabase";
import { teamStatus } from "../../../lib/team-status";
export const dynamic = "force-dynamic";
export async function GET() { try { return Response.json({ teams: await teamStatus(supabase()) }); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Unable to load team status" }, { status: 500 }); } }
