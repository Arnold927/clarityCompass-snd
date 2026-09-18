from django.views.decorators.csrf import csrf_exempt
import json
import traceback
import os
import base64
from docx import Document
from bs4 import BeautifulSoup
from django.http import JsonResponse
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from projects.models import Project, Donor, ProjectReportingSchedule
from tasks.models import Task, TaskUpdate, KeyActivity
from django.db.models import Count

from google import genai

import time
import random
from functools import wraps

def retry_with_backoff(max_retries=5, initial_delay=2.0, max_delay=60.0):
    """
    Decorator to retry a function with exponential backoff.
    Specifically handles Gemini API 503 (overload) and 429 (rate limit) errors.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            delay = initial_delay
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    error_msg = str(e)
                    
                    is_rate_limit = "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg or "quota" in error_msg.lower()
                    is_service_unavailable = "503" in error_msg or "overloaded" in error_msg.lower() or "UNAVAILABLE" in error_msg
                    
                    if not (is_rate_limit or is_service_unavailable) or attempt == max_retries - 1:
                        raise e
                    
                    jitter = random.uniform(0.5, 1.5)
                    wait_time = min(delay * (2 ** attempt) * jitter, max_delay)
                    
                    if "retry in" in error_msg.lower():
                        import re
                        match = re.search(r'retry in (\d+\.?\d*)s', error_msg.lower())
                        if match:
                            wait_time = float(match.group(1)) + 2.0
                    
                    error_type = "rate limit" if is_rate_limit else "service overload"
                    
                    time.sleep(wait_time)
            
            return func(*args, **kwargs)
        return wrapper
    return decorator

@csrf_exempt
def generate_report(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed."}, status=405)

    try:
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError as e:
            return JsonResponse({"error": f"Invalid JSON: {str(e)}"}, status=400)
        
        
        project_data = body.get("projectData")
        target_audience = body.get("targetAudience")
        report_context = body.get("reportContext")
        
        if not project_data:
            return JsonResponse({"error": "Missing projectData field."}, status=400)
        if not target_audience:
            return JsonResponse({"error": "Missing targetAudience field."}, status=400)
        if not report_context:
            return JsonResponse({"error": "Missing reportContext field."}, status=400)

        if isinstance(project_data, str):
            try:
                project_data = json.loads(project_data)
            except Exception as e:
                return JsonResponse({"error": f"Invalid projectData JSON string: {str(e)}"}, status=400)

        schedule_context = ""
        submission_analysis = ""
        schedule_id = body.get("scheduleId")
        reporting_period = body.get("reportingPeriod")
        
        if schedule_id and schedule_id != "none":
            try:
                schedule = ProjectReportingSchedule.objects.get(id=schedule_id)
                submissions = schedule.submissions.all().order_by('-submitted_at')
                
                schedule_context = f"""
                REPORTING SCHEDULE DETAILS:
                - Schedule Name: {schedule.name}
                - Frequency: {schedule.get_frequency_display()}
                - Recipient: {schedule.recipient}
                - Total Submissions: {submissions.count()}
                """
                
                if reporting_period:
                    schedule_context += f"- Reporting Period: {reporting_period}\n"
                
                if submissions.exists():
                    submission_analysis = "PREVIOUS SUBMISSIONS ANALYSIS:\n"
                    status_counts = submissions.values('status').annotate(count=Count('id'))
                    for status_group in status_counts:
                        submission_analysis += f"- {status_group['status']}: {status_group['count']} submissions\n"
                    
                    latest = submissions.first()
                    submission_analysis += f"""
                    MOST RECENT SUBMISSION:
                    - Title: {latest.title}
                    - Date: {latest.submitted_at.strftime('%Y-%m-%d')}
                    - Status: {latest.status}
                    - Notes: {latest.notes or 'No notes provided'}
                    """
                else:
                    submission_analysis = "PREVIOUS SUBMISSIONS:\n- No previous submissions found for this schedule."
                    
                    
            except ProjectReportingSchedule.DoesNotExist:
                print(f"DEBUG: Schedule {schedule_id} not found")

        project_data_text = json.dumps(project_data, indent=2)

        try:
            api_key = os.environ.get("GEMINI_API_KEY")
            
            if not api_key:
                try:
                    from dotenv import load_dotenv
                    load_dotenv()
                    api_key = os.environ.get("GEMINI_API_KEY")
                except ImportError:
                    pass
            
            if not api_key or api_key == "your-actual-gemini-api-key-here":
                return JsonResponse({
                    "error": "Gemini API key not configured. Please set GEMINI_API_KEY environment variable."
                }, status=500)
            
            
            client = genai.Client(api_key=api_key)
            
        except Exception as e:
            return JsonResponse({
                "error": f"Failed to initialize Gemini client: {str(e)}"
            }, status=500)

        prompt_text = f"""
        Generate a professional, detailed project report.

        {schedule_context}
        
        {submission_analysis}

        PROJECT DATA:
        {project_data_text}

        TARGET AUDIENCE: {target_audience}
        REPORT CONTEXT: {report_context}
        
        IMPORTANT INSTRUCTIONS:
        1. If this is a scheduled report, structure it appropriately for the frequency.
        2. Reference previous submissions if available.
        3. For donor reports, include detailed financial analysis.
        4. Highlight key achievements during the reporting period.
        5. Mention any delays or challenges and proposed solutions.
        6. Link activities to project indicators.
        7. Use a professional tone appropriate for {target_audience}.
        
        REPORT STRUCTURE:
        1. Executive Summary
        2. Project Overview
        3. Progress Against Objectives
        4. Financial Summary
        5. Key Achievements
        6. Challenges and Mitigation
        7. Next Steps/Recommendations
        """

        
        try:            
            @retry_with_backoff(max_retries=3, initial_delay=5.0, max_delay=120.0)
            def call_gemini_api():
                return client.models.generate_content(
                    model="gemini-2.0-flash",
                    contents=prompt_text
                )
            
            response = call_gemini_api()
            
            if not response.text:
                return JsonResponse({"error": "Empty response from Gemini API"}, status=500)
            
            report_text = response.text
            
        except Exception as e:
            
            error_msg = str(e)
            if "503" in error_msg or "overloaded" in error_msg or "UNAVAILABLE" in error_msg:
                return JsonResponse({
                    "error": "Gemini API is currently overloaded. Please try again in a few minutes."
                }, status=503)
            elif "429" in error_msg or "quota" in error_msg.lower() or "RESOURCE_EXHAUSTED" in error_msg:
                return JsonResponse({
                    "error": "API quota exceeded. Please check your Google AI Studio billing and quotas."
                }, status=429)
            else:
                return JsonResponse({
                    "error": f"Failed to generate content: {str(e)}"
                }, status=500)

        return JsonResponse({"report": report_text.strip()})

    except Exception as e:
        error_trace = traceback.format_exc()
        return JsonResponse({
            "error": f"Internal server error: {str(e)}"
        }, status=500)

@api_view(['POST', 'GET'])

@permission_classes([IsAuthenticated])
def generate_scheduled_report(request, schedule_id):
    """Generate a report for a specific reporting schedule"""
    try:
        schedule = ProjectReportingSchedule.objects.get(id=schedule_id)
        project = schedule.project
        
        from datetime import datetime, timedelta
        end_date = timezone.now().date()
        
        if schedule.frequency == 'WEEKLY':
            start_date = end_date - timedelta(days=7)
            period_label = f"Week ending {end_date.strftime('%Y-%m-%d')}"
        elif schedule.frequency == 'MONTHLY':
            start_date = end_date.replace(day=1)
            period_label = f"Month of {end_date.strftime('%B %Y')}"
        elif schedule.frequency == 'QUARTERLY':
            month = end_date.month
            quarter = (month - 1) // 3 + 1
            start_date = datetime(end_date.year, 3 * (quarter - 1) + 1, 1).date()
            period_label = f"Q{quarter} {end_date.year}"
        else:
            start_date = project.start_date
            period_label = f"Up to {end_date.strftime('%Y-%m-%d')}"
        
        return Response({
            "success": True,
            "schedule": schedule.name,
            "period": period_label,
            "report_context": f"{schedule.get_frequency_display()} report for {period_label}",
            "target_audience": schedule.recipient,
            "project_id": project.id,
            "period_start": start_date.isoformat(),
            "period_end": end_date.isoformat()
        })
        
    except ProjectReportingSchedule.DoesNotExist:
        return Response({"error": "Schedule not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@csrf_exempt
def evaluate_project(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed."}, status=405)

    try:
        body = json.loads(request.body)
        project_data = body.get("projectData")
        evaluation_type = body.get("evaluationType", "general")

        if not project_data:
            return JsonResponse({"error": "Missing projectData"}, status=400)

        if isinstance(project_data, str):
            try:
                project_data = json.loads(project_data)
            except:
                return JsonResponse({"error": "Invalid projectData JSON."}, status=400)

        project_text = json.dumps(project_data, indent=2)

        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            return JsonResponse({"error": "Gemini API key not configured"}, status=500)
        
        client = genai.Client(api_key=api_key)

        prompt_text = f"""
You are a project evaluation expert. Analyze this project data and return a JSON object with this exact structure:

{{
  "overallSummary": "Brief summary here",
  "strengths": ["strength 1", "strength 2", ...],
  "weaknesses": ["weakness 1", "weakness 2", ...],
  "recommendations": ["recommendation 1", "recommendation 2", ...]
}}

Project Data:
{project_text}

Evaluation Type: {evaluation_type}

Return ONLY the JSON object, no other text.
"""

        @retry_with_backoff(max_retries=3, initial_delay=5.0, max_delay=120.0)
        def call_gemini_api():
            return client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt_text,
                config={
                    "temperature": 0.1,
                    "max_output_tokens": 8192,
                }
            )

        response = call_gemini_api()

        evaluation_text = response.text if response.text else ""

        try:
            clean_text = evaluation_text.strip()
            if clean_text.startswith("```json"):
                clean_text = clean_text[7:]
            if clean_text.endswith("```"):
                clean_text = clean_text[:-3]
            if clean_text.startswith("```"):
                clean_text = clean_text[3:]
            
            evaluation_data = json.loads(clean_text.strip())
            
        except json.JSONDecodeError:
            evaluation_data = {
                "overallSummary": evaluation_text.strip(),
                "strengths": [],
                "weaknesses": [],
                "recommendations": []
            }

        if 'strengths' not in evaluation_data or not isinstance(evaluation_data['strengths'], list):
            evaluation_data['strengths'] = []
        if 'weaknesses' not in evaluation_data or not isinstance(evaluation_data['weaknesses'], list):
            evaluation_data['weaknesses'] = []
        if 'recommendations' not in evaluation_data or not isinstance(evaluation_data['recommendations'], list):
            evaluation_data['recommendations'] = []
        if 'overallSummary' not in evaluation_data:
            evaluation_data['overallSummary'] = ''

        return JsonResponse({
            "evaluation": evaluation_data,
            "error": None
        })

    except Exception as e:
        traceback.print_exc()
        return JsonResponse({"error": str(e), "evaluation": None}, status=500)

@csrf_exempt
def generate_docx(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed."}, status=405)

    try:
        body = json.loads(request.body)
        html = body.get("htmlContent")

        if not html:
            return JsonResponse({"error": "Missing htmlContent"}, status=400)

        soup = BeautifulSoup(html, "html.parser")

        doc = Document()

        for elem in soup.find_all(["h1","h2","h3","p","li","strong","em","br"]):
            text = elem.get_text().strip()

            if elem.name == "h1":
                doc.add_heading(text, level=1)
            elif elem.name == "h2":
                doc.add_heading(text, level=2)
            elif elem.name == "h3":
                doc.add_heading(text, level=3)
            else:
                doc.add_paragraph(text)

        from io import BytesIO
        buffer = BytesIO()
        doc.save(buffer)
        buffer.seek(0)

        docx_base64 = base64.b64encode(buffer.read()).decode()

        return JsonResponse({"docx": docx_base64, "error": None})

    except Exception as e:
        traceback.print_exc()
        return JsonResponse({"error": str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """Get dashboard statistics for overview cards"""
    
    active_projects_count = Project.objects.filter(
        is_active=True
    ).count()
    
    active_donor_ids = Project.objects.filter(
        is_active=True
    ).values_list('donors', flat=True).distinct()
    
    active_donors_count = Donor.objects.filter(
        id__in=active_donor_ids,
        is_active=True
    ).count()
    
    completed_activities_count = KeyActivity.objects.filter(
        project__is_active=True,
        is_completed=True
    ).distinct().count()

    pending_activities_count = KeyActivity.objects.filter(
        project__is_active=True,
        is_completed=False
    ).distinct().count()
    
    active_projects = Project.objects.filter(
        is_active=True
    ).prefetch_related('activities').order_by('-created_at')[:5]
    
    projects_data = []
    for project in active_projects:
        project_data = {
            'id': project.id,
            'title': project.name if hasattr(project, 'name') else project.title,
            'code': project.code if hasattr(project, 'code') else project.id,
            'description': project.description,
            'key_activities': []
        }
        
        key_activities = project.activities.all().order_by('end_date')[:5]
        for activity in key_activities:
            project_data['key_activities'].append({
                'id': activity.id,
                'title': activity.name,
                'description': activity.description,
                'is_completed': activity.is_completed,
                'start_date': activity.start_date,
                'end_date': activity.end_date,
                'created_at': activity.created_at if hasattr(activity, 'created_at') else None
            })
        
        projects_data.append(project_data)
    
    return Response({
        'active_projects_count': active_projects_count,
        'active_donors_count': active_donors_count,
        'completed_activities_count': completed_activities_count,
        'pending_activities_count': pending_activities_count,
        'active_projects': projects_data,
    })

# ═══════════════════════════════════════════════════════════════
# M&E DASHBOARD ANALYTICS ENDPOINTS
# ═══════════════════════════════════════════════════════════════

from django.db.models import Avg, Sum, F, ExpressionWrapper, FloatField
from django.db.models.functions import TruncMonth
from datetime import date, timedelta
from decimal import Decimal


# ─────────────────────────────────────────────────────────────
# 1. /api/dashboard/me-stats/
#    Full M&E headline metrics in a single call.
# ─────────────────────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_dashboard_stats(request):
    """
    Aggregated M&E metrics for the hero cards section.
    Extends the existing dashboard_stats endpoint with
    strategic, FCRM, task, and reporting metrics.
    """
    from strategic.models import StrategicPlan, CorporateIndicatorPerformance
    from tasks.models import Task, TaskIndicatorProgress
    from projects.models import Project, Donor, ProjectReportingSchedule, ProjectReportSubmission
    from complaints.models import Complaint

    today = date.today()

    # ── Strategic plan
    active_plan = StrategicPlan.objects.filter(is_active=True).first()
    active_plan_count = StrategicPlan.objects.filter(is_active=True).count()

    # ── Corporate indicators on active plan
    corporate_indicators_count = 0
    overall_achievement_rate = None

    if active_plan:
        from strategic.models import CorporateIndicator
        # Indicators linked via statements → objectives → plan
        corp_ids = CorporateIndicatorPerformance.objects.filter(
            year__plan=active_plan
        ).values_list('indicator_id', flat=True).distinct()
        corporate_indicators_count = len(set(corp_ids))

        # Average achievement across all performances for this plan
        perfs = CorporateIndicatorPerformance.objects.filter(
            year__plan=active_plan,
            target__gt=0,
        )
        if perfs.exists():
            rates = []
            for p in perfs:
                rates.append(float(p.actual) / float(p.target) * 100)
            overall_achievement_rate = round(sum(rates) / len(rates), 1) if rates else None

    # ── Projects
    active_projects = Project.objects.filter(is_active=True)
    active_projects_count = active_projects.count()

    active_donor_ids = active_projects.values_list('donors', flat=True).distinct()
    active_donors_count = Donor.objects.filter(id__in=active_donor_ids, is_active=True).count()

    # ── Key activities
    from tasks.models import KeyActivity
    completed_activities = KeyActivity.objects.filter(
        project__is_active=True, is_completed=True
    ).count()
    pending_activities = KeyActivity.objects.filter(
        project__is_active=True, is_completed=False
    ).count()

    # ── Tasks
    all_tasks = Task.objects.filter(project__is_active=True)
    overdue_tasks = all_tasks.filter(
        end_date__lt=today,
        status__in=['PLANNED', 'ONGOING'],
    ).count()

    # ── Total beneficiaries YTD (sum of all task indicator progress actuals)
    ytd_start = today.replace(month=1, day=1)
    total_beneficiaries_ytd = TaskIndicatorProgress.objects.filter(
        task__project__is_active=True,
        task__end_date__gte=ytd_start,
    ).aggregate(total=Sum('actual_contribution'))['total'] or 0

    # ── Budget utilisation
    budget_total = active_projects.aggregate(t=Sum('budget'))['t'] or 0
    spent_total = Task.objects.filter(
        project__is_active=True
    ).aggregate(t=Sum('cumulative_spent'))['t'] or 0
    budget_utilisation_rate = (
        round(float(spent_total) / float(budget_total) * 100, 1)
        if budget_total else None
    )

    # ── Complaints
    all_complaints = Complaint.objects.all()
    total_complaints = all_complaints.count()
    open_complaints = all_complaints.filter(
        status__in=['pending', 'in_progress']
    ).count()
    closed_complaints = all_complaints.filter(
        date_case_closed__isnull=False
    ).count()
    complaint_resolution_rate = (
        round(closed_complaints / total_complaints * 100, 1)
        if total_complaints else None
    )
    overdue_complaints = all_complaints.filter(
        deadline__lt=today,
        status__in=['pending', 'in_progress'],
    ).count()

    # ── Report compliance
    schedules = ProjectReportingSchedule.objects.filter(project__is_active=True)
    total_schedules = schedules.count()
    submitted_reports = ProjectReportSubmission.objects.filter(
        schedule__project__is_active=True
    ).count()
    report_compliance_rate = (
        round(submitted_reports / total_schedules * 100, 1)
        if total_schedules else None
    )
    pending_review = ProjectReportSubmission.objects.filter(
        schedule__project__is_active=True,
        status='Pending Review',
    ).count()

    return Response({
        'active_strategic_plans': active_plan_count,
        'active_plan_title': active_plan.title if active_plan else None,
        'corporate_indicators_count': corporate_indicators_count,
        'overall_achievement_rate': overall_achievement_rate,
        'active_projects_count': active_projects_count,
        'active_donors_count': active_donors_count,
        'completed_activities_count': completed_activities,
        'pending_activities_count': pending_activities,
        'overdue_tasks_count': overdue_tasks,
        'total_beneficiaries_ytd': float(total_beneficiaries_ytd),
        'budget_total': float(budget_total),
        'budget_spent': float(spent_total),
        'budget_utilisation_rate': budget_utilisation_rate,
        'total_complaints': total_complaints,
        'open_complaints': open_complaints,
        'closed_complaints': closed_complaints,
        'overdue_complaints': overdue_complaints,
        'complaint_resolution_rate': complaint_resolution_rate,
        'total_report_schedules': total_schedules,
        'submitted_reports': submitted_reports,
        'pending_review_reports': pending_review,
        'report_compliance_rate': report_compliance_rate,
    })


# ─────────────────────────────────────────────────────────────
# 2. /api/strategic/performance/?plan_id=&year_id=
#    All corporate indicators with target/actual for a plan year.
# ─────────────────────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def strategic_performance(request):
    """
    Returns all corporate indicators with their performance data.
    Optional query params: plan_id, year_id
    Falls back to the active plan and all its years if not specified.
    """
    from strategic.models import (
        StrategicPlan, StrategicPlanYear,
        CorporateIndicator, CorporateIndicatorPerformance,
    )

    plan_id = request.query_params.get('plan_id')
    year_id = request.query_params.get('year_id')

    # Resolve plan
    if plan_id:
        plan = StrategicPlan.objects.filter(id=plan_id).first()
    else:
        plan = StrategicPlan.objects.filter(is_active=True).first()

    if not plan:
        return Response({'error': 'No active strategic plan found.'}, status=404)

    # Resolve years
    if year_id:
        years = StrategicPlanYear.objects.filter(id=year_id, plan=plan)
    else:
        years = StrategicPlanYear.objects.filter(plan=plan).order_by('year')

    results = []
    for year_obj in years:
        perfs = CorporateIndicatorPerformance.objects.filter(
            year=year_obj
        ).select_related('indicator')

        for perf in perfs:
            ind = perf.indicator
            target = float(perf.target) if perf.target else 0
            actual = float(perf.actual) if perf.actual else 0
            achievement_pct = round(actual / target * 100, 1) if target > 0 else 0

            # Resolve objective via statements
            first_stmt = ind.statements.select_related('objective').first()
            objective_name = None
            objective_number = None
            if first_stmt and first_stmt.objective:
                objective_name = first_stmt.objective.name
                objective_number = first_stmt.objective.number

            results.append({
                'indicator_id': ind.id,
                'indicator_name': ind.name,
                'objective_name': objective_name,
                'objective_number': objective_number,
                'year': year_obj.year,
                'year_id': year_obj.id,
                'target': target,
                'actual': actual,
                'achievement_pct': achievement_pct,
                'comments': perf.comments or '',
            })

    # Also include the list of available plan years for the frontend filter
    all_years = [
        {'id': y.id, 'year': y.year}
        for y in StrategicPlanYear.objects.filter(plan=plan).order_by('year')
    ]

    return Response({
        'plan_id': plan.id,
        'plan_title': plan.title,
        'plan_years': all_years,
        'results': results,
    })


# ─────────────────────────────────────────────────────────────
# 3. /api/programs/<id>/quarterly-performance/?year=
#    Program outcomes with quarterly target vs. actual breakdown.
# ─────────────────────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def program_quarterly_performance(request, program_id):
    """
    Returns quarterly indicator performance for a specific program.
    Optional query param: year (integer)
    """
    from programs.models import (
        Program, ProgramOutcome, ProgramOutcomeIndicator,
        ProgramOutcomeIndicatorPerformance, ReportingQuarter,
    )

    try:
        program = Program.objects.get(id=program_id)
    except Program.DoesNotExist:
        return Response({'error': 'Program not found.'}, status=404)

    year_filter = request.query_params.get('year')

    # Available quarters — optionally filter by year
    quarters_qs = ReportingQuarter.objects.all().order_by('year', 'quarter')
    if year_filter:
        quarters_qs = quarters_qs.filter(year=int(year_filter))

    # Build available years list for the frontend filter
    available_years = list(
        ReportingQuarter.objects.values_list('year', flat=True).distinct().order_by('year')
    )

    outcomes_data = []
    for outcome in program.outcomes.all().order_by('id'):
        indicators_data = []
        for indicator in outcome.indicators.all().order_by('id'):
            ind_name = indicator.name_override or (
                indicator.corporate_indicator.name if indicator.corporate_indicator else f'Indicator {indicator.id}'
            )

            quarters_data = []
            for q in quarters_qs:
                perf = ProgramOutcomeIndicatorPerformance.objects.filter(
                    indicator=indicator,
                    quarter=q,
                ).first()
                quarters_data.append({
                    'quarter_id': q.id,
                    'year': q.year,
                    'quarter': q.quarter,
                    'label': f'Q{q.quarter} {q.year}',
                    'target': float(perf.target) if perf else 0,
                    'actual': float(perf.actual) if perf else 0,
                    'achievement_pct': (
                        round(float(perf.actual) / float(perf.target) * 100, 1)
                        if perf and perf.target > 0 else 0
                    ),
                    'comments': perf.comments if perf else '',
                })

            indicators_data.append({
                'indicator_id': indicator.id,
                'indicator_name': ind_name,
                'quarters': quarters_data,
            })

        outcomes_data.append({
            'outcome_id': outcome.id,
            'outcome_name': outcome.name,
            'indicators': indicators_data,
        })

    return Response({
        'program_id': program.id,
        'program_name': program.name,
        'available_years': available_years,
        'outcomes': outcomes_data,
    })


# ─────────────────────────────────────────────────────────────
# 4. /api/indicators/<id>/disaggregation-summary/?project_id=
#    Target and actual by disaggregator for a corporate indicator.
# ─────────────────────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def indicator_disaggregation_summary(request, indicator_id):
    """
    Returns disaggregated breakdown for a corporate indicator.
    Pulls from:
      - IndicatorDisaggregation (baseline / target / reported at project-indicator level)
      - IndicatorDisaggregatedValue (outcome/output level actuals)
      - TaskIndicatorDisaggregatedValue (task-level reported values)
    Optional query param: project_id
    """
    from strategic.models import CorporateIndicator, IndicatorDisaggregation, Disaggregator
    from projects.models import ProjectIndicator, IndicatorDisaggregatedValue

    try:
        indicator = CorporateIndicator.objects.get(id=indicator_id)
    except CorporateIndicator.DoesNotExist:
        return Response({'error': 'Indicator not found.'}, status=404)

    project_id = request.query_params.get('project_id')

    # Get all project indicators linked to this corporate indicator
    project_indicators_qs = ProjectIndicator.objects.filter(corporate_indicator=indicator)
    if project_id:
        project_indicators_qs = project_indicators_qs.filter(project_id=project_id)

    # Build a per-disaggregator summary
    disaggregators = indicator.disaggregators.all()
    results = []

    for disagg in disaggregators:
        # Baseline and target from IndicatorDisaggregation
        ind_disaggs = IndicatorDisaggregation.objects.filter(
            project_indicator__in=project_indicators_qs,
            disaggregator=disagg,
        )
        baseline = ind_disaggs.aggregate(b=Sum('baseline_value'))['b'] or 0
        target   = ind_disaggs.aggregate(t=Sum('target_value'))['t'] or 0
        reported = ind_disaggs.aggregate(r=Sum('reported_value'))['r'] or 0

        # Actuals from IndicatorDisaggregatedValue (outcome/output level)
        outcome_actuals = IndicatorDisaggregatedValue.objects.filter(
            outcome_indicator__project_indicator__in=project_indicators_qs,
            disaggregator=disagg,
        ).aggregate(a=Sum('actual'))['a'] or 0

        output_actuals = IndicatorDisaggregatedValue.objects.filter(
            output_indicator__project_indicator__in=project_indicators_qs,
            disaggregator=disagg,
        ).aggregate(a=Sum('actual'))['a'] or 0

        # Actuals from task-level disaggregated values
        from tasks.models import TaskIndicatorDisaggregatedValue, TaskIndicatorProgress
        task_actuals = TaskIndicatorDisaggregatedValue.objects.filter(
            disaggregator=disagg,
            task_indicator_progress__output_indicator__project_indicator__in=project_indicators_qs,
        ).aggregate(a=Sum('actual'))['a'] or 0

        # Best available actual — prefer task-level if present, else outcome/output
        best_actual = float(task_actuals or outcome_actuals or output_actuals or reported)
        best_target = float(target)

        achievement_pct = (
            round(best_actual / best_target * 100, 1) if best_target > 0 else 0
        )

        results.append({
            'disaggregator_id': disagg.id,
            'disaggregator_name': disagg.name,
            'baseline': float(baseline),
            'target': best_target,
            'actual': best_actual,
            'achievement_pct': achievement_pct,
        })

    return Response({
        'indicator_id': indicator.id,
        'indicator_name': indicator.name,
        'project_id': project_id,
        'disaggregations': results,
    })


# ─────────────────────────────────────────────────────────────
# 5. /api/complaints/analytics/?date_from=&date_to=
#    Aggregated FCRM metrics for the complaints dashboard.
# ─────────────────────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def complaints_analytics(request):
    """
    Returns aggregated complaint statistics for the FCRM dashboard.
    Optional query params: date_from (YYYY-MM-DD), date_to (YYYY-MM-DD)
    """
    from complaints.models import Complaint
    from django.db.models import Avg, DurationField, ExpressionWrapper
    from django.db.models.functions import TruncMonth
    from django.utils.timezone import make_aware
    from datetime import datetime

    qs = Complaint.objects.all()

    # Date range filtering
    date_from = request.query_params.get('date_from')
    date_to   = request.query_params.get('date_to')
    if date_from:
        qs = qs.filter(date_feedback_received__date__gte=date_from)
    if date_to:
        qs = qs.filter(date_feedback_received__date__lte=date_to)

    today = date.today()
    total = qs.count()

    # ── By status
    by_status_raw = qs.values('status').annotate(count=Count('id'))
    by_status = {row['status']: row['count'] for row in by_status_raw}

    # ── By category
    by_category_raw = qs.values('category').annotate(count=Count('id'))
    by_category = {(row['category'] or 'unknown'): row['count'] for row in by_category_raw}

    # ── By channel
    by_channel_raw = qs.values('feedback_channel').annotate(count=Count('id'))
    by_channel = {row['feedback_channel']: row['count'] for row in by_channel_raw}

    # ── By gender
    by_gender_raw = qs.values('gender').annotate(count=Count('id'))
    by_gender = {row['gender']: row['count'] for row in by_gender_raw}

    # ── By sensitivity level
    by_sensitivity_raw = qs.values('sensitivity_level').annotate(count=Count('id'))
    by_sensitivity = {str(row['sensitivity_level']): row['count'] for row in by_sensitivity_raw}

    # ── By priority
    by_priority_raw = qs.values('priority').annotate(count=Count('id'))
    by_priority = {row['priority']: row['count'] for row in by_priority_raw}

    # ── Resolution metrics
    closed_qs = qs.filter(date_case_closed__isnull=False)
    closed_count = closed_qs.count()
    resolution_rate = round(closed_count / total * 100, 1) if total else 0

    # Average days to close
    avg_days_to_close = None
    closed_with_dates = closed_qs.exclude(date_feedback_received=None)
    if closed_with_dates.exists():
        days_list = []
        for c in closed_with_dates:
            if c.date_case_closed and c.date_feedback_received:
                received = c.date_feedback_received.date() if hasattr(c.date_feedback_received, 'date') else c.date_feedback_received
                delta = (c.date_case_closed - received).days
                if delta >= 0:
                    days_list.append(delta)
        if days_list:
            avg_days_to_close = round(sum(days_list) / len(days_list), 1)

    # ── Overdue
    overdue_count = qs.filter(
        deadline__lt=today,
        status__in=['pending', 'in_progress'],
    ).count()

    # ── Monthly trend (last 12 months)
    twelve_months_ago = today - timedelta(days=365)
    monthly_qs = qs.filter(
        date_feedback_received__date__gte=twelve_months_ago
    ).annotate(
        month=TruncMonth('date_feedback_received')
    ).values('month').annotate(count=Count('id')).order_by('month')

    monthly_trend = [
        {
            'month': row['month'].strftime('%b %Y'),
            'month_iso': row['month'].strftime('%Y-%m'),
            'count': row['count'],
        }
        for row in monthly_qs
    ]

    return Response({
        'total': total,
        'closed': closed_count,
        'open': by_status.get('pending', 0) + by_status.get('in_progress', 0),
        'overdue': overdue_count,
        'resolution_rate': resolution_rate,
        'avg_days_to_close': avg_days_to_close,
        'by_status': by_status,
        'by_category': by_category,
        'by_channel': by_channel,
        'by_gender': by_gender,
        'by_sensitivity': by_sensitivity,
        'by_priority': by_priority,
        'monthly_trend': monthly_trend,
    })


# ─────────────────────────────────────────────────────────────
# 6. /api/tasks/me-summary/
#    Task-level metrics for the Tasks dashboard section.
# ─────────────────────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tasks_me_summary(request):
    """
    Returns task status breakdown, budget utilisation,
    and indicator contribution data for the M&E Tasks tab.
    Optional query param: project_id
    """
    from tasks.models import Task, TaskIndicatorProgress, TaskIndicatorDisaggregatedValue
    from projects.models import Project

    project_id = request.query_params.get('project_id')
    today = date.today()

    tasks_qs = Task.objects.select_related('project', 'output').filter(
        project__is_active=True
    )
    if project_id:
        tasks_qs = tasks_qs.filter(project_id=project_id)

    # ── Status breakdown
    status_counts = {}
    for row in tasks_qs.values('status').annotate(count=Count('id')):
        status_counts[row['status'] or 'UNKNOWN'] = row['count']

    total_tasks = tasks_qs.count()
    overdue_tasks = tasks_qs.filter(
        end_date__lt=today,
        status__in=['PLANNED', 'ONGOING'],
    ).count()

    # ── Budget
    budget_agg = tasks_qs.aggregate(
        total_budget=Sum('budget'),
        total_spent=Sum('cumulative_spent'),
    )
    total_budget = float(budget_agg['total_budget'] or 0)
    total_spent  = float(budget_agg['total_spent'] or 0)
    budget_utilisation = round(total_spent / total_budget * 100, 1) if total_budget else 0

    # ── Per-project budget breakdown
    project_budget = []
    for proj in Project.objects.filter(is_active=True).order_by('code'):
        proj_tasks = tasks_qs.filter(project=proj)
        pb = proj_tasks.aggregate(b=Sum('budget'), s=Sum('cumulative_spent'))
        budget_val = float(pb['b'] or 0)
        spent_val  = float(pb['s'] or 0)
        project_budget.append({
            'project_id': proj.id,
            'project_code': proj.code,
            'project_title': proj.title,
            'currency': proj.currency or 'KES',
            'budget': budget_val,
            'spent': spent_val,
            'utilisation_pct': round(spent_val / budget_val * 100, 1) if budget_val else 0,
        })

    # ── Indicator contributions
    indicator_contributions = []
    for prog in TaskIndicatorProgress.objects.filter(
        task__in=tasks_qs
    ).select_related('output_indicator').values(
        'output_indicator__id',
        'output_indicator__name',
    ).annotate(
        total_target=Sum('target_contribution'),
        total_actual=Sum('actual_contribution'),
    ):
        t = float(prog['total_target'] or 0)
        a = float(prog['total_actual'] or 0)
        indicator_contributions.append({
            'indicator_id': prog['output_indicator__id'],
            'indicator_name': prog['output_indicator__name'],
            'target_contribution': t,
            'actual_contribution': a,
            'achievement_pct': round(a / t * 100, 1) if t > 0 else 0,
        })

    # ── Timeline (tasks with dates)
    timeline = []
    for t in tasks_qs.filter(start_date__isnull=False, end_date__isnull=False).order_by('start_date')[:20]:
        timeline.append({
            'task_id': t.id,
            'task_title': t.title,
            'project_code': t.project.code if t.project else None,
            'output_name': t.output.name if t.output else None,
            'start_date': t.start_date.isoformat() if t.start_date else None,
            'end_date': t.end_date.isoformat() if t.end_date else None,
            'status': t.status,
            'budget': float(t.budget or 0),
            'cumulative_spent': float(t.cumulative_spent or 0),
        })

    return Response({
        'total_tasks': total_tasks,
        'overdue_tasks': overdue_tasks,
        'status_breakdown': status_counts,
        'total_budget': total_budget,
        'total_spent': total_spent,
        'budget_utilisation_rate': budget_utilisation,
        'project_budget': project_budget,
        'indicator_contributions': indicator_contributions,
        'task_timeline': timeline,
    })


# ─────────────────────────────────────────────────────────────
# 7. /api/reporting/compliance/
#    Report schedule vs. submission compliance per project.
# ─────────────────────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reporting_compliance(request):
    """
    Returns reporting schedule compliance data.
    Compares ProjectReportingSchedule records against
    actual ProjectReportSubmission records per project.
    """
    from projects.models import Project, ProjectReportingSchedule, ProjectReportSubmission

    projects_qs = Project.objects.filter(is_active=True).prefetch_related(
        'reporting_schedules__submissions'
    ).order_by('code')

    projects_data = []
    total_schedules = 0
    total_submitted = 0
    total_pending_review = 0

    for project in projects_qs:
        schedules = project.reporting_schedules.all()
        schedule_count = schedules.count()
        submitted_count = 0
        pending_review_count = 0
        schedule_details = []

        for schedule in schedules:
            submissions = schedule.submissions.all().order_by('-submitted_at')
            has_submission = submissions.exists()
            latest = submissions.first()

            if has_submission:
                submitted_count += 1

            if latest and latest.status == 'Pending Review':
                pending_review_count += 1

            schedule_details.append({
                'schedule_id': schedule.id,
                'schedule_name': schedule.name,
                'frequency': schedule.frequency,
                'recipient': schedule.recipient,
                'submissions_count': submissions.count(),
                'latest_submission_status': latest.status if latest else None,
                'latest_submission_date': latest.submitted_at.isoformat() if latest else None,
                'has_submission': has_submission,
            })

        compliance_rate = (
            round(submitted_count / schedule_count * 100, 1)
            if schedule_count else None
        )

        projects_data.append({
            'project_id': project.id,
            'project_code': project.code,
            'project_title': project.title,
            'total_schedules': schedule_count,
            'submitted': submitted_count,
            'pending_review': pending_review_count,
            'compliance_rate': compliance_rate,
            'schedules': schedule_details,
        })

        total_schedules    += schedule_count
        total_submitted    += submitted_count
        total_pending_review += pending_review_count

    overall_compliance = (
        round(total_submitted / total_schedules * 100, 1)
        if total_schedules else None
    )

    return Response({
        'total_schedules': total_schedules,
        'total_submitted': total_submitted,
        'total_pending_review': total_pending_review,
        'overall_compliance_rate': overall_compliance,
        'projects': projects_data,
    })