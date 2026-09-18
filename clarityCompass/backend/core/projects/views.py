from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import (
    IndicatorDisaggregatedValue, Project, ProjectIndicator, ProjectIndicatorTarget, Donor, Location, ProjectTeamMember, ProjectObjective, 
    ProjectOutcome, ProjectOutput, ProjectOutcomeIndicator, ProjectOutputIndicator, ProjectReportingSchedule, 
    ProjectReportSubmission, ProjectReportSubmissionHistory
)
from .serializers import (
    IndicatorDisaggregatedValueSerializer, ProjectSerializer, ProjectIndicatorSerializer, ProjectIndicatorTargetSerializer, DonorSerializer, 
    LocationSerializer, ProjectTeamMemberSerializer, ProjectObjectiveSerializer, ProjectOutcomeIndicatorSerializer, 
    ProjectOutputIndicatorSerializer, ProjectOutcomeSerializer, ProjectOutputSerializer, ProjectReportSubmissionSerializer, 
    ProjectReportingScheduleSerializer, ProjectReportSubmissionStatusSerializer, ProjectReportSubmissionHistorySerializer,
    ProjectReportDataSerializer
)
from rest_framework.permissions import IsAuthenticated
from strategic.models import Disaggregator, IndicatorDisaggregation
from django.http import FileResponse, Http404
from django.utils import timezone
from rest_framework import status as drf_status
from rest_framework.decorators import api_view, permission_classes
from tasks.models import Task, TaskUpdate

class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['PUT', 'POST'], url_path='donors', url_name='donors')
    def donors(self, request, pk=None):
        project = self.get_object()
        
        if request.method == 'POST':
            donor_id = request.data.get('donor_id')
            if not donor_id:
                return Response(
                    {'error': 'donor_id is required.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
           
            try:
                donor = Donor.objects.get(id=donor_id)
                project.donors.add(donor)
                project.save()
                serializer = DonorSerializer(donor)
                return Response(serializer.data)
            except Donor.DoesNotExist:
                return Response(
                    {'error': 'Donor not found.'},
                    status=status.HTTP_404_NOT_FOUND
                )
               
        elif request.method == 'PUT':
            donor_ids = request.data.get('donor_ids', [])
            
            donors = Donor.objects.filter(id__in=donor_ids)
            if len(donors) != len(donor_ids):
                return Response(
                    {'error': 'One or more donor IDs are invalid.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            project.donors.set(donors)
            project.save()
            
            serializer = DonorSerializer(donors, many=True)
            return Response(serializer.data)

    @action(detail=True, methods=['GET'], url_path='report-data', url_name='report-data')
    def get_report_data(self, request, pk=None):
        """
        Get detailed report data for a specific project
        using the ProjectReportDataSerializer
        """
        try:
            project = self.get_object()
            serializer = ProjectReportDataSerializer(project, context={'request': request})
            return Response(serializer.data)
        except Project.DoesNotExist:
            return Response(
                {'error': 'Project not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['DELETE'], url_path='donors/(?P<donor_id>[^/.]+)', url_name='remove-donor')
    def remove_donor(self, request, pk=None, donor_id=None):
        """Remove a specific donor from the project"""
        project = self.get_object()
        
        try:
            donor = Donor.objects.get(id=donor_id)
            project.donors.remove(donor)
            project.save()
            return Response(
                {'message': f'Donor {donor_id} removed from project successfully.'},
                status=status.HTTP_200_OK
            )
        except Donor.DoesNotExist:
            return Response(
                {'error': 'Donor not found.'},
                status=status.HTTP_404_NOT_FOUND
            )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_schedule_submissions(request, schedule_id):
    """Get all submissions for a specific schedule"""
    try:
        schedule = ProjectReportingSchedule.objects.get(id=schedule_id)
        
        if schedule.project.manager != request.user and not request.user.is_superuser:
            return Response(
                {"error": "You don't have permission to view this schedule"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        submissions = schedule.submissions.all().order_by('-submitted_at')
        serializer = ProjectReportSubmissionSerializer(submissions, many=True, context={'request': request})
        
        return Response({
            "schedule": schedule.name,
            "total_submissions": submissions.count(),
            "submissions": serializer.data
        })
        
    except ProjectReportingSchedule.DoesNotExist:
        return Response({"error": "Schedule not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


class ProjectIndicatorViewSet(viewsets.ModelViewSet):
    queryset = ProjectIndicator.objects.all()
    serializer_class = ProjectIndicatorSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = ProjectIndicator.objects.all()
        project_id = self.request.query_params.get('project')
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        return queryset
    
    def perform_create(self, serializer):
        raw_disaggregators = self.request.data.get("disaggregators", [])
        indicator = serializer.save()

        for item in raw_disaggregators:
            disagg = None

            if isinstance(item, int) or (isinstance(item, str) and item.isdigit()):
                disagg = Disaggregator.objects.filter(id=item).first()

            if disagg is None and isinstance(item, str):
                disagg = Disaggregator.objects.filter(name=item).first()

            if disagg is None:
                continue

            IndicatorDisaggregation.objects.get_or_create(
                project_indicator=indicator,
                disaggregator=disagg
            )

    def perform_update(self, serializer):
        raw_disaggregators = self.request.data.get("disaggregators", [])
        indicator = serializer.save()

        normalized = []
        for item in raw_disaggregators:
            if isinstance(item, int) or (isinstance(item, str) and item.isdigit()):
                disagg = Disaggregator.objects.filter(id=item).first()
            else:
                disagg = Disaggregator.objects.filter(name=item).first()

            if disagg:
                normalized.append(disagg)

        IndicatorDisaggregation.objects.filter(
            project_indicator=indicator
        ).exclude(disaggregator__in=normalized).delete()

        for disagg in normalized:
            IndicatorDisaggregation.objects.get_or_create(
                project_indicator=indicator,
                disaggregator=disagg
            )



class ProjectIndicatorTargetViewSet(viewsets.ModelViewSet):
    queryset = ProjectIndicatorTarget.objects.all()
    serializer_class = ProjectIndicatorTargetSerializer
    permission_classes = [IsAuthenticated]

class DonorViewSet(viewsets.ModelViewSet):
    queryset = Donor.objects.all()
    serializer_class = DonorSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save()

class LocationViewSet(viewsets.ModelViewSet):
    queryset = Location.objects.all()
    serializer_class = LocationSerializer


class ProjectTeamMemberViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectTeamMemberSerializer
    queryset = ProjectTeamMember.objects.all()

    def get_queryset(self):
        project_id = self.kwargs.get('project_pk')
        if project_id:
            return ProjectTeamMember.objects.filter(project_id=project_id)
        return ProjectTeamMember.objects.all()

    def create(self, request, *args, **kwargs):
        project_id = self.kwargs.get('project_pk')
        project = Project.objects.get(pk=project_id)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(project=project)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ProjectObjectiveViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectObjectiveSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = ProjectObjective.objects.all()

        project_id = self.request.query_params.get('project')
        if project_id:
            queryset = queryset.filter(project_id=project_id)

        return queryset


class ProjectOutcomeViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectOutcomeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = ProjectOutcome.objects.select_related(
            'project_objective__project'
        )

        objective_id = self.request.query_params.get('project_objective')
        if objective_id:
            queryset = queryset.filter(project_objective_id=objective_id)

        return queryset



class ProjectOutputViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectOutputSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = ProjectOutput.objects.select_related(
            'project_outcome__project_objective__project'
        )

        outcome_id = self.request.query_params.get('project_outcome')
        if outcome_id:
            queryset = queryset.filter(project_outcome_id=outcome_id)

        return queryset


class ProjectOutcomeIndicatorViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectOutcomeIndicatorSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = ProjectOutcomeIndicator.objects.select_related(
            'outcome__project_objective__project'
        )

        project_id = self.request.query_params.get('project')
        if project_id:
            queryset = queryset.filter(
                outcome__project_objective__project_id=project_id
            )

        return queryset



class ProjectOutputIndicatorViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectOutputIndicatorSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = ProjectOutputIndicator.objects.select_related(
            'output__project_outcome__project_objective__project'
        )

        project_id = self.request.query_params.get('project')
        if project_id:
            queryset = queryset.filter(
                output__project_outcome__project_objective__project_id=project_id
            )

        return queryset


class IndicatorDisaggregatedValueViewSet(viewsets.ModelViewSet):
    queryset = IndicatorDisaggregatedValue.objects.all()
    serializer_class = IndicatorDisaggregatedValueSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()

        outcome_indicator = self.request.query_params.get('outcome_indicator')
        output_indicator = self.request.query_params.get('output_indicator')

        if outcome_indicator:
            queryset = queryset.filter(outcome_indicator=outcome_indicator)

        if output_indicator:
            queryset = queryset.filter(output_indicator=output_indicator)

        return queryset



class ProjectReportingScheduleViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectReportingScheduleSerializer

    def get_queryset(self):
        project_id = self.kwargs.get("project_pk")
        return ProjectReportingSchedule.objects.filter(project_id=project_id)

    def perform_create(self, serializer):
        project_id = self.kwargs.get('project_pk')
        serializer.save(project_id=project_id)


class ProjectReportSubmissionViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectReportSubmissionSerializer

    def get_queryset(self):
        schedule_id = self.kwargs.get("schedule_pk")
        return ProjectReportSubmission.objects.filter(schedule_id=schedule_id)
    
    def perform_create(self, serializer):
        schedule_id = self.kwargs.get("schedule_pk")
        submission = serializer.save(schedule_id=schedule_id, created_by=self.request.user)

        ProjectReportSubmissionHistory.objects.create(
            submission=submission,
            status=submission.status,
            notes=submission.notes or "Initial submission",
            reviewed_by=self.request.user,
            reviewed_at=timezone.now(),
        )
    
    def perform_update(self, serializer):
        submission = self.get_object()

        before = {
            "title": submission.title,
            "file": submission.file,
            "notes": submission.notes,
            "status": submission.status,
        }

        updated_submission = serializer.save()

        after = {
            "title": updated_submission.title,
            "file": updated_submission.file,
            "notes": updated_submission.notes,
            "status": updated_submission.status,
        }

        changed_fields = []
        for field in before:
            if field == "file":
                if before["file"].name != after["file"].name:
                    changed_fields.append("file")
            elif before[field] != after[field]:
                changed_fields.append(field)

        change_notes = (
            f"Updated fields: {', '.join(changed_fields)}"
            if changed_fields else "Updated submission"
        )

        ProjectReportSubmissionHistory.objects.create(
            submission=updated_submission,
            status=updated_submission.status,
            notes=updated_submission.notes or change_notes,
            file=updated_submission.file, 
            reviewed_by=self.request.user,
            reviewed_at=timezone.now(),
        )

    @action(detail=True, methods=['patch'])
    def update_status(self, request, project_pk=None, schedule_pk=None, pk=None):
        submission = self.get_object()
        new_status = request.data.get("status", submission.status)
        notes = request.data.get("notes", "")

        submission.status = new_status
        submission.save(update_fields=["status"])

        ProjectReportSubmissionHistory.objects.create(
            submission=submission,
            status=new_status,
            notes=notes,
            reviewed_by=request.user,
            reviewed_at=timezone.now()
        )
        serializer = ProjectReportSubmissionSerializer(submission)
        return Response(serializer.data, status=drf_status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def history(self, request, project_pk=None, schedule_pk=None, pk=None):
        submission = self.get_object()
        history = submission.history.all()
        serializer = ProjectReportSubmissionHistorySerializer(history, many=True)
        return Response(serializer.data)

    def get_serializer_context(self):
        return {"request": self.request}
    
    @action(detail=True, methods=["get"])
    def download(self, request, project_pk=None, schedule_pk=None, pk=None):
        submission = self.get_object()
        if not submission.file:
            return Response({"error": "No file uploaded"}, status=404)

        return FileResponse(
            submission.file.open("rb"),
            as_attachment=True,
            filename=submission.file.name.split("/")[-1]
        )


