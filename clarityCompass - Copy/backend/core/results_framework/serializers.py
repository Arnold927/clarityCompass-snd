from rest_framework import serializers
from projects.serializers import ProjectIndicatorSerializer
from projects.models import ProjectIndicator
from strategic.models import StrategicObjective
from .models import Outcome, Output, OutputIndicator, OutcomeIndicator

class OutcomeIndicatorSerializer(serializers.ModelSerializer):
    outcome = serializers.PrimaryKeyRelatedField(
        queryset=Outcome.objects.all()
    )

    class Meta:
        model = OutcomeIndicator
        fields = ['id', 'name', 'description', 'outcome']

class OutputSerializer(serializers.ModelSerializer):
    outcome = serializers.PrimaryKeyRelatedField(
        queryset=Outcome.objects.all(),
        write_only=True
    )
    indicators = serializers.SerializerMethodField(read_only=True)
    outcome_id = serializers.IntegerField(source='outcome.id', read_only=True)


    class Meta:
        model = Output
        fields = ['id', 'name', 'description', 'outcome', 'indicators', 'outcome_id']

    def get_indicators(self, obj):
        from .serializers import OutputIndicatorSerializer
        return OutputIndicatorSerializer(obj.indicators.all(), many=True).data



class OutcomeSerializer(serializers.ModelSerializer):
    strategic_objective = serializers.PrimaryKeyRelatedField(
        queryset=StrategicObjective.objects.all(),
        write_only=True
    )
    indicators = OutcomeIndicatorSerializer(many=True, read_only=True)
    outputs = OutputSerializer(many=True, read_only=True)
    
    class Meta:
        model = Outcome
        fields = ['id', 'name', 'description', 'strategic_objective', 'indicators', 'outputs']


class OutputIndicatorSerializer(serializers.ModelSerializer):
    output = serializers.PrimaryKeyRelatedField(
        queryset=Output.objects.all()
    )
    project_indicator = ProjectIndicatorSerializer(read_only=True)

    class Meta:
        model = OutputIndicator
        fields = ['id', 'name', 'description', 'output', 'project_indicator']


