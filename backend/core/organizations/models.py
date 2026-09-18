from django.contrib.auth.models import AbstractUser
from django.db import models

class Organization(models.Model):
    ORG_CHOICES = [
        ('NGO', 'Non-Governmental Organization'),
        ('GOV', 'Government Agency'),
        ('PRV', 'Private Sector'),
    ]
    name = models.CharField(max_length=255)
    org_type = models.CharField(max_length=50, null=True, blank=True, choices=ORG_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class User(AbstractUser):
    # ── Access-level roles ──────────────────────────────────────────────
    ROLE_SENIOR_MANAGEMENT = 'senior_management'   # Executive Director / Head of Programmes
    ROLE_PROGRAM_MANAGER   = 'program_manager'     # Programme Managers
    ROLE_ME                = 'me'                  # Monitoring & Evaluation officers

    APP_ROLE_CHOICES = [
        (ROLE_SENIOR_MANAGEMENT, 'Senior Management'),
        (ROLE_PROGRAM_MANAGER,   'Program Manager'),
        (ROLE_ME,                'Monitoring & Evaluation'),
    ]

    organization = models.ForeignKey(Organization, null=True, blank=True, on_delete=models.SET_NULL, related_name='users')
    app_role = models.CharField(
        max_length=30,
        choices=APP_ROLE_CHOICES,
        default=ROLE_PROGRAM_MANAGER,
        help_text='Controls what the user can see and do inside the M&E Portal.',
    )

    # ── Convenience helpers ─────────────────────────────────────────────
    @property
    def is_senior_management(self) -> bool:
        return self.app_role == self.ROLE_SENIOR_MANAGEMENT or self.is_superuser

    @property
    def is_program_manager(self) -> bool:
        return self.app_role == self.ROLE_PROGRAM_MANAGER

    @property
    def is_me_officer(self) -> bool:
        return self.app_role == self.ROLE_ME

    def __str__(self):
        return self.username
