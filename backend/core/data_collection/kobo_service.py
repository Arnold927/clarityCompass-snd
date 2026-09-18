import requests
from django.conf import settings
from django.utils import timezone
from .models import Submission

class KoboService:
    def __init__(self, token=None):
        self.base_url = getattr(settings, 'KOBO_BASE_URL', 'https://kf.kobotoolbox.org')
        self.token = token or getattr(settings, 'KOBO_API_TOKEN', '')
        
    def get_headers(self):
        return {
            "Authorization": f"Token {self.token}",
            "Content-Type": "application/json"
        }
    
    def fetch_forms(self):
        """Get all forms accessible with the API token"""
        url = f"{self.base_url}/api/v2/assets/"
        try:
            response = requests.get(url, headers=self.get_headers())
            response.raise_for_status()
            
            
            data = response.json()

            forms_list = []
            for asset in data.get('results', []):
                form_data = {
                    'uid': asset.get('uid'),
                    'name': asset.get('name'),
                    'date_created': asset.get('date_created'),
                    'date_modified': asset.get('date_modified'),
                    'deployment__active': asset.get('deployment_status') == 'deployed',
                    'submissions_count': asset.get('deployment__submission_count', 0),
                    'asset_type': asset.get('asset_type', 'survey')
                }
                forms_list.append(form_data)
            
            return {'forms': forms_list}
            
        except requests.exceptions.RequestException as e:
            return {'forms': []} 
    
    def fetch_form_submissions(self, asset_id, since=None):
        """Fetch submissions for a specific Kobo form"""
        url = f"{self.base_url}/api/v2/assets/{asset_id}/data/"
        params = {}
        if since:
            params['query'] = f'{{"_submission_time": {{"$gt": "{since}"}}}}'
        
        response = requests.get(url, headers=self.get_headers(), params=params)
        return response.json()
    
    def sync_kobo_submissions(self, kobo_form):
        """
        Sync submissions from Kobo into our database
        Returns: (new_count, updated_count)
        """
        if kobo_form.form_type != 'kobo':
            return (0, 0)
        
        submissions_data = self.fetch_form_submissions(
            kobo_form.kobo_asset_id,
            since=kobo_form.last_kobo_sync
        )
        
        new_count = 0
        for submission in submissions_data.get('results', []):
            kobo_submission_id = submission.get('_id')
            
            mapped_data = self.map_kobo_to_internal(submission, kobo_form)
            
            obj, created = Submission.objects.update_or_create(
                local_id=kobo_submission_id,
                form=kobo_form,
                project=kobo_form.projects.first(),
                defaults={
                    'data': mapped_data,
                    'submitted_by': kobo_form.created_by,
                }
            )
            
            if created:
                new_count += 1
        
        kobo_form.last_kobo_sync = timezone.now()
        kobo_form.save(update_fields=['last_kobo_sync'])
        
        return (new_count, 0)
    
    def map_kobo_to_internal(self, kobo_submission, form):
        """
        Map Kobo submission data to your internal structure
        You'll need to customize this based on your form structure
        """
        mapped = {
            '_submission_time': kobo_submission.get('_submission_time'),
            '_id': kobo_submission.get('_id'),
        }
        
        for key, value in kobo_submission.items():
            if not key.startswith('_'):
                mapped[key] = value
        
        return mapped