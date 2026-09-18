# clarityCompass → SND Africa MEAL Dashboard rebuild — progress

## Decision on record
Legacy modules (Strategic Plan, Programs, Tasks, Data Collection, Complaints,
Funding, Results Framework, Shared Portal, AI Reporter) are left in the
codebase untouched but are no longer linked from navigation. The 5 new
modules are now the entire visible app.

## Done (backend — verified end-to-end: migrations applied, seeded, aggregation
tested, and exercised through a real running `runserver` instance with curl +
JWT auth, including a live create round-trip)

New Django app: `backend/core/meal/`
- **Models**: Country, ThematicFocus (+ ThematicFocusIndicator), LeadPartner
  (+ LeadPartnerIndicator), Donor (+ DonorIndicator), Project (+
  ProjectActivity, ProjectIndicator, ProjectDocument).
- Three independent indicator pools (Project / Donor+LeadPartner /
  ThematicFocus) exactly as the module description doc specifies — none of
  them roll up into each other.
- Reach auto-aggregates Project → Donor / Lead Partner / Country. Thematic
  Focus reach is always manual, per spec. A cross-border project's full
  reach counts toward *every* country/donor/partner it's linked to.
- `meal/aggregation.py` — all rollup logic (reach breakdowns, status
  breakdowns, reach-by-country, reach-by-year, key achievements).
- Full REST API under `/api/meal/` — CRUD for every model, plus
  `/overview/` actions on Project/Donor/LeadPartner/Country and a
  `/api/meal/dashboard/?country=&donor=&lead_partner=&thematic_focus=&project=&start_after=&end_before=`
  endpoint for the top-level dashboard, matching the filters in the
  reference screenshot.
- Django admin registered for all models (inlines for activities/indicators)
  — usable for data entry immediately.
- `python manage.py seed_meal_demo` — loads the 7 real SND Africa thematic
  pillars (pulled from sndafrica.org), Kenya + Ethiopia, and the
  BMZ / TDH Germany / PROTECT–Cross-Border sample data from the reference
  screenshots.

## Done (frontend)
- `components/layout/app-layout.tsx` — sidebar nav replaced: Dashboard,
  Projects, Donors, Lead Partners, Countries, Thematic Focus. (Brand
  colours/logo/tagline were already SND-themed in this codebase — untouched.)
  Also removed dead code left over from the old permission-gated nav filter.
- `lib/meal-api.ts` — typed API client + shared types + brand colour tokens
  for all 5 modules, so every page pulls from one place.
- `app/(ngo)/dashboard/page.tsx` — fully rebuilt against `/api/meal/dashboard/`:
  filter bar (Country/Donor/Lead Partner/Thematic Focus/Project), 6 KPI
  cards, Total Reach & Disaggregation, Project Activity Status, Key
  Achievements cards.
- **Projects module — complete** (`app/(ngo)/projects/page.tsx`, replacing
  the legacy 1,047 + 238-line pages that talked to the old Program-coupled
  API): select/switch dropdown with prev/next, empty-state for a fresh
  database, title card (image, status, Edit/Export), info strip (countries,
  donors, lead partner, thematic focus, dates, duration), and four tabs:
  - **Overview** — read-only rollup: reach cards, activity status, top
    indicators/activities preview, description, quick info.
  - **Activities** — full CRUD table + dialog (target, reach, M/F/PWD,
    status, reporting period).
  - **Indicators** — full CRUD table + dialog (target, achievement, unit,
    reporting period).
  - **Documents** — upload, list, download, delete.
  - Create/Edit Project dialog: multi-select pickers (countries, donors,
    thematic focus), single-select lead partner, image upload.
  - Export Report: opens a print-ready summary (browser "Save as PDF") —
    a deliberate scoped simplification, not a proper PDF-library export yet.
  - Shared components factored out for reuse by the remaining 4 modules:
    `components/meal/{multi-select,shared-cards,indicator-manager,
    activity-manager,project-form-dialog,document-manager}.tsx`.

## Bugs found and fixed while verifying (not left for later)
- A pre-existing empty stub at `app/donors/page.tsx` broke the production
  build entirely — removed (the real Donors page will live under
  `(ngo)/donors/` when that module is built).
- A pre-existing missing `xlsx` dependency (installed at the repo root
  instead of `frontend/`) also broke the production build — installed
  correctly in `frontend/package.json`.
- **Decimal fields serialized inconsistently**: `target`/`achievement`/
  `budget` came back as JSON *strings* through the normal CRUD serializers
  but as JSON *numbers* through the `/overview/` aggregation endpoints.
  Fixed by explicitly setting `coerce_to_string=False` on every Decimal
  field in `meal/serializers.py` — scoped to this app only, so legacy
  endpoints are untouched. Verified with live curl calls (including a real
  POST round-trip) that every endpoint now returns numbers consistently.
- The Projects page had a genuine empty-state bug: with zero projects, it
  would show a loading skeleton forever instead of a "create your first
  project" prompt. Fixed before shipping.

## Verification performed on this pass
- `python manage.py check`, `makemigrations --check` (no drift), `migrate`,
  and `seed_meal_demo` all run clean against the shipped `db.sqlite3`.
- Live `runserver` + JWT-authenticated curl calls against
  `/api/meal/projects/`, `/api/meal/projects/1/`, `/api/meal/projects/1/overview/`,
  `/api/meal/project-indicators/`, `/api/meal/donors/1/`, and a real
  indicator `POST` — response shapes checked field-by-field against the
  TypeScript types in `lib/meal-api.ts`.
- `npx tsc --noEmit` and `npm run build` (full Next.js production build, not
  just dev mode) both run clean — no errors in any new or edited file.
- Not possible in this sandbox: a real browser/click-through test (no
  headless browser available, no network access to download one). Build +
  type-check + live API verification is the ceiling here — recommend a
  quick manual click-through after `npm run dev` before this goes to the
  client.

## Not done yet — next phase
- Donor module page (`/donors`): profile, Overview, Projects list, Key
  Indicator cards, indicator data-entry. (`IndicatorManager` and
  `shared-cards` components are already built and ready to reuse.)
- Lead Partner module page (`/lead-partners`): same shape as Donor.
- Country module page (`/countries`): profile, Reach by Year chart, Reach
  by Gender/PWD donut, Projects-in-country table.
- Thematic Focus module page (`/thematic-focus`): manual reach entry, Key
  Indicator cards.
- A real PDF export (current Export Report uses the browser print dialog).

## Running it locally
```
cd backend/core
export DB_ENGINE=sqlite DJANGO_SECRET_KEY=<something> ALLOWED_HOSTS=localhost
pip install django djangorestframework djangorestframework-simplejwt \
  django-extensions django-nested-admin django-cors-headers channels \
  django-filter python-dotenv google-genai channels_redis \
  drf-nested-routers djangorestframework-recursive
python manage.py migrate
python manage.py seed_meal_demo   # optional demo data
python manage.py runserver

cd ../../frontend
npm install
npm run dev
```

---

## Donors module — complete (this pass)

Backend additions (new migration `meal/0002_donordocument.py`):
- `DonorDocument` model + serializer + viewset + `/api/meal/donor-documents/`
  (Donor didn't have a Documents concept before — added to match the
  Documents tab visible in the reference screenshot for both Donor and Lead
  Partner, even though the module description doc's prose didn't spell it
  out for those two).
- `portfolio_overview()` (shared by Donor and Lead Partner) now also returns
  `country_count`, `donor_count`, `lead_partner_count`, `thematic_area_count`
  — needed for the info-strip counts shown in the screenshot.
- `ProjectViewSet` now actually filters by query params (`?donor=`,
  `?country=`, `?lead_partner=`, `?thematic_focus=`, `?status=`) — needed for
  the "Projects under this Donor" table. Previously only the Dashboard
  endpoint applied these filters; the main project list ignored them.
- `DonorSerializer.documents` added (nested, read-only).

Frontend:
- `app/(ngo)/donors/page.tsx` — select/switch donor with prev/next, empty
  state, title card (logo, status, Edit/Export), info strip (Total Projects,
  Countries, Lead Partners, Thematic Areas, Partnership Since), four tabs:
  - **Overview** — reach cards, Projects by Status, People Reached by
    Country (bar list), Projects-under-donor preview table, **Donor Key
    Indicators as card visuals** (not a table — per the doc), Donor
    Information panel.
  - **Projects** — full table of linked projects; clicking a row opens that
    project directly in the Projects module (`/projects?project=<id>`).
  - **Indicators** — full CRUD via the reused `IndicatorManager`, pointed at
    `donor-indicators`, completely independent of Project indicators.
  - **Documents** — reused `DocumentManager` (generalized this pass — it was
    hard-coded to `Project` before; now takes plain `documents` +
    `onUpload`/`onDelete` so Donor, and later Lead Partner, can use it too).
- `components/meal/donor-form-dialog.tsx` — create/edit Donor (name,
  description, type, status, head office, website, partnership year, notes,
  logo upload).
- `components/meal/shared-cards.tsx` — added `ReachByCountryBars`.
- `lib/meal-api.ts` — `Donor.documents`, `PortfolioOverview` count fields,
  `MealDocument` shared type, `projects(filters)` now accepts
  country/donor/lead_partner/thematic_focus/status, donor indicator/document
  CRUD calls. `fmtNumber` made defensive against string input too (in
  addition to the backend fix, in case any other endpoint is ever
  inconsistent again).

## Verification performed on this pass
- Live `runserver` + curl for: donors list, donor create (JSON), donor
  overview **for a donor with zero projects** (the actual edge case most
  likely to break aggregation math — confirmed clean zeros, no
  division-by-zero), donor indicator create, donor edit with a real logo
  file via multipart PATCH, donor delete. All response shapes checked
  against `lib/meal-api.ts` types.
- `npx tsc --noEmit` and `npm run build` (production) both clean.
- `makemigrations --check` clean, migration applied, seed data confirmed
  undisturbed (only the real BMZ donor remains — all test donors/users
  created during verification were deleted afterward).

---

## Lead Partners module — complete (this pass)

Backend additions (new migration `meal/0003_leadpartnerdocument.py`):
- `LeadPartnerDocument` model + serializer + viewset + `/api/meal/lead-partner-documents/`
  — same pattern as `DonorDocument`.
- `LeadPartnerSerializer.documents` added (nested, read-only).
- No changes needed to `portfolio_overview()` or `ProjectViewSet` filtering —
  both were already generalized during the Donors pass (`?lead_partner=`
  filtering and the full count set were already in place).

Frontend:
- `app/(ngo)/lead-partners/page.tsx` — same structure as Donors (select/switch
  with prev/next, empty state, title card, four tabs), with the differences
  the module doc and screenshot actually call for:
  - Info strip shows **Donor Partnerships** (`donor_count`) instead of a
    "Lead Partners" count — the inverse of what the Donor page shows,
    correctly using the generic counts `portfolio_overview` already returns.
  - "Projects under this Lead Partner" table includes a Donor(s) column
    (Donor's equivalent table doesn't need one, since donor is implied).
  - Lead Partner Information panel, Lead Partner Key Indicator cards
    (independent `lead-partner-indicators` pool), Documents tab — all reusing
    the same `IndicatorManager` / `IndicatorCard` / `DocumentManager` /
    `ReachByCountryBars` components built for Projects and Donors.
- `components/meal/lead-partner-form-dialog.tsx` — create/edit (name,
  description, partner type, status, head office, website, partnership year,
  notes, logo upload).

## Verification performed on this pass
- Live `runserver` + curl: lead partner detail (nested documents/indicators),
  overview (including **zero-projects edge case** again, since it's a new
  record each time), `?lead_partner=` project filtering, full create → add
  indicator → upload document → nested-read-back → delete round trip.
- `npx tsc --noEmit` and `npm run build` (production) both clean; `/lead-partners`
  builds as a static route alongside `/projects` and `/donors`.
- `makemigrations --check` clean, migrations applied, seed data confirmed
  undisturbed after cleanup (exactly 1 donor, 1 lead partner, 0 stray
  documents remain).

## Status after 3 of 5 modules
Projects, Donors, and Lead Partners are done and verified. Remaining:
Countries (reach is auto-aggregated only, no custom indicators — the
odd one out in the other direction from Thematic Focus) and Thematic
Focus (fully manual, no Project linkage at all).

---

## Countries module — complete (this pass)

This module is deliberately the simplest of the five — the doc is explicit
that "the system should not require users to manually enter [reach] figures
at country level," and there is no custom-indicators pool and no Documents
tab for Country at all (confirmed by re-reading the exact doc text, not
just the screenshot). Built to match that, not the richer CRUD pattern used
for Donor/Lead Partner.

Backend (no new models/migrations — `Country` already existed in full):
- `country_overview()` extended with `latest_activity_year` (max year across
  the country's activity data) and `reach_change_pct` — a **genuinely
  computed** year-over-year change from the same `reach_by_year` data the
  chart uses (verified with a live test: added a second year of activity
  data and confirmed the percentage came out mathematically correct), not
  a fabricated "vs previous period" number like the reference screenshot's
  own mock data appears to have.
- `country_overview()` also now returns `main_thematic_areas` (the actual
  distinct thematic focus names across the country's projects, for the
  Country Information panel).
- `ProjectListSerializer` gained a `total_reach` field (summed from
  activities) — needed for the "People Reached" column in the Projects-in-
  Country table, and available for free to Donor/Lead Partner project
  tables too, though their screenshots don't show that column.
- `ProjectViewSet.get_queryset` now prefetches related objects on list
  requests, since the list endpoint got a bit heavier with `total_reach`.

Frontend:
- `app/(ngo)/countries/page.tsx` — select/switch with prev/next, empty state,
  title card with a real flag emoji (derived from the ISO code, no image
  assets needed) instead of a static flag icon, **only two tabs — Overview
  and Projects** (no Indicators, no Documents, matching the spec exactly).
  Overview: reach cards (with the "Total People Reached in {Country}" label
  and a genuine ▲/▼ year-over-year badge), a real bar chart (Reach by Year)
  and donut chart (Reach by Gender and PWD) using `recharts` — already a
  project dependency — rather than the CSS-bar shortcut used elsewhere,
  since the doc calls these out as first-class visuals and the screenshot
  shows real charts. Projects-in-Country table links into the Projects
  module. Country Information panel.
- **Deliberate deviation, flagged rather than silently added**: the
  reference screenshot shows no Edit/Add control on the Country page at
  all. I added a small pencil icon next to the country name (not a
  prominent "Edit Country" button like the other modules) and an outlined
  (not filled) "New Country" button, because the app needs *some* way to
  manage country records without dropping into Django admin. If you'd
  rather match the screenshot exactly with zero create/edit UI here, say
  so and I'll pull it back out — Django admin already covers Country
  management either way.
- `components/meal/reach-charts.tsx` — `ReachByYearChart`, `ReachByGenderDonut`.
- `components/meal/country-form-dialog.tsx` — create/edit.
- `lib/meal-api.ts` — `flagEmoji()` helper, extended `CountryOverview` and
  `ProjectListItem` types.
- `shared-cards.tsx`'s `ReachSummaryCards` extended (backward-compatibly —
  existing Project/Donor/Lead Partner usages unaffected) with optional
  `totalLabel` and `trendPct` props for the country-specific framing.

## Verification performed on this pass
- Live `runserver` + curl: country list, overview for a real country,
  overview for a **freshly created country with zero projects** (clean
  zeros/nulls, no crashes), `?country=` project filtering, a real two-year
  activity insert to confirm `reach_change_pct` computes correctly
  (500 → 2,450 people = +390%, verified by hand), and a full create → edit
  → delete round trip for Country itself, all cleaned up afterward.
- `npx tsc --noEmit` and `npm run build` (production) both clean — this
  pass was the first to actually exercise `recharts` in a new page, so this
  check mattered more than usual.
- `makemigrations --check` clean (no model changes this pass). Final DB
  state confirmed to hold only the original 2 seeded countries.

## Status after 4 of 5 modules
Projects, Donors, Lead Partners, and Countries are done and verified. Only
**Thematic Focus** remains — the other outlier: fully manual reach entry,
no Project linkage, no Projects tab at all.

---

## Thematic Focus module — complete (this pass) — ALL 5 MODULES DONE

Re-read the exact doc text before building (not just the screenshot), which
paid off: it explicitly says the user enters **four** separate values —
"Total Reach | Male | Female | PWD" — meaning Total is its own entry, not
just the sum of the other three. My original model only stored
Male/Female/PWD and computed Total as a property. **Caught and fixed this
before building the frontend**, not after:

Backend (new migration `meal/0004_thematicfocus_reach_total.py`):
- `ThematicFocus.reach_total` changed from a computed `@property` to a real
  stored `PositiveIntegerField` — entered independently, because real M&E
  reach figures often can't just be summed (PWD may overlap with Male/
  Female counts, or reach may be deduplicated in ways the sub-figures
  don't capture). Added a code comment explaining why, so a future
  developer doesn't "fix" it back to a sum.
- Added `reach_male_pct` / `reach_female_pct` / `reach_pwd_pct` as computed
  properties (percentage of `reach_total`, zero-division-guarded) —
  exposed on the serializer, matching the doc's example output format
  exactly (verified: Protection's seed data reproduces the reference
  screenshot's 46.4% / 49.6% / 4.0% precisely).
- No other new models — confirmed via the doc text that Thematic Focus has
  **no Documents tab and no Project linkage of any kind**, so neither was
  built (unlike Donor/Lead Partner, which do get Documents).
- Re-seeded the existing Protection record to backfill `reach_total=12500`.

Frontend:
- `app/(ngo)/thematic-focus/page.tsx` — select/switch with prev/next,
  **only two tabs (Overview, Indicators)** matching both the doc and
  screenshot exactly. Overview: People Reached cards (with the doc's exact
  manually-entered caption), Key Indicator cards (reusing `IndicatorCard`,
  same visual language as Donor/Lead Partner per the doc's own comparison),
  Thematic Focus Information panel (name, description, status, created/
  updated timestamps, reporting frequency, responsible person, notes).
- `components/meal/thematic-focus-form-dialog.tsx` — edit dialog, with the
  four reach fields entered as clearly independent inputs and a note in
  the UI itself explaining Total doesn't have to equal the sum.
- **Two deliberate scope decisions, flagged rather than silent** (mirror
  images of the Country decision):
  - **No "New Thematic Focus" button.** The doc explicitly frames this as
    switching between "the seven thematic areas" — a fixed structural set
    tied to SND's actual program design, not a growing list like Donors.
    Full CRUD still exists in the backend/admin if an 8th pillar is ever
    needed.
  - **No Export Report button.** Neither the doc nor the reference
    screenshot shows one for this module (unlike Project/Donor/Lead
    Partner, which all explicitly have it) — matched that omission exactly
    rather than adding it for consistency with the other modules.

## Verification performed on this pass
- Live `runserver` + curl: full list (all 7 real pillars present), detail
  read reproducing the screenshot's exact percentages, a reach edit → 
  revert round trip, indicator create → update → delete round trip, and —
  importantly — **the zero-reach, zero-indicator case** (6 of the 7 seeded
  areas have no demo data at all) confirmed to return clean 0.0% values
  with no division-by-zero error, not just the one populated area.
- `npx tsc --noEmit` and `npm run build` (production) both clean;
  `/thematic-focus` builds as a static route.
- `makemigrations --check` clean, migration applied, all 7 thematic areas
  confirmed present and correct after cleanup (only the Protection area
  has demo data, matching the original seed intent).

## Final status: all 5 modules complete
Projects, Donors, Lead Partners, Countries, and Thematic Focus are all
built, backend-verified against a live server, and build-verified via a
full Next.js production build. Two flagged, reversible deviations from the
literal screenshots exist (Country's added edit/create affordance;
confirmed here that Thematic Focus correctly got the *opposite* treatment).
Still outstanding across the whole rebuild: a real PDF export (currently
browser print-to-PDF), and an actual browser click-through test, which
this sandbox cannot run (no headless browser, no network path to install
one) — worth doing once this is running locally.

---

## Follow-up: New Thematic Focus + Export Report added (client request)

You asked for both of the deliberately-omitted controls on the Thematic
Focus page to be added back in. Done:

- `thematic-focus-form-dialog.tsx` now genuinely supports create mode (it
  already had the state-handling logic for `thematicFocus: null`, but the
  dialog title was hardcoded to "Edit Thematic Focus" regardless — fixed to
  read "New Thematic Focus" when creating).
- `thematic-focus/page.tsx`: added a `formMode` state (matching the
  create/edit pattern used on every other module page), a filled "+ New
  Thematic Focus" button in the selector row, a populated empty state with
  its own create button, and an "Export Report" button (print-ready
  summary, same pattern as Project/Donor/Lead Partner/Country) next to Edit.

## Verification performed on this pass
- Live `runserver` + curl: created a new thematic focus with the exact
  payload the dialog sends, confirmed it appears in the list (7 → 8),
  **and checked the duplicate-name edge case** — `name` is unique on the
  model, so submitting a second area with the same name correctly returns
  an HTTP 400 validation error rather than crashing; the dialog's existing
  error handling surfaces that message to the user. Cleaned up back to 7.
- `npx tsc --noEmit` and `npm run build` (production) both clean.

Thematic Focus now has the same full CRUD affordances as Donor and Lead
Partner. The only remaining intentional module-to-module differences are:
Country (no custom indicators, no manual reach entry — by design, per the
doc) and Thematic Focus (no Documents tab, no Project linkage — also by
design). Both of those are structural, not UI omissions, so I've left them
as-is unless you want those changed too.

---

## Follow-up: reverse links + standalone detail pages (client request)

You asked me to implement the three gaps I'd identified as "not specified,
but could be useful": Project → other-module reverse links, standalone
detail pages for Activities/Indicators/Documents, and document preview.
All three built, no backend model changes needed — every new page is
powered by ModelViewSets that already existed and were already verified;
this was purely additive frontend work plus two small TS interface fixes.

**1. Reverse links from Project's info strip.** Countries, Donor(s), Lead
Partner, and Thematic Focus values on the Project page are now clickable
links into their respective modules (new `InfoLinkList` component). While
editing this in, I introduced and then caught a real mistake: an
`str_replace` briefly left orphaned duplicate JSX from the old `InfoItem`
function body dangling in the file. Caught it on the next read (before
running any check), rewrote it cleanly, and the subsequent brace/paren
balance check plus a clean `tsc`/production build confirm it's fine.

**2. Standalone detail pages** — three new routes, all backed by the
existing ModelViewSets (no backend changes):
- `/activities/[id]` — single Activity detail, with a link back to its
  parent project.
- `/indicators/[kind]/[id]` — one page handling all four independent
  indicator pools (`project` / `donor` / `lead-partner` / `thematic-focus`),
  resolving and linking to the correct parent for whichever kind it is.
- `/documents/[kind]/[id]` — document detail **with a real inline
  preview**: images render directly, PDFs render in an iframe, anything
  else falls back to a clear "no preview, download instead" state.
  Fixed a real bug here before shipping: the file-extension detection
  originally split the *whole file URL* on `.`, which breaks on local
  URLs like `127.0.0.1` (the IP's dots would win over the actual
  extension). Fixed to isolate the filename after the last `/` first.
- Added "View" (eye icon) links into `ActivityManager`, `IndicatorManager`,
  and `DocumentManager` so these pages are actually reachable from the
  tables, not just live at unlinked URLs.

**3. Tab-in-URL syncing**, added to Projects/Donors/Lead
Partners/Thematic Focus, so a link like `/projects?project=5&tab=activities`
actually lands on the right tab — without this, every "back to source"
link from a new detail page would dump the user on Overview regardless of
where they came from.

New shared helpers in `lib/meal-api.ts`: `mealApi.activity()`,
`mealApi.indicator()`, `mealApi.document()`, `moduleHref()`,
`indicatorParentId()`, `documentParentId()`, `fetchModuleName()`. Also
fixed two pre-existing TS interface gaps caught by this work:
`ProjectActivity` and `IndicatorLike` were both missing `created_at`/
`updated_at`, even though every backend serializer already returns them.

## Verification performed on this pass
- Live `runserver` + curl: single-record GET for the activity, all 4
  indicator kinds, and all 3 document kinds — confirmed each returns the
  correct parent FK field (`project`/`donor`/`lead_partner`/
  `thematic_focus`) with the right value and `None` for the others, exactly
  matching what `indicatorParentId`/`documentParentId` expect. Verified
  all 4 parent-name lookups resolve correctly. **Explicitly checked the
  404 case** for a nonexistent ID across all 8 endpoint variants (activity,
  4 indicator kinds, 3 document kinds) — all return a clean 404, which the
  pages' existing error states handle without crashing.
- `npx tsc --noEmit` and `npm run build` (production) both clean; all
  three new dynamic routes appear correctly in the build output.
- `makemigrations --check` clean (no model changes this pass — everything
  here reused existing, already-verified endpoints). Final DB state
  confirmed unchanged from the last known-good seed (1 donor, 1 lead
  partner, 2 countries, 7 thematic areas, 1 project).

---

## Follow-up: UI/UX polish batch (client request) — toasts, dirty-check,
## sortable tables, aria-labels, page titles, clickable breadcrumb, favicon

Pure presentation-layer work, no functional/spec changes and no backend
changes at all — confirmed via `find backend -newer PROGRESS.md` before
packaging, which returned nothing.

**New shared utilities** (`components/meal/`):
- `use-sortable-data.tsx` — generic client-side sort hook (`useSortableData`)
  + `SortableTableHead` column header component. Stable sort (ties broken by
  original index), nulls/empty values always pushed to the end regardless
  of direction.
- `use-confirm-discard.ts` — snapshots a dialog's form values on open,
  prompts "Discard unsaved changes?" if Cancel/outside-click/Escape is used
  while the form is dirty.
- `use-page-title.ts` — sets `document.title` per page (client components
  can't use the Next.js `metadata` export) and restores the previous title
  on unmount.

**Toasts + dirty-check-on-close**: wired into all 5 top-level dialogs
(Project/Donor/Lead Partner/Country/Thematic Focus) and both shared
managers (Activity, Indicator) — success and error feedback on every save,
plus a confirmation prompt before discarding an in-progress edit. Document
upload/delete also got toasts (no dirty-check needed there — it's an
inline form, not a dialog). The toast infrastructure
(`components/ui/use-toast.tsx` + `<Toaster />`) already existed in this
codebase, mounted globally, and used elsewhere in the legacy code — this
was purely a matter of actually calling it from the 5 rebuilt modules.

**Sortable columns**: added to `ActivityManager`, `IndicatorManager`, and
all three `ProjectsTable` instances (Donor/Lead Partner/Country pages).
Array-valued columns (Countries, Donor(s)) are left unsorted since there's
no single meaningful order for a list.

**Accessibility**: `aria-label` added alongside every existing `title`
tooltip on icon-only buttons (View/Edit/Delete/Download/Upload, prev/next
navigation, the Country page's inline pencil-edit icon) across all touched
components.

**Clickable Home breadcrumb**: wrapped in a `Link` to `/dashboard` across
all 8 relevant pages (5 modules + 3 detail pages) — each edit was asserted
to match exactly once before applying, specifically to avoid a repeat of
the mistake below.

**Per-page browser tab titles**: applied to all 9 pages, showing the
loaded record's name once available (e.g. "PROTECT – Cross-Border |
Projects | SND Africa MEAL"), falling back to a generic title while
loading or with nothing selected.

**Favicon**: replaced the default Next.js icon. The SND logo is a wide
562×204 wordmark, not a square icon, so pasting the whole thing into a
16×16 square would've been illegible. I looked at the actual logo, tried
cropping the illustrated icon mark (sun/tree/herder) first, and rejected
it — too much fine detail to survive at favicon scale. Cropped the bold
"SND" wordmark letters instead, padded onto a square white canvas, and
checked it at actual 32×32 render scale before finalizing. Saved as both
`favicon.ico` (multi-resolution: 16/32/48/64px) and `icon.png` (Next.js
App Router's modern-icon convention) — confirmed `/icon.png` appears as
its own route in the production build output.

## A mistake made and caught mid-batch
While adding the Projects page's title hook, an edit landed two
`useState` declarations on the same line with no line break
(`const [project,...] = useState(...);  const [overview,...] = useState(...);`)
— syntactically works in JS but is exactly the kind of thing that can hide
a real error next time that line is touched. Caught it before running any
check, fixed it, and — because this was now the second time a multi-line
edit had gone wrong — added an explicit brace/paren balance check across
all 9 edited page files as a matter of routine before moving on, not just
after finishing.

## Verification performed on this pass
- `npx tsc --noEmit`: clean — only the 5 known pre-existing legacy errors
  remain (notification-bell, activity-editor, task-indicator-data-entry),
  none introduced by this batch.
- `npm run build` (production): clean, all 9 touched routes present,
  `/icon.png` correctly registered as its own route.
- Backend confirmed untouched (`find backend -newer PROGRESS.md` → empty)
  and still migration-clean and check-clean.
- A final grep sweep across every dialog confirmed no leftover
  `onOpenChange={onOpenChange}` / `setOpen(false)` bypass of the new
  `handleOpenChange` wrapper — every close path is now guarded.
- Manual logical review of the two trickier pieces (`useSortableData`'s
  null-handling and tie-breaking; `useConfirmDiscard`'s JSON-snapshot
  comparison) since neither can be exercised in a live browser in this
  sandbox. One known, low-impact limitation from that review: reordering a
  multi-select (e.g. deselecting then reselecting the same item) can
  trigger an unnecessary "discard changes?" prompt even though the
  effective selection is unchanged — errs toward an extra confirmation
  rather than silently losing data, so left as-is rather than engineering
  an order-insensitive comparison for a cosmetic edge case.

---

## Fix: missing icons on reach and status cards (client-reported)

You were right — I checked the code and confirmed it directly: `ReachSummaryCards`
(the Total People Reached / Male / Female / PWD cards used across Project,
Donor, Lead Partner, Country, and Thematic Focus Overview tabs) had no icon
at all, just a colored label and number. The reference screenshots show a
colored circular icon badge on every one of these cards.

**Root cause**: I built the Dashboard first, with a proper icon-badge
`StatCard` component. When I later built the shared `ReachSummaryCards` and
`StatusBreakdownCard` components for the other five modules, I didn't carry
that same visual treatment over — a genuine inconsistency in my own work,
not a spec ambiguity. Checking for it turned up a **third** occurrence of
the same gap: the Dashboard page itself had its own separate, older inline
`ReachCard` and status-breakdown block (pre-dating the shared components),
which had the identical problem.

**Fixed all three, and eliminated the duplication where the layouts
actually matched:**
- `ReachSummaryCards` (shared, used by 5 modules) — added a circular icon
  badge per card: `Users` for Total, `Mars` for Male, `Venus` for Female,
  `Accessibility` for PWD — matching the same visual pattern already used
  correctly on the Dashboard's KPI row.
- `StatusBreakdownCard` (shared, used by Project/Donor/Lead Partner) —
  added a small icon next to the card title (`ListChecks`) and a colored
  icon badge per status row (`CircleCheck` / `RefreshCw` / `Clock` /
  `CircleX` / `CirclePause` for Completed/Ongoing/Partially Done/Not
  Started/On Hold).
- Dashboard's own inline `ReachCard` — same icon treatment applied
  directly, since its layout (one bordered card titled "Total Reach and
  Disaggregation" containing a 2×2 grid) doesn't match `ReachSummaryCards`'
  own grid shape, so a straight component swap would have looked wrong.
  Its inline **status** block, however, *did* match `StatusBreakdownCard`'s
  shape exactly (a standalone card, one column in a 2-column grid) — so
  that block was deleted entirely and replaced with a direct call to the
  shared component, removing ~15 lines of duplicate code instead of fixing
  it twice.
- Confirmed via a memory check against the reference screenshots that the
  Key Achievements cards (already had icons) and the individual Donor/Lead
  Partner/Thematic Focus indicator cards (plain by design, no icon in the
  reference screenshots) didn't need the same change — applied this fix
  only where the gap actually existed.

All icon choices were verified against the actually-installed lucide-react
version (0.475.0) before use — checked the package's exported names
directly rather than assuming, since a few of these had been renamed
(`CheckCircle2`→`CircleCheck`, `XCircle`→`CircleX`) between versions and I
wanted the current canonical name, not a deprecated alias.

## Verification
- `npx tsc --noEmit`: clean.
- `npm run build` (production): clean, all routes present.

---

## Fix: Active status color, country flags, and interactive charts (client request)

### 1. "Active" pill wasn't green — a real bug, now fixed
Confirmed by reading the code: `STATUS_COLORS`/`STATUS_LABELS` (the shared
maps `StatusPill` uses everywhere) only ever had activity/project status
keys (COMPLETED/ONGOING/etc.) — `ACTIVE`/`INACTIVE` were never in there at
all. So `<StatusPill status="ACTIVE">` on every Donor/Lead Partner/Country/
Thematic Focus page was silently falling back to gray and printing the raw
string "ACTIVE" instead of "Active". Added both keys (green for Active,
muted gray for Inactive) to the one shared map — fixes every module at once
since they all go through the same `StatusPill` component.

### 2. Real country flag images (not just emoji)
Added a proper `flag` image field to `Country` (new migration
`0005_country_flag_alter_country_iso_code.py`), mirroring how Donor/Lead
Partner already have a `logo` field:
- Sourced actual Kenya and Ethiopia flag SVGs from a well-known open-source
  flag-icon set on GitHub, converted to PNG, and **visually verified both
  were the correct, real flags** before using them (not just trusted by
  filename) — Kenya's black/red/green bands with the Maasai shield, and
  Ethiopia's green/yellow/red with the blue star emblem.
- Seed command now attaches these to the existing Kenya/Ethiopia records
  automatically (idempotent — only sets the flag if one isn't already
  there).
- `CountryFormDialog` now supports uploading a flag image, exactly the same
  multipart pattern as Donor/Lead Partner's logo upload — this is the "way
  to add a flag image of another country" you asked for.
- Countries page (selector dropdown, title card, and the Export Report
  print view) now shows the uploaded flag image when one exists, falling
  back to the ISO-code-derived flag emoji when it doesn't — so countries
  added without a flag image still show *something* reasonable rather than
  a blank space.

### 3. Interactive charts on the Countries page
The Reach by Year and Reach by Gender/PWD charts were static — a bar chart
and donut with only recharts' default plain tooltip. Rebuilt both with
real interactivity:
- **Rich custom tooltips** on both charts — hovering now shows the full
  Male/Female/PWD breakdown, not just the one number being plotted. This
  required extending the backend: `reach_by_year()` only tracked a total
  before, so I extended it to track Male/Female/PWD per year too (verified
  live against real data before touching the frontend).
- **Reach by Year**: click a bar (or line point) to select that year —
  the selected bar is visually highlighted and a detail panel appears
  below the chart with the full breakdown; click again to deselect. Added
  a **bar/line toggle** above the chart — a genuine "switch visualization
  type" control in the PowerBI sense, not just a cosmetic tweak.
- **Reach by Gender and PWD**: hovering a segment enlarges it (recharts'
  `activeShape` pattern) and updates the center label to show that
  segment's exact value and percentage instead of the grand total.
  Clicking a segment *or* its legend entry pins that selection so it stays
  highlighted without needing to keep hovering — click again to unpin.

## Verification performed on this pass
- Visually inspected both sourced flag images before use, confirming they
  were the genuine Kenya and Ethiopia flags, not just correctly-named files.
- Live `runserver` + curl: confirmed `reach_by_year` now returns the
  male/female/pwd breakdown per year on real data, confirmed the `flag`
  field appears on Country reads with a working media URL, and ran a full
  create-country-with-flag-upload round trip via multipart — exactly the
  request shape `CountryFormDialog` sends — then cleaned up and confirmed
  the final country table holds only Kenya and Ethiopia with their real
  flags intact.
- `makemigrations --check` clean, migration applied.
- `npx tsc --noEmit` and `npm run build` (production) both clean — worth
  calling out specifically for this pass since the interactive charts use
  several loosely-typed recharts event-handler signatures
  (`activeShape`, `onClick` payloads) that are exactly the kind of thing
  that can silently typecheck wrong; both passed clean.

---

## Follow-up: interactivity everywhere + correct favicon (client request)

### Favicon corrected to match the sidebar exactly
Checked how the sidebar actually renders `logo.png`: the whole file,
`object-fit: contain`, into a square box — not any particular crop. My
previous favicon (a custom crop of just the bold "SND" letters) was a
*different* treatment of the logo than what the app itself uses. Redid it
to match exactly: the entire logo, letterboxed onto a square white canvas,
same as the sidebar. This is naturally busier at 16×16 than a dedicated
icon would be (all the illustrated detail and text get very small), but it
is now genuinely "the same logo as in the sidebar" as asked, not my own
separate interpretation of it.

### Every graph in the rebuilt system is now interactive
Audited the whole app for anything chart-like. Two more were found beyond
last pass's Country charts, both used across multiple modules:

- **`StatusBreakdownCard`** (Project's Activity Status, Donor's and Lead
  Partner's Projects by Status, and Dashboard's Project Activity Status —
  four places, one shared component) was a plain icon+list with no chart
  at all. Rebuilt with a small interactive donut alongside the list:
  hovering a status row highlights the matching donut segment (enlarges
  it) and vice versa; clicking either pins the selection. One fix, four
  screens upgraded at once, because they all already shared this
  component.
- **`ReachByCountryBars`** (Donor's and Lead Partner's "People Reached by
  Country") was hand-rolled static CSS bars with no interactivity at all.
  Rebuilt as a real interactive horizontal bar chart: rich tooltip showing
  the full Male/Female/PWD breakdown per country (not just the total),
  click a bar to select/highlight it. This needed the same backend
  extension as last pass's `reach_by_year` fix: `reach_by_country()` only
  tracked a total before, so I extended it to carry Male/Female/PWD per
  country too — verified live against real data before touching the
  frontend, same as always.
- Deliberately did **not** touch `ReachSummaryCards`, `IndicatorCard`, or
  the indicator progress bars — these are single-value KPI/progress
  displays, not comparative charts, and PowerBI dashboards have plenty of
  those too without making them "interactive" in the graph sense. Applying
  chart interactivity there would've been adding motion for its own sake
  rather than matching a real gap.
- Confirmed via a grep sweep across every rebuilt page that nothing
  chart-like was missed — the two components above were genuinely the only
  static "graphs" left anywhere in the 5 modules.

## Verification performed on this pass
- Live `runserver` + curl: confirmed `reach_by_country()` now returns the
  Male/Female/PWD breakdown per country on real data (both Kenya and
  Ethiopia correctly show the full project reach, since it's a
  cross-border project counting toward both).
- `npx tsc --noEmit` and `npm run build` (production) both clean — all 27
  routes present, including every page that now renders the reworked
  `StatusBreakdownCard` (Project/Donor/Lead Partner/Dashboard) statically
  during the build without errors.
- `makemigrations --check` clean (no model changes this pass — both
  extensions were to existing aggregation functions, not the schema).
- Confirmed the favicon files were actually overwritten (562×562 canvas,
  matching the full logo — not the old 247×247 "SND"-only crop).

---

## Follow-up: filtering + pagination across all 5 modules (client request)

Pure frontend work — confirmed via `find backend -newer PROGRESS.md`
(empty) before packaging. Pagination is client-side (filters/paginates an
already-fully-fetched list), consistent with how sorting already works in
this app — no backend endpoint returns paginated data yet. If any module
grows into the hundreds of records, that's the point where this would need
to move to real server-side paging; flagging that now rather than
overstating what "pagination" means here.

**New shared utilities** (`components/meal/`):
- `use-pagination.tsx` — `usePagination` hook (10 rows/page, clamps back to
  the last valid page if a filter shrinks the results out from under the
  current page) + `PaginationControls` (Prev/Next, up to 5 page numbers,
  "Showing X–Y of Z" count).
- `table-filter-bar.tsx` — reusable search input + optional status/period
  dropdown, used identically everywhere so the filtering UX doesn't vary
  module to module.

**Applied to every table in every tab across all 5 modules:**
- **Activities** (Project): status filter + search by name, paginated.
- **Indicators** (Project/Donor/Lead Partner/Thematic Focus — one shared
  component, four modules covered at once): search by name/unit +
  a **Reporting Period** filter whose options are derived from whatever
  periods actually exist in the data (periods are free text, not a fixed
  enum, so a hardcoded dropdown would've been wrong), paginated.
- **Documents** (Project/Donor/Lead Partner): search by title, paginated.
- **Projects tables** (Donor/Lead Partner/Country): status filter + search
  by name, paginated.

**Deliberate scoping decision**: the Overview tab's "preview" tables (the
first-5-rows-with-a-View-All-link pattern used throughout) do **not** get
filter/pagination controls — a 5-row preview with pagination controls
would be a contradiction in terms. Added a `showFilters` prop (defaulting
to `true`) to the shared `ProjectsTable` components specifically so the
Overview preview usage can opt out while the dedicated Projects tab keeps
full filtering. The dedicated tabs (Activities, Indicators, Documents,
Projects) all get the full treatment since those are where someone
actually browses the complete list.

Did **not** add filtering to the top-level "Select Project/Donor/Lead
Partner/Country/Thematic Focus" dropdowns themselves — those are a
single-select control for picking one record to view, not a browsable
list, so a filter there would be a different feature (narrowing which
record you can select) rather than what was asked (filtering the data
*within* a module/tab). Flagging this so it's a visible scoping choice,
not a silent gap — happy to add it if that's actually wanted too.

## Verification performed on this pass
- `npx tsc --noEmit` and `npm run build` (production): both clean, all 27
  routes present.
- Manual structural review of the Countries page's `ProjectsTable`
  specifically (the most heavily-edited of the three, done in multiple
  steps) plus a brace/paren balance check across every file touched this
  pass, given past experience in this project that multi-part edits are
  exactly where a stray line is most likely to slip in unnoticed.
- No backend changes this pass, confirmed via `find backend -newer
  PROGRESS.md` returning nothing.

---

## Follow-up: Shared Portal cards commented out, back-to-home link, scroll glitch fix

### (a) Shared Portal card commented out
`app/page.tsx` (root landing page) and `app/login/page.tsx` both had a
"Shared Portal" card/button linking to `/shared-portal/login`. Commented
out both (JSX-comment blocks, not deleted, with a note on exactly what to
uncomment to restore) — the routes themselves at `/shared-portal/*` still
exist and still work if linked directly, only the visible entry points are
gone.
- `app/page.tsx`: the grid was `grid-cols-1 md:grid-cols-2` for two
  side-by-side cards; with only one left, changed it to a single centred
  card (`max-w-md mx-auto`) rather than leaving an empty second column.
  Removed the now-unused `Users` icon import.
- `app/login/page.tsx`: also commented out the "OR" divider that sat
  directly above the Shared Portal button — with the button gone, a bare
  divider followed immediately by the security note looked broken.
  Removed the now-unused `Globe` icon import.

### (b) Back-to-Home link added to the login page
Added a small "← Back to Home" link at the top of `app/login/page.tsx`,
pointing at `/` (the root landing page).

### (c) Scroll-boundary glitch — found and fixed
Diagnosed "hangs off when scrolled to the very top or bottom" as the
classic mobile-browser `100vh` bug: Tailwind's `min-h-screen`/`h-screen`
utilities compile to `min-height: 100vh` / `height: 100vh`, which does
**not** account for the browser's address bar showing or hiding as the
page scrolls — exactly the symptom described (something visually
"detaching" or jumping right at the very top/bottom of the scroll).
Confirmed the installed Tailwind version (3.4.17) supports the newer
`dvh` (dynamic viewport height) unit natively, then replaced every
`min-h-screen`/`h-screen` in the actively-used part of the app with
`min-h-dvh`/`h-dvh`:
- `components/layout/app-layout.tsx` (both occurrences — this wraps every
  one of the 5 rebuilt modules plus the Dashboard, so this is the fix that
  matters most)
- `app/(ngo)/layout.tsx` (auth-loading state)
- `app/page.tsx` and `app/login/page.tsx`
- `app/(ngo)/accountability/page.tsx` (a dormant, unlinked legacy page —
  fixed anyway since it was a one-line, zero-risk change while already
  auditing every occurrence)

Checked `globals.css` for any compounding `100vh`/overflow rules — none
found, so this was the complete fix, not a partial one.

## Verification performed on this pass
- `npx tsc --noEmit` and `npm run build` (production): both clean, `/`,
  `/login`, and every `(ngo)` route present and correct.
- Explicit brace/paren balance check on every hand-edited file (the two
  large JSX-comment blocks in `page.tsx` and `login/page.tsx` are exactly
  the kind of edit where a stray brace has slipped in before in this
  project, so checked deliberately rather than assuming a clean build
  alone was sufficient).
- No backend changes this pass, confirmed via `find backend -newer
  PROGRESS.md` returning nothing.
- Not verifiable in this sandbox: the actual mobile-browser scroll
  behavior, since there's no real device/browser available here — the
  `dvh` fix is a well-established, correct fix for the exact symptom
  described, but worth confirming on an actual phone once this is
  deployed.

---

## Follow-up: list pages as the default landing view (Projects, Donors, Lead Partners)

Pure frontend restructuring — confirmed via `find backend -newer PROGRESS.md`
(empty). Scoped to exactly the three modules discussed (Projects, Donors,
Lead Partners) — Countries and Thematic Focus deliberately left as
dropdown-only, per the earlier reasoning (2 countries and a fixed set of
7 pillars don't benefit from a browsable list the way a growing roster of
projects/donors/partners would).

**New behavior**: visiting `/projects`, `/donors`, or `/lead-partners` with
no id in the URL now shows a searchable, sortable, paginated **list** of
all records (reusing the same `TableFilterBar` / `useSortableData` /
`usePagination` components already built for the in-tab tables) instead of
silently auto-selecting the first record. Clicking a row switches to
exactly the existing detail view (unchanged tabs, Edit/Export, indicators,
etc.) by setting `?project=<id>` (or `?donor=`/`?partner=`) in the URL —
the two views are just two states of the same page, keyed off whether that
param is present, not two separate routes.

- **List columns**: Projects (Name, Countries, Donor(s), Lead Partner,
  Dates, Status, People Reached); Donors and Lead Partners (Name, Type,
  Head Office, Partnership Since, Status — their own ACTIVE/INACTIVE
  status, not a project status).
- **"+ New X"** moved from the detail view's selector row to the list
  view's header — the natural place for it in a list+detail pattern.
  Creating a record still doesn't auto-navigate into it (consistent with
  how creation already worked everywhere else in this app); it refreshes
  the list so the new entry is visible to click into.
- **Getting back to the list**: the "Projects"/"Donors"/"Lead Partners"
  breadcrumb segment becomes a clickable link back to the list once you're
  in detail view, plus a dedicated "← All Projects" (etc.) button was
  added to the detail view's selector row. The quick-switch dropdown and
  prev/next buttons stay in the detail view for flipping between records
  without returning to the list.
- Every existing cross-link into these three modules
  (`/projects?project=<id>` from Donor/Lead Partner/Country's project
  tables, the reverse links on Project's info strip, the standalone
  Activity/Indicator/Document detail pages' "back to source" links) always
  passes an explicit id, so all of them land straight in detail view,
  unaffected by this change — only the bare sidebar nav links (which pass
  no id) now show the list first.

## Verification performed on this pass
- `npx tsc --noEmit` and `npm run build` (production): both clean, all 27
  routes present.
- Explicit brace/paren balance check on all three fully-rewritten page
  files before running any other check, given this was the largest
  single-file rewrite yet in this project and past experience here shows
  that's exactly where a stray line slips in unnoticed.
- Traced every existing link into these three modules to confirm each one
  passes an explicit id (and therefore still lands in detail view, not the
  new list) rather than assuming this from the diff alone.
- No backend changes this pass, confirmed via `find backend -newer
  PROGRESS.md` returning nothing.

---

## Follow-up: branded Export Report across all 5 modules (client request)

Pure frontend work — confirmed via `find backend -newer PROGRESS.md`
(empty). Rather than patch the 5 separate hand-rolled HTML strings (one
per module's "Export Report" button, each slightly different and each
missing the logo), built **one shared report generator**
(`components/meal/export-report.ts`) and pointed all 5 at it — a single
source of truth, so every exported report is now guaranteed visually
identical and on-brand, not just "5 reports that each happen to include a
logo now."

**Logo handling** — the SND logo is 124KB, too large to hardcode as a
base64 constant bundled into every page's JS (would add ~166KB to 5
heavily-used pages). Since the sidebar already loads `/logo.png` on every
page, the shared generator fetches it and converts it to a data URI **at
export time**, caching the result in memory — this resolves from the
browser's own HTTP cache almost instantly in practice, with no bundle-size
cost. A data URI is used rather than a plain `<img src="/logo.png">`
specifically because a window opened via `window.open('', '_blank')` +
`document.write` has inconsistent relative-URL resolution across
browsers — a data URI always renders regardless of that window's resolved
base URL, so the logo can't silently fail to appear.

**Theme applied**: the exact brand palette (`C` from `lib/meal-api.ts`),
the same Lora/Source Sans 3 font pairing used throughout the app, and a
header styled to match the sidebar (dark brown background, orange
accent border, cream text) — plus a footer with the "Confronting
crisis · Building Resilience · Transforming lives" tagline and a
generated-on timestamp. Every module's report now looks like it came from
the same product, because it does — one template, not five.

**Correctness**: all dynamic content (names, descriptions, table cell
values) is HTML-escaped before insertion, so a project/donor name
containing characters like `&` or `<` can't break the generated document —
this wasn't previously handled in the old per-module implementations.

All 5 modules' `exportReport` functions were refactored to call this one
function with their own module-specific KPIs/tables (Project: Activities +
Indicators; Donor/Lead Partner: Projects + Key Indicators; Country:
Projects in Country; Thematic Focus: Key Indicators, plus the "manually
entered" disclaimer note) — no visual regression to what each report shows,
only how it's rendered and branded.

## A mistake made and caught mid-edit
While adding a `.note` CSS class, a `str_replace` matched a selector line
too broadly and deleted the `h2 {` selector text, leaving a bare,
ruleless `{ ... }` CSS block behind. Caught it immediately with a
follow-up grep before running any check, fixed it, and — consistent with
practice on every pass since this class of mistake first came up — ran an
explicit brace/paren balance check across every touched file before
running `tsc`, not just after.

## Verification performed on this pass
- `npx tsc --noEmit` and `npm run build` (production): both clean, all 27
  routes present. This also caught two real import gaps (`fmtNumber` was
  missing from the Countries and Lead Partners pages' imports) and one
  duplicate import line (Thematic Focus) before they could ship.
- Explicit brace/paren balance check across all 6 touched files
  (`export-report.ts` + the 5 page files) both before and after the CSS
  mistake was fixed.
- Full manual read-through of the final `export-report.ts` end-to-end,
  given the mid-edit mistake, to confirm the generated document structure
  is correct beyond what a clean compile alone guarantees.
- Not verifiable in this sandbox: what the exported PDF actually looks
  like when printed/saved from a real browser (no headless browser
  available here) — the HTML/CSS is standard and the logo-loading
  strategy is a well-established technique, but worth doing one real
  "Export Report → Save as PDF" click-through once this is running
  locally to confirm it renders and paginates as expected.
