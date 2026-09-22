from rest_framework import serializers


def _decimal_field(**kwargs):
    """Every Decimal value in this app is returned as a JSON number, not a
    string — DRF's serializer default (coerce_to_string=True) is overridden
    here explicitly so every /api/meal/ response is internally consistent
    (the raw-dict aggregation endpoints already return numbers)."""
    kwargs.setdefault('max_digits', 18)
    kwargs.setdefault('decimal_places', 2)
    kwargs.setdefault('coerce_to_string', False)
    return serializers.DecimalField(**kwargs)


from .models import (
    Country, ThematicFocus, ThematicFocusIndicator,
    LeadPartner, LeadPartnerIndicator, LeadPartnerDocument,
    Donor, DonorIndicator, DonorDocument,
    Project, ProjectDocument, ProjectActivity, ProjectIndicator,
    ProjectLocation, ActivityLocation,
)


# ---------- Mini (nested-read) serializers ----------

class CountryMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Country
        fields = ['id', 'name', 'iso_code']


class DonorMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Donor
        fields = ['id', 'name', 'logo']


class LeadPartnerMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeadPartner
        fields = ['id', 'name', 'logo']


class ThematicFocusMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = ThematicFocus
        fields = ['id', 'name', 'icon']


# ---------- Indicator serializers (shared shape, independent pools) ----------

class ThematicFocusIndicatorSerializer(serializers.ModelSerializer):
    percentage_achievement = serializers.ReadOnlyField()
    target = _decimal_field(allow_null=True, required=False)
    achievement = _decimal_field()

    class Meta:
        model = ThematicFocusIndicator
        fields = ['id', 'thematic_focus', 'name', 'target', 'achievement', 'unit',
                  'reporting_period', 'percentage_achievement', 'created_at', 'updated_at']
        read_only_fields = ['thematic_focus']


class LeadPartnerIndicatorSerializer(serializers.ModelSerializer):
    percentage_achievement = serializers.ReadOnlyField()
    target = _decimal_field(allow_null=True, required=False)
    achievement = _decimal_field()

    class Meta:
        model = LeadPartnerIndicator
        fields = ['id', 'lead_partner', 'name', 'target', 'achievement', 'unit',
                  'reporting_period', 'percentage_achievement', 'created_at', 'updated_at']
        read_only_fields = ['lead_partner']


class DonorIndicatorSerializer(serializers.ModelSerializer):
    percentage_achievement = serializers.ReadOnlyField()
    target = _decimal_field(allow_null=True, required=False)
    achievement = _decimal_field()

    class Meta:
        model = DonorIndicator
        fields = ['id', 'donor', 'name', 'target', 'achievement', 'unit',
                  'reporting_period', 'percentage_achievement', 'created_at', 'updated_at']
        read_only_fields = ['donor']


class ProjectIndicatorSerializer(serializers.ModelSerializer):
    percentage_achievement = serializers.ReadOnlyField()
    target = _decimal_field(allow_null=True, required=False)
    achievement = _decimal_field()

    class Meta:
        model = ProjectIndicator
        fields = ['id', 'project', 'name', 'target', 'achievement', 'unit',
                  'reporting_period', 'percentage_achievement', 'created_at', 'updated_at']
        read_only_fields = ['project']


class ProjectLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectLocation
        fields = ['id', 'project', 'latitude', 'longitude', 'location_name', 'created_at']
        read_only_fields = ['project']


class ActivityLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityLocation
        fields = ['id', 'activity', 'latitude', 'longitude', 'location_name', 'created_at']
        read_only_fields = ['activity']


class ProjectActivitySerializer(serializers.ModelSerializer):
    percentage_of_target = serializers.ReadOnlyField()
    locations = ActivityLocationSerializer(many=True, read_only=True)

    class Meta:
        model = ProjectActivity
        fields = ['id', 'project', 'name', 'target', 'reach', 'reach_male', 'reach_female',
                  'reach_pwd', 'status', 'reporting_period', 'percentage_of_target',
                  'locations',
                  'created_at', 'updated_at']
        read_only_fields = ['project']


class ProjectDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectDocument
        fields = ['id', 'project', 'title', 'file', 'uploaded_at']
        read_only_fields = ['project']


class DonorDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = DonorDocument
        fields = ['id', 'donor', 'title', 'file', 'uploaded_at']
        read_only_fields = ['donor']


class LeadPartnerDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeadPartnerDocument
        fields = ['id', 'lead_partner', 'title', 'file', 'uploaded_at']
        read_only_fields = ['lead_partner']


# ---------- Top-level module serializers ----------

class CountrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Country
        fields = ['id', 'name', 'iso_code', 'flag', 'region', 'description', 'status',
                  'first_implementation_year', 'notes', 'created_at', 'updated_at']


class ThematicFocusSerializer(serializers.ModelSerializer):
    indicators = ThematicFocusIndicatorSerializer(many=True, read_only=True)
    reach_male_pct = serializers.ReadOnlyField()
    reach_female_pct = serializers.ReadOnlyField()
    reach_pwd_pct = serializers.ReadOnlyField()

    class Meta:
        model = ThematicFocus
        fields = ['id', 'name', 'description', 'icon', 'status', 'reporting_frequency',
                  'responsible_person', 'notes', 'reach_total', 'reach_male', 'reach_female',
                  'reach_pwd', 'reach_male_pct', 'reach_female_pct', 'reach_pwd_pct',
                  'indicators', 'created_at', 'updated_at']


class LeadPartnerSerializer(serializers.ModelSerializer):
    indicators = LeadPartnerIndicatorSerializer(many=True, read_only=True)
    documents = serializers.SerializerMethodField()

    class Meta:
        model = LeadPartner
        fields = ['id', 'name', 'description', 'status', 'partner_type', 'head_office',
                  'website', 'logo', 'partnership_since', 'notes', 'indicators', 'documents',
                  'created_at', 'updated_at']

    def get_documents(self, obj):
        return LeadPartnerDocumentSerializer(obj.documents.all(), many=True, context=self.context).data


class DonorSerializer(serializers.ModelSerializer):
    indicators = DonorIndicatorSerializer(many=True, read_only=True)
    documents = serializers.SerializerMethodField()

    class Meta:
        model = Donor
        fields = ['id', 'name', 'description', 'status', 'donor_type', 'head_office',
                  'website', 'logo', 'partnership_since', 'notes', 'indicators', 'documents',
                  'created_at', 'updated_at']

    def get_documents(self, obj):
        return DonorDocumentSerializer(obj.documents.all(), many=True, context=self.context).data


class ProjectSerializer(serializers.ModelSerializer):
    # Read: nested mini representations
    countries = CountryMiniSerializer(many=True, read_only=True)
    donors = DonorMiniSerializer(many=True, read_only=True)
    lead_partner = LeadPartnerMiniSerializer(read_only=True)
    thematic_focus = ThematicFocusMiniSerializer(many=True, read_only=True)

    # Write: plain PK fields
    country_ids = serializers.PrimaryKeyRelatedField(
        source='countries', many=True, queryset=Country.objects.all(), write_only=True, required=False
    )
    donor_ids = serializers.PrimaryKeyRelatedField(
        source='donors', many=True, queryset=Donor.objects.all(), write_only=True, required=False
    )
    lead_partner_id = serializers.PrimaryKeyRelatedField(
        source='lead_partner', queryset=LeadPartner.objects.all(),
        write_only=True, required=False, allow_null=True
    )
    thematic_focus_ids = serializers.PrimaryKeyRelatedField(
        source='thematic_focus', many=True, queryset=ThematicFocus.objects.all(),
        write_only=True, required=False
    )

    activities = ProjectActivitySerializer(many=True, read_only=True)
    indicators = ProjectIndicatorSerializer(many=True, read_only=True)
    documents = ProjectDocumentSerializer(many=True, read_only=True)
    locations = ProjectLocationSerializer(many=True, read_only=True)
    duration_years = serializers.ReadOnlyField()
    budget = _decimal_field(allow_null=True, required=False)

    class Meta:
        model = Project
        fields = [
            'id', 'name', 'project_code', 'description',
            'countries', 'donors', 'lead_partner', 'thematic_focus',
            'country_ids', 'donor_ids', 'lead_partner_id', 'thematic_focus_ids',
            'start_date', 'end_date', 'status', 'budget', 'currency', 'duration_years',
            'image', 'is_active', 'locations',
            'activities', 'indicators', 'documents',
            'created_at', 'updated_at',
        ]


class ProjectListSerializer(serializers.ModelSerializer):
    """Lighter serializer for list/dropdown views."""
    countries = CountryMiniSerializer(many=True, read_only=True)
    donors = DonorMiniSerializer(many=True, read_only=True)
    lead_partner = LeadPartnerMiniSerializer(read_only=True)
    total_reach = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = ['id', 'name', 'project_code', 'countries', 'donors', 'lead_partner',
                  'start_date', 'end_date', 'status', 'total_reach']

    def get_total_reach(self, obj):
        return sum(a.reach for a in obj.activities.all())