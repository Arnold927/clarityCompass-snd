from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.utils import timezone
from datetime import timedelta
from django.core.mail import send_mail
from django.conf import settings
from .models import Decision, Notification

@receiver(post_save, sender=Decision)
def create_decision_notifications(sender, instance, created, **kwargs):
    if created:
        if instance.owner:
            Notification.objects.create(
                user=instance.owner,
                notification_type='decision_assigned',
                decision=instance,
                message=f"You've been assigned as owner of decision: {instance.title}",
                metadata={'priority': instance.priority}
            )
        
        if instance.assigned_to and instance.assigned_to != instance.owner:
            Notification.objects.create(
                user=instance.assigned_to,
                notification_type='decision_assigned',
                decision=instance,
                message=f"You've been assigned to implement decision: {instance.title}",
                metadata={'priority': instance.priority}
            )
        
        for stakeholder in instance.stakeholders.all():
            Notification.objects.create(
                user=stakeholder,
                notification_type='decision_assigned',
                decision=instance,
                message=f"You're a stakeholder for decision: {instance.title}",
                metadata={'priority': instance.priority}
            )
    
    else:
        if 'status' in kwargs.get('update_fields', []):
            if instance.status == 'completed':
                involved_users = set([instance.owner, instance.assigned_to, instance.created_by])
                involved_users.update(instance.stakeholders.all())
                involved_users.discard(None)
                
                for user in involved_users:
                    Notification.objects.create(
                        user=user,
                        notification_type='status_changed',
                        decision=instance,
                        message=f"Decision '{instance.title}' has been marked as completed",
                        metadata={'new_status': 'completed'}
                    )