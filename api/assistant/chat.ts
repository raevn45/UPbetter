type Request = { method?: string; body?: unknown };
type Response = { status(code: number): Response; json(body: unknown): void };

type ChatBody = {
  message?: string;
  context?: { nextAlarmAt?: string | null; currentTime?: string };
};

export default async function handler(req: Request, res: Response) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST." });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(503).json({ error: "UP’s conversational assistant is temporarily unavailable. Time-until-alarm questions still work locally." });

  let body: ChatBody;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body as ChatBody;
  } catch {
    return res.status(400).json({ error: "Invalid request." });
  }

  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message || message.length > 2000) return res.status(400).json({ error: "Enter a message under 2,000 characters." });

  const alarm = body.context?.nextAlarmAt ? new Date(body.context.nextAlarmAt) : null;
  const current = body.context?.currentTime ? new Date(body.context.currentTime) : new Date();
  const alarmContext = alarm && Number.isFinite(alarm.getTime())
    ? `Next enabled alarm: ${alarm.toISOString()}. Current time: ${current.toISOString()}.`
    : "No upcoming alarm time is available.";

  try {
    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: "You are UP, a concise, warm, practical voice-first personal alarm and productivity assistant. Answer the user's actual question conversationally, not by keyword matching. Use provided alarm context when relevant, calculate time remaining accurately, and never invent alarms, integrations, actions, or completed tasks. If asked to change an alarm, explain that this chat endpoint cannot change it yet. Keep spoken answers natural and usually under 100 words. Do not request passwords, API keys, or sensitive credentials." }]
        },
        contents: [{ role: "user", parts: [{ text: `${message}\n\nApp context: ${alarmContext}` }] }],
        generationConfig: { temperature: 0.55, maxOutputTokens: 350 }
      })
    });
    if (!upstream.ok) return res.status(502).json({ error: "UP's AI provider could not answer. Please try again." });
    const payload = await upstream.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const reply = payload.candidates?.[0]?.content?.parts?.map(part => part.text || "").join("").trim() || "";
    if (!reply) return res.status(502).json({ error: "UP received an empty AI response." });
    return res.status(200).json({ reply: reply.slice(0, 1800) });
  } catch {
    return res.status(502).json({ error: "UP's AI service is temporarily unavailable." });
  }
}
