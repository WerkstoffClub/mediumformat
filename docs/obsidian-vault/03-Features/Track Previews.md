# Track Previews

Each release page renders its tracklist with a play button per track —
juno.co.uk style. Inspired by Boomkat / Bleep.

## Resolution order

When a Release is imported (or refreshed), `jobs/handlers/resolve-tracks.ts`
runs against each Track:

1. **Apple Music / iTunes Search** — `https://itunes.apple.com/search` for
   `"{artist} {title}"`. If a 30s preview URL is returned, use it.
   `previewSource = APPLE`.
2. **Bandcamp** — if `Release.bandcampUrl` is set, try to find the matching
   track number in the page payload. `previewSource = BANDCAMP`.
3. **YouTube Data v3** — search `"{artist} {title}"`, take top video,
   embed via `youtube-nocookie`. `previewSource = YOUTUBE`.
4. **NONE** — leave the play button disabled.

Manual overrides always win: setting `previewLocked = true` makes the worker
skip that track.

## Storage on `Track`

| Column | Type | Notes |
|---|---|---|
| `previewSource` | `APPLE` / `BANDCAMP` / `YOUTUBE` / `MANUAL` / `NONE` | |
| `previewUrl` | URL | Apple m4a / Bandcamp iframe / YouTube embed |
| `previewExternalId` | string | iTunes trackId, YouTube videoId, Bandcamp track id |
| `previewLocked` | bool | manual override flag |
| `lastResolvedAt` | DateTime | when the worker last touched this row |

## When the worker runs

- On Release import (immediate).
- On manual `Refresh previews` click in `/admin/catalog`.
- On a nightly cron (TBD) for rows where `lastResolvedAt > 30 days ago` and
  `previewSource = NONE`.
