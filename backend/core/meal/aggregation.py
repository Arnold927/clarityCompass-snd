"""
Aggregation helpers for the MEAL dashboard rollups.

Rule (per the module description doc): reach only auto-aggregates
Project -> Donor / Lead Partner / Country. It never continues on to
Thematic Focus, which is always manually entered. A cross-border
project's full reach counts toward EACH country/donor/partner it is
linked to (it is not split across them).
"""
import re
from collections import defaultdict

ACTIVITY_STATUS_LABELS = {
    'NOT_STARTED': 'Not Started',
    'ONGOING': 'Ongoing',
    'PARTIALLY_DONE': 'Partially Done',
    'COMPLETED': 'Completed',
}
PROJECT_STATUS_LABELS = {
    'NOT_STARTED': 'Not Started',
    'ONGOING': 'Ongoing',
    'COMPLETED': 'Completed',
    'ON_HOLD': 'On Hold',
}


def _pct(part, whole):
    if not whole:
        return 0.0
    return round((part / whole) * 100, 1)


def reach_breakdown_for_activities(activities):
    """Sum reach/male/female/pwd across an iterable of ProjectActivity."""
    total = male = female = pwd = 0
    for a in activities:
        total += a.reach
        male += a.reach_male
        female += a.reach_female
        pwd += a.reach_pwd
    return {
        'total': total,
        'male': male,
        'male_pct': _pct(male, total),
        'female': female,
        'female_pct': _pct(female, total),
        'pwd': pwd,
        'pwd_pct': _pct(pwd, total),
    }


def status_breakdown(items, status_field_labels):
    """Generic {status: count} + percentage breakdown, given a list of status codes."""
    counts = defaultdict(int)
    for status in items:
        counts[status] += 1
    total = len(items)
    breakdown = []
    for code, label in status_field_labels.items():
        count = counts.get(code, 0)
        breakdown.append({'status': code, 'label': label, 'count': count, 'percentage': _pct(count, total)})
    return {'total': total, 'breakdown': breakdown}


def project_reach_total(project):
    """Total reach for a single project, summed from its activities."""
    return reach_breakdown_for_activities(project.activities.all())


def aggregate_projects_reach(projects):
    """Reach breakdown summed across a list/queryset of projects."""
    all_activities = []
    for p in projects:
        all_activities.extend(p.activities.all())
    return reach_breakdown_for_activities(all_activities)


def aggregate_projects_status(projects):
    statuses = [p.status for p in projects]
    return status_breakdown(statuses, PROJECT_STATUS_LABELS)


def aggregate_activities_status(projects):
    statuses = []
    for p in projects:
        statuses.extend([a.status for a in p.activities.all()])
    return status_breakdown(statuses, ACTIVITY_STATUS_LABELS)


def reach_by_country(projects):
    """Each project's full reach breakdown counts toward EVERY country it's
    tagged with. Includes Male/Female/PWD per country (not just the total)
    so the frontend chart can show full detail on hover/click."""
    buckets = defaultdict(lambda: {'total': 0, 'male': 0, 'female': 0, 'pwd': 0})
    for p in projects:
        breakdown = project_reach_total(p)
        for country in p.countries.all():
            bucket = buckets[country.name]
            bucket['total'] += breakdown['total']
            bucket['male'] += breakdown['male']
            bucket['female'] += breakdown['female']
            bucket['pwd'] += breakdown['pwd']
    return [
        {'country': name, 'reach': b['total'], 'male': b['male'], 'female': b['female'], 'pwd': b['pwd']}
        for name, b in sorted(buckets.items(), key=lambda kv: -kv[1]['total'])
    ]


YEAR_RE = re.compile(r'(20\d{2})')


def reach_by_year(projects):
    """Sum activity reach by year, parsed from the activity's reporting_period
    string (e.g. 'Q2 2026'). Falls back to the project's start_date year if the
    period can't be parsed. Includes the Male/Female/PWD breakdown per year so
    the frontend chart can show full detail on hover/click, not just a total."""
    buckets = defaultdict(lambda: {'total': 0, 'male': 0, 'female': 0, 'pwd': 0})
    for p in projects:
        for a in p.activities.all():
            match = YEAR_RE.search(a.reporting_period or '')
            year = int(match.group(1)) if match else p.start_date.year
            bucket = buckets[year]
            bucket['total'] += a.reach
            bucket['male'] += a.reach_male
            bucket['female'] += a.reach_female
            bucket['pwd'] += a.reach_pwd
    return [
        {'year': year, 'reach': b['total'], 'male': b['male'], 'female': b['female'], 'pwd': b['pwd']}
        for year, b in sorted(buckets.items())
    ]


def project_overview(project):
    activities = list(project.activities.all())
    indicators = list(project.indicators.all())
    reach = reach_breakdown_for_activities(activities)
    activity_status = status_breakdown([a.status for a in activities], ACTIVITY_STATUS_LABELS)
    return {
        'total_people_reached': reach,
        'activity_status': activity_status,
        'indicators': [
            {
                'id': i.id, 'name': i.name, 'target': i.target, 'achievement': i.achievement,
                'unit': i.unit, 'reporting_period': i.reporting_period,
                'percentage_achievement': i.percentage_achievement,
            }
            for i in indicators
        ],
        'needs_attention': needs_attention(activities=activities, indicators=indicators),
    }


def portfolio_overview(projects):
    """Shared shape for Donor / Lead Partner overview dashboards. Returns the
    same counts Country's overview does, so either page can pick whichever
    counts are relevant to show (a Donor page shows lead_partner_count; a
    Lead Partner page shows donor_count; both show country/thematic counts).
    Also includes reach_by_year / reach_change_pct, the same as Country,
    so Donor/Lead Partner pages can show a genuine trend too."""
    projects = list(projects)
    by_year = reach_by_year(projects)
    all_activities = [a for p in projects for a in p.activities.all()]
    return {
        'total_people_reached': aggregate_projects_reach(projects),
        'project_status': aggregate_projects_status(projects),
        'reach_by_country': reach_by_country(projects),
        'reach_by_year': by_year,
        'reach_change_pct': year_over_year_change_pct(by_year),
        'project_count': len(projects),
        'country_count': len({c.id for p in projects for c in p.countries.all()}),
        'donor_count': len({d.id for p in projects for d in p.donors.all()}),
        'lead_partner_count': len({p.lead_partner_id for p in projects if p.lead_partner_id}),
        'thematic_area_count': len({t.id for p in projects for t in p.thematic_focus.all()}),
        'needs_attention': needs_attention(activities=all_activities),
    }


def year_over_year_change_pct(by_year):
    """A genuine year-over-year % change, computed from the same reach-by-year
    data a chart would show — not a fabricated "vs previous period" figure.
    Shared by every overview that has year-based reach data."""
    if len(by_year) < 2:
        return None
    sorted_years = sorted(by_year, key=lambda y: y['year'])
    prev, latest = sorted_years[-2], sorted_years[-1]
    if not prev['reach']:
        return None
    return round(((latest['reach'] - prev['reach']) / prev['reach']) * 100, 1)


def country_overview(country):
    projects = list(country.projects.all())
    by_year = reach_by_year(projects)
    latest_activity_year = max((y['year'] for y in by_year), default=None)
    reach_change_pct = year_over_year_change_pct(by_year)

    return {
        'total_people_reached': aggregate_projects_reach(projects),
        'reach_by_year': by_year,
        'latest_activity_year': latest_activity_year,
        'reach_change_pct': reach_change_pct,
        'project_count': len(projects),
        'donor_count': len({d.id for p in projects for d in p.donors.all()}),
        'lead_partner_count': len({p.lead_partner_id for p in projects if p.lead_partner_id}),
        'thematic_area_count': len({t.id for p in projects for t in p.thematic_focus.all()}),
        'main_thematic_areas': sorted(
            {t.id: {'id': t.id, 'name': t.name} for p in projects for t in p.thematic_focus.all()}.values(),
            key=lambda t: t['name'],
        ),
    }


def key_achievements(projects, limit=5):
    """Top project indicators (by % achievement) across the filtered projects,
    for the Dashboard's 'Key Achievements' cards."""
    indicators = []
    for p in projects:
        indicators.extend(p.indicators.all())
    scored = sorted(
        indicators,
        key=lambda i: (i.percentage_achievement if i.percentage_achievement is not None else -1),
        reverse=True,
    )
    return [
        {
            'name': i.name, 'achievement': i.achievement, 'target': i.target,
            'unit': i.unit, 'percentage_achievement': i.percentage_achievement,
        }
        for i in scored[:limit]
    ]


def needs_attention(activities=None, indicators=None, activity_threshold=0.5, indicator_threshold=50.0):
    """Flags activities and indicators that are meaningfully underperforming —
    not just "not yet started" (which is expected and not a concern), but
    actively behind where they should be. Shared across every module's
    overview so "needs attention" means the same thing everywhere.
    - Activities: only ONGOING or PARTIALLY_DONE activities are considered
      (NOT_STARTED activities with 0 reach aren't "behind", they just
      haven't begun; COMPLETED ones are done). Flagged if reach is below
      `activity_threshold` (default 50%) of target.
    - Indicators: flagged if percentage_achievement is below
      `indicator_threshold` (default 50%). Indicators with no target set
      have no percentage_achievement and are skipped — there's nothing to
      be "behind" on.
    """
    flagged = []
    for a in (activities or []):
        if a.status in ('ONGOING', 'PARTIALLY_DONE') and a.target > 0:
            ratio = a.reach / a.target
            if ratio < activity_threshold:
                flagged.append({
                    'kind': 'activity', 'id': a.id, 'name': a.name,
                    'target': a.target, 'value': a.reach,
                    'percentage': round(ratio * 100, 1),
                    'project_id': a.project_id,
                })
    for i in (indicators or []):
        pct = i.percentage_achievement
        if pct is not None and pct < indicator_threshold:
            flagged.append({
                'kind': 'indicator', 'id': i.id, 'name': i.name,
                'target': i.target, 'value': i.achievement,
                'percentage': pct,
            })
    # Worst-performing first — that's the point of the list.
    flagged.sort(key=lambda f: f['percentage'])
    return flagged


def dashboard_overview(projects):
    """The top-level MEAL Dashboard rollup, after any filters have been applied."""
    projects = list(projects)
    donors = {d.id for p in projects for d in p.donors.all()}
    countries = {c.id for p in projects for c in p.countries.all()}
    partners = {p.lead_partner_id for p in projects if p.lead_partner_id}
    thematic = {t.id for p in projects for t in p.thematic_focus.all()}
    all_activities = []
    for p in projects:
        all_activities.extend(p.activities.all())
    by_year = reach_by_year(projects)
    return {
        'total_people_reached': aggregate_projects_reach(projects),
        'active_projects': len([p for p in projects if p.status == 'ONGOING']),
        'donor_count': len(donors),
        'country_count': len(countries),
        'lead_partner_count': len(partners),
        'thematic_area_count': len(thematic),
        'project_status': aggregate_projects_status(projects),
        'activity_status': status_breakdown([a.status for a in all_activities], ACTIVITY_STATUS_LABELS),
        'key_achievements': key_achievements(projects),
        'reach_by_year': by_year,
        'reach_change_pct': year_over_year_change_pct(by_year),
        'reach_by_country': reach_by_country(projects),
        'needs_attention': needs_attention(
            activities=all_activities,
            indicators=[i for p in projects for i in p.indicators.all()],
        ),
    }