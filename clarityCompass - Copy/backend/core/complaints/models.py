from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
import uuid

User = get_user_model()

class Complaint(models.Model):
    date_feedback_received = models.DateTimeField(default=timezone.now)
    
    FEEDBACK_CHANNELS = [
        ('phone', 'Phone Call/Toll Free Line'),
        ('email', 'Email'),
        ('sms', 'SMS'),
        ('whatsapp', 'WhatsApp'),
        ('in_person', 'Face-to-Face with SND staff'),
        ('website', 'Website'),
        ('social_media', 'Social Media'),
        ('complaint_box', 'Complaint Box'),
        ('crfm_clinics', 'CRFM Clinics'),
        ('gender_help_desk', 'Gender Help Desk'),
        ('other', 'Other'),
    ]
    feedback_channel = models.CharField(max_length=50, choices=FEEDBACK_CHANNELS)
    
    full_name = models.CharField(max_length=255)
    GENDER_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Other'),
        ('unknown', 'Unknown'),
    ]
    gender = models.CharField(max_length=20, choices=GENDER_CHOICES)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    id_number = models.CharField(max_length=100, blank=True, null=True)
    nationality = models.CharField(max_length=100, blank=True, null=True)
    
    FEEDBACK_TYPES = [
        ('snd_staff', 'SND Staff'),
        ('beneficiary', 'Beneficiary'),
        ('contractor', 'Contractor'),
        ('implementing_partner', 'Implementing Partner'),
        ('third_party_with_link', 'Third Parties WITH a link to the project'),
        ('third_party_without_link', 'Third Parties WITHOUT link to the project'),
    ]
    feedback_type = models.CharField(max_length=50, choices=FEEDBACK_TYPES)
    
    geographic_area = models.CharField(max_length=255)
    specific_location = models.TextField(blank=True, null=True)
    
    has_thanking_note = models.BooleanField(default=False)
    
    SENSITIVITY_LEVELS = [
        (1, 'Level 1'),
        (2, 'Level 2'),
        (3, 'Level 3'),
        (4, 'Level 4'),
        (5, 'Level 5'),
    ]
    sensitivity_level = models.IntegerField(choices=SENSITIVITY_LEVELS)
    
    CATEGORY_CHOICES = [
        ('corruption_fraud', 'Alleged corruption / fraud'),
        ('sexual_exploitation_abuse', 'Alleged sexual exploitation / abuse'),
        ('child_ill_treatment', 'Alleged child ill-treatment / negligence'),
        ('other', 'Other'),
    ]
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, null=True, blank=True)
    
    sub_category = models.CharField(max_length=50, null=True, blank=True)
    other_subject = models.TextField(blank=True, null=True)
    description = models.TextField()
    
    PERPETRATOR_TYPES = [
        ('snd_staff', 'SND Staff'),
        ('beneficiary', 'Beneficiary'),
        ('contractor', 'Contractor'),
        ('implementing_partner', 'Implementing Partner'),
        ('third_party_with_link', 'Third Parties WITH a link to the project'),
        ('third_party_without_link', 'Third Parties WITHOUT link to the project'),
    ]
    alleged_perpetrator = models.CharField(max_length=50, choices=PERPETRATOR_TYPES, blank=True, null=True)
    
    responsible_person = models.CharField(max_length=255, blank=True, null=True)
    actions_taken = models.TextField(blank=True, null=True)
    evidence_of_followup = models.FileField(upload_to='evidence/%Y/%m/%d/', blank=True, null=True)
    date_response_provided = models.DateField(blank=True, null=True)
    date_case_closed = models.DateField(blank=True, null=True)
    additional_comments = models.TextField(blank=True, null=True)
    
    case_id = models.CharField(max_length=50, unique=True, editable=False)
    case_status = models.CharField(max_length=50, blank=True, null=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='complaints_created')
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='complaints_assigned')
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='complaints_updated')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('overdue', 'Overdue'),
        ('cancelled', 'Cancelled'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    deadline = models.DateField(blank=True, null=True)
    project = models.ForeignKey('projects.Project', on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['case_id']),
            models.Index(fields=['status']),
            models.Index(fields=['sensitivity_level']),
            models.Index(fields=['assigned_to']),
            models.Index(fields=['created_at']),
        ]

    def save(self, *args, **kwargs):
        if not self.case_id:
            year = timezone.now().year
            month = timezone.now().month
            unique_id = str(uuid.uuid4()).split('-')[0].upper()
            self.case_id = f"CMP-{year}-{month:02d}-{unique_id}"
        
        if self.date_case_closed:
            self.case_status = 'Closed'
        elif self.date_response_provided:
            self.case_status = 'Response Provided'
        else:
            self.case_status = 'Pending'
            
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.case_id} - {self.full_name}"


class ComplaintFollowUp(models.Model):
    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name='followups')
    follow_up_date = models.DateTimeField(default=timezone.now)
    action_taken = models.TextField()
    response_to_complainant = models.TextField(blank=True, null=True)
    evidence_file = models.FileField(upload_to='followup_evidence/%Y/%m/%d/', blank=True, null=True)
    followed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-follow_up_date']
    
    def __str__(self):
        user_name = self.followed_by.username if self.followed_by else "Unknown"
        date_str = self.follow_up_date.strftime('%Y-%m-%d')
        return f"{self.complaint.case_id} | {date_str} | {user_name}"


class ComplaintAttachment(models.Model):
    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='complaint_attachments/%Y/%m/%d/')
    description = models.CharField(max_length=255, blank=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        uploader = self.uploaded_by.username if self.uploaded_by else "Unknown"
        filename = self.file.name.split('/')[-1]  # only the file name, not full path
        return f"{self.complaint.case_id} | {filename} | {uploader}"

class ComplaintComment(models.Model):
    """For comments on decisions - matching your existing structure"""
    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        username = self.user.username if self.user else "Unknown"
        date_str = self.created_at.strftime('%Y-%m-%d')
        return f"{self.complaint.case_id} | {username} | {date_str}"
