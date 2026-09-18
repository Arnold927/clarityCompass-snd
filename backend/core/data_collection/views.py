from django.shortcuts import render
from rest_framework import viewsets
from .models import DataCollectionForm, FormField, Submission
from .serializers import (
    DataCollectionFormSerializer,
    FormFieldSerializer,
    SubmissionSerializer
)
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework import status


class DataCollectionFormViewSet(viewsets.ModelViewSet):
    queryset = DataCollectionForm.objects.all().prefetch_related('fields__subfields')
    serializer_class = DataCollectionFormSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        
        project_id = self.request.query_params.get('project')
        
        if project_id:
            queryset = queryset.filter(
                submissions__project_id=project_id
            ).distinct()
        
        return queryset

    def get_serializer_context(self):
        context = super().get_serializer_context()
        project_id = self.request.query_params.get('project')
        if project_id:
            context['project_id'] = int(project_id)
        
        return context
    
    def perform_create(self, serializer):
        return serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        return serializer.save()

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        
        if hasattr(data, 'dict'):
            data = data.dict()
                
        if 'projectIds' in data:
            data['projects'] = data.pop('projectIds')
        
        if 'fields' not in data and 'fields' in request.data:
            data['fields'] = request.data.get('fields')
                
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        
        instance = self.perform_create(serializer)
        response_serializer = self.get_serializer(instance)
        
        return Response(response_serializer.data, status=201)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        instance = self.perform_update(serializer)

        response_serializer = self.get_serializer(instance)

        return Response(response_serializer.data)


class FormFieldViewSet(viewsets.ModelViewSet):
    queryset = FormField.objects.all()
    serializer_class = FormFieldSerializer

    @action(detail=False, methods=["patch"], url_path="update-conditions")
    def update_conditions(self, request):
        """
        Expect payload:
        {
            "conditions": [
                {"id": 123, "condition": {"fieldId": 456, "operator": "equals", "value": "Yes"}},
                ...
            ]
        }
        """
        conditions = request.data.get("conditions", [])
        errors = []

        for cond in conditions:
            try:
                field = FormField.objects.get(id=cond["id"])
                field.condition = cond["condition"]
                field.save(update_fields=["condition"])
            except FormField.DoesNotExist:
                errors.append(f"Field {cond['id']} does not exist")

        if errors:
            return Response({"errors": errors}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"status": "success"})


def normalize_submission_data(fields, data):
    """
    Normalize submission data to use field labels as keys.
    Handles groups and repeats.
    """
    if isinstance(data, list):
        return [normalize_submission_data(fields, item) for item in data]

    if not isinstance(data, dict):
        return {}

    result = {}

    for field in fields:
        field_id = str(field["id"])
        field_label = field.get("name") or field_id
        field_type = field["type"]
        subfields = field.get("fields", [])

        value = data.get(field_id)
        if value is None:
            continue

        if isinstance(value, list) and len(value) > 0 and isinstance(value[0], dict):
            result[field_label] = {
                "id": field_id,
                "value": [normalize_submission_data(subfields, item) for item in value]
            }
        elif isinstance(value, dict):
            result[field_label] = {
                "id": field_id,
                "value": normalize_submission_data(subfields, value)
            }
        else:
            result[field_label] = {"id": field_id, "value": value}

    return result

def serialize_field(field: FormField):
    """
    Convert a FormField instance into a dict suitable for normalize_submission_data.
    Handles nested subfields recursively.
    """
    return {
        "id": field.id,
        "name": field.label,
        "type": "group" if field.field_type == "field_group" else field.field_type,
        "fields": [serialize_field(sf) for sf in field.subfields.all().order_by("order")]
    }

class SubmissionViewSet(viewsets.ModelViewSet):
    queryset = Submission.objects.all().select_related('form', 'project')
    serializer_class = SubmissionSerializer

    def perform_create(self, serializer):
        local_id = self.request.data.get("local_id")
        form_id = self.request.data.get("form")
        project_id = self.request.data.get("project_id")
        raw_data = self.request.data.get("data", {})

        form_instance = DataCollectionForm.objects.get(id=form_id)
        form_fields_qs = form_instance.fields.filter(parent__isnull=True).order_by("order")
        form_fields = [serialize_field(f) for f in form_fields_qs]

        normalized_data = normalize_submission_data(form_fields, raw_data)

        if local_id:
            if Submission.objects.filter(
                form_id=form_id,
                project_id=project_id,
                local_id=local_id
            ).exists():
                raise ValidationError("Duplicate submission detected.")

        serializer.save(submitted_by=self.request.user, data=normalized_data)

    
    def get_queryset(self):
        qs = super().get_queryset()

        form_id = self.request.query_params.get("form")
        project_id = self.request.query_params.get("project")

        if form_id:
            qs = qs.filter(form_id=form_id)

        if project_id:
            qs = qs.filter(project_id=project_id)

        return qs
        

