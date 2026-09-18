from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import serializers
from .models import StrategicPlan, StrategicObjective, CorporateIndicator, Disaggregator, StrategicPlanYear, CorporateIndicatorPerformance, StrategicObjectiveStatement
from .serializers import (
    StrategicPlanSerializer, StrategicObjectiveSerializer, CorporateIndicatorSerializer, DisaggregatorSerializer, StrategicPlanYearSerializer, CorporateIndicatorPerformanceSerializer, StrategicObjectiveStatementSerializer
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Prefetch

class StrategicPlanViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = StrategicPlan.objects.all()
    serializer_class = StrategicPlanSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        queryset = queryset.prefetch_related(
            Prefetch(
                'objectives',
                queryset=StrategicObjective.objects.prefetch_related(
                    Prefetch(
                        'statements',
                        queryset=StrategicObjectiveStatement.objects.prefetch_related(
                            Prefetch(
                                'corporate_indicators',
                                queryset=CorporateIndicator.objects.prefetch_related(
                                    'disaggregators',
                                    Prefetch(
                                        'performances',
                                        queryset=CorporateIndicatorPerformance.objects.select_related('year')
                                    )
                                )
                            )
                        )
                    )
                )
            ),
            'years'
        )
        
        return queryset

    @action(detail=False, methods=['get'])
    def active(self, request):
        """Return the currently active strategic plan (or message if none)."""
        plan = StrategicPlan.objects.filter(is_active=True).first()
        
        if not plan:
            return Response({
                "active_plan": None,
                "message": "No active plan found. Please create or activate one."
            }, status=200)

        serializer = self.get_serializer(plan)
        return Response({
            "active_plan": serializer.data,
            "message": "Active plan retrieved successfully."
        }, status=200)
    
    def perform_create(self, serializer):
        org = getattr(self.request.user, "organization", None)
        if not org:
            raise serializers.ValidationError({"org": "User is not linked to an organization."})
        serializer.save(org=org)

class StrategicObjectiveViewSet(viewsets.ModelViewSet):
    queryset = StrategicObjective.objects.all()
    serializer_class = StrategicObjectiveSerializer

    def perform_create(self, serializer):
        plan_id = self.request.data.get("plan")
        if not plan_id:
            raise serializers.ValidationError({"plan": "A plan ID must be provided."})
        serializer.save(plan_id=plan_id)


class CorporateIndicatorViewSet(viewsets.ModelViewSet):
    queryset = CorporateIndicator.objects.all()
    serializer_class = CorporateIndicatorSerializer

class DisaggregatorViewSet(viewsets.ModelViewSet):
    queryset = Disaggregator.objects.all()
    serializer_class = DisaggregatorSerializer


class StrategicPlanYearViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = StrategicPlanYear.objects.all()
    serializer_class = StrategicPlanYearSerializer

    def get_queryset(self):
        plan_id = self.request.query_params.get('plan')
        if plan_id:
            return self.queryset.filter(plan_id=plan_id)
        return self.queryset
    
class StrategicObjectiveStatementViewSet(viewsets.ModelViewSet):
    queryset = StrategicObjectiveStatement.objects.all()
    serializer_class = StrategicObjectiveStatementSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        objective_id = self.request.query_params.get('objective')
        if objective_id:
            queryset = queryset.filter(objective_id=objective_id)
        return queryset


class CorporateIndicatorPerformanceViewSet(viewsets.ModelViewSet):
    queryset = CorporateIndicatorPerformance.objects.select_related(
        "indicator",
        "year",
    )
    serializer_class = CorporateIndicatorPerformanceSerializer

    filter_backends = [
        DjangoFilterBackend,
        SearchFilter,
        OrderingFilter,
    ]

    filterset_fields = [
        "indicator",
        "year",
    ]

    search_fields = [
        "indicator__name",
    ]

    ordering_fields = [
        "year__year",
        "target",
        "actual",
    ]

    ordering = ["indicator", "year__year"]