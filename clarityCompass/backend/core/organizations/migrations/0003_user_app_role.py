from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('organizations', '0002_alter_organization_org_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='app_role',
            field=models.CharField(
                choices=[
                    ('senior_management', 'Senior Management'),
                    ('program_manager', 'Program Manager'),
                    ('me', 'Monitoring & Evaluation'),
                ],
                default='program_manager',
                help_text='Controls what the user can see and do inside the M&E Portal.',
                max_length=30,
            ),
        ),
    ]
