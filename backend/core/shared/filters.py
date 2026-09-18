from django_filters import rest_framework as filters
from .models import Decision

class DecisionFilter(filters.FilterSet):
    overdue = filters.BooleanFilter(method='filter_overdue')
    due_soon = filters.BooleanFilter(method='filter_due_soon')
    
    class Meta:
        model = Decision
        fields = ['status', 'priority', 'decision_type', 'owner', 'assigned_to', 'project']
    
    def filter_overdue(self, queryset, name, value):
        if value:
            from django.utils import timezone
            return queryset.filter(
                status__in=['pending', 'in_progress'],
                deadline__lt=timezone.now().date()
            )
        return queryset
    
    def filter_due_soon(self, queryset, name, value):
        if value:
            from django.utils import timezone
            from datetime import timedelta
            next_week = timezone.now().date() + timedelta(days=7)
            return queryset.filter(
                status__in=['pending', 'in_progress'],
                deadline__range=[timezone.now().date(), next_week]
            )
        return queryset