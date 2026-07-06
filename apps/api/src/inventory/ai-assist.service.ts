import { Injectable, ServiceUnavailableException } from '@nestjs/common';

export type AssistKind = 'desc' | 'metatitle' | 'metadesc';

interface ReleaseContext {
  artist: string;
  title: string;
  label?: string;
  year?: number;
  format?: string;
  genre?: string;
  condition?: string;
  priceIdr?: number;
}

const PROMPTS: Record<AssistKind, (r: ReleaseContext) => string> = {
  desc: r =>
    `Write a storefront description (2-3 sentences, ~50 words) for a record shop listing. ` +
    `Release: ${r.artist} — ${r.title}${r.label ? ` (${r.label}` : ''}${r.year ? `, ${r.year})` : r.label ? ')' : ''}. ` +
    `Format: ${r.format ?? 'LP'}. Genre: ${r.genre ?? 'unknown'}. ` +
    `Tone: knowledgeable independent record shop, plain and warm, no hype words, no exclamation marks. ` +
    `Mention the format. Reply with the description only.`,
  metatitle: r =>
    `Write an SEO meta title (max 60 chars) for a record shop product page. ` +
    `Release: ${r.artist} — ${r.title}, format ${r.format ?? 'LP'}. Shop name: Medium Format. ` +
    `Pattern: "Artist — Title (Format) | Medium Format". Reply with the title only.`,
  metadesc: r =>
    `Write an SEO meta description (max 155 chars) for a record shop product page. ` +
    `Release: ${r.artist} — ${r.title}${r.label ? `, ${r.label}` : ''}${r.year ? `, ${r.year}` : ''}, format ${r.format ?? 'LP'}. ` +
    `Shop: Medium Format, Jakarta — ships nationwide. Reply with the description only.`,
};

/** Small OpenRouter-backed copy generator for the release form's AI-assist buttons. */
@Injectable()
export class AiAssistService {
  get isConfigured(): boolean {
    return Boolean(process.env.OPENROUTER_API_KEY);
  }

  async generate(kind: AssistKind, release: ReleaseContext): Promise<string> {
    if (!this.isConfigured) {
      throw new ServiceUnavailableException('OPENROUTER_API_KEY is not configured');
    }
    const base = process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1';
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL ?? 'openai/gpt-4o-mini',
        max_tokens: 200,
        messages: [{ role: 'user', content: PROMPTS[kind](release) }],
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new ServiceUnavailableException(`AI assist failed (${res.status}): ${body.slice(0, 200)}`);
    }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new ServiceUnavailableException('AI assist returned no text');
    return text.replace(/^["']|["']$/g, '');
  }
}
