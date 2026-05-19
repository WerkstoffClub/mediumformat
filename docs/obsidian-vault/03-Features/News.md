# News

`/admin/news` — editorial blog. Public at `/news` + `/news/[slug]`.

## `NewsPost`

| Field | Notes |
|---|---|
| `slug` | unique URL slug |
| `title` | |
| `bodyMd` | markdown body |
| `excerpt` | shown in listings |
| `heroImage` | path in `public/uploads/` or external URL |
| `authorId` | FK to User |
| `status` | `DRAFT`, `PUBLISHED`, `ARCHIVED` |
| `publishedAt` | set when status flips to `PUBLISHED` |

Indexed on `(status, publishedAt)` for the `/news` listing query.

## Seed

`prisma/seed.ts` creates one sample news post so a fresh deploy isn't empty.

## Editor

The body is markdown. We use it raw — no WYSIWYG. Renders with a basic
markdown-to-React pipeline (TODO: pin choice of MD lib in `lib/`).
