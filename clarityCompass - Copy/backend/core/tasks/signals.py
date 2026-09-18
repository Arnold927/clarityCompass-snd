from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from tasks.models import TaskUpdate, TaskReport
from strategic.models import CorporateIndicator, IndicatorDisaggregation



# @receiver([post_save, post_delete], sender=TaskUpdate)
# def update_task_cumulative_spent(sender, instance, **kwargs):
#     """Update task cumulative spent when updates change"""
#     instance.task.update_cumulative_spent()

@receiver(post_save, sender=TaskUpdate)
def update_task_cumulative_spent_on_save(sender, instance, **kwargs):
    instance.task.update_cumulative_spent()

@receiver(post_delete, sender=TaskUpdate)
def update_task_cumulative_spent_on_delete(sender, instance, **kwargs):
    instance.task.update_cumulative_spent()


@receiver(post_save, sender=TaskReport)
def sync_task_report_data(sender, instance, created, **kwargs):
    if created:
        try:
            if instance.main_indicator_value is not None:
                if instance.indicator and instance.indicator.corporate_indicator:
                    corporate_indicator = instance.indicator.corporate_indicator
                    corporate_indicator.current_value = instance.main_indicator_value
                    corporate_indicator.save()
        except Exception as e:
            print(f"Error updating CorporateIndicator: {e}")
        
        try:
            if instance.indicator and instance.reported_data:
                for disagg_id, value in instance.reported_data.items():
                    try:
                        disagg = IndicatorDisaggregation.objects.get(
                            project_indicator=instance.indicator,
                            disaggregator_id=disagg_id
                        )
                        disagg.reported_value = value
                        disagg.save()
                    except IndicatorDisaggregation.DoesNotExist:
                        pass
                    except Exception as e:
                        print(f"Error updating disaggregator {disagg_id}: {e}")
        except Exception as e:
            print(f"Error in disaggregation sync: {e}")
