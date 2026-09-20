from rest_framework import viewsets, generics
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import (
    Country, ThematicFocus, ThematicFocusIndicator,
    LeadPartner, LeadPartnerIndicator, LeadPartnerDocument,
    Donor, DonorIndicator, DonorDocument,
    Project, ProjectDocument, ProjectActivity, ProjectIndicator,
)
from .serializers import (
    CountrySerializer, ThematicFocusSerializer, ThematicFocusIndicatorSerializer,
    LeadPartnerSerializer, LeadPartnerIndicatorSerializer, LeadPartnerDocumentSerializer,
    DonorSerializer, DonorIndicatorSerializer, DonorDocumentSerializer,
    ProjectSerializer, ProjectListSerializer, ProjectDocumentSerializer,
    ProjectActivitySerializer, ProjectIndicatorSerializer,
)
from . import aggregation as agg


def _filter_projects_by_query_params(qs, params):
    country = params.get('country')
    donor = params.get('donor')
    lead_partner = params.get('lead_partner')
    thematic_focus = params.get('thematic_focus')
    project_id = params.get('project')
    status_ = params.get('status')
    start_after = params.get('start_after')
    end_before = params.get('end_before')

    if country:
        qs = qs.filter(countries__id=country)
    if donor:
        qs = qs.filter(donors__id=donor)
    if lead_partner:
        qs = qs.filter(lead_partner__id=lead_partner)
    if thematic_focus:
        qs = qs.filter(thematic_focus__id=thematic_focus)
    if project_id:
        qs = qs.filter(id=project_id)
    if status_:
        qs = qs.filter(status=status_)
    if start_after:
        qs = qs.filter(start_date__gte=start_after)
    if end_before:
        qs = qs.filter(end_date__lte=end_before)
    return qs.distinct()


class CountryViewSet(viewsets.ModelViewSet):
    queryset = Country.objects.all()
    serializer_class = CountrySerializer

    @action(detail=True, methods=['get'])
    def overview(self, request, pk=None):
        country = self.get_object()
        return Response(agg.country_overview(country))


class ThematicFocusViewSet(viewsets.ModelViewSet):
    queryset = ThematicFocus.objects.all()
    serializer_class = ThematicFocusSerializer


class ThematicFocusIndicatorViewSet(viewsets.ModelViewSet):
    serializer_class = ThematicFocusIndicatorSerializer

    def get_queryset(self):
        qs = ThematicFocusIndicator.objects.all()
        tf = self.request.query_params.get('thematic_focus')
        if tf:
            qs = qs.filter(thematic_focus_id=tf)
        return qs

    def perform_create(self, serializer):
        serializer.save(thematic_focus_id=self.request.data.get('thematic_focus'))


class LeadPartnerViewSet(viewsets.ModelViewSet):
    queryset = LeadPartner.objects.all()
    serializer_class = LeadPartnerSerializer

    @action(detail=True, methods=['get'])
    def overview(self, request, pk=None):
        partner = self.get_object()
        data = agg.portfolio_overview(partner.projects.all())
        data['needs_attention'] = sorted(
            data['needs_attention'] + agg.needs_attention(indicators=partner.indicators.all()),
            key=lambda f: f['percentage'],
        )
        return Response(data)


class LeadPartnerIndicatorViewSet(viewsets.ModelViewSet):
    serializer_class = LeadPartnerIndicatorSerializer

    def get_queryset(self):
        qs = LeadPartnerIndicator.objects.all()
        lp = self.request.query_params.get('lead_partner')
        if lp:
            qs = qs.filter(lead_partner_id=lp)
        return qs

    def perform_create(self, serializer):
        serializer.save(lead_partner_id=self.request.data.get('lead_partner'))


class LeadPartnerDocumentViewSet(viewsets.ModelViewSet):
    serializer_class = LeadPartnerDocumentSerializer

    def get_queryset(self):
        qs = LeadPartnerDocument.objects.all()
        lp = self.request.query_params.get('lead_partner')
        if lp:
            qs = qs.filter(lead_partner_id=lp)
        return qs

    def perform_create(self, serializer):
        serializer.save(lead_partner_id=self.request.data.get('lead_partner'))


class DonorViewSet(viewsets.ModelViewSet):
    queryset = Donor.objects.all()
    serializer_class = DonorSerializer

    @action(detail=True, methods=['get'])
    def overview(self, request, pk=None):
        donor = self.get_object()
        data = agg.portfolio_overview(donor.projects.all())
        data['needs_attention'] = sorted(
            data['needs_attention'] + agg.needs_attention(indicators=donor.indicators.all()),
            key=lambda f: f['percentage'],
        )
        return Response(data)


class DonorIndicatorViewSet(viewsets.ModelViewSet):
    serializer_class = DonorIndicatorSerializer

    def get_queryset(self):
        qs = DonorIndicator.objects.all()
        donor = self.request.query_params.get('donor')
        if donor:
            qs = qs.filter(donor_id=donor)
        return qs

    def perform_create(self, serializer):
        serializer.save(donor_id=self.request.data.get('donor'))


class DonorDocumentViewSet(viewsets.ModelViewSet):
    serializer_class = DonorDocumentSerializer

    def get_queryset(self):
        qs = DonorDocument.objects.all()
        donor = self.request.query_params.get('donor')
        if donor:
            qs = qs.filter(donor_id=donor)
        return qs

    def perform_create(self, serializer):
        serializer.save(donor_id=self.request.data.get('donor'))


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()

    def get_queryset(self):
        qs = _filter_projects_by_query_params(Project.objects.all(), self.request.query_params)
        if self.action == 'list':
            qs = qs.prefetch_related('countries', 'donors', 'thematic_focus', 'activities', 'lead_partner')
        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return ProjectListSerializer
        return ProjectSerializer

    @action(detail=True, methods=['get'])
    def overview(self, request, pk=None):
        project = self.get_object()
        return Response(agg.project_overview(project))


class ProjectActivityViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectActivitySerializer

    def get_queryset(self):
        qs = ProjectActivity.objects.all()
        project = self.request.query_params.get('project')
        if project:
            qs = qs.filter(project_id=project)
        return qs

    def perform_create(self, serializer):
        serializer.save(project_id=self.request.data.get('project'))


class ProjectIndicatorViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectIndicatorSerializer

    def get_queryset(self):
        qs = ProjectIndicator.objects.all()
        project = self.request.query_params.get('project')
        if project:
            qs = qs.filter(project_id=project)
        return qs

    def perform_create(self, serializer):
        serializer.save(project_id=self.request.data.get('project'))


class ProjectDocumentViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectDocumentSerializer

    def get_queryset(self):
        qs = ProjectDocument.objects.all()
        project = self.request.query_params.get('project')
        if project:
            qs = qs.filter(project_id=project)
        return qs

    def perform_create(self, serializer):
        serializer.save(project_id=self.request.data.get('project'))


class DashboardView(generics.GenericAPIView):
    """GET /api/meal/dashboard/?country=&donor=&lead_partner=&thematic_focus=&project=&start_after=&end_before="""

    def get(self, request):
        qs = _filter_projects_by_query_params(Project.objects.all(), request.query_params)
        return Response(agg.dashboard_overview(qs))


class SearchView(generics.GenericAPIView):
    """GET /api/meal/search/?q=<query> — searches by name across every module
    and every independent indicator pool, so "global search" really means
    global. Case-insensitive partial match, top 5 per category (a search
    result list showing 200 rows isn't useful — this is for finding the one
    record you're after, not browsing, which the module list pages already
    do)."""
    LIMIT_PER_KIND = 5

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        if not q:
            return Response({'results': []})

        results = []

        for obj in Project.objects.filter(name__icontains=q)[:self.LIMIT_PER_KIND]:
            results.append({'kind': 'project', 'id': obj.id, 'name': obj.name, 'subtitle': obj.get_status_display()})
        for obj in Donor.objects.filter(name__icontains=q)[:self.LIMIT_PER_KIND]:
            results.append({'kind': 'donor', 'id': obj.id, 'name': obj.name, 'subtitle': obj.get_donor_type_display()})
        for obj in LeadPartner.objects.filter(name__icontains=q)[:self.LIMIT_PER_KIND]:
            results.append({'kind': 'lead-partner', 'id': obj.id, 'name': obj.name, 'subtitle': obj.get_partner_type_display()})
        for obj in Country.objects.filter(name__icontains=q)[:self.LIMIT_PER_KIND]:
            results.append({'kind': 'country', 'id': obj.id, 'name': obj.name, 'subtitle': obj.region})
        for obj in ThematicFocus.objects.filter(name__icontains=q)[:self.LIMIT_PER_KIND]:
            results.append({'kind': 'thematic-focus', 'id': obj.id, 'name': obj.name, 'subtitle': 'Thematic Focus'})

        for obj in ProjectIndicator.objects.filter(name__icontains=q).select_related('project')[:self.LIMIT_PER_KIND]:
            results.append({
                'kind': 'indicator', 'indicator_kind': 'project', 'id': obj.id, 'name': obj.name,
                'subtitle': f'Indicator · {obj.project.name}',
            })
        for obj in DonorIndicator.objects.filter(name__icontains=q).select_related('donor')[:self.LIMIT_PER_KIND]:
            results.append({
                'kind': 'indicator', 'indicator_kind': 'donor', 'id': obj.id, 'name': obj.name,
                'subtitle': f'Indicator · {obj.donor.name}',
            })
        for obj in LeadPartnerIndicator.objects.filter(name__icontains=q).select_related('lead_partner')[:self.LIMIT_PER_KIND]:
            results.append({
                'kind': 'indicator', 'indicator_kind': 'lead-partner', 'id': obj.id, 'name': obj.name,
                'subtitle': f'Indicator · {obj.lead_partner.name}',
            })
        for obj in ThematicFocusIndicator.objects.filter(name__icontains=q).select_related('thematic_focus')[:self.LIMIT_PER_KIND]:
            results.append({
                'kind': 'indicator', 'indicator_kind': 'thematic-focus', 'id': obj.id, 'name': obj.name,
                'subtitle': f'Indicator · {obj.thematic_focus.name}',
            })

        return Response({'results': results})