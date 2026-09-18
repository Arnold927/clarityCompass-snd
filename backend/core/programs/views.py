from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from .models import (
    Program, ProgramIndicator, ProgramOutcome, ProgramOutcomeIndicator, ProgramOutcomePerformance, ReportingQuarter, 
    ProgramOutcomeIndicatorPerformance
)
from .serializers import (
    ProgramOutcomePerformanceSerializer, ProgramSerializer, ProgramIndicatorSerializer, ProgramOutcomeSerializer,
    ProgramOutcomeIndicatorSerializer, ReportingQuarterSerializer,
    ProgramOutcomeIndicatorPerformanceSerializer
)
from rest_framework.decorators import action
from strategic.models import StrategicObjective
from rest_framework.response import Response
from rest_framework import status 
from rest_framework.permissions import IsAuthenticated
from django.db import IntegrityError


class ProgramViewSet(viewsets.ModelViewSet):
    queryset = Program.objects.all()
    serializer_class = ProgramSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        org = getattr(self.request.user, "organization", None)
        serializer.save(org=org)

    @action(detail=True, methods=["post"], url_path="link-objective")
    def link_objective(self, request, pk=None):
        """Link a strategic objective to a program."""
        program = self.get_object()
        objective_id = request.data.get("objective_id")

        if not objective_id:
            return Response({"error": "objective_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            objective = StrategicObjective.objects.get(id=objective_id)
        except StrategicObjective.DoesNotExist:
            return Response({"error": "Objective not found"}, status=status.HTTP_404_NOT_FOUND)

        program.linked_objectives.add(objective)
        program.save()

        return Response(
            {"message": f"Objective '{objective}' linked successfully"},
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=["post"], url_path="unlink-objective")
    def unlink_objective(self, request, pk=None):
        """Unlink a strategic objective from a program."""
        program = self.get_object()
        objective_id = request.data.get("objective_id")

        try:
            objective = StrategicObjective.objects.get(id=objective_id)
        except StrategicObjective.DoesNotExist:
            return Response({"error": "Objective not found"}, status=status.HTTP_404_NOT_FOUND)

        program.linked_objectives.remove(objective)
        return Response(
            {"message": f"Objective '{objective}' unlinked successfully"},
            status=status.HTTP_200_OK
        )


class ProgramIndicatorViewSet(viewsets.ModelViewSet):
    queryset = ProgramIndicator.objects.all()
    serializer_class = ProgramIndicatorSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = super().get_queryset()
        program_id = self.request.query_params.get("program")
        if program_id:
            queryset = queryset.filter(program__id=program_id)
        return queryset

    def perform_create(self, serializer):
        serializer.save()

class ProgramOutcomeViewSet(viewsets.ModelViewSet):
    queryset = ProgramOutcome.objects.all()
    serializer_class = ProgramOutcomeSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = super().get_queryset()
        program_id = self.request.query_params.get("program")
        if program_id:
            queryset = queryset.filter(program__id=program_id)
        return queryset

class ProgramOutcomeIndicatorViewSet(viewsets.ModelViewSet):
    queryset = ProgramOutcomeIndicator.objects.all()
    serializer_class = ProgramOutcomeIndicatorSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = super().get_queryset()
        outcome_id = self.request.query_params.get("outcome")
        program_id = self.request.query_params.get("program")

        if outcome_id:
            queryset = queryset.filter(outcome__id=outcome_id)

        if program_id:
            queryset = queryset.filter(outcome__program__id=program_id)

        return queryset

class ReportingQuarterViewSet(viewsets.ModelViewSet):
    queryset = ReportingQuarter.objects.all()
    serializer_class = ReportingQuarterSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

class ReportingQuarterViewSet(viewsets.ModelViewSet):
    queryset = ReportingQuarter.objects.all().order_by('-year', '-quarter')
    serializer_class = ReportingQuarterSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['year', 'quarter']

    def create(self, request, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        except IntegrityError:
            return Response(
                {"error": "A quarter with this year and quarter combination already exists"},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def update(self, request, *args, **kwargs):
        try:
            partial = kwargs.pop('partial', False)
            instance = self.get_object()
            serializer = self.get_serializer(instance, data=request.data, partial=partial)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            return Response(serializer.data)
        except IntegrityError:
            return Response(
                {"error": "A quarter with this year and quarter combination already exists"},
                status=status.HTTP_400_BAD_REQUEST
            )


class ProgramOutcomeIndicatorPerformanceViewSet(viewsets.ModelViewSet):
    queryset = ProgramOutcomeIndicatorPerformance.objects.select_related(
        'indicator', 'indicator__outcome', 'indicator__outcome__program', 'quarter'
    ).all()
    serializer_class = ProgramOutcomeIndicatorPerformanceSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['indicator', 'quarter', 'indicator__outcome__program']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        program_id = self.request.query_params.get('program')
        if program_id:
            queryset = queryset.filter(indicator__outcome__program_id=program_id)
            
        return queryset

class ProgramOutcomePerformanceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and editing program outcome performances.
    Supports list, create, retrieve, update, partial_update, destroy.
    """
    queryset = ProgramOutcomePerformance.objects.all()
    serializer_class = ProgramOutcomePerformanceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        
        outcome = self.request.query_params.get('outcome')
        if outcome:
            queryset = queryset.filter(outcome_id=outcome)
        
        quarter = self.request.query_params.get('quarter')
        if quarter:
            queryset = queryset.filter(quarter_id=quarter)
            
        program = self.request.query_params.get('program')
        if program:
            queryset = queryset.filter(outcome__program_id=program)
            
        return queryset

