type Request = { method?: string; body?: unknown };
type Response = { status(code: number): Response; json(body: unknown): void };

export default async function handler(req: Request, res: Response) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST." });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(503).json({ error: "Photo identification is not configured yet. Add GEMINI_API_KEY to the Vercel project environment variables." });

  let body: { mimeType?: string; imageBase64?: string };
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body as typeof body);
  } catch { return res.status(400).json({ error: "Invalid request." }); }
  const mimeType = body?.mimeType || "";
  const imageBase64 = body?.imageBase64 || "";
  if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(mimeType) || !imageBase64 || imageBase64.length > 11_200_000) {
    return res.status(400).json({ error: "Unsupported image or image too large." });
  }

  try {
    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: "Inspect this image only for evidence of a completed productive activity such as study notes, a completed worksheet, a finished project, a cleaned workspace, or a completed practical task. Be conservative. Do not identify people or infer private traits. Return ONLY JSON with keys activity (short neutral label, max 100 chars), confidence (0 to 1), looksLikeEvidence (boolean). Set looksLikeEvidence false if the image is unclear or does not show a completed activity. Never claim something is completed when the image does not support that." },
          { inline_data: { mime_type: mimeType, data: imageBase64 } }
        ] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.1, maxOutputTokens: 180 }
      })
    });
    if (!upstream.ok) return res.status(502).json({ error: "The image-identification provider could not process this photo." });
    const payload = await upstream.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const raw = payload.candidates?.[0]?.content?.parts?.map(part => part.text || "").join("") || "";
    const parsed = JSON.parse(raw) as { activity?: unknown; confidence?: unknown; looksLikeEvidence?: unknown };
    const activity = typeof parsed.activity === "string" ? parsed.activity.trim().slice(0, 100) : "";
    const confidence = typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : 0;
    return res.status(200).json({ activity, confidence, looksLikeEvidence: parsed.looksLikeEvidence === true });
  } catch {
    return res.status(502).json({ error: "Could not identify that photo. Try again or log the win manually." });
  }
}
