from rest_framework import serializers
from .models import StrategicObjectiveStatement, StrategicPlan, StrategicObjective, CorporateIndicator, Disaggregator, IndicatorDisaggregation, StrategicPlanYear, CorporateIndicatorPerformance


class DisaggregatorSerializer(serializers.ModelSerializer):
    org = serializers.PrimaryKeyRelatedField(read_only=True)
    # name = serializers.CharField(read_only=True)

    class Meta:
        model = Disaggregator
        fields = ['id', 'org', 'name']
        extra_kwargs = {
            'name': {'read_only': False}
        }

    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['org'] = user.organization
        return super().create(validated_data)
    
    def to_representation(self, instance):
        return super().to_representation(instance)
    
class StrategicPlanYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = StrategicPlanYear
        fields = ['id', 'plan', 'year']
    
class CorporateIndicatorPerformanceSerializer(serializers.ModelSerializer):
    year_detail = StrategicPlanYearSerializer(source='year', read_only=True)

    class Meta:
        model = CorporateIndicatorPerformance
        fields = ['id', 'indicator', 'year', 'year_detail', 'target', 'actual', 'comments']

    def validate(self, data):
        indicator = data.get("indicator")
        year = data.get("year")

        if indicator and year:
            for statement in indicator.statements.all():
                if not (statement.objective and 
                    statement.objective.plan and 
                    statement.objective.plan.id == year.plan_id):
                    raise serializers.ValidationError(
                        f"Indicator statement '{statement.text}' does not belong to the same Strategic Plan as the performance year."
                    )
        return data


class CorporateIndicatorSerializer(serializers.ModelSerializer):
    disaggregators = DisaggregatorSerializer(many=True, read_only=True)
    disaggregator_ids = serializers.PrimaryKeyRelatedField(
        many=True, source='disaggregators', queryset=Disaggregator.objects.all(),
        write_only=True,
        required=False
    )
    statement_ids = serializers.PrimaryKeyRelatedField(
        many=True, source='statements', queryset=StrategicObjectiveStatement.objects.all(),
        write_only=True,
        required=False
    )
    objective_id = serializers.SerializerMethodField()
    objective_number = serializers.SerializerMethodField()
    performances = CorporateIndicatorPerformanceSerializer(many=True, read_only=True)

    class Meta:
        model = CorporateIndicator
        fields = [
            'id', 'name', 'description', 
            'disaggregators', 'disaggregator_ids', 
            'statement_ids',
            'objective_id', 'objective_number', 
            'performances'
        ]

    def validate(self, data):
        if self.instance is None:
            statements = data.get('statements')
            if not statements:
                raise serializers.ValidationError({
                    'statement_ids': 'At least one statement must be selected when creating an indicator.'
                })
        return data

    def create(self, validated_data):
        disaggregators = validated_data.pop('disaggregators', [])
        statements = validated_data.pop('statements', [])
        
        instance = CorporateIndicator.objects.create(**validated_data)
        
        if statements:
            instance.statements.set(statements)
        if disaggregators:
            instance.disaggregators.set(disaggregators)
        
        return instance

    def update(self, instance, validated_data):
        statements = validated_data.pop('statements', serializers.empty)
        disaggregators = validated_data.pop('disaggregators', serializers.empty)
        
        instance = super().update(instance, validated_data)
        
        if statements is not serializers.empty:
            instance.statements.set(statements)
        if disaggregators is not serializers.empty:
            instance.disaggregators.set(disaggregators)
            
        instance.refresh_from_db()
        return instance
    
    def get_objective_id(self, obj):
        first_statement = obj.statements.first()
        if first_statement and first_statement.objective:
            return first_statement.objective.id
        return None

    def get_objective_number(self, obj):
        first_statement = obj.statements.first()
        if first_statement and first_statement.objective:
            return first_statement.objective.number
        return None

class StrategicPlanSerializer(serializers.ModelSerializer):
    strategicObjectives = serializers.SerializerMethodField()
    years = StrategicPlanYearSerializer(many=True, read_only=True)

    class Meta:
        model = StrategicPlan
        fields = [
            'id', 'title', 'version', 'start_date', 'end_date',
            'overall_objective', 'is_active', 'strategicObjectives', 'years'
        ]

    def get_strategicObjectives(self, obj):
        from .serializers import StrategicObjectiveSerializer
        return StrategicObjectiveSerializer(obj.objectives.all(), many=True).data

class IndicatorDisaggregationSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='disaggregator.name', read_only=True)
    
    class Meta:
        model = IndicatorDisaggregation
        fields = ['id', 'name', 'baseline_value', 'target_value', 'reported_value', 'notes']
    

class StrategicObjectiveStatementSerializer(serializers.ModelSerializer):
    corporateIndicators = CorporateIndicatorSerializer(
        many=True,
        read_only=True,
        source='corporate_indicators'
    )
    
    class Meta:
        model = StrategicObjectiveStatement
        fields = ['id', 'objective', 'text', 'corporateIndicators']
        read_only_fields = ['id']

    def validate(self, data):
        return data

class StrategicObjectiveSerializer(serializers.ModelSerializer):
    statements = StrategicObjectiveStatementSerializer(
        many=True,
        read_only=True
    )
    plan = serializers.PrimaryKeyRelatedField(
        queryset=StrategicPlan.objects.all()
    )
    outcomes = serializers.SerializerMethodField()
    
    class Meta:
        model = StrategicObjective
        fields = ['id', 'plan', 'number', 'name', 'description', 'statements', 'outcomes']

    def get_outcomes(self, obj):
        from results_framework.serializers import OutcomeSerializer
        return OutcomeSerializer(obj.outcomes.all(), many=True).data


