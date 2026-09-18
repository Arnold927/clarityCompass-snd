from rest_framework import serializers
from strategic.models import CorporateIndicator, Disaggregator
from organizations.serializers import User, UserSerializer
from programs.serializers import ProgramIndicatorSerializer
from .models import (
    IndicatorDisaggregatedValue, Project, ProjectIndicator, ProjectIndicatorTarget, Donor, Location, ProjectTeamMember, 
    ProjectObjective, ProjectOutcome, ProjectOutput, ProjectOutputIndicator, ProjectOutcomeIndicator, 
    ProjectReportingSchedule, ProjectReportSubmission, ProjectReportSubmissionHistory
)
from tasks.serializers import KeyActivitySerializer
from programs.models import ProgramIndicator
from tasks.models import TaskUpdate
from data_collection.models import DataCollectionForm, Submission
from strategic.serializers import DisaggregatorSerializer


class DonorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Donor
        fields = ["id", "name", "donor_type", "contact_info", "email", 
                  "phone", "country", "website", "notes", "created_at", "is_active"]

class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = ["id", "name", "lat", "lon", "project"]

class ProjectSerializer(serializers.ModelSerializer):
    donors = DonorSerializer(many=True, read_only=True)
    donor_ids = serializers.PrimaryKeyRelatedField(
        many=True, write_only=True, queryset=Donor.objects.all(), source="donors"
    )
    program_name = serializers.CharField(source="program.name", read_only=True)
    manager_name = serializers.CharField(source="manager.get_full_name", read_only=True)
    locations = LocationSerializer(many=True, read_only=True)
    location_ids = serializers.PrimaryKeyRelatedField(
        many=True, write_only=True, required=False, queryset=Location.objects.all(), source="locations"
    )
    resultsFramework = serializers.SerializerMethodField()
    indicators = serializers.SerializerMethodField()
    activities = serializers.SerializerMethodField()
    programId = serializers.IntegerField(source="program.id", read_only=True)
    reporting = serializers.SerializerMethodField()


    def get_resultsFramework(sel, obj):
        from .serializers import ProjectObjectiveSerializer
        objectives = obj.objectives.all()     
        return ProjectObjectiveSerializer(objectives, many=True).data

    def get_indicators(self, obj):
        from .serializers import ProjectIndicatorSerializer
        return ProjectIndicatorSerializer(obj.indicators.all(), many=True).data

    def get_activities(self, obj):
        from .serializers import KeyActivitySerializer
        return KeyActivitySerializer(obj.activities.all(), many=True).data
    
    def get_reporting(self, obj):
        schedules = ProjectReportingSchedule.objects.filter(project=obj)
        all_submissions = ProjectReportSubmission.objects.filter(schedule__project=obj)
        return {
            'schedules': ProjectReportingScheduleSerializer(schedules, many=True).data,
            'submissions': ProjectReportSubmissionSerializer(all_submissions, many=True).data
        }


    class Meta:
        model = Project
        fields = ['id', 'program', 'code', 'title', 'description', 'manager', 'start_date', 'end_date', 'currency', 'status', 'created_at', 'updated_at', 'lifecycle_status', 'health_status', 'donors', 'donor_ids', 'manager_name', 'program_name',
                  'locations', 'location_ids', 'resultsFramework', 'indicators', 'activities', 'programId', 'reporting', 'budget', 'is_active'
                ]



class ProjectIndicatorSerializer(serializers.ModelSerializer):
    linkedProgramIndicatorName = serializers.CharField(
        source="program_indicator.name_override", read_only=True
    )
    linkedStrategicObjectiveNumber = serializers.SerializerMethodField()
    disaggregators = serializers.SerializerMethodField()
    isDonorIndicator = serializers.BooleanField(source="is_donor_indicator")
    program_indicator = serializers.PrimaryKeyRelatedField(
        queryset=ProgramIndicator.objects.all(), write_only=True, required=False, allow_null=True
    )
    corporate_indicator = serializers.PrimaryKeyRelatedField(
        queryset=CorporateIndicator.objects.all(), required=False, allow_null=True, write_only=True
    )
    corporateIndicatorDetails = serializers.SerializerMethodField(read_only=True)
    linked_corporate_indicator_name = serializers.CharField(
            source="corporate_indicator.name", read_only=True
        )
    
    class Meta:
        model = ProjectIndicator
        fields = [
            "id", "project", "name", "description", "program_indicator", "linkedProgramIndicatorName",
            "linkedStrategicObjectiveNumber", "disaggregators", "isDonorIndicator", "corporate_indicator", "corporateIndicatorDetails",'linked_corporate_indicator_name'
        ]

    def get_linkedStrategicObjectiveNumber(self, obj):
        pi = getattr(obj, "program_indicator", None)
        if not pi:
            return ""
        
        corp = getattr(pi, "corporate_indicator", None)
        if corp:
            objective_numbers = []
            for statement in corp.statements.all():
                if statement.objective and statement.objective.number:
                    objective_numbers.append(statement.objective.number)
            
            if objective_numbers:
                unique_numbers = sorted(set(objective_numbers))
                return ", ".join(unique_numbers)
        return ""


    def get_disaggregators(self, obj):
        return [
            disagg.disaggregator.name
            for disagg in obj.disaggregations.all()
        ]

    def get_corporateIndicatorDetails(self, obj):
        corp = getattr(obj, "corporate_indicator", None)
        if not corp:
            return None

        objective_numbers = []
        for statement in corp.statements.all():
            if statement.objective and statement.objective.number:
                objective_numbers.append(statement.objective.number)
        
        unique_objective_numbers = sorted(set(objective_numbers))
        objective_number_display = ", ".join(unique_objective_numbers) if unique_objective_numbers else None

        return {
            "id": corp.id,
            "name": corp.name,
            "description": corp.description,
            "objectiveNumber": objective_number_display,
            "objectiveNumbers": unique_objective_numbers,
        }



class ProjectIndicatorTargetSerializer(serializers.ModelSerializer):
    project_indicator = serializers.PrimaryKeyRelatedField(
        queryset=ProjectIndicator.objects.all()
    )

    class Meta:
        model = ProjectIndicatorTarget
        fields = ['id', 'project_indicator', 'financial_year', 'quarter', 'value']


class ProjectTeamMemberSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='user',
        write_only=True,
        required=False,
        allow_null=True
    )

    name = serializers.SerializerMethodField()

    class Meta:
        model = ProjectTeamMember
        fields = [
            'id','project','user','user_id','member_name','name','role','email','phone'
        ]
        read_only_fields = ['project']

    def get_name(self, obj):
        if obj.member_name:
            return obj.member_name
        if obj.user:
            return obj.user.get_full_name()
        return ""

    def create(self, validated_data):
        user = validated_data.get('user')

        if user:
            validated_data.setdefault('member_name', user.get_full_name())
            validated_data.setdefault('email', user.email)

        return super().create(validated_data)

    def update(self, instance, validated_data):
        user = validated_data.get('user')

        if user:
            validated_data.setdefault('member_name', user.get_full_name())
            validated_data.setdefault('email', user.email)

        return super().update(instance, validated_data)


class ProjectOutcomeIndicatorSerializer(serializers.ModelSerializer):
    project_indicator = ProjectIndicatorSerializer(read_only=True)
    project_indicator_id = serializers.PrimaryKeyRelatedField(
        queryset=ProjectIndicator.objects.all(),
        write_only=True,
        source='project_indicator',
        required=False,
        allow_null=True
    )

    disaggregators = DisaggregatorSerializer(many=True, read_only=True)

    disaggregator_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Disaggregator.objects.all(),
        write_only=True,
        source='disaggregators',
        required=False
    )

    class Meta:
        model = ProjectOutcomeIndicator
        fields = [
            'id', 'name', 'description', 'outcome',
            'project_indicator', 'project_indicator_id',
            'target', 'actual',
            'disaggregators', 'disaggregator_ids'
        ]


class ProjectOutputIndicatorSerializer(serializers.ModelSerializer):
    project_indicator = ProjectIndicatorSerializer(read_only=True)
    project_indicator_id = serializers.PrimaryKeyRelatedField(
        queryset=ProjectIndicator.objects.all(),
        write_only=True,
        source='project_indicator',
        required=False,
        allow_null=True
    )

    disaggregators = DisaggregatorSerializer(many=True, read_only=True)

    disaggregator_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Disaggregator.objects.all(),
        write_only=True,
        source='disaggregators',
        required=False
    )

    class Meta:
        model = ProjectOutputIndicator
        fields = [
            'id', 'name', 'description', 'output',
            'project_indicator', 'project_indicator_id',
            'target', 'actual',
            'disaggregators', 'disaggregator_ids'
        ]


class IndicatorDisaggregatedValueSerializer(serializers.ModelSerializer):
    disaggregator_name = serializers.CharField(
        source='disaggregator.name',
        read_only=True
    )

    class Meta:
        model = IndicatorDisaggregatedValue
        fields = [
            'id', 'output_indicator', 'outcome_indicator', 'disaggregator', 'disaggregator_name',
            'target', 'actual'
        ]
    

class ProjectOutputSerializer(serializers.ModelSerializer):
    indicators = ProjectOutputIndicatorSerializer(many=True, read_only=True)
    project_outcome_id = serializers.IntegerField(source='project_outcome.id', read_only=True)


    class Meta:
        model = ProjectOutput
        fields = ['id', 'name', 'description', 'project_outcome', 'project_outcome_id', 'indicators']


class ProjectOutcomeSerializer(serializers.ModelSerializer):
    outputs = ProjectOutputSerializer(many=True, read_only=True)
    indicators = ProjectOutcomeIndicatorSerializer(many=True, read_only=True)
    # project_objective_id = serializers.IntegerField(source='project_objective.id', read_only=True)


    class Meta:
        model = ProjectOutcome
        fields = ['id', 'name', 'description', 'project_objective', 'indicators', 'outputs']
        extra_kwargs = {
            'project_objective': {'write_only': True}
        }


class ProjectObjectiveSerializer(serializers.ModelSerializer):
    outcomes = ProjectOutcomeSerializer(many=True, required=False)
    objective = serializers.CharField(source='name', read_only=True)


    class Meta:
        model = ProjectObjective
        fields = ['id', 'project', 'name', 'description', 'outcomes', 'objective']

    def create(self, validated_data):
        outcomes_data = validated_data.pop('outcomes', [])
        objective = ProjectObjective.objects.create(**validated_data)
        for outcome_data in outcomes_data:
            outputs_data = outcome_data.pop('outputs', [])
            outcome_indicators = outcome_data.pop('indicators', [])
            outcome = ProjectOutcome.objects.create(project_objective=objective, **outcome_data)
            for indicator in outcome_indicators:
                ProjectOutcomeIndicator.objects.create(outcome=outcome, **indicator)
            for output_data in outputs_data:
                output_indicators = output_data.pop('indicators', [])
                output = ProjectOutput.objects.create(project_outcome=outcome, **output_data)
                for ind in output_indicators:
                    ProjectOutputIndicator.objects.create(output=output, **ind)
        return objective

    def update(self, instance, validated_data):
        outcomes_data = validated_data.pop('outcomes', [])

        instance.name = validated_data.get('name', instance.name)
        instance.description = validated_data.get('description', instance.description)
        instance.save()

        instance.outcomes.all().delete()

        for outcome_data in outcomes_data:
            outputs_data = outcome_data.pop('outputs', [])
            indicators_data = outcome_data.pop('indicators', [])
            
            outcome = ProjectOutcome.objects.create(
                project_objective=instance,
                **outcome_data
            )

            for ind in indicators_data:
                ProjectOutcomeIndicator.objects.create(outcome=outcome, **ind)

            for output_data in outputs_data:
                output_indicators = output_data.pop('indicators', [])
                output = ProjectOutput.objects.create(project_outcome=outcome, **output_data)

                for ind in output_indicators:
                    ProjectOutputIndicator.objects.create(output=output, **ind)

        return instance

class ProjectReportSubmissionSerializer(serializers.ModelSerializer):
    date = serializers.DateTimeField(source='submitted_at', format='%Y-%m-%d', read_only=True)
    url = serializers.SerializerMethodField()
    content = serializers.CharField(write_only=True, required=False)  # Add this line

    class Meta:
        model = ProjectReportSubmission
        fields = ['id', 'title', 'date', 'url', 'notes', 'status', 'schedule', 'file', 'created_by', 'content']  # Add 'content'

        extra_kwargs = {
            'schedule': {'write_only': True, 'required': False},
            'file': {'required': False, 'allow_null': True},
            'status': {'read_only': True},
        }
    
    def get_url(self, obj):
        request = self.context.get("request")
        if request and obj.file:
            return request.build_absolute_uri(obj.file.url)
        return obj.file.url
    
    def create(self, validated_data):
        """Override create to handle content field and create file"""
        content = validated_data.pop('content', None)        
        submission = ProjectReportSubmission.objects.create(**validated_data)
        
        if content:
            from django.core.files.base import ContentFile
            import datetime
            
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"ai_report_{timestamp}.txt"
            submission.file.save(filename, ContentFile(content))
            
            if not submission.notes:
                notes_content = content[:500] + "..." if len(content) > 500 else content
                submission.notes = f"AI Generated Report:\n\n{notes_content}"
                submission.save()
        
        return submission   

class ProjectReportSubmissionStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectReportSubmission
        fields = ['status', 'notes']


class ProjectReportingScheduleSerializer(serializers.ModelSerializer):
    # submissions = ProjectReportSubmissionSerializer(many=True, read_only=True)
    submissions = serializers.SerializerMethodField()

    class Meta:
        model = ProjectReportingSchedule
        fields = ['id', 'name', 'recipient', 'frequency', 'submissions']

    def get_submissions(self, obj):
        submissions = obj.submissions.all().order_by('-submitted_at')
        return ProjectReportSubmissionSerializer(submissions, many=True).data

class ProjectReportSubmissionHistorySerializer(serializers.ModelSerializer):
    reviewed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ProjectReportSubmissionHistory
        fields = ['id', 'status', 'notes', 'reviewed_by_name', 'reviewed_at']

    def get_reviewed_by_name(self, obj):
        if obj.reviewed_by:
            full_name = f"{obj.reviewed_by.first_name} {obj.reviewed_by.last_name}".strip()
            return full_name if full_name else obj.reviewed_by.username
        return "Unknown"


class ProjectReportDataSerializer(serializers.ModelSerializer):
    """
    Comprehensive serializer for AI report generation.
    All related_name references verified against actual model definitions.
    """
    program_name = serializers.CharField(source="program.name", read_only=True)
    manager_name = serializers.SerializerMethodField()
 
    financial_summary       = serializers.SerializerMethodField()
    results_framework       = serializers.SerializerMethodField()
    indicators_summary      = serializers.SerializerMethodField()
    activities_summary      = serializers.SerializerMethodField()
    direct_tasks_summary    = serializers.SerializerMethodField()
    beneficiaries_summary   = serializers.SerializerMethodField()
    complaints_summary      = serializers.SerializerMethodField()
    locations_list          = serializers.SerializerMethodField()
    donors_list             = serializers.SerializerMethodField()
    timeline_summary        = serializers.SerializerMethodField()
    data_collection_summary = serializers.SerializerMethodField()
    submission_insights     = serializers.SerializerMethodField()
 
    class Meta:
        model = Project
        fields = [
            'id', 'title', 'code', 'description',
            'program_name', 'manager_name',
            'start_date', 'end_date', 'status',
            'lifecycle_status', 'health_status', 'budget', 'currency',
            'financial_summary', 'results_framework',
            'indicators_summary', 'activities_summary', 'direct_tasks_summary',
            'beneficiaries_summary', 'complaints_summary',
            'locations_list', 'donors_list', 'timeline_summary',
            'data_collection_summary', 'submission_insights',
        ]
 
    # ── Helpers ──────────────────────────────────────────────────────────────
 
    def _safe_float(self, value):
        if value is None:
            return 0.0
        try:
            return float(value)
        except (TypeError, ValueError):
            return 0.0
 
    def get_manager_name(self, obj):
        if obj.manager:
            return obj.manager.get_full_name() or obj.manager.username
        return None
 
    # ── Results Framework ────────────────────────────────────────────────────
    # Hierarchy: ProjectObjective → ProjectOutcome → ProjectOutput
    # Related names confirmed from models:
    #   ProjectObjective.outcomes  (FK on ProjectOutcome → project_objective)
    #   ProjectOutcome.outputs     (FK on ProjectOutput  → project_outcome)
    #   ProjectOutcome.indicators  (FK on ProjectOutcomeIndicator → outcome)
    #   ProjectOutput.indicators   (FK on ProjectOutputIndicator  → output)
    #   ProjectOutcomeIndicator: has target, actual directly on model
    #   ProjectOutputIndicator:  has target, actual directly on model
    #   IndicatorDisaggregatedValue: outcome_indicator FK (related_name='disaggregated_values')
    #                                output_indicator  FK (related_name='disaggregated_values')
 
    def get_results_framework(self, obj):
        from django.db.models import Sum
 
        framework = []
        for objective in obj.objectives.all().order_by('id'):
            outcomes_data = []
 
            for outcome in objective.outcomes.all().order_by('id'):
                # Outcome-level indicators
                # related_name on ProjectOutcomeIndicator.outcome = 'indicators'
                outcome_indicators = []
                for oci in outcome.indicators.all():
                    # Disaggregated actuals via IndicatorDisaggregatedValue
                    # related_name on outcome_indicator FK = 'disaggregated_values'
                    disagg_actual = self._safe_float(
                        oci.disaggregated_values.aggregate(
                            t=Sum('actual')
                        )['t']
                    )
                    outcome_indicators.append({
                        'id': oci.id,
                        'name': oci.name,
                        'description': oci.description or '',
                        'target': self._safe_float(oci.target),
                        'actual': self._safe_float(oci.actual) or disagg_actual,
                        'achievement_pct': round(
                            self._safe_float(oci.actual) / self._safe_float(oci.target) * 100, 1
                        ) if oci.target else 0.0,
                    })
 
                # Output-level
                outputs_data = []
                for output in outcome.outputs.all().order_by('id'):
                    # related_name on ProjectOutputIndicator.output = 'indicators'
                    output_indicators = []
                    for outi in output.indicators.all():
                        # Disaggregated actuals
                        disagg_actual = self._safe_float(
                            outi.disaggregated_values.aggregate(
                                t=Sum('actual')
                            )['t']
                        )
                        # Task contributions via TaskIndicatorProgress
                        # TaskIndicatorProgress.output_indicator FK (no explicit related_name
                        # → default reverse = 'taskindicatorprogress_set')
                        from tasks.models import TaskIndicatorProgress
                        task_actual = self._safe_float(
                            TaskIndicatorProgress.objects.filter(
                                output_indicator=outi
                            ).aggregate(t=Sum('actual_contribution'))['t']
                        )
                        output_indicators.append({
                            'id': outi.id,
                            'name': outi.name,
                            'description': outi.description or '',
                            'target': self._safe_float(outi.target),
                            'actual': self._safe_float(outi.actual) or disagg_actual or task_actual,
                            'achievement_pct': round(
                                (self._safe_float(outi.actual) or task_actual)
                                / self._safe_float(outi.target) * 100, 1
                            ) if outi.target else 0.0,
                        })
 
                    outputs_data.append({
                        'id': output.id,
                        'name': output.name,
                        'description': output.description or '',
                        'indicators': output_indicators,
                    })
 
                outcomes_data.append({
                    'id': outcome.id,
                    'name': outcome.name,
                    'description': outcome.description or '',
                    'indicators': outcome_indicators,
                    'outputs': outputs_data,
                })
 
            framework.append({
                'id': objective.id,
                'name': objective.name,
                'description': objective.description or '',
                'outcomes': outcomes_data,
            })
        return framework
 
    # ── Financial Summary ────────────────────────────────────────────────────
 
    def get_financial_summary(self, obj):
        from django.db.models import Sum
 
        total_budget = 0.0
        total_spent = 0.0
        breakdown_by_activity = {}
        alerts = []
 
        # Tasks via activities
        # KeyActivity.tasks → related_name='tasks' on Task.activity FK
        for activity in obj.activities.all():
            act_budget = 0.0
            act_spent = 0.0
            act_tasks = []
            for task in activity.tasks.all():
                tb = self._safe_float(task.budget)
                ts = self._safe_float(task.cumulative_spent)
                act_budget += tb
                act_spent += ts
                total_budget += tb
                total_spent += ts
                act_tasks.append({
                    'title': task.title,
                    'budget': tb,
                    'spent': ts,
                    'balance': tb - ts,
                    'utilization': round(ts / tb * 100, 1) if tb > 0 else 0.0,
                    'status': task.status or 'PLANNED',
                })
                if tb > 0 and ts > tb:
                    alerts.append({
                        'type': 'warning',
                        'code': 'TASK_OVERRUN',
                        'message': f'Task "{task.title}" exceeded budget',
                        'details': f'Budget: ${tb:,.2f}, Spent: ${ts:,.2f}',
                    })
            breakdown_by_activity[activity.name] = {
                'budget': act_budget, 'spent': act_spent, 'tasks': act_tasks,
            }
 
        # Direct tasks (no activity)
        # Task.project FK → related_name='tasks'; filter activity=None
        for task in obj.tasks.filter(activity__isnull=True):
            tb = self._safe_float(task.budget)
            ts = self._safe_float(task.cumulative_spent)
            total_budget += tb
            total_spent += ts
            bucket = breakdown_by_activity.setdefault('Direct Project Tasks', {
                'budget': 0.0, 'spent': 0.0, 'tasks': []
            })
            bucket['budget'] += tb
            bucket['spent'] += ts
            bucket['tasks'].append({
                'title': task.title,
                'budget': tb,
                'spent': ts,
                'balance': tb - ts,
                'utilization': round(ts / tb * 100, 1) if tb > 0 else 0.0,
                'status': task.status or 'PLANNED',
            })
 
        project_budget = self._safe_float(obj.budget)
        # Use project budget if it's larger; otherwise use sum of task budgets
        effective_budget = project_budget if project_budget >= total_budget else total_budget
 
        utilization_rate = round(total_spent / effective_budget * 100, 1) if effective_budget > 0 else 0.0
 
        if total_spent > effective_budget:
            alerts.insert(0, {
                'type': 'critical',
                'code': 'BUDGET_OVERRUN',
                'message': f'Project has exceeded budget by ${total_spent - effective_budget:,.2f}',
                'details': f'Spent: ${total_spent:,.2f}, Budget: ${effective_budget:,.2f}',
            })
 
        # Donor list — Donor model has: name, contact_info, email, country
        donor_list = []
        for donor in obj.donors.all():
            donor_list.append({'name': donor.name})
 
        return {
            'currency': obj.currency or 'USD',
            'project_budget': project_budget,
            'total_task_budget': total_budget,
            'effective_budget': effective_budget,
            'total_spent': total_spent,
            'balance': effective_budget - total_spent,
            'budget_utilization': utilization_rate,
            'spending_efficiency': self._calculate_spending_efficiency(
                obj, total_spent, effective_budget
            ),
            'donor_contributions': donor_list,
            'breakdown_by_activity': breakdown_by_activity,
            'alerts': alerts,
        }
 
    def _calculate_spending_efficiency(self, obj, total_spent, effective_budget):
        from django.utils import timezone
        if not obj.start_date or not obj.end_date:
            return None
        elapsed = (timezone.now().date() - obj.start_date).days
        total_days = (obj.end_date - obj.start_date).days
        if total_days <= 0:
            return None
        time_pct = elapsed / total_days * 100
        budget_pct = total_spent / effective_budget * 100 if effective_budget > 0 else 0.0
        score = round(100 - abs(budget_pct - time_pct), 1)
        if score >= 90:
            status, msg = 'excellent', 'Spending matches project timeline'
        elif score >= 80:
            status, msg = 'good', 'Spending slightly off timeline'
        elif score >= 70:
            status, msg = 'warning', 'Spending significantly off timeline'
        else:
            status, msg = 'critical', 'Urgent review needed'
        return {'score': score, 'status': status, 'message': msg}
 
    # ── Project Indicators ───────────────────────────────────────────────────
    # ProjectIndicator model fields: name, description, is_donor_indicator,
    #   program_indicator (FK → ProgramIndicator), corporate_indicator (FK → CorporateIndicator)
    # ProjectIndicatorTarget: related_name='targets', has: value, financial_year, quarter
    # IndicatorDisaggregation: related_name='disaggregations' on project_indicator FK
    #   fields: baseline_value, target_value, reported_value, disaggregator FK
    # ProgramIndicator: has name_override (no plain 'name' field)
    # CorporateIndicator.statements: M2M → StrategicObjectiveStatement
    #   StrategicObjectiveStatement.objective FK → StrategicObjective (number, name)
 
    def get_indicators_summary(self, obj):
        from tasks.models import TaskIndicatorData
 
        indicators = []
        for indicator in obj.indicators.all():
            # Target: sum all ProjectIndicatorTarget.value
            target_value = self._safe_float(
                sum(self._safe_float(t.value) for t in indicator.targets.all())
            )
 
            # Actual: sum all TaskIndicatorData values where
            # indicator_disaggregation links back to this project_indicator
            # TaskIndicatorData.indicator_disaggregation FK → IndicatorDisaggregation
            # IndicatorDisaggregation.project_indicator FK → ProjectIndicator
            actual_value = self._safe_float(
                TaskIndicatorData.objects.filter(
                    indicator_disaggregation__project_indicator=indicator
                ).aggregate(
                    t=__import__('django.db.models', fromlist=['Sum']).Sum('value')
                )['t']
            )
 
            progress_pct = round(actual_value / target_value * 100, 1) if target_value > 0 else 0.0
 
            # ProgramIndicator has name_override, not 'name'
            program_indicator_name = ''
            if indicator.program_indicator:
                pi = indicator.program_indicator
                program_indicator_name = (
                    pi.name_override or
                    (pi.corporate_indicator.name if pi.corporate_indicator else '') or
                    ''
                )
 
            # CorporateIndicator links to StrategicObjectiveStatement via M2M 'statements'
            corporate_indicator_name = ''
            strategic_objective = ''
            if indicator.corporate_indicator:
                corporate_indicator_name = indicator.corporate_indicator.name
                # statements is M2M from CorporateIndicator to StrategicObjectiveStatement
                # StrategicObjectiveStatement has objective FK → StrategicObjective
                stmt = indicator.corporate_indicator.statements.select_related(
                    'objective'
                ).first()
                if stmt and stmt.objective:
                    obj_num = stmt.objective.number or ''
                    obj_name = stmt.objective.name or ''
                    strategic_objective = f"{obj_num} {obj_name}".strip()
 
            indicators.append({
                'id': indicator.id,
                'name': indicator.name,
                'description': indicator.description or '',
                'target_value': target_value,
                'actual_value': actual_value,
                'progress_percentage': progress_pct,
                'is_donor_indicator': indicator.is_donor_indicator,
                'linked_program_indicator': program_indicator_name,
                'linked_corporate_indicator': corporate_indicator_name,
                'linked_strategic_objective': strategic_objective,
                'disaggregations': self._get_indicator_disaggregations(indicator),
            })
        return indicators
 
    def _get_indicator_disaggregations(self, indicator):
        # IndicatorDisaggregation related_name='disaggregations'
        # Fields: baseline_value, target_value, reported_value, disaggregator FK
        result = []
        for disagg in indicator.disaggregations.all():
            result.append({
                'disaggregator': disagg.disaggregator.name if disagg.disaggregator else 'Unknown',
                'baseline': self._safe_float(disagg.baseline_value),
                'target': self._safe_float(disagg.target_value),
                'reported': self._safe_float(disagg.reported_value),
            })
        return result
 
    # ── Activities & Tasks ───────────────────────────────────────────────────
    # KeyActivity related_name='activities' on project FK
    # Task related_name='tasks' on activity FK
 
    def get_activities_summary(self, obj):
        activities = []
        for activity in obj.activities.all():
            tasks_data = self._serialize_tasks(activity.tasks.all())
            # Activity completion: count tasks with status=COMPLETED
            completed = sum(1 for t in tasks_data if t['status'] == 'COMPLETED')
            total = len(tasks_data)
            completion_pct = round(completed / total * 100, 1) if total > 0 else 0.0
 
            activities.append({
                'id': activity.id,
                'name': activity.name,
                'description': activity.description or '',
                'completion_percentage': completion_pct,
                'tasks_total': total,
                'tasks_completed': completed,
                'linked_indicator_name': (
                    activity.linked_project_indicator.name
                    if activity.linked_project_indicator else None
                ),
                'tasks': tasks_data,
            })
        return activities
 
    def get_direct_tasks_summary(self, obj):
        """Tasks linked directly to the project without an activity."""
        return self._serialize_tasks(obj.tasks.filter(activity__isnull=True))
 
    def _serialize_tasks(self, tasks_qs):
        tasks_data = []
        for task in tasks_qs:
            last_update = task.updates.order_by('-status_date').first()
            task_budget = self._safe_float(task.budget)
            # cumulative_spent is the authoritative total spend on the task
            task_spent = self._safe_float(task.cumulative_spent)
            utilization = round(task_spent / task_budget * 100, 1) if task_budget > 0 else 0.0
 
            # TOR: OneToOne related_name='tor'
            tor_info = None
            try:
                if task.tor:
                    tor_info = {
                        'filename': task.tor.filename,
                        'uploaded_at': (
                            task.tor.uploaded_at.isoformat()
                            if task.tor.uploaded_at else None
                        ),
                        'uploaded_by': (
                            task.tor.uploaded_by.get_full_name()
                            if task.tor.uploaded_by else None
                        ),
                        'description': task.tor.description or '',
                    }
            except Exception:
                pass
 
            # Completion report: OneToOne related_name='completion_report'
            completion_report = None
            try:
                if task.completion_report:
                    cr = task.completion_report
                    completion_report = {
                        'submitted_at': (
                            cr.submitted_at.isoformat() if cr.submitted_at else None
                        ),
                        'submitted_by': (
                            cr.submitted_by.get_full_name() if cr.submitted_by else None
                        ),
                        'notes': cr.notes or '',
                        'activity_report_filename': cr.activity_report_filename,
                        'participants_filename': cr.participants_filename,
                    }
            except Exception:
                pass
 
            tasks_data.append({
                'id': task.id,
                'title': task.title,
                'description': task.description or '',
                'status': task.status or 'PLANNED',
                'assignee': (
                    task.focal_person.user.get_full_name()
                    if task.focal_person and task.focal_person.user else None
                ),
                'start_date': task.start_date.isoformat() if task.start_date else None,
                'end_date': task.end_date.isoformat() if task.end_date else None,
                'budget': task_budget,
                'cumulative_spent': task_spent,
                'budget_utilization': utilization,
                'last_update_status': last_update.status if last_update else None,
                'last_update_date': (
                    last_update.status_date.isoformat()
                    if last_update and last_update.status_date else None
                ),
                'last_update_justification': (
                    last_update.status_justification if last_update else None
                ),
                'is_complete': last_update.is_complete if last_update else False,
                'updates_count': task.updates.count(),
                'has_tor': tor_info is not None,
                'tor': tor_info,
                'has_completion_report': completion_report is not None,
                'completion_report': completion_report,
            })
        return tasks_data
 
    # ── Complaints ───────────────────────────────────────────────────────────
    # Complaint.project FK → Project (null=True, blank=True)
    # Complaint fields confirmed: status, priority, category, sensitivity_level,
    #   date_feedback_received, date_case_closed, feedback_channel, case_id
 
    def get_complaints_summary(self, obj):
        from complaints.models import Complaint
        from django.db.models import Count
 
        qs = Complaint.objects.filter(project=obj)
        total = qs.count()
        if total == 0:
            return {'total': 0, 'message': 'No complaints linked to this project.'}
 
        by_status = {
            r['status']: r['c']
            for r in qs.values('status').annotate(c=Count('id'))
        }
        by_category = {
            r['category'] or 'unspecified': r['c']
            for r in qs.values('category').annotate(c=Count('id'))
        }
        by_priority = {
            r['priority']: r['c']
            for r in qs.values('priority').annotate(c=Count('id'))
        }
        closed = qs.filter(date_case_closed__isnull=False).count()
        resolution_rate = round(closed / total * 100, 1) if total > 0 else 0.0
 
        recent = []
        for c in qs.order_by('-created_at')[:5]:
            recent.append({
                'case_id': c.case_id,
                'category': c.category,
                'priority': c.priority,
                'status': c.status,
                'sensitivity_level': c.sensitivity_level,
                'date_received': (
                    c.date_feedback_received.date().isoformat()
                    if c.date_feedback_received else None
                ),
                'date_closed': (
                    c.date_case_closed.isoformat() if c.date_case_closed else None
                ),
                'channel': c.feedback_channel,
            })
 
        return {
            'total': total,
            'closed': closed,
            'resolution_rate': resolution_rate,
            'by_status': by_status,
            'by_category': by_category,
            'by_priority': by_priority,
            'recent_cases': recent,
        }
 
    # ── Beneficiaries ────────────────────────────────────────────────────────
    # Uses IndicatorDisaggregation fields: baseline_value, reported_value
    # and Submission model
 
    def get_beneficiaries_summary(self, obj):
        existing = self._get_existing_beneficiaries_summary(obj)
        submissions = Submission.objects.filter(project=obj)
        if submissions.exists():
            sub_ben = self._extract_beneficiaries_from_submissions(submissions)
            if existing['total_count'] == 0 and sub_ben['total_count'] > 0:
                return sub_ben
            elif sub_ben['total_count'] > 0:
                existing['total_count'] += sub_ben['total_count']
                existing['breakdown'].extend(sub_ben['breakdown'])
                existing['data_sources'] = ['indicator_disaggregations', 'submission_data']
        return existing
 
    def _get_existing_beneficiaries_summary(self, obj):
        count = 0.0
        breakdown = []
        for indicator in obj.indicators.all():
            # IndicatorDisaggregation related_name='disaggregations'
            for disagg in indicator.disaggregations.all():
                if disagg.disaggregator and 'beneficiar' in disagg.disaggregator.name.lower():
                    # Use reported_value if available, else baseline_value
                    val = self._safe_float(
                        disagg.reported_value if disagg.reported_value is not None
                        else disagg.baseline_value
                    )
                    count += val
                    breakdown.append({
                        'category': disagg.disaggregator.name,
                        'count': val,
                        'type': 'reported' if disagg.reported_value is not None else 'baseline',
                    })
        return {
            'total_count': count,
            'breakdown': breakdown,
            'data_source': 'indicator_disaggregations',
        }
 
    def _extract_beneficiaries_from_submissions(self, submissions):
        total = 0
        breakdown = []
        for submission in submissions[:20]:
            if submission.data and isinstance(submission.data, dict):
                for field_label, field_data in submission.data.items():
                    if not isinstance(field_data, dict):
                        continue
                    value = field_data.get('value')
                    if not value:
                        continue
                    if any(
                        k in field_label.lower()
                        for k in ['beneficiar', 'participant', 'household', 'person', 'people', 'member']
                    ):
                        try:
                            count = len(value) if isinstance(value, list) else int(float(str(value)))
                            total += count
                            breakdown.append({'category': field_label, 'count': count})
                        except (ValueError, TypeError):
                            pass
        return {
            'total_count': total,
            'breakdown': breakdown,
            'data_source': 'submission_data',
        }
 
    # ── Locations ────────────────────────────────────────────────────────────
    # Location model: name, lat, lon (both FloatField nullable)
 
    def get_locations_list(self, obj):
        return [
            {
                'name': loc.name,
                'lat': loc.lat,
                'lon': loc.lon,
            }
            for loc in obj.locations.all()
        ]
 
    # ── Donors ───────────────────────────────────────────────────────────────
    # Donor model confirmed fields: name, contact_info, email, country
 
    def get_donors_list(self, obj):
        return [
            {
                'name': donor.name,
                'contact_info': donor.contact_info or '',
                'country': donor.country or '',
                'email': donor.email or '',
            }
            for donor in obj.donors.all()
        ]
 
    # ── Timeline ─────────────────────────────────────────────────────────────
 
    def get_timeline_summary(self, obj):
        from django.utils import timezone
        today = timezone.now().date()
        events = []
 
        if obj.start_date:
            events.append({
                'event': 'Project Start',
                'date': obj.start_date.isoformat(),
                'type': 'milestone',
                'status': 'completed' if obj.start_date <= today else 'pending',
            })
 
        for activity in obj.activities.all():
            for task in activity.tasks.filter(end_date__isnull=False)[:10]:
                events.append({
                    'event': f'Task: {task.title}',
                    'date': task.end_date.isoformat(),
                    'type': 'task_deadline',
                    'status': task.status or 'PLANNED',
                })
 
        # ProjectReportingSchedule related_name='reporting_schedules'
        for schedule in obj.reporting_schedules.all():
            next_due = self._calculate_next_report_date(
                schedule.frequency, obj.start_date or today
            )
            events.append({
                'event': f'{schedule.name} Report Due ({schedule.recipient})',
                'date': next_due.isoformat() if next_due else None,
                'type': 'reporting_deadline',
                'frequency': schedule.frequency,
                'status': 'overdue' if next_due and next_due < today else 'upcoming',
            })
 
        if obj.end_date:
            events.append({
                'event': 'Project End',
                'date': obj.end_date.isoformat(),
                'type': 'milestone',
                'status': 'completed' if obj.end_date <= today else 'pending',
            })
 
        events.sort(key=lambda x: (x['date'] is None, x['date'] or '9999-12-31'))
        return events
 
    def _calculate_next_report_date(self, frequency, start_date):
        from django.utils import timezone
        from datetime import timedelta
        today = timezone.now().date()
        try:
            if frequency == 'DAILY':
                return today + timedelta(days=1)
            elif frequency == 'WEEKLY':
                days = 7 - today.weekday()
                return today + timedelta(days=days if days > 0 else 7)
            elif frequency == 'MONTHLY':
                m = today.month % 12 + 1
                y = today.year + (1 if today.month == 12 else 0)
                return today.replace(year=y, month=m, day=1)
            elif frequency == 'QUARTERLY':
                next_q = ((today.month - 1) // 3 + 1) * 3 + 1
                if next_q > 12:
                    return today.replace(year=today.year + 1, month=1, day=1)
                return today.replace(month=next_q, day=1)
            elif frequency == 'ANNUALLY':
                return today.replace(year=today.year + 1, month=1, day=1)
            else:
                return today + timedelta(days=30)
        except Exception:
            return today + timedelta(days=30)
 
    # ── Data Collection ───────────────────────────────────────────────────────
 
    def get_data_collection_summary(self, obj):
        try:
            forms = DataCollectionForm.objects.filter(projects=obj)
            form_summary = []
            total_submissions = 0
            for form in forms:
                subs = Submission.objects.filter(form=form, project=obj)
                count = subs.count()
                total_submissions += count
                latest = subs.order_by('-submitted_at').first()
                form_summary.append({
                    'form_id': form.id,
                    'form_title': form.title,
                    'description': form.description or '',
                    'submission_count': count,
                    'latest_submission_date': (
                        latest.submitted_at.isoformat() if latest else None
                    ),
                    'fields_count': form.fields.count(),
                })
            return {
                'total_forms': forms.count(),
                'total_submissions': total_submissions,
                'forms': form_summary,
            }
        except Exception as e:
            return {'error': str(e)}
 
    def get_submission_insights(self, obj):
        try:
            submissions = Submission.objects.filter(project=obj)
            if not submissions.exists():
                return {'message': 'No submissions available.'}
            return {
                'total_submissions': submissions.count(),
                'unique_submitters': (
                    submissions.values('submitted_by').distinct().count()
                ),
            }
        except Exception as e:
            return {'error': str(e)}
