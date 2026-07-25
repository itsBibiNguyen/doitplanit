# DoitPlanit

A fast, focused Kanban board for planning and shipping your work. Tasks move across four columns — To Do, In Progress, In Review, Done — and everything is scoped to you privately, with no sign-up form to fill out.

Built with Next.js, Supabase, and TypeScript.

## Highlights

- **No-friction start.** An anonymous guest session is created on first load, so the board is usable immediately. The session persists across reloads.
- **Private by default.** Every task is scoped to your user ID and enforced at the database level with Postgres Row Level Security — not just in application code.
- **Full task detail.** Title, description, priority (low / normal / high), due date, and status, all editable from a single dialog.
- **Due-date awareness.** Dates are color-coded as overdue, due today, or upcoming.
- **Responsive.** Columns scroll horizontally on narrow screens with a sticky header.

## Tech stack

| Layer    | Choice                                       |
| -------- | -------------------------------------------- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Styling  | Tailwind CSS v4 with CSS-variable design tokens |
| Data     | Supabase (Postgres + Row Level Security)     |
| Auth     | Supabase anonymous sign-in                   |
| Drag/drop| `@dnd-kit`                                   |

The frontend talks to Supabase directly using the anon key — there is no custom API layer to maintain, and RLS does the authorization.

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

Create a free project at [supabase.com](https://supabase.com). Once it's ready, grab the project URL and anon key from **Project Settings → API**.

### 3. Configure environment variables

Copy the template and fill in your values:

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

Both are public client-side keys and are safe to expose in the browser — RLS is what protects your data. Never put the `service_role` key here.

### 4. Set up the database

In the Supabase dashboard, open **SQL Editor → New query**, then paste and run the contents of [`supabase/migrations/001_tasks.sql`](supabase/migrations/001_tasks.sql). This creates the `tasks` table, its indexes, and the RLS policies. The script is safe to re-run.

### 5. Enable anonymous sign-ins

Under **Authentication → Providers**, enable **Anonymous sign-ins**. The app cannot create guest sessions without this.

### 6. Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> If environment variables are missing, the app renders a setup checklist instead of failing — so a misconfigured clone is easy to diagnose.

## Data model

The `tasks` table:

| Column        | Type          | Notes                                            |
| ------------- | ------------- | ------------------------------------------------ |
| `id`          | `uuid`        | Primary key, defaults to `gen_random_uuid()`     |
| `user_id`     | `uuid`        | Defaults to `auth.uid()`, cascades on user delete |
| `title`       | `text`        | Required, 1–200 characters                       |
| `description` | `text`        | Optional                                         |
| `status`      | `text`        | `todo` · `in_progress` · `in_review` · `done`    |
| `priority`    | `text`        | `low` · `normal` · `high`                        |
| `due_date`    | `date`        | Optional                                         |
| `position`    | `numeric`     | Ordering within a column                         |
| `created_at`  | `timestamptz` | Defaults to `now()`                              |
| `updated_at`  | `timestamptz` | Maintained by a trigger                          |

`status` and `priority` are constrained by `CHECK` clauses, so invalid values are rejected by the database.

### Ordering

`position` is a `numeric` rather than an integer so a card can be dropped between two neighbours by averaging their positions, with no need to renumber the rest of the column. New tasks are appended with a gap of 1000.

### Security

RLS is enabled on `tasks` with separate `SELECT`, `INSERT`, `UPDATE`, and `DELETE` policies, each requiring `auth.uid() = user_id`. A user can only ever read or modify their own rows.

## Project structure

```
app/
  layout.tsx          Fonts, metadata, root shell
  globals.css         Design tokens and animations
  page.tsx            Renders the board
components/
  board/              Board, Column, TaskCard, TaskDialog, SetupNotice
  layout/AppHeader    Branded header with the new-task action
  ui/Modal            Accessible modal primitive
  icons.tsx           Shared icon set
lib/
  supabase/client     Singleton browser client
  supabase/auth       Anonymous session bootstrap
  supabase/tasks      Task queries and position helpers
  hooks/useAuth       Session state for components
  types.ts            Shared task types
  utils.ts            Class names and due-date formatting
supabase/
  migrations/         SQL schema and RLS policies
```

## Design

The interface avoids default-template aesthetics in favor of a Linear-inspired direction: a cool slate canvas (`#F4F6F8`) against near-black ink (`#0B0F14`), with a single teal accent (`#0D9488`) reserved for primary actions, focus rings, and normal-priority cues. Type pairs **DM Sans** for the interface with **Fraunces** for the wordmark.

All colors, shadows, and radii are CSS variables in `app/globals.css` and exposed to Tailwind via `@theme`, so retuning the palette is a single-file change. Motion is kept subtle — a staggered column entrance and soft card elevation — and respects `prefers-reduced-motion`.

## Scripts

```bash
npm run dev     # Start the dev server
npm run build   # Production build
npm start       # Serve the production build
npm run lint    # ESLint
```

## Roadmap

- [x] Supabase schema with RLS
- [x] Anonymous guest sessions
- [x] Four-column board with live data
- [x] Create, edit, and delete tasks
- [ ] Drag-and-drop between columns with optimistic updates
- [ ] Loading skeletons during auth and fetch
- [ ] Deploy to Vercel

## Deployment

The app deploys to [Vercel](https://vercel.com) with no extra configuration. Import the repository, then add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as environment variables before the first build.

A live URL will be listed here once deployed.
