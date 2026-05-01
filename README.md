# M.A.G.I. Task System

Evangelion-themed task manager with Supabase backend. Single-page HTML, no build step.

## Setup (one-time)

### 1. Create Supabase tables

Open your Supabase project → SQL Editor → New query. Paste the contents of `supabase-setup.sql` and run it. This creates two tables (`lists`, `tasks`) with Row Level Security so each user only sees their own data.

### 2. Enable email auth

In Supabase: Authentication → Providers → Email. Make sure "Enable Email provider" is on. If you want to skip email confirmation while testing, you can disable "Confirm email" under Email auth settings (re-enable for production).

### 3. Deploy to GitHub Pages

```bash
git init
git add .
git commit -m "init"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

Then in your repo: Settings → Pages → Source = "Deploy from a branch" → Branch = `main`, folder = `/ (root)` → Save. Your site will be live at `https://YOUR_USERNAME.github.io/YOUR_REPO/` in about a minute.

### 4. Add your Pages URL to Supabase

In Supabase: Authentication → URL Configuration → add your GitHub Pages URL to "Site URL" and "Redirect URLs". Without this, email confirmation links will redirect to localhost.

## Usage

- **Register** with any email + password (≥6 chars)
- **Add lists** with the `+` column at the right edge
- **Click a list name** to rename it
- **◄ ►** buttons reorder lists
- **DEL** removes a list and all its tasks
- **Click a task** to toggle complete; **×** deletes it
- Tasks turn **yellow** within 24h of deadline, **red & pulsing** when overdue
- Completed tasks appear in the "Recently Completed" panel and auto-archive (hide) after 3 days
- **Settings** toggles boot sequence, scanlines, flicker, hex margins, and frame chrome — preferences save to your browser

## Files

- `index.html` — markup, styles, all UI structure
- `app.js` — Supabase client, auth, CRUD, render loop
- `supabase-setup.sql` — database schema
