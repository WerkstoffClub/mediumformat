// OpenRouter — model-agnostic chat completion gateway.
// We use the OpenAI-compatible endpoint at /api/v1/chat/completions.

const BASE = "https://openrouter.ai/api/v1";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export async function chat(messages: ChatMessage[], opts: ChatOptions = {}) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY missing");
  const model =
    opts.model ??
    process.env.OPENROUTER_DEFAULT_MODEL ??
    "anthropic/claude-sonnet-4-6";

  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.PUBLIC_APP_URL ?? "https://mediumformat.info",
      "X-Title": "Medium Format Admin",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 1500,
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content as string;
}

// Convenience wrappers.

export function draftNewsletter(input: {
  newArrivals: Array<{ title: string; artist: string; price: string }>;
  toneNotes?: string;
}) {
  const lines = input.newArrivals
    .map((r) => `- ${r.artist} — ${r.title} (${r.price})`)
    .join("\n");
  return chat(
    [
      {
        role: "system",
        content:
          "You are the editor of a Jakarta-based independent record shop's newsletter. Write warm, knowledgeable, concise prose. Default to English; mix in Bahasa Indonesia phrases sparingly.",
      },
      {
        role: "user",
        content: `Draft an HTML newsletter for this week's new arrivals:\n${lines}\n\nTone notes: ${input.toneNotes ?? "Casual, music-nerd, no marketing fluff."}\n\nReturn HTML only — no markdown.`,
      },
    ],
    { maxTokens: 2000 },
  );
}

export function draftReleaseBlurb(input: {
  artist: string;
  title: string;
  year?: number;
  genres: string[];
}) {
  return chat([
    {
      role: "system",
      content:
        "You write 2–3 sentence release descriptions for a record shop. Factual, evocative, no clichés.",
    },
    {
      role: "user",
      content: `Artist: ${input.artist}\nTitle: ${input.title}\nYear: ${input.year ?? "?"}\nGenres: ${input.genres.join(", ")}`,
    },
  ]);
}
