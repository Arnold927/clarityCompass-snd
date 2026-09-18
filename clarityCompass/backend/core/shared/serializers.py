from rest_framework import serializers
from .models import Decision, DecisionUpdate, Notification, Tag
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'name', 'color', 'description']


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'full_name', 'first_name', 'last_name']
    
    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


class DecisionUpdateSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    # user_id = serializers.PrimaryKeyRelatedField(
    #     queryset=User.objects.all(), 
    #     write_only=True, 
    #     source='user'
    # )
    content = serializers.CharField(source='update_text', read_only=True)
    user_details = UserSerializer(source='user', read_only=True)
    
    class Meta:
        model = DecisionUpdate
        fields = ['id', 'user', 'user_details', 'update_text', 'content', 'attachment', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']
    
    def to_representation(self, instance):
        """Format the response to match frontend expectations"""
        data = super().to_representation(instance)
        data['content'] = data.pop('update_text')
        return data
    
    def to_internal_value(self, data):
        """Handle incoming data for creating/updating"""
        if 'content' in data:
            data['update_text'] = data.pop('content')
        return super().to_internal_value(data)


class DecisionSerializer(serializers.ModelSerializer):
    owner_details = UserSerializer(source='owner', read_only=True)
    assigned_to_details = UserSerializer(source='assigned_to', read_only=True)
    created_by_details = UserSerializer(source='created_by', read_only=True)
    stakeholders_details = UserSerializer(source='stakeholders', many=True, read_only=True)
    tags_details = TagSerializer(source='tags', many=True, read_only=True)
    
    owner_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), 
        write_only=True, 
        source='owner',
        required=False,
        allow_null=True
    )
    assigned_to_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), 
        write_only=True, 
        source='assigned_to',
        required=False,
        allow_null=True
    )
    stakeholder_ids = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), 
        write_only=True, 
        many=True,
        source='stakeholders',
        required=False
    )
    tag_ids = serializers.PrimaryKeyRelatedField(
        queryset=Tag.objects.all(),
        write_only=True,
        many=True,
        source='tags',
        required=False
    )
    
    project_title = serializers.CharField(source='project.title', read_only=True)
    is_overdue = serializers.SerializerMethodField()
    days_remaining = serializers.SerializerMethodField()
    related_object_info = serializers.SerializerMethodField()
    recent_updates = DecisionUpdateSerializer(source='updates', many=True, read_only=True)
    
    class Meta:
        model = Decision
        fields = [
            'id', 'title', 'description', 'decision_type',
            'owner', 'owner_details', 'owner_id',
            'assigned_to', 'assigned_to_details', 'assigned_to_id',
            'stakeholders', 'stakeholders_details', 'stakeholder_ids',
            'project', 'project_title',
            'content_type', 'object_id', 'related_object_description',
            'related_object_info',
            'created_at', 'updated_at', 'deadline', 'completed_at',
            'status', 'priority', 'progress_percentage',
            'rationale', 'expected_outcome', 'actual_outcome',
            'created_by', 'created_by_details',
            'days_to_complete', 'is_recurring', 'recurrence_pattern',
            'risk_level', 'impact_level',
            'tags', 'tags_details', 'tag_ids',
            'is_overdue', 'days_remaining', 'recent_updates'
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at', 'days_to_complete']
    
    def get_is_overdue(self, obj):
        if obj.deadline and obj.status not in ['completed', 'cancelled']:
            return timezone.now().date() > obj.deadline
        return False
    
    def get_days_remaining(self, obj):
        if obj.deadline and obj.status not in ['completed', 'cancelled']:
            remaining = (obj.deadline - timezone.now().date()).days
            return max(remaining, 0)
        return None
    
    def get_related_object_info(self, obj):
        return obj.get_related_object_info()
    
    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        
        stakeholders = validated_data.pop('stakeholders', [])
        tags = validated_data.pop('tags', [])
        
        decision = Decision.objects.create(**validated_data)
        
        if stakeholders:
            decision.stakeholders.set(stakeholders)
        if tags:
            decision.tags.set(tags)
        
        return decision
    
    def validate(self, data):
        if data.get('status') == 'completed' and not data.get('actual_outcome'):
            raise serializers.ValidationError({
                "actual_outcome": "Required when marking as completed"
            })
        return data

class NotificationSerializer(serializers.ModelSerializer):
    decision = DecisionSerializer(read_only=True)
    
    class Meta:
        model = Notification
        fields = ['id', 'notification_type', 'decision', 'message', 
                  'is_read', 'created_at', 'metadata']


class DashboardDecisionSerializer(serializers.ModelSerializer):
    """Lightweight serializer for dashboard view"""
    owner_name = serializers.CharField(source='owner.get_full_name', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)
    project_title = serializers.CharField(source='project.title', read_only=True, allow_null=True)
    is_overdue = serializers.SerializerMethodField()
    
    class Meta:
        model = Decision
        fields = ['id', 'title', 'owner_name', 'assigned_to_name', 'deadline', 'status', 'priority', 'project_title', 'is_overdue']
    
    def get_is_overdue(self, obj):
        if obj.deadline and obj.status not in ['completed', 'cancelled']:
            return timezone.now().date() > obj.deadline
        return False