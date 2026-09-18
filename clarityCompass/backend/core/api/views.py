from django.shortcuts import render
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework import viewsets
from .models import Project
from .serializers import ProjectSerializer

# Create your views here.


@api_view(['GET'])
def hello(request):
    return Response({"message": "Hello from Django backend!"})


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer