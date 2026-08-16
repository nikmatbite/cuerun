# CueRun

Billiards rack time-trial tracker. PWA mobile-first, offline-first, no backend, no auth.

**Deploy target:** `cuerun.binapath.my.id` (Cloudflare Pages)

---

## Tech Stack

- React 18 + TypeScript + Vite
- Tailwind CSS v3
- IndexedDB via `idb`
- PWA via `vite-plugin-pwa`

---

## Setup

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

---

## Project Structure

```
src/
  types/          # TypeScript types (Session, Rack, etc.)
  database/       # IndexedDB layer (db.ts)
  timer/          # Timer engine — timestamp-based, pure functions
  statistics/     # Stats calculations — pure, deterministic
  services/       # Business logic (sessionService, etc.)
  backup/         # Export/import JSON backup
  hooks/          # React hooks (useTimer, useData, useAppState)
  components/     # Shared UI components (BottomNav, Modal)
  pages/          # Page-level components
  utils/          # Label helpers, date formatting
```

---

## Consistency Score Formula

```
CV    = standard_deviation / mean
Score = clamp(100 × (1 − CV), 0, 100)
```

| CV   | Score |
|------|-------|
| 0%   | 100   |
| 20%  | 80    |
| 35%  | 65    |

Minimum 5 completed racks required. Below 5: displays "Belum cukup data".

---

## Game Modes

| Mode   | Drill        | Variant        |
|--------|--------------|----------------|
| 8 Ball | Solo Rack    | —              |
| 8 Ball | Break & Run  | Solids         |
| 8 Ball | Break & Run  | Stripes        |
| 9 Ball | Full Rack    | —              |
| 10 Ball| Full Rack    | —              |

Stats are always separated by mode + drill + variant.

One session can contain racks from multiple modes.

---

## Backup Format

`cuerun-backup-YYYY-MM-DD.json`

```json
{
  "app": "CueRun",
  "backupVersion": 1,
  "exportedAt": "...",
  "sessions": [...],
  "racks": [...]
}
```

Import modes:
- **Merge** — skip duplicates (by ID), keep existing data
- **Replace** — clear all data first, then import

---

## Cloudflare Pages Deploy

1. Push to GitHub
2. Connect repo to Cloudflare Pages
3. Build command: `npm run build`
4. Output directory: `dist`
5. Set custom domain: `cuerun.binapath.my.id`

The `public/_redirects` file handles SPA routing.
