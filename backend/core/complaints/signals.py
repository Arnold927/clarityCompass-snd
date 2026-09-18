from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone
from .models import Complaint, ComplaintFollowUp

@receiver(pre_save, sender=Complaint)
def update_status_based_on_dates(sender, instance, **kwargs):
    """Update status based on dates and deadline"""
    if instance.deadline and instance.deadline < timezone.now().date():
        if instance.status not in ['completed', 'cancelled']:
            instance.status = 'overdue'


@receiver(post_save, sender=ComplaintFollowUp)
def update_complaint_on_followup(sender, instance, created, **kwargs):
    """Update complaint when follow-up is added"""
    if created:
        complaint = instance.complaint
        complaint.actions_taken = instance.action_taken
        complaint.updated_at = timezone.now()
        
        if complaint.status == 'pending':
            complaint.status = 'in_progress'
        
        complaint.save()