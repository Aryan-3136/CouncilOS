import { z } from "zod";
import { databaseError, supabase } from "../../../../db/supabase";
import { atlasTools, executeAtlasTool, isWriteTool } from "../../../lib/atlas-tools";
import { sanitizeReply } from "../../../lib/text-utils";

export const dynamic = "force-dynamic";

const messageSchema = z.object({ role: z.enum(["user", "assistant", "tool"]), content: z.string().nullable().optional(), tool_call_id: z.string().optional(), tool_calls: z.array(z.object({ id: z.string(), type: z.literal("function").optional(), function: z.object({ name: z.string(), arguments: z.string() }) })).optional() });
const schema = z.object({ message: z.string().trim().min(1).max(4000).optional(), messages: z.array(messageSchema).min(1).max(20).optional() }).refine((value) => value.message || value.messages, "Write a message for Atlas.");
type ChatMessage = z.infer<typeof messageSchema>;
type ToolCall = NonNullable<ChatMessage["tool_calls"]>[number];
type GroqResponse = { choices?: { message?: ChatMessage }[]; error?: { message?: string } };

function normalizedHistory(input: z.infer<typeof schema>) {
  const messages = input.messages?.slice(-20) ?? [{ role: "user" as const, content: input.message!.trim() }];
  return messages.filter((message) => message.role !== "tool" || Boolean(message.tool_call_id)).slice(-20);
}
function writeIntent(messages: ChatMessage[]) { const last = [...messages].reverse().find((message) => message.role === "user")?.content?.toLowerCase() ?? ""; return /\b(add|create|make|complete|check off|checkoff|assign)\b/.test(last) && /\b(task|habit|team)\b/.test(last); }
function assistantMessage(value: ChatMessage) { return { role: "assistant" as const, content: value.content ?? "", ...(value.tool_calls?.length ? { tool_calls: value.tool_calls } : {}) }; }
async function askGroq(key: string, model: string, system: string, messages: ChatMessage[]) { return fetch("https://api.groq.com/openai/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, messages: [{ role: "system", content: system }, ...messages], tools: atlasTools, tool_choice: "auto", temperature: .25, max_tokens: 120 }) }); }
async function askWithFallback(key: string, system: string, messages: ChatMessage[]) { let response = await askGroq(key, "openai/gpt-oss-120b", system, messages); if (!response.ok && [400, 403, 404].includes(response.status)) response = await askGroq(key, "qwen/qwen3.6-27b", system, messages); if (!response.ok) { const failure = await response.json().catch(() => null) as GroqResponse | null; throw new Error(failure?.error?.message || `Atlas could not reach Groq (HTTP ${response.status}).`); } return response.json() as Promise<GroqResponse>; }

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message || "Write a message for Atlas." }, { status: 400 });
    const key = process.env.GROQ_API_KEY;
    if (!key) return Response.json({ error: "Atlas needs GROQ_API_KEY in its server environment." }, { status: 503 });
    const client = supabase();
    const [{ data: tasks, error: taskError }, { data: teams, error: teamError }, { data: habits, error: habitError }] = await Promise.all([client.from("tasks").select("title,status,due_date,team_id").eq("archived", false).limit(100), client.from("teams").select("id,name").eq("archived", false), client.from("habits").select("name").eq("archived", false).limit(50)]);
    if (taskError || teamError || habitError) throw databaseError(taskError || teamError || habitError, "Unable to prepare Atlas context");
    const personal = (tasks ?? []).filter((task) => !task.team_id), council = (teams ?? []).map((team) => ({ team: team.name, open: (tasks ?? []).filter((task) => task.team_id === team.id && task.status !== "done").length }));
    const system = `You are Atlas, a concise personal executive assistant. Personal means tasks with no team. Council means team tasks. Never mix them unless asked. Use the supplied tools for every real action. If the user asks you to add, complete, or check off anything, you MUST call the matching tool — never claim an action succeeded without calling its tool. Tool results are authoritative. Respond in plain conversational text only: no markdown, no bold, bullets, headers, or backticks. Never restate the user's request. Keep confirmations to one short sentence, for example: Added the task. Personal tasks: ${JSON.stringify(personal)}. Habits: ${JSON.stringify(habits ?? [])}. Council status: ${JSON.stringify(council)}.`;
    const history = normalizedHistory(parsed.data);
    const first = await askWithFallback(key, system, history);
    const firstMessage = first.choices?.[0]?.message;
    const calls = firstMessage?.tool_calls ?? [];
    console.info("Atlas raw tool_calls", calls.length ? calls : null);
    let finalMessage = firstMessage;
    let completedHistory: ChatMessage[] = [...history];
    let verifiedWrite = false;

    if (calls.length) {
      completedHistory.push(assistantMessage(firstMessage ?? { role: "assistant", content: "" }));
      const toolMessages: ChatMessage[] = [];
      for (const call of calls) {
        const result = await executeAtlasTool(call);
        const name = call.function.name;
        if (isWriteTool(name) && result.success) verifiedWrite = true;
        toolMessages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
      }
      completedHistory.push(...toolMessages);
      const second = await askWithFallback(key, system, completedHistory);
      finalMessage = second.choices?.[0]?.message;
      console.info("Atlas follow-up raw tool_calls", finalMessage?.tool_calls?.length ? finalMessage.tool_calls : null);
    }

    const unearnedWrite = writeIntent(history) && !verifiedWrite;
    const reply = unearnedWrite ? "I couldn't complete that action because it was not verified." : sanitizeReply(finalMessage?.content || "Atlas could not form a reply.");
    return Response.json({ reply, history: [...completedHistory, { role: "assistant", content: reply }].slice(-20) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Atlas is unavailable" }, { status: 500 });
  }
}
