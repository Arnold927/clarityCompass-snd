from django.shortcuts import render
from rest_framework import viewsets
from .models import Outcome, OutcomeIndicator, Output, OutputIndicator
from rest_framework.permissions import IsAuthenticated
from .serializers import OutcomeSerializer, OutcomeIndicatorSerializer, OutputSerializer, OutputIndicatorSerializer

class OutcomeViewSet(viewsets.ModelViewSet):
    queryset = Outcome.objects.all()
    serializer_class = OutcomeSerializer

class OutcomeIndicatorViewSet(viewsets.ModelViewSet):
    queryset = OutcomeIndicator.objects.all()
    serializer_class = OutcomeIndicatorSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save() 

class OutputViewSet(viewsets.ModelViewSet):
    queryset = Output.objects.all()
    serializer_class = OutputSerializer
    permission_classes = [IsAuthenticated]

class OutputIndicatorViewSet(viewsets.ModelViewSet):
    queryset = OutputIndicator.objects.all()
    serializer_class = OutputIndicatorSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save()
