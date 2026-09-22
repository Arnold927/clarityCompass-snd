from django.db import models


ACTIVITY_STATUS_CHOICES = [
    ('NOT_STARTED', 'Not Started'),
    ('ONGOING', 'Ongoing'),
    ('PARTIALLY_DONE', 'Partially Done'),
    ('COMPLETED', 'Completed'),
]

PROJECT_STATUS_CHOICES = [
    ('NOT_STARTED', 'Not Started'),
    ('ONGOING', 'Ongoing'),
    ('COMPLETED', 'Completed'),
    ('ON_HOLD', 'On Hold'),
]

STATUS_CHOICES = [
    ('ACTIVE', 'Active'),
    ('INACTIVE', 'Inactive'),
]


class Country(models.Model):
    """Countries SND Africa operates in. Reach here is always auto-aggregated
    from Projects tagged to this country — never entered manually."""
    name = models.CharField(max_length=100, unique=True)
    iso_code = models.CharField(max_length=3, blank=True, help_text="e.g. KE, ET — used as a fallback flag if no image is uploaded")
    flag = models.ImageField(upload_to='country_flags/', null=True, blank=True)
    region = models.CharField(max_length=100, blank=True, help_text="e.g. East Africa")
    description = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='ACTIVE')
    first_implementation_year = models.PositiveIntegerField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Countries'

    def __str__(self):
        return self.name


class ThematicFocus(models.Model):
    """One of SND Africa's thematic pillars. Fully independent of Projects —
    reach and indicators here are entered manually, never derived."""
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True, help_text="Icon identifier for the frontend")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='ACTIVE')
    reporting_frequency = models.CharField(max_length=50, blank=True, default='Annual')
    responsible_person = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)

    # Manually entered reach (card visuals) — independent of Project data.
    # The doc lists Total Reach as its own entry, separate from Male/Female/
    # PWD (real M&E data often can't just sum these — PWD may overlap with
    # Male/Female, or reach may be deduplicated across activities in a way
    # the three sub-figures don't capture), so this is a stored field the
    # user sets directly, not a computed sum of the other three.
    reach_total = models.PositiveIntegerField(default=0)
    reach_male = models.PositiveIntegerField(default=0)
    reach_female = models.PositiveIntegerField(default=0)
    reach_pwd = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'Thematic Focus'
        verbose_name_plural = 'Thematic Focus Areas'

    def __str__(self):
        return self.name

    def _pct(self, part):
        if not self.reach_total:
            return 0.0
        return round((part / self.reach_total) * 100, 1)

    @property
    def reach_male_pct(self):
        return self._pct(self.reach_male)

    @property
    def reach_female_pct(self):
        return self._pct(self.reach_female)

    @property
    def reach_pwd_pct(self):
        return self._pct(self.reach_pwd)


class ThematicFocusIndicator(models.Model):
    """Custom indicator entered independently for a Thematic Focus area.
    Not linked to Project indicators in any way."""
    thematic_focus = models.ForeignKey(ThematicFocus, on_delete=models.CASCADE, related_name='indicators')
    name = models.CharField(max_length=255)
    target = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True)
    achievement = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    unit = models.CharField(max_length=100, blank=True)
    reporting_period = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.thematic_focus.name} — {self.name}"

    @property
    def percentage_achievement(self):
        if not self.target:
            return None
        return round((float(self.achievement) / float(self.target)) * 100, 1)


class LeadPartner(models.Model):
    PARTNER_TYPE_CHOICES = [
        ('INTERNATIONAL_NGO', 'International NGO'),
        ('LOCAL_NGO', 'Local NGO'),
        ('GOVERNMENT', 'Government Agency'),
        ('UN_AGENCY', 'UN Agency'),
        ('OTHER', 'Other'),
    ]
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='ACTIVE')
    partner_type = models.CharField(max_length=30, choices=PARTNER_TYPE_CHOICES, default='OTHER')
    head_office = models.CharField(max_length=255, blank=True)
    website = models.URLField(blank=True)
    logo = models.ImageField(upload_to='lead_partner_logos/', null=True, blank=True)
    partnership_since = models.PositiveIntegerField(null=True, blank=True, help_text="Year")
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class LeadPartnerIndicator(models.Model):
    """Custom indicator entered independently for a Lead Partner.
    Not linked to Project indicators."""
    lead_partner = models.ForeignKey(LeadPartner, on_delete=models.CASCADE, related_name='indicators')
    name = models.CharField(max_length=255)
    target = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True)
    achievement = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    unit = models.CharField(max_length=100, blank=True)
    reporting_period = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.lead_partner.name} — {self.name}"

    @property
    def percentage_achievement(self):
        if not self.target:
            return None
        return round((float(self.achievement) / float(self.target)) * 100, 1)


class LeadPartnerDocument(models.Model):
    lead_partner = models.ForeignKey(LeadPartner, on_delete=models.CASCADE, related_name='documents')
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to='lead_partner_documents/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return self.title


class Donor(models.Model):
    DONOR_TYPE_CHOICES = [
        ('BILATERAL', 'Bilateral Donor'),
        ('MULTILATERAL', 'Multilateral Donor'),
        ('FOUNDATION', 'Foundation'),
        ('CORPORATE', 'Corporate'),
        ('INDIVIDUAL', 'Individual'),
        ('UN_AGENCY', 'UN Agency'),
        ('OTHER', 'Other'),
    ]
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='ACTIVE')
    donor_type = models.CharField(max_length=20, choices=DONOR_TYPE_CHOICES, default='OTHER')
    head_office = models.CharField(max_length=255, blank=True)
    website = models.URLField(blank=True)
    logo = models.ImageField(upload_to='donor_logos/', null=True, blank=True)
    partnership_since = models.PositiveIntegerField(null=True, blank=True, help_text="Year")
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class DonorIndicator(models.Model):
    """Custom indicator entered independently for a Donor.
    Not linked to Project indicators."""
    donor = models.ForeignKey(Donor, on_delete=models.CASCADE, related_name='indicators')
    name = models.CharField(max_length=255)
    target = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True)
    achievement = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    unit = models.CharField(max_length=100, blank=True)
    reporting_period = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.donor.name} — {self.name}"

    @property
    def percentage_achievement(self):
        if not self.target:
            return None
        return round((float(self.achievement) / float(self.target)) * 100, 1)


class DonorDocument(models.Model):
    donor = models.ForeignKey(Donor, on_delete=models.CASCADE, related_name='documents')
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to='donor_documents/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return self.title


class Project(models.Model):
    name = models.CharField(max_length=255)
    project_code = models.CharField(max_length=50, blank=True)
    description = models.TextField(blank=True)

    countries = models.ManyToManyField(Country, related_name='projects', blank=True)
    donors = models.ManyToManyField(Donor, related_name='projects', blank=True)
    lead_partner = models.ForeignKey(
        LeadPartner, on_delete=models.SET_NULL, null=True, blank=True, related_name='projects'
    )
    thematic_focus = models.ManyToManyField(ThematicFocus, related_name='projects', blank=True)

    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=20, choices=PROJECT_STATUS_CHOICES, default='NOT_STARTED')

    CURRENCY_CHOICES = [
        ('USD', 'US Dollar'), ('KES', 'Kenyan Shilling'), ('EUR', 'Euro'),
        ('GBP', 'British Pound'), ('ETB', 'Ethiopian Birr'),
    ]
    budget = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=10, choices=CURRENCY_CHOICES, blank=True, default='USD')

    image = models.ImageField(upload_to='project_images/', null=True, blank=True)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    @property
    def duration_years(self):
        days = (self.end_date - self.start_date).days
        return round(days / 365.25, 1)


class ProjectDocument(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='documents')
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to='project_documents/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return self.title


class ProjectActivity(models.Model):
    """An activity under a Project. The target is a single figure — it is
    NOT disaggregated. Actual reach IS disaggregated by Male/Female/PWD."""
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='activities')
    name = models.CharField(max_length=255)
    target = models.PositiveIntegerField(default=0)
    reach = models.PositiveIntegerField(default=0, help_text="Overall actual reach for this activity")
    reach_male = models.PositiveIntegerField(default=0)
    reach_female = models.PositiveIntegerField(default=0)
    reach_pwd = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=ACTIVITY_STATUS_CHOICES, default='NOT_STARTED')
    reporting_period = models.CharField(max_length=50, blank=True, help_text="e.g. Q2 2026")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['id']
        verbose_name_plural = 'Project Activities'

    def __str__(self):
        return f"{self.project.name} — {self.name}"

    @property
    def percentage_of_target(self):
        if not self.target:
            return None
        return round((self.reach / self.target) * 100, 1)


class ProjectLocation(models.Model):
    """One of possibly several real-world points for a project (e.g. a head
    office plus one or more field sites) — a project can span more ground
    than a single coordinate pair can represent."""
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='locations')
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    location_name = models.CharField(max_length=255, blank=True, help_text="Resolved or entered place name for the coordinates above")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return self.location_name or f"{self.latitude}, {self.longitude}"


class ActivityLocation(models.Model):
    """One of possibly several real-world points for an activity — e.g. a
    training that ran at more than one site."""
    activity = models.ForeignKey('ProjectActivity', on_delete=models.CASCADE, related_name='locations')
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    location_name = models.CharField(max_length=255, blank=True, help_text="Resolved or entered place name for the coordinates above")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return self.location_name or f"{self.latitude}, {self.longitude}"


class ProjectIndicator(models.Model):
    """A project-specific indicator. NOT disaggregated by gender or PWD."""
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='indicators')
    name = models.CharField(max_length=255)
    target = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True)
    achievement = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    unit = models.CharField(max_length=100, blank=True)
    reporting_period = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f"{self.project.name} — {self.name}"

    @property
    def percentage_achievement(self):
        if not self.target:
            return None
        return round((float(self.achievement) / float(self.target)) * 100, 1)