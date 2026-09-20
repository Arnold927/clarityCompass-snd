# Deploying to the live server

Manual deploy process for clarityCompass (SND Africa MEAL Dashboard) as it
currently stands. Run these steps **in order**, every time — skipping the
backup step or restarting services before rebuilding are the two most
common ways a deploy goes wrong.

## 1. Back up the database

Non-negotiable, every time, before touching anything else:

```bash
mkdir -p /root/backups
cp /compass/backend/core/db.sqlite3 /root/backups/db-$(date +%Y%m%d-%H%M%S).sqlite3
```

## 2. Pull the latest code

```bash
cd /compass
git pull origin main
```

Watch the output. If it reports a conflict instead of completing cleanly,
**stop here** and resolve it before continuing — don't run later steps on
top of an unresolved merge.

## 3. Apply database migrations

```bash
cd /compass/backend/core
../vclarity/bin/python3 manage.py migrate
```

Safe to run even when there's nothing new to migrate.

## 4. Restart the backend (Gunicorn)

```bash
sudo systemctl restart clarity-backend.service
sudo systemctl status clarity-backend.service
```

Confirm the status shows `active (running)` with no errors before moving
on. Gunicorn loads Python into memory once at startup — this restart is
what makes new backend code actually take effect.

## 5. Rebuild the frontend

```bash
cd /compass/frontend
npm install
npm run build
```

Restarting PM2 alone does **not** pick up new code — it just restarts
whatever was already built. This build step is what compiles the latest
changes; skipping it is the most common reason a deploy looks like it did
nothing.

## 6. Restart the frontend (PM2)

```bash
pm2 list
pm2 restart <app-name>
```

Use `pm2 list` first if unsure of the exact process name.

## 7. Verify

- Load the live site in a browser
- Log in
- Click into a couple of the specific features that just changed

---

## Reference: what's git-ignored, and why

The following are intentionally **not** tracked in git — each caused a
real problem before being excluded:

| Path | Why it's ignored |
|---|---|
| `backend/core/db.sqlite3` | The live database. Pulling could otherwise overwrite production data with a stale committed copy. |
| `backend/core/media/` | User-uploaded files (logos, flags, documents) — server-specific, not source code. |
| `backend/vclarity/` | The Python virtual environment — regenerated via `pip install`, environment-specific. |
| `frontend/node_modules/` and root `node_modules/` | Regenerated via `npm install`. |
| `frontend/.next/` | Next.js build output — regenerated via `npm run build`. |
| `__pycache__/`, `*.pyc` | Compiled Python bytecode — regenerated automatically. |

If any of these ever reappear in `git status` as tracked/modified, don't
commit them — that's a sign something regressed. Use `git rm --cached` to
untrack (removes only from git, not from disk) and confirm the
`.gitignore` entry above is still present.

## Recovering from a bad database state

If the live site errors with something like `no such table: ...`, the
database file is likely missing, empty, or reverted:

```bash
sudo systemctl stop clarity-backend.service
cp /root/backups/db-<latest-date>.sqlite3 /compass/backend/core/db.sqlite3
chown root:root /compass/backend/core/db.sqlite3   # match the service's User=root
cd /compass/backend/core
../vclarity/bin/python3 manage.py migrate
sudo systemctl start clarity-backend.service
```

Then verify real data came back before considering it resolved:

```bash
../vclarity/bin/python3 manage.py shell -c "from organizations.models import User; from meal.models import Project; print('users:', User.objects.count(), '| projects:', Project.objects.count())"
```

## Still outstanding (not yet done, worth doing soon)

- **Automated daily backups** — currently the backup above is manual,
  run only as part of a deploy. A cron job would remove reliance on
  remembering to do this:
  ```
  0 2 * * * cp /compass/backend/core/db.sqlite3 /root/backups/db-$(date +\%Y\%m\%d).sqlite3
  ```
- **`DEBUG = True`** is currently active in the live server's Django
  settings — exposes internal file paths and stack traces on any error.
  Should be set to `False` once a proper custom error page is in place.
- **CI/CD** (GitHub Actions deploying automatically on push) — would
  replace this manual runbook with "push and it just happens." Not yet
  set up.