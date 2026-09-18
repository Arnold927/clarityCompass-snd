from django.db import models
from projects.models import Project

class DataCollectionForm(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    projects = models.ManyToManyField(Project, blank=True, related_name='forms')
    created_by = models.ForeignKey('organizations.User', null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)
     
    def __str__(self):  
        return self.title

class FormField(models.Model):
    FIELD_TYPES = [('text','Text'), ('textarea','Textarea'), ('number','Number'),('select','Select'),('checkbox','Checkbox'),('date','Date'), ("field_group", "Field Group")]
    form = models.ForeignKey(DataCollectionForm, on_delete=models.CASCADE, related_name='fields')
    parent = models.ForeignKey("self", on_delete=models.CASCADE, null=True, blank=True, related_name="subfields")
    label = models.CharField(max_length=255)
    field_type = models.CharField(max_length=50, choices=FIELD_TYPES)
    options = models.JSONField(blank=True, null=True)
    required = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)
    condition = models.JSONField(blank=True, null=True)
    
    def __str__(self): 
        return f"{self.form.title} - {self.label}"

class Submission(models.Model):
    local_id = models.CharField(max_length=255, blank=True, null=True)
    form = models.ForeignKey(DataCollectionForm, on_delete=models.CASCADE, related_name='submissions')
    project=models.ForeignKey(Project, on_delete=models.CASCADE, related_name='submissions')
    data = models.JSONField()
    submitted_by = models.ForeignKey('organizations.User', null=True, blank=True, on_delete=models.SET_NULL)
    submitted_at = models.DateTimeField(auto_now_add=True)
    
