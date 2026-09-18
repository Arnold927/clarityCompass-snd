from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Complaint, ComplaintFollowUp, ComplaintAttachment, ComplaintComment
from projects.serializers import ProjectSerializer


User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']


class ComplaintFollowUpSerializer(serializers.ModelSerializer):
    followed_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = ComplaintFollowUp
        fields = '__all__'
        read_only_fields = ['created_at', 'complaint']
        extra_kwargs = {
            'complaint': {'required': False}
        }
    
    def get_followed_by_name(self, obj):
        if obj.followed_by:
            return f"{obj.followed_by.first_name} {obj.followed_by.last_name}".strip() or obj.followed_by.username
        return None


class ComplaintAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ComplaintAttachment
        fields = '__all__'
        read_only_fields = ['uploaded_at', 'complaint']
        extra_kwargs = {
            'complaint': {'required': False}
        }
    
    def get_uploaded_by_name(self, obj):
        if obj.uploaded_by:
            return f"{obj.uploaded_by.first_name} {obj.uploaded_by.last_name}".strip() or obj.uploaded_by.username
        return None
    
    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None


class ComplaintCommentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)  # This will return the full user object
    user_name = serializers.SerializerMethodField()
    
    class Meta:
        model = ComplaintComment
        fields = '__all__'
        read_only_fields = ['created_at', 'complaint', 'user']
        extra_kwargs = {
            'complaint': {'required': False},
            'user': {'required': False}
        }
    
    def get_user_name(self, obj):
        if obj.user:
            return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.username
        return None

class ComplaintListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views"""
    created_by_name = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()
    project_name = serializers.SerializerMethodField()
    comment_count = serializers.SerializerMethodField()
    followup_count = serializers.SerializerMethodField()
    alleged_perpetrator_type = serializers.CharField(source='alleged_perpetrator', read_only=True, allow_null=True)
    project = ProjectSerializer(read_only=True)
    assigned_to = UserSerializer(read_only=True)
    
    class Meta:
        model = Complaint
        fields = [
            'id', 'case_id', 'description', 'status', 'priority',
            'sensitivity_level', 'category', 'full_name', 'feedback_type', 'geographic_area', 'specific_location',
            'created_at', 'updated_at', 'deadline', 'assigned_to', 'project',
            'assigned_to_name', 'created_by_name', 'project_name',
            'comment_count', 'followup_count', 'case_status',
            'date_response_provided', 'date_case_closed',
            'gender', 'phone_number', 'id_number', 'nationality',
            'sub_category', 'other_subject', 'alleged_perpetrator',
            'responsible_person', 'actions_taken', 'additional_comments', 'alleged_perpetrator_type'
        ]
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.username
        return None
    
    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return f"{obj.assigned_to.first_name} {obj.assigned_to.last_name}".strip() or obj.assigned_to.username
        return None
    
    def get_project_name(self, obj):
        return obj.project.title if obj.project else None
    
    def get_comment_count(self, obj):
        return obj.comments.count()
    
    def get_followup_count(self, obj):
        return obj.followups.count()


class ComplaintDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for single complaint view"""
    # created_by = UserSerializer(read_only=True)
    # assigned_to = UserSerializer(read_only=True)
    # updated_by = UserSerializer(read_only=True)
    created_by_name = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()
    updated_by_name = serializers.SerializerMethodField()
    followups = ComplaintFollowUpSerializer(many=True, read_only=True)
    attachments = ComplaintAttachmentSerializer(many=True, read_only=True)
    comments = ComplaintCommentSerializer(many=True, read_only=True)
    project = ProjectSerializer(read_only=True)
    project_name = serializers.SerializerMethodField()
    
    alleged_perpetrator_type = serializers.CharField(source='alleged_perpetrator', read_only=True, allow_null=True)
    comments_field = serializers.CharField(source='additional_comments', read_only=True, allow_null=True)
    alleged_perpetrator_details = serializers.SerializerMethodField()

    class Meta:
        model = Complaint
        fields = [
            'id', 'case_id', 'case_status', 'date_feedback_received', 'feedback_channel',
            'full_name', 'gender', 'phone_number', 'id_number', 'nationality',
            'feedback_type', 'geographic_area', 'specific_location',
            'has_thanking_note', 'sensitivity_level', 'category', 'sub_category', 'other_subject', 'description',
            'alleged_perpetrator_details', 'alleged_perpetrator_type',
            'responsible_person', 'actions_taken', 'evidence_of_followup',
            'date_response_provided', 'date_case_closed', 'comments_field',
            'created_by_name', 'assigned_to_name', 'updated_by_name', 
            'created_at', 'updated_at',            
            'priority', 'status', 'deadline', 'project', 'project_name',
            'followups', 'attachments', 'comments'
        ]
        read_only_fields = ['case_id', 'case_status', 'created_at', 'updated_at']

    def get_project_name(self, obj):
        return obj.project.title if obj.project else None

    def get_alleged_perpetrator_details(self, obj):
        if obj.alleged_perpetrator:
            return obj.get_alleged_perpetrator_display()
        return None
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.username
        return None

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return f"{obj.assigned_to.first_name} {obj.assigned_to.last_name}".strip() or obj.assigned_to.username
        return None

    def get_updated_by_name(self, obj):
        if obj.updated_by:
            return f"{obj.updated_by.first_name} {obj.updated_by.last_name}".strip() or obj.updated_by.username
        return None


class ComplaintCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating complaints"""
    
    alleged_perpetrator_type = serializers.CharField(source='alleged_perpetrator', required=False, allow_null=True, allow_blank=True)
    comments = serializers.CharField(source='additional_comments', required=False, allow_null=True, allow_blank=True)
    
    class Meta:
        model = Complaint
        fields = [
            'date_feedback_received', 'feedback_channel',
            'full_name', 'gender', 'phone_number', 'id_number', 'nationality',
            'feedback_type',
            'geographic_area', 'specific_location',
            'has_thanking_note', 'sensitivity_level', 'category',
            'sub_category', 'other_subject', 'description',
            'alleged_perpetrator_type',
            'responsible_person', 'actions_taken', 'evidence_of_followup',
            'date_response_provided', 'date_case_closed', 'comments',
            'priority', 'status', 'deadline', 'project', 'assigned_to'
        ]
    
    def validate(self, data):
        sensitivity_level = data.get('sensitivity_level')
        alleged_perpetrator = data.get('alleged_perpetrator')
        
        if sensitivity_level and sensitivity_level >= 4 and not alleged_perpetrator:
            raise serializers.ValidationError({
                'alleged_perpetrator_type': 'Alleged perpetrator is required for Level 4 and 5 complaints.'
            })
        
        return data


class ComplaintStatsSerializer(serializers.Serializer):
    """Serializer for statistics"""
    total = serializers.IntegerField()
    pending = serializers.IntegerField()
    in_progress = serializers.IntegerField()
    completed = serializers.IntegerField()
    overdue = serializers.IntegerField()
    by_sensitivity = serializers.ListField()
    by_category = serializers.ListField()
    by_status = serializers.ListField()
    by_priority = serializers.ListField()