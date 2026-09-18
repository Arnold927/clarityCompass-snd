from rest_framework import serializers
from .models import (
    Program, ProgramIndicator, ProgramOutcome, ProgramOutcomeIndicator, ProgramOutcomePerformance, ReportingQuarter, 
    ProgramOutcomeIndicatorPerformance
)
from strategic.serializers import StrategicObjectiveSerializer, DisaggregatorSerializer
from django.db.models import Count

class ProgramSerializer(serializers.ModelSerializer):
    org = serializers.PrimaryKeyRelatedField(read_only=True)
    linked_objectives = StrategicObjectiveSerializer(many=True, read_only=True)
    strategic_objective = serializers.SerializerMethodField()
    project_count = serializers.SerializerMethodField()
    indicator_count = serializers.SerializerMethodField()
    is_active = serializers.BooleanField(default=True, read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    code = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    
    class Meta:
        model = Program
        fields = [
            'id', 'org', 'name', 'description', 'code', 'linked_objectives', 'strategic_objective', 'project_count',
            'indicator_count', 'is_active', 'created_at'
        ]

    def get_strategic_objective(self, obj):
        if obj.linked_objectives.exists():
            return StrategicObjectiveSerializer(obj.linked_objectives.first()).data
        return None

    def get_project_count(self, obj):
        try:
            return obj.projects.count()
        except:
            return 0

    def get_indicator_count(self, obj):
        return obj.indicators.count()

    def create(self, validated_data):
        user = self.context['request'].user
        org = getattr(user, 'organization', None)
        validated_data['org'] = org
        return super().create(validated_data)

class ProgramIndicatorSerializer(serializers.ModelSerializer):
    corporate_indicator_name = serializers.CharField(
        source="corporate_indicator.name", read_only=True
    )
    strategic_objective_number = serializers.CharField(
        source="corporate_indicator.objective.number", read_only=True
    )
    outcome_name = serializers.CharField(
        source="outcome.name", read_only=True
    )
    disaggregators = serializers.SerializerMethodField()
    
    program = serializers.PrimaryKeyRelatedField(
        queryset=Program.objects.all(),
        write_only=True
    )
    
    program_name = serializers.CharField(source='program.name', read_only=True)

    class Meta:
        model = ProgramIndicator
        fields = [
            "id", "program", "program_name", "name_override", "description_override", "corporate_indicator", 
            "corporate_indicator_name", "strategic_objective_number", "outcome_name", "disaggregators",
        ]

    def get_disaggregators(self, obj):
        corp = obj.corporate_indicator
        if not corp:
            return []
        return DisaggregatorSerializer(corp.disaggregators.all(), many=True).data
    
class ProgramOutcomeSerializer(serializers.ModelSerializer):
    program_name = serializers.CharField(source="program.name", read_only=True)
    objective_name = serializers.CharField(
        source="linked_objective.name",
        read_only=True
    )
    indicator_count = serializers.SerializerMethodField()

    class Meta:
        model = ProgramOutcome
        fields = [
            "id", "program", "program_name", "linked_objective", "objective_name", "name", "description", "indicator_count",
        ]

    def get_indicator_count(self, obj):
        return obj.indicators.count()

class ProgramOutcomeIndicatorSerializer(serializers.ModelSerializer):
    corporate_indicator_name = serializers.CharField(
        source="corporate_indicator.name",
        read_only=True
    )
    outcome_name = serializers.CharField(
        source="outcome.name",
        read_only=True
    )
    program_name = serializers.CharField(
        source="outcome.program.name",
        read_only=True
    )
    disaggregators = serializers.SerializerMethodField()

    class Meta:
        model = ProgramOutcomeIndicator
        fields = [
            "id", "outcome", "outcome_name", "program_name", "name_override", "description_override", "corporate_indicator",
            "corporate_indicator_name", "disaggregators",
        ]

    def get_disaggregators(self, obj):
        corp = obj.corporate_indicator
        if not corp:
            return []
        return DisaggregatorSerializer(
            corp.disaggregators.all(),
            many=True
        ).data

class ReportingQuarterSerializer(serializers.ModelSerializer):

    class Meta:
        model = ReportingQuarter
        fields = [
            "id", "year", "quarter", "start_date", "end_date",
        ]

class ProgramOutcomeIndicatorPerformanceSerializer(serializers.ModelSerializer):
    indicator_name = serializers.SerializerMethodField()
    outcome_name = serializers.CharField(
        source="indicator.outcome.name",
        read_only=True
    )
    program_name = serializers.CharField(
        source="indicator.outcome.program.name",
        read_only=True
    )
    quarter_label = serializers.CharField(
        source="quarter.__str__",
        read_only=True
    )

    class Meta:
        model = ProgramOutcomeIndicatorPerformance
        fields = [
            "id", "indicator", "indicator_name", "outcome_name", "program_name", "quarter", "quarter_label", "target",
            "actual", "comments",
        ]

    def get_indicator_name(self, obj):
        return (
            obj.indicator.name_override
            or (
                obj.indicator.corporate_indicator.name
                if obj.indicator.corporate_indicator
                else None
            )
        )
    
class ProgramOutcomePerformanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProgramOutcomePerformance
        fields = ['id', 'outcome', 'quarter', 'target', 'actual', 'comments']
        read_only_fields = ['id']


