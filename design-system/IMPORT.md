# Using these tokens in OpenDesign (or any design tool)

The file **`tokens.json`** holds every Medium Format colour, text style, spacing
step, corner radius and shadow as **design tokens**, written in the standard
**W3C Design Tokens (DTCG)** format. That's the format design tools read, so you
import it once and everything — the black, the white, the greys, the type
sizes — appears as named styles you can apply with a click.

## What's in the file

| Group | What it gives you |
|---|---|
| `color` | Brand black & white, the dark and light surface greys, text colours, and the status colours (with their faded tints) |
| `space` | The spacing steps (4, 8, 12, 16 … 64) |
| `radius` | Corner roundness (4, 6, 8, 12, pill, full) |
| `fontFamily` / `fontWeight` | Noto Sans and Noto Sans Mono, and the three weights |
| `typography` | Ready-made text styles — display, headings, body, label, prices |
| `shadow` | The three elevation shadows |

## How to import

**OpenDesign / Penpot** — these read DTCG tokens directly. Open your file, go to
the tokens panel, choose *Import*, and pick `tokens.json`. The tokens land as
themeable sets you can apply to shapes and text.

**Figma** — use the free **Tokens Studio** plugin. Open it, choose *Import*, and
select `tokens.json`. It reads the same DTCG format. Then push the tokens to
Figma styles/variables from the plugin.

**Code (engineers)** — feed `tokens.json` to **Style Dictionary** to generate
CSS, iOS or Android variables. A ready-made CSS version is already provided in
`tokens.css` if you'd rather skip that step.

## A couple of notes

- The tints (e.g. `success-tint`) are written as 8-digit hex with transparency
  baked in (`#22C55E1F` = the green at 12%), so they import as proper translucent
  colours.
- Dark theme is the default. The light-theme colours live under `color.light`.
- If OpenDesign asks for a specific token file shape that this doesn't match,
  tell me which and I'll output that exact variant — the values won't change.

## v2.1 additions

- **Channel colour key** — `color.channel.*` in `tokens.json` (Website, POS, Tokopedia,
  Shopee, Discogs, Bandcamp, eBay, Event). Used only on channel indicators (a coloured
  dot + text on a neutral pill), never for status.
- **Panel/section header bar** — the labelled strip atop a content panel is a solid
  accent bar (black bar/white text in light, inverted in dark). Recipe `.mf-panel-hdr`
  in `tokens.css`.
- **Design handoff** — `design-system/opendesign-handoff.html` is a self-contained
  handoff sheet (tokens, component specs, screen set). Open it in a browser, or import
  `tokens.json` into OpenDesign after starting the daemon with `pnpm tools-dev`.
