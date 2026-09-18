from pathlib import Path
from django.core.files import File
from django.core.management.base import BaseCommand
from meal.models import (
    Country, ThematicFocus, LeadPartner, Donor, Project,
    ProjectActivity, ProjectIndicator, DonorIndicator, LeadPartnerIndicator,
)

SEED_ASSETS = Path(__file__).resolve().parent.parent.parent / 'seed_assets'


class Command(BaseCommand):
    help = "Seed demo data matching the SND Africa MEAL Dashboard reference screenshots."

    def handle(self, *args, **options):
        # --- Countries ---
        kenya, _ = Country.objects.update_or_create(
            name='Kenya', defaults=dict(iso_code='KE', region='East Africa', first_implementation_year=2018)
        )
        ethiopia, _ = Country.objects.update_or_create(
            name='Ethiopia', defaults=dict(iso_code='ET', region='East Africa', first_implementation_year=2019)
        )
        for country, filename in [(kenya, 'ke.png'), (ethiopia, 'et.png')]:
            if not country.flag:
                flag_path = SEED_ASSETS / 'flags' / filename
                with open(flag_path, 'rb') as f:
                    country.flag.save(filename, File(f), save=True)

        # --- The seven real SND Africa thematic pillars ---
        pillar_names = [
            'Peace Building and Governance',
            'Humanitarian Assistance and Emergency Response',
            'Protection, Gender Equality and Inclusion',
            'Climate Justice and Resilience',
            'Livelihood and Enterprise Development',
            'Water, Sanitation and Hygiene (WASH)',
            'Institutional Effectiveness and Sustainability',
        ]
        pillars = {}
        for name in pillar_names:
            pillars[name], _ = ThematicFocus.objects.update_or_create(
                name=name, defaults=dict(reporting_frequency='Annual', responsible_person='MEAL Manager')
            )

        protection = pillars['Protection, Gender Equality and Inclusion']
        protection.reach_total = 12500
        protection.reach_male = 5800
        protection.reach_female = 6200
        protection.reach_pwd = 500
        protection.description = (
            'Promoting the rights, safety and wellbeing of vulnerable and marginalized people, '
            'with a focus on children, women, girls and persons with disabilities.'
        )
        protection.save()
        for name, target, achievement, unit in [
            ('Children reached with protection services', 4000, 3200, 'Children'),
            ('Community child protection structures strengthened', 100, 75, 'Structures'),
            ('Parents and caregivers trained on positive parenting', 150, 120, 'People'),
            ('Women and girls supported with GBV response services', 100, 65, 'Women/Girls'),
        ]:
            protection.indicators.update_or_create(
                name=name, defaults=dict(target=target, achievement=achievement, unit=unit,
                                          reporting_period='Aug 2026')
            )

        # --- Lead Partner ---
        tdh, _ = LeadPartner.objects.update_or_create(
            name='TDH Germany – terre des hommes Deutschland e.V.',
            defaults=dict(
                description='For a world in which all children can live a self-determined life in dignity and security.',
                partner_type='INTERNATIONAL_NGO', head_office='Osnabrück, Germany',
                website='https://www.tdh.de', partnership_since=2018,
            )
        )
        for name, target, achievement in [
            ('Children supported with protection services', 1500, 1250),
            ('Community members trained on climate resilience', 400, 320),
            ('Child protection structures established/strengthened', 85, 75),
            ('Schools supported with learning materials', 60, 40),
        ]:
            tdh.indicators.update_or_create(
                name=name, defaults=dict(target=target, achievement=achievement, unit='')
            )

        # --- Donor ---
        bmz, _ = Donor.objects.update_or_create(
            name='BMZ - German Federal Ministry for Economic Cooperation and Development',
            defaults=dict(
                description='Supporting sustainable development, peace and social justice through partnership.',
                donor_type='BILATERAL', head_office='Bonn, Germany',
                website='https://www.bmz.de', partnership_since=2019,
            )
        )
        for name, target, achievement in [
            ('Health facilities supported with SFP commodities', 100, 100),
            ('Community health workers trained', 500, 420),
            ('Households supported with livelihoods', 1000, 780),
            ('Schools supported with WASH facilities', 50, 40),
        ]:
            bmz.indicators.update_or_create(
                name=name, defaults=dict(target=target, achievement=achievement, unit='')
            )

        # --- Project: PROTECT - Cross-Border ---
        project, _ = Project.objects.update_or_create(
            name='PROTECT – Cross-Border',
            defaults=dict(
                description=(
                    'PROTECT aims to promote resilience and cross-border transformation of social norms for '
                    'community-based child protection in Ethiopia and Kenya. The project works with communities, '
                    'local authorities and partners to prevent and respond to child protection risks, with a focus '
                    'on harmful practices, child rights and strengthened protection systems.'
                ),
                lead_partner=tdh, start_date='2026-04-01', end_date='2029-03-31',
                status='ONGOING', budget=3300000, currency='USD',
            )
        )
        project.countries.set([kenya, ethiopia])
        project.donors.set([bmz])
        project.thematic_focus.set([protection])

        activities = [
            ('Training of community child protection committees', 500, 420, 210, 180, 50, 'COMPLETED'),
            ('Awareness sessions on child rights', 1000, 650, 320, 280, 50, 'ONGOING'),
            ('Support to child protection case management', 800, 520, 250, 240, 30, 'PARTIALLY_DONE'),
            ('Cross-border learning exchange', 200, 0, 0, 0, 0, 'NOT_STARTED'),
            ('Community dialogues on harmful practices', 800, 860, 370, 410, 80, 'COMPLETED'),
        ]
        for name, target, reach, male, female, pwd, status in activities:
            project.activities.update_or_create(
                name=name,
                defaults=dict(target=target, reach=reach, reach_male=male, reach_female=female,
                              reach_pwd=pwd, status=status, reporting_period='Q2 2026')
            )

        indicators = [
            ('Children reached with protection services', 5000, 4200, 'Children', 'Q2 2026'),
            ('Community members trained on child protection', 2000, 1650, 'People', 'Q2 2026'),
            ('Child protection structures established/strengthened', 50, 42, 'Structures', 'Q1 2026'),
            ('Community dialogues conducted', 800, 540, 'Sessions', 'Q1 2026'),
        ]
        for name, target, achievement, unit, period in indicators:
            project.indicators.update_or_create(
                name=name, defaults=dict(target=target, achievement=achievement, unit=unit,
                                          reporting_period=period)
            )

        self.stdout.write(self.style.SUCCESS(
            'Seeded: 2 countries, 7 thematic pillars, 1 lead partner, 1 donor, '
            '1 project (5 activities, 4 indicators).'
        ))
