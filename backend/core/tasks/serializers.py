from rest_framework import serializers

from strategic.models import CorporateIndicator
from .models import KeyActivity, Task, TaskIndicatorProgress, TaskUpdate, TaskIndicatorData, TaskReport, TaskIndicatorDisaggregatedValue, TaskTOR, TaskCompletionReport, TaskNotification
from projects.models import Location, ProjectTeamMember, ProjectIndicator
from strategic.serializers import DisaggregatorSerializer, IndicatorDisaggregationSerializer


class KeyActivitySerializer(serializers.ModelSerializer):
    linkedIndicatorId = serializers.IntegerField(source='linked_project_indicator.id', read_only=True)

    class Meta:
        model = KeyActivity
        fields = ['id', 'project', 'linked_project_indicator', 'linkedIndicatorId', 'name', 'description',
                  'start_date', 'end_date', 'is_completed']


class TaskUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskUpdate
        fields = ['id', 'task', 'status_date', 'status', 'status_justification', 'is_complete', 'amount_spent', 'created_at']


# ============= NEW SERIALIZERS FOR TASK WORKFLOW =============

class TaskTORSerializer(serializers.ModelSerializer):
    """Serializer for Task TOR (Terms of Reference)"""
    uploaded_by_name = serializers.SerializerMethodField()
    filename = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = TaskTOR
        fields = [
            'id', 'task', 'file', 'file_url', 'filename', 'description',
            'uploaded_by', 'uploaded_by_name', 'uploaded_at'
        ]
        read_only_fields = ['uploaded_by', 'uploaded_at']
    
    def get_uploaded_by_name(self, obj):
        if obj.uploaded_by:
            return obj.uploaded_by.get_full_name() or obj.uploaded_by.username
        return None
    
    def get_filename(self, obj):
        return obj.filename
    
    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None


class TaskCompletionReportSerializer(serializers.ModelSerializer):
    """Serializer for Task Completion Reports (after field visit)"""
    submitted_by_name = serializers.SerializerMethodField()
    activity_report_filename = serializers.SerializerMethodField()
    activity_report_url = serializers.SerializerMethodField()
    participants_filename = serializers.SerializerMethodField()
    participants_url = serializers.SerializerMethodField()
    
    class Meta:
        model = TaskCompletionReport
        fields = [
            'id', 'task', 'activity_report', 'activity_report_url', 'activity_report_filename',
            'participants_list', 'participants_url', 'participants_filename',
            'notes', 'submitted_by', 'submitted_by_name', 'submitted_at'
        ]
        read_only_fields = ['submitted_by', 'submitted_at']
    
    def get_submitted_by_name(self, obj):
        if obj.submitted_by:
            return obj.submitted_by.get_full_name() or obj.submitted_by.username
        return None
    
    def get_activity_report_filename(self, obj):
        return obj.activity_report_filename
    
    def get_activity_report_url(self, obj):
        request = self.context.get('request')
        if obj.activity_report and request:
            return request.build_absolute_uri(obj.activity_report.url)
        return None
    
    def get_participants_filename(self, obj):
        return obj.participants_filename
    
    def get_participants_url(self, obj):
        request = self.context.get('request')
        if obj.participants_list and request:
            return request.build_absolute_uri(obj.participants_list.url)
        return None


class TaskNotificationSerializer(serializers.ModelSerializer):
    """Serializer for Task Notifications"""
    sent_to_name = serializers.SerializerMethodField()
    task_title = serializers.SerializerMethodField()
    
    class Meta:
        model = TaskNotification
        fields = [
            'id', 'task', 'task_title', 'notification_type', 'message',
            'sent_to', 'sent_to_name', 'sent_at', 'is_read', 'read_at'
        ]
        read_only_fields = ['sent_at', 'read_at']
    
    def get_sent_to_name(self, obj):
        if obj.sent_to:
            return obj.sent_to.get_full_name() or obj.sent_to.username
        return None
    
    def get_task_title(self, obj):
        return obj.task.title


# ============= UPDATED TASK SERIALIZER =============

class TaskSerializer(serializers.ModelSerializer):
    focal_person = serializers.SerializerMethodField()
    focal_person_id = serializers.PrimaryKeyRelatedField(
        queryset=ProjectTeamMember.objects.all(),
        source='focal_person',
        write_only=True,
        required=False,
        allow_null=True
    )

    location = serializers.PrimaryKeyRelatedField(
        queryset=Location.objects.all(), 
        many=True
    )
    updates = TaskUpdateSerializer(many=True, read_only=True)
    indicatorData = serializers.SerializerMethodField()
    activityId = serializers.IntegerField(source="activity.id", read_only=True)
    linkedIndicatorId = serializers.IntegerField(source='activity.linked_project_indicator.id', read_only=True)
    linkedIndicatorName = serializers.CharField(
        source='activity.linked_project_indicator.indicatorName',
        read_only=True
    )
    qaAdjustments = serializers.JSONField(required=False)
    disaggregators = serializers.SerializerMethodField()
    startDate = serializers.DateField(source='start_date', read_only=True)
    endDate = serializers.DateField(source='end_date', read_only=True)
    locationIds = serializers.SerializerMethodField()
    activityName = serializers.CharField(source='activity.name', read_only=True)
    location_details = serializers.SerializerMethodField()
    
    # NEW FIELDS FOR TASK WORKFLOW
    status = serializers.ChoiceField(
        choices=['PLANNED', 'ONGOING', 'COMPLETED', 'CANCELLED'],
        required=False,
        default='PLANNED'
    )
    has_tor = serializers.SerializerMethodField()
    has_completion_report = serializers.SerializerMethodField()
    tor_details = serializers.SerializerMethodField()
    completion_report_details = serializers.SerializerMethodField()
    notifications = serializers.SerializerMethodField()
    
    class Meta:
        model = Task
        fields = [
            'id', 'activity', 'project', 'output', 'activityId', 'linkedIndicatorId', 'title',
            'description', 'focal_person', 'focal_person_id', 'start_date', 'end_date',
            'budget', 'created_at', 'location', 'indicatorData', 'linkedIndicatorName',
            'qaAdjustments', 'disaggregators', 'cumulative_spent', 'updates', 'startDate',
            'endDate', 'locationIds', 'location_details', 'activityName',
            # NEW FIELDS
            'status', 'has_tor', 'has_completion_report', 'tor_details',
            'completion_report_details', 'notifications', 'currency'
        ]

    def get_locationIds(self, obj):
        return [loc.id for loc in obj.location.all()]

    def get_focal_person(self, obj):
        from projects.serializers import ProjectTeamMemberSerializer
        if obj.focal_person:
            return ProjectTeamMemberSerializer(obj.focal_person).data
        return None
    
    def get_indicatorData(self, obj):
        indicator = getattr(obj.activity, 'linked_project_indicator', None)
        if not indicator:
            return {}

        disaggregators = [d.disaggregator.name for d in indicator.disaggregations.all()] or ['value']

        data = {d: 0 for d in disaggregators}

        latest_update = obj.updates.order_by('-status_date').first()
        if latest_update:
            for item in latest_update.indicator_data.all():
                name = item.indicator_disaggregation.name
                data[name] = float(item.value)

        return data

    def get_disaggregators(self, obj):
        indicator = getattr(obj.activity, 'linked_project_indicator', None)
        if not indicator:
            return []

        disaggregations = indicator.disaggregations.all()
        from projects.serializers import IndicatorDisaggregationSerializer
        return IndicatorDisaggregationSerializer(disaggregations, many=True).data

    def get_location_details(self, obj):
        """Return full location objects instead of just IDs"""
        from projects.serializers import LocationSerializer
        return LocationSerializer(obj.location.all(), many=True).data
    
    # NEW METHODS FOR TASK WORKFLOW
    def get_has_tor(self, obj):
        """Check if task has TOR uploaded"""
        return hasattr(obj, 'tor') and obj.tor is not None
    
    def get_has_completion_report(self, obj):
        """Check if task has completion report submitted"""
        return hasattr(obj, 'completion_report') and obj.completion_report is not None
    
    def get_tor_details(self, obj):
        """Get TOR details if available"""
        if hasattr(obj, 'tor') and obj.tor:
            request = self.context.get('request')
            return {
                'id': obj.tor.id,
                'filename': obj.tor.filename,
                'file_url': request.build_absolute_uri(obj.tor.file.url) if request and obj.tor.file else None,
                'uploaded_by': obj.tor.uploaded_by.get_full_name() if obj.tor.uploaded_by else None,
                'uploaded_at': obj.tor.uploaded_at,
                'description': obj.tor.description
            }
        return None
    
    def get_completion_report_details(self, obj):
        """Get completion report details if available"""
        if hasattr(obj, 'completion_report') and obj.completion_report:
            request = self.context.get('request')
            return {
                'id': obj.completion_report.id,
                'activity_report_filename': obj.completion_report.activity_report_filename,
                'activity_report_url': request.build_absolute_uri(obj.completion_report.activity_report.url) if request and obj.completion_report.activity_report else None,
                'participants_filename': obj.completion_report.participants_filename,
                'participants_url': request.build_absolute_uri(obj.completion_report.participants_list.url) if request and obj.completion_report.participants_list else None,
                'submitted_by': obj.completion_report.submitted_by.get_full_name() if obj.completion_report.submitted_by else None,
                'submitted_at': obj.completion_report.submitted_at,
                'notes': obj.completion_report.notes
            }
        return None
    
    def get_notifications(self, obj):
        """Get recent notifications for this task"""
        notifications = obj.notifications.all()[:10]  # Last 10 notifications
        return TaskNotificationSerializer(notifications, many=True, context=self.context).data


# ============= TASK CREATE/UPDATE SERIALIZER WITH VALIDATION =============

class TaskCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating tasks with workflow validation"""
    
    class Meta:
        model = Task
        fields = [
            'id', 'project', 'activity', 'output', 'title', 'description',
            'focal_person', 'start_date', 'end_date', 'budget',
            'location', 'status'
            # Note: 'currency' is NOT writable — it is always inherited from the
            # project in Task.save(). Exposing it as writable would allow drift.
        ]
    
    def validate_status(self, value):
        """Validate status transitions"""
        instance = self.instance
        
        if instance:
            # Check if trying to mark as ONGOING without TOR
            if value == 'ONGOING' and not hasattr(instance, 'tor'):
                raise serializers.ValidationError(
                    'Cannot mark as ONGOING. Please upload TOR first.'
                )
            
            # Check if trying to mark as COMPLETED without completion report
            if value == 'COMPLETED' and not hasattr(instance, 'completion_report'):
                raise serializers.ValidationError(
                    'Cannot mark as COMPLETED. Please submit completion report first.'
                )
        
        return value
    
    def validate(self, data):
        """
        Ensure the task's project has a currency set.
        The actual currency is always inherited from the project in Task.save(),
        so there is nothing for the caller to supply — we just guard against
        projects that somehow have no currency recorded.
        """
        project = data.get('project') or (self.instance.project if self.instance else None)
        if project and not project.currency:
            raise serializers.ValidationError(
                {
                    'project': (
                        f'Project "{project.title}" does not have a currency set. '
                        'Please set the project currency before creating tasks.'
                    )
                }
            )
        return data

    def create(self, validated_data):
        # Set default status to PLANNED
        if 'status' not in validated_data:
            validated_data['status'] = 'PLANNED'
        return super().create(validated_data)


# ============= TOR UPLOAD SERIALIZER =============

class TaskTORUploadSerializer(serializers.ModelSerializer):
    """Serializer for uploading TOR"""
    
    class Meta:
        model = TaskTOR
        fields = ['file', 'description']
    
    def validate(self, data):
        task = self.context.get('task')
        
        if task and hasattr(task, 'tor') and task.tor:
            raise serializers.ValidationError({
                'file': 'TOR already uploaded for this task'
            })
        
        return data


# ============= COMPLETION REPORT SUBMIT SERIALIZER =============

class TaskCompletionReportSubmitSerializer(serializers.ModelSerializer):
    """Serializer for submitting completion report"""
    
    class Meta:
        model = TaskCompletionReport
        fields = ['activity_report', 'participants_list', 'notes']
    
    def validate(self, data):
        task = self.context.get('task')
        
        if not task:
            return data
        
        # Check if TOR exists
        if not hasattr(task, 'tor') or not task.tor:
            raise serializers.ValidationError({
                'activity_report': 'Please upload TOR before submitting completion report'
            })
        
        # Check if completion report already exists
        if hasattr(task, 'completion_report') and task.completion_report:
            raise serializers.ValidationError({
                'activity_report': 'Completion report already submitted for this task'
            })
        
        return data


# ============= NOTIFICATION MARK AS READ SERIALIZER =============

class NotificationMarkAsReadSerializer(serializers.Serializer):
    """Serializer for marking notifications as read"""
    notification_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text="List of notification IDs to mark as read"
    )
    mark_all = serializers.BooleanField(
        required=False, 
        default=False,
        help_text="Set to true to mark all notifications as read"
    )


# ============= EXISTING SERIALIZERS (unchanged below) =============

class TaskIndicatorProgressSerializer(serializers.ModelSerializer):
    indicator_name = serializers.CharField(source='output_indicator.name', read_only=True)
    indicator_description = serializers.CharField(source='output_indicator.description', read_only=True)
    disaggregators = serializers.SerializerMethodField()
    
    class Meta:
        model = TaskIndicatorProgress
        fields = [
            'id', 'output_indicator', 'indicator_name', 'indicator_description',
            'target_contribution', 'actual_contribution', 'notes', 'disaggregators'
        ]
    
    def get_disaggregators(self, obj):
        values = TaskIndicatorDisaggregatedValue.objects.filter(
            task_indicator_progress=obj
        ).select_related('disaggregator')
        
        return [{
            'disaggregator_id': v.disaggregator.id,
            'disaggregator_name': v.disaggregator.name,
            'target': v.target,
            'actual': v.actual
        } for v in values]


class TaskIndicatorDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskIndicatorData
        fields = ['id', 'task_update', 'indicator_disaggregation', 'value']


class TaskReportSerializer(serializers.ModelSerializer):
    task = serializers.PrimaryKeyRelatedField(queryset=Task.objects.all())
    indicator = serializers.PrimaryKeyRelatedField(
        queryset=ProjectIndicator.objects.all(), 
        required=False,
        allow_null=True
    )
    
    class Meta:
        model = TaskReport
        fields = [
            'id', 'task', 'indicator',
            'baseline_value', 'target_value', 'is_baseline_set',
            'main_indicator_value', 'reported_data', 
            'submitted_by', 'submitted_at',
        ]
        read_only_fields = ['submitted_by', 'submitted_at', 'is_baseline_set']
    
    def create(self, validated_data):
        validated_data['submitted_by'] = self.context['request'].user
        return super().create(validated_data)