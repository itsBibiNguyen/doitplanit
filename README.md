# DoitPlanit

A fast, focused Kanban board for planning and shipping your work. Tasks move across four columns — To Do, In Progress, In Review, Done — and everything is scoped to you privately, with no sign-up form to fill out.

Built with Next.js, Supabase, and TypeScript.

## Highlights

- **No-friction start.** An anonymous guest session is created on first load, so the board is usable immediately. The session persists across reloads.
- **Private by default.** Every task is scoped to your user ID and enforced at the database level with Postgres Row Level Security — not just in application code.
- **Full task detail.** Title, description, priority (low / normal / high), due date, labels, and status, all editable from a single dialog.
- **Due-date awareness.** Dates show as filled chips for overdue, today, soon (1–3 days), or upcoming.
- **Labels.** Color chips on cards, a picker in the task dialog, and header filters that match tasks with every selected label.
- **Comments.** A chronological thread on each task, loaded when you open it — posting stays in the dialog so you can keep going.
- **Search and filters.** Title search, priority chips, and label chips hide cards in place; dragging still uses the full board so a drop cannot skip a hidden card.
- **Board at a glance.** A header button opens a summary panel with total, done, and overdue counts plus a status chart — always from the unfiltered list, closed by default so it does not steal column width.
- **Responsive.** Columns scroll horizontally on narrow screens with a sticky header.
- **Honest about failure.** Losing connection shows a banner instead of breaking the board, a drop that can't be saved slides back with a retry, and every error message says what to do next rather than echoing a Postgres code.

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

Create a free project at [supabase.com](https://supabase.com). Once it's ready, grab the project URL and publishable key (`sb_publishable_...`) from **Project Settings → API Keys**.

### 3. Configure environment variables

Copy the template and fill in your values:

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Both are public client-side values and are safe to expose in the browser — RLS is what protects your data. Never put a secret key (`sb_secret_...`, or the legacy `service_role` key) here.

If your project predates the new API keys and only offers a legacy `anon` key, set `NEXT_PUBLIC_SUPABASE_ANON_KEY` instead; the app falls back to it. Supabase removes legacy keys at the end of 2026, so migrate when you can.

### 4. Set up the database

In the Supabase dashboard, open **SQL Editor → New query**, then paste and run each migration in order:

1. [`supabase/migrations/001_tasks.sql`](supabase/migrations/001_tasks.sql) — `tasks` table, indexes, and RLS.
2. [`supabase/migrations/002_labels.sql`](supabase/migrations/002_labels.sql) — `labels` and `task_labels`, plus RLS.
3. [`supabase/migrations/003_comments.sql`](supabase/migrations/003_comments.sql) — `comments` table and RLS.

Each script is safe to re-run.

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

The `labels` table:

| Column       | Type          | Notes                                             |
| ------------ | ------------- | ------------------------------------------------- |
| `id`         | `uuid`        | Primary key                                       |
| `user_id`    | `uuid`        | Defaults to `auth.uid()`, unique with `lower(name)` |
| `name`       | `text`        | 1–32 characters                                   |
| `color`      | `text`        | `#RRGGBB`                                         |
| `created_at` | `timestamptz` | Defaults to `now()`                               |

`task_labels` is a join table (`task_id`, `label_id`, `user_id`) with a composite primary key. Inserts and deletes are allowed only when the caller owns both the task and the label.

The `comments` table:

| Column       | Type          | Notes                                              |
| ------------ | ------------- | -------------------------------------------------- |
| `id`         | `uuid`        | Primary key                                        |
| `task_id`    | `uuid`        | FK to `tasks`, cascades on task delete             |
| `user_id`    | `uuid`        | Defaults to `auth.uid()`                           |
| `body`       | `text`        | 1–2000 characters                                  |
| `created_at` | `timestamptz` | Defaults to `now()`                                |

Inserts are allowed only when the caller also owns the parent task. There is no update or delete from the client in this pass.

### Ordering

`position` is a `numeric` rather than an integer so a card can be dropped between two neighbours by averaging their positions, with no need to renumber the rest of the column. New tasks are appended with a gap of 1000.

### Security

RLS is enabled on `tasks`, `labels`, `task_labels`, and `comments` with policies that require `auth.uid() = user_id`. A user can only ever read or modify their own rows.

## Project structure

```
app/
  layout.tsx          Fonts, metadata, root shell
  globals.css         Design tokens and animations
  page.tsx            Renders the board
  error.tsx           Recoverable fallback for render-time crashes
  global-error.tsx    Last resort when the root layout itself fails
components/
  board/              Board, Column, TaskCard, TaskDialog, CommentThread,
                      SetupNotice, BoardError, ConnectionBanner, skeletons,
                      empty states
  layout/AppHeader    Branded header with search, filters, and new-task
  ui/Modal            Accessible modal primitive
  ui/Toaster          Transient failure and recovery messages
  icons.tsx           Shared icon set
lib/
  supabase/client     Singleton browser client
  supabase/auth       Anonymous session bootstrap
  supabase/tasks      Task queries and position helpers
  supabase/labels     Label queries and task–label assignment
  supabase/comments   Comment list and create helpers
  hooks/useAuth       Session state for components
  hooks/useOnline     Browser connectivity
  hooks/useToasts     Toast queue
  errors.ts           Turns thrown errors into actionable messages
  types.ts            Shared task, label, and comment types
  utils.ts            Class names, due-date, and timestamp formatting
  board.ts            Column grouping, filters, and placement math
supabase/
  migrations/         SQL schema and RLS policies
```

## Design

The interface avoids default-template aesthetics in favor of a Linear-inspired direction: a cool slate canvas (`#F4F6F8`) against near-black ink (`#0B0F14`), with a single teal accent (`#0D9488`) reserved for primary actions, focus rings, and normal-priority cues. Type pairs **DM Sans** for the interface with **Fraunces** for the wordmark.

All colors, shadows, and radii are CSS variables in `app/globals.css` and exposed to Tailwind via `@theme`, so retuning the palette is a single-file change. Motion is kept subtle — a staggered column entrance and soft card elevation — and respects `prefers-reduced-motion`.

### States and recovery

- **Loading.** Skeleton columns hold the layout until the guest session and the first fetch have both landed, so nothing flashes empty.
- **Empty.** A brand-new board gets a single blank-slate panel; once there's work, individual columns show their own prompt, which becomes a labelled drop zone mid-drag.
- **Offline.** A banner appears under the header, adding and moving are held back with an explanation, and the board refreshes itself when the connection returns.
- **Failed saves.** A drop that can't be persisted puts the card back and offers a retry; a dialog save that fails keeps the draft on screen so it can be tried again.
- **Unrecoverable.** Missing tables, disabled anonymous sign-in, and expired sessions each get their own message naming the fix, rather than a raw Postgres or auth code.

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
- [x] Drag-and-drop between columns with optimistic updates
- [x] Loading skeletons during auth and fetch
- [x] Empty-board and empty-column states
- [x] Offline, auth, and failed-save recovery
- [x] Deploy to Vercel
- [x] Due-date chips (overdue, today, soon, upcoming)
- [x] Client-side search and priority filters
- [x] On-demand board summary panel
- [x] Labels / tags with card chips and board filters
- [x] Task comments

## Deployment

**Live:** [https://doitplanit.vercel.app](https://doitplanit.vercel.app)

The app deploys to [Vercel](https://vercel.com) with no extra configuration. The production project already has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` set.

To redeploy from this machine:

```bash
npx vercel --prod
```

To have every push to `main` deploy automatically, connect the GitHub repo in the Vercel project: **Settings → Git**. The first CLI deploy could not attach `itsBibiNguyen/doitplanit` until the [Vercel GitHub app](https://github.com/apps/vercel) is installed on that repository.
