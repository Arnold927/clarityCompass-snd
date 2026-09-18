from rest_framework import serializers
from .models import FormField, DataCollectionForm, Submission
from projects.models import Project, ProjectTeamMember
from organizations.serializers import UserSerializer
from projects.serializers import ProjectSerializer
import copy
from rest_framework_recursive.fields import RecursiveField
import uuid
from django.db.models import Count, Q

class FormFieldSerializer(serializers.ModelSerializer):
    nested_subfields = RecursiveField(many=True, required=False)
    id = serializers.CharField(required=False, allow_blank=True, write_only=True)
    class Meta:
        model = FormField
        fields = [
            "id", "label", "field_type", "options", "required",
            "order", "condition", "nested_subfields"
        ]
        extra_kwargs = {
            'id': {'read_only': False, 'required': False},
        }

    def to_internal_value(self, data):
        validated_data = super().to_internal_value(data)
        
        if 'id' in data:
            validated_data['id'] = data['id']
        
        return validated_data

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep["id"] = instance.id
        rep["condition"] = instance.condition if instance.condition else None

        rep["nested_subfields"] = FormFieldSerializer(
            instance.subfields.all().order_by("order"),
            many=True,
            context=self.context
        ).data

        return rep


class DataCollectionFormSerializer(serializers.ModelSerializer):
    fields = FormFieldSerializer(many=True, write_only=True)
    form_fields = serializers.SerializerMethodField(read_only=True)
    project_details = serializers.SerializerMethodField()
    projectIds = serializers.ListField(
        child=serializers.IntegerField(), 
        write_only=True, 
        required=False,
        source='projects'
    )
    created_at = serializers.DateTimeField(read_only=True)
    submission_count = serializers.SerializerMethodField()

    class Meta:
        model = DataCollectionForm
        fields = [
            "id", "title", "description",
            "projects", "fields", "form_fields", "project_details", "projectIds", "created_at",
            "submission_count"
        ]

    def get_project_details(self, obj):
        return [{"id": p.id, "title": p.title} for p in obj.projects.all()]

    def _create_or_update_fields(self, fields_data, form_instance, id_map, existing_fields=None, parent=None):
        existing_fields = existing_fields or {}

        for f_data in fields_data:
            tmp_id = f_data.get("id")
            
            if tmp_id is None or tmp_id == "":
                tmp_id = str(uuid.uuid4())
                f_data["id"] = tmp_id
            else:
                tmp_id = str(tmp_id)
            
            nested = f_data.get("nested_subfields", [])

            if tmp_id in existing_fields:
                field = existing_fields[tmp_id]
                field.label = f_data.get("label", field.label)
                field.field_type = f_data.get("field_type", field.field_type)
                field.options = f_data.get("options", field.options)
                field.required = f_data.get("required", field.required)
                field.order = f_data.get("order", field.order)
                field.parent = parent
                field.save()
            else:
                field = FormField.objects.create(
                    form=form_instance,
                    parent=parent,
                    label=f_data.get("label"),
                    field_type=f_data.get("field_type"),
                    options=f_data.get("options"),
                    required=f_data.get("required", False),
                    order=f_data.get("order", 0)
                )

            id_map[tmp_id] = field.id
            self._create_or_update_fields(nested, form_instance, id_map, existing_fields, parent=field)
        
    def _apply_conditions(self, fields_data, id_map):
        """
        Apply conditions AFTER all fields exist in DB.
        - fields_data: list of all fields from the payload
        - id_map: mapping from temporary IDs to real DB IDs
        """
        all_fields = []

        def flatten(fields):
            for f in fields:
                tmp_id = f.get("id")
                if tmp_id is None:
                    continue
                    
                all_fields.append({
                    "tmp_id": str(tmp_id),
                    "data": f
                })
                flatten(f.get("nested_subfields", []))

        flatten(fields_data)
        
        for item in all_fields:
            tmp_id = item["tmp_id"]
            f_data = item["data"]
            cond = f_data.get("condition")
            
            if cond and "fieldId" in cond:
                cond_field_tmp = str(cond["fieldId"])
                
                if cond_field_tmp in id_map and tmp_id in id_map:
                    field = FormField.objects.get(id=id_map[tmp_id])
                    
                    patched = copy.deepcopy(cond)
                    patched["fieldId"] = id_map[cond_field_tmp]

                    field.condition = patched
                    field.save(update_fields=["condition"])
    
    def create(self, validated_data):
        fields_data = validated_data.pop("fields", [])
        project_ids = validated_data.pop("projects", [])

        form = DataCollectionForm.objects.create(**validated_data)
        form.projects.set(project_ids)

        id_map = {}
        self._create_or_update_fields(fields_data, form, id_map)
        self._apply_conditions(fields_data, id_map)

        return form

    def update(self, instance, validated_data):
        fields_data = validated_data.pop("fields", [])
        project_ids = validated_data.pop("projects", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if project_ids is not None:
            instance.projects.set(project_ids)

        existing_fields = {str(f.id): f for f in instance.fields.all()}
        id_map = {}

        self._create_or_update_fields(fields_data, instance, id_map, existing_fields)

        instance.fields.exclude(id__in=id_map.values()).delete()

        self._apply_conditions(fields_data, id_map)

        return instance

    def get_form_fields(self, obj):
        top_level = obj.fields.filter(parent__isnull=True).order_by("order")
        return FormFieldSerializer(top_level, many=True, context=self.context).data

    def get_submission_count(self, obj):
        request = self.context.get('request')
        project_id = request.query_params.get('project') if request else None
        
        if project_id:
            return obj.submissions.filter(project_id=project_id).count()
        else:
            return obj.submissions.count()


class SubmissionSerializer(serializers.ModelSerializer):
    submitted_by = UserSerializer(read_only=True)
    project_id = serializers.PrimaryKeyRelatedField(
        queryset=Project.objects.all(), source='project', write_only=True
    )
    project = ProjectSerializer(read_only=True)
    data = serializers.JSONField(default=dict)
    user_role = serializers.SerializerMethodField()
    
    class Meta:
        model = Submission
        fields = ['id', 'local_id', 'form', 'project_id', 'project', 'data', 'submitted_by', 'submitted_at',
                  'user_role'
                ]
        
    def get_user_role(self, obj):
        if obj.submitted_by and obj.project:
            try:
                team_member = ProjectTeamMember.objects.filter(
                    project=obj.project,
                    user=obj.submitted_by
                ).first()
                
                if team_member:
                    return team_member.role
                
                if obj.submitted_by.email:
                    team_member = ProjectTeamMember.objects.filter(
                        project=obj.project,
                        email=obj.submitted_by.email
                    ).first()
                    if team_member:
                        return team_member.role
                        
            except Exception as e:
                return None
        return None


