

import { Project, Decision, Engagement } from "./types";

export const initialStrategicPlan = {
  title: "Empowering Underprivileged Communities through Education and Health",
  version: "2.0",
  startDate: "2024-01-01",
  endDate: "2028-12-31",
  isActive: true,
  overallObjective:
    "To significantly improve the quality of life for 1 million people in underprivileged communities by 2028 through targeted interventions in education and healthcare.",
  strategicObjectives: [
    {
      id: "so-1",
      number: "SO1",
      name: "Enhance Educational Access & Quality",
      description:
        "Increase primary school enrollment and retention rates by 25% and improve learning outcomes in core subjects through teacher training and resource provision.",
      corporateIndicators: [
        {
          name: "Primary school enrollment rate",
          disaggregators: ['Male', 'Female', 'Urban', 'Rural'],
        },
        {
          name: "Student retention rate",
          disaggregators: ['Male', 'Female'],
        },
      ],
      outcomes: [
        {
            id: 'outcome-1-1',
            name: "Improved learning outcomes for primary students",
            description: "Students in targeted schools demonstrate measurable improvements in literacy and numeracy.",
            indicators: [ {name: "% of students achieving proficiency in literacy tests"} ],
            outputs: [
                {
                    id: 'output-1-1-1',
                    name: "Enhanced teaching capacity",
                    indicators: [ { name: "Number of teachers trained in new pedagogical methods"} ],
                    activities: [ {id: 'act-1-1-1-1', name: "Conduct pedagogical training workshops" } ]
                },
                {
                    id: 'output-1-1-2',
                    name: "Increased availability of learning materials",
                    indicators: [ { name: "Student-to-textbook ratio" } ],
                    activities: []
                }
            ]
        }
      ]
    },
    {
      id: "so-2",
      number: "SO2",
      name: "Improve Healthcare Services",
      description:
        "Reduce child mortality by 20% and improve maternal health by establishing 50 new community health clinics and training 500 healthcare workers.",
      corporateIndicators: [
        {
          name: "Under-5 mortality rate",
          disaggregators: ['Male', 'Female', 'Cause of Death'],
        },
        {
          name: "Access to clean water",
          disaggregators: ['Household', 'School', 'Health Facility'],
        },
      ],
       outcomes: [],
    },
    {
      id: "so-3",
      number: "SO3",
      name: "Foster Community Engagement",
      description:
        "Strengthen community-based organizations and increase citizen participation in local governance and development processes.",
      corporateIndicators: [
        {
          name: "Percentage of community members in leadership roles",
          disaggregators: ['Male', 'Female', 'Youth'],
        }
      ],
       outcomes: [],
    },
  ],
};

export const initialPrograms = [
  {
    id: "PROG-001",
    name: "Clean Water Initiative",
    description: "A comprehensive program to provide access to clean and safe drinking water for 10,000 households in the Arid Region.",
    linkedObjectives: [
      {
        number: "SO2",
        name: "Improve Healthcare Services",
        outcomes: [
            {
                id: 'prog-outcome-1',
                name: 'Reduced incidence of waterborne diseases',
                indicators: [{ name: '% reduction in reported cholera cases', disaggregators: [] }],
                outputs: [
                    {
                        id: 'prog-output-1',
                        name: 'New water sources established',
                        indicators: [{ name: 'Number of new wells constructed', disaggregators: [] }]
                    }
                ]
            }
        ]
      },
    ],
  },
  {
    id: "PROG-002",
    name: "Youth Education & Empowerment",
    description: "Focused on improving educational outcomes and providing vocational training for 5,000 young people in urban centers.",
    linkedObjectives: [
      {
        number: "SO1",
        name: "Enhance Educational Access & Quality",
         outcomes: [],
      },
      {
        number: "SO3",
        name: "Foster Community Engagement",
         outcomes: [],
      }
    ],
  },
   {
    id: "PROG-003",
    name: "Education Program",
    description: "A program focused on education.",
     linkedObjectives: [
        {
            number: "SO1",
            name: "Enhance Educational Access & Quality",
            outcomes: [],
        },
     ],
  },
  {
    id: "PROG-004",
    name: "Healthcare Services",
    description: "A program focused on healthcare.",
    linkedObjectives: [],
  }
];

export const projectRoles = [
  'PROJECT_MANAGER',
  'M_E_OFFICER',
  'FINANCE_OFFICER',
  'FIELD_OFFICER',
  'DATA_ENTRY_CLERK',
  'DRIVER',
  'SECURITY_GUARD',
  'VIEWER'
];

export const initialTeamMembers = [
    { id: 'usr-001', name: 'Jane Doe', role: 'PROJECT_MANAGER', phone: '254-712-345678' },
    { id: 'usr-002', name: 'John Smith', role: 'M_E_OFFICER', phone: '254-723-456789' },
    { id: 'usr-003', name: 'Alice Johnson', role: 'FIELD_OFFICER', phone: '254-734-567890' },
];

export const initialProjects = [
  {
    id: "prj-uuid-001",
    code: "PRJ-001",
    title: "Water Access – Kisumu",
    description: "A project to improve access to clean water in the Kisumu region, focusing on well construction and hygiene education.",
    program: "Clean Water Initiative",
    manager: "Jane Doe",
    startDate: "2025-01-01",
    endDate: "2026-12-31",
    currency: "KES",
    status: "On Track",
    donors: [
      { id: "donor-01", name: "Global Fund" },
      { id: "donor-02", name: "Bill & Melinda Gates Foundation" },
    ],
    team: [
        { id: 'usr-001', name: 'Jane Doe', role: 'PROJECT_MANAGER', phone: '254-712-345678' },
        { id: 'usr-002', name: 'John Smith', role: 'M_E_OFFICER', phone: '254-723-456789' },
        { id: 'usr-003', name: 'Alice Johnson', role: 'FIELD_OFFICER', phone: '254-734-567890' },
    ],
    locations: [
        { id: 'loc-001', name: "Village A, Kisumu County, Kenya", lat: -0.0917, lon: 34.7680 },
        { id: 'loc-002', name: "Village B, Kisumu County, Kenya", lat: -0.1017, lon: 34.7580 },
    ],
    indicatorTargets: [
        { id: 'tgt-01', indicatorId: 'proj-ind-04', year: '2025', quarter: 'Q1', value: 2 },
        { id: 'tgt-02', indicatorId: 'proj-ind-04', year: '2025', quarter: 'Q2', value: 3 },
        { id: 'tgt-03', indicatorId: 'proj-ind-04', year: '2025', quarter: 'Q3', value: 3 },
        { id: 'tgt-04', indicatorId: 'proj-ind-04', year: '2025', quarter: 'Q4', value: 2 },
        { id: 'tgt-05', indicatorId: 'proj-ind-01', year: '2025', quarter: 'Q2', value: -5 },
    ],
    resultsFramework: {
      objective: "To improve health and hygiene in 5 villages in Kisumu region.",
      outcomes: [
        { id: 'prj-out-1', name: 'Reduced prevalence of water-borne diseases', indicators: [{ name: '% of households reporting diarrhea in last 30 days', disaggregators: [] }], outputs: [
          { id: 'prj-op-1', name: 'Increased access to safe water sources', indicators: [{ name: 'Liters per capita per day available', disaggregators: [] }], activities: [
            { id: 'prj-act-1', name: 'Drill 5 new boreholes' }
          ] }
        ]}
      ]
    },
    indicators: [
        {
            id: 'proj-ind-01',
            name: "Child mortality rate in Kisumu",
            isDonorIndicator: true,
            disaggregators: ['Male', 'Female'],
            linkedProgramIndicatorName: "Under-5 mortality rate",
            linkedStrategicObjectiveNumber: "SO2",
            allDisaggregators: ['Male', 'Female', 'Cause of Death']
        },
        {
            id: 'proj-ind-04',
            name: "Functioning water points in Kisumu schools",
            isDonorIndicator: false,
            disaggregators: ['School'],
            linkedProgramIndicatorName: "Access to clean water",
            linkedStrategicObjectiveNumber: "SO2",
            allDisaggregators: ['Household', 'School', 'Health Facility']
        }
    ],
    activities: [
        { id: 'act-01', name: 'Construct 10 new boreholes', description: 'Drilling and installation of 10 new community boreholes in selected villages.', linkedIndicatorId: 'proj-ind-04' },
        { id: 'act-02', name: 'Conduct hygiene promotion workshops', description: 'Facilitate 20 workshops on safe water handling and hygiene practices.', linkedIndicatorId: 'proj-ind-01' },
    ],
    tasks: [
        {
            id: 'task-01',
            title: 'Site Survey for Boreholes',
            activityId: 'act-01',
            activityName: 'Construct 10 new boreholes',
            focalPersonId: 'usr-003', // Alice Johnson
            focalPersonName: 'Alice Johnson',
            locationIds: ['loc-001'],
            startDate: '2024-07-20',
            endDate: '2024-07-28',
            budget: 5000,
            indicatorData: {},
            attachments: [],
            qaAdjustments: {},
            updates: [
                {
                    statusDate: '2024-07-27',
                    status: 'green',
                    statusJustification: 'Completed ahead of schedule.',
                    isComplete: true,
                    amountSpent: 4800,
                }
            ]
        },
        {
            id: 'task-02',
            title: 'Drilling of Borehole 1',
            activityId: 'act-01',
            activityName: 'Construct 10 new boreholes',
            focalPersonId: 'usr-003', // Alice Johnson
            focalPersonName: 'Alice Johnson',
            locationIds: ['loc-001', 'loc-002'],
            startDate: '2024-07-29',
            endDate: '2024-08-10',
            budget: 25000,
            indicatorData: { 'School': 1 },
            attachments: [],
            qaAdjustments: {
                'proj-ind-04': {
                    'School': { value: -1, justification: 'Duplicate entry by field officer. Corrected.'}
                }
            },
            updates: [
                 {
                    statusDate: '2024-08-01',
                    status: 'green',
                    statusJustification: 'On track.',
                    isComplete: false,
                    amountSpent: 10000,
                }
            ]
        },
        {
            id: 'task-03',
            title: 'Develop workshop materials',
            activityId: 'act-02',
            activityName: 'Conduct hygiene promotion workshops',
            focalPersonId: 'usr-002', // John Smith
            focalPersonName: 'John Smith',
            locationIds: ['loc-002'],
            startDate: '2024-07-25',
            endDate: '2024-08-05',
            budget: 2000,
            indicatorData: { 'Male': 50, 'Female': 65 },
            attachments: [{ name: 'Workshop_Agenda.pdf', size: 120400 }],
            qaAdjustments: {
                'proj-ind-01': {
                    'Female': { value: 5, justification: 'Recounted attendance sheets, found 5 more participants.'}
                }
            },
            updates: [
                 {
                    statusDate: '2024-08-01',
                    status: 'amber',
                    statusJustification: 'Slight delay, but should catch up.',
                    isComplete: false,
                    amountSpent: 500,
                }
            ]
        }
    ],
    reporting: {
      schedules: [
        { id: 'sched-01', name: 'Quarterly Narrative Report', recipient: 'Donor', frequency: 'Quarterly' },
        { id: 'sched-02', name: 'Monthly Financial Report', recipient: 'Internal', frequency: 'Monthly' },
      ],
      submissions: [
        { id: 'sub-01', scheduleId: 'sched-01', title: 'Q1 2025 Narrative Report', date: '2025-04-15', url: '#', status: 'Accepted' },
        { id: 'sub-02', scheduleId: 'sched-02', title: 'January 2025 Financials', date: '2025-02-10', url: '#', status: 'Accepted' },
      ]
    }
  },
  {
    id: "prj-uuid-002",
    code: "PRJ-002",
    title: "Youth Skills Training - Nairobi",
    description: "Vocational training for at-risk youth in Nairobi's informal settlements.",
    program: "Youth Education & Empowerment",
    manager: "John Smith",
    startDate: "2024-06-01",
    endDate: "2025-05-31",
    currency: "USD",
    status: "At Risk",
    donors: [
      { id: "donor-03", name: "USAID" },
    ],
    team: [
        { id: 'usr-002', name: 'John Smith', role: 'PROJECT_MANAGER', phone: '254-723-456789' },
    ],
    locations: [
        { id: 'loc-004', name: "Kibera, Nairobi, Kenya", lat: -1.3147, lon: 36.7865 },
        { id: 'loc-005', name: "Mathare, Nairobi, Kenya", lat: -1.264, lon: 36.852 },
    ],
    indicatorTargets: [],
    resultsFramework: {
      objective: "To equip 500 at-risk youth with marketable vocational skills.",
      outcomes: []
    },
    indicators: [
      {
            id: 'proj-ind-02',
            name: 'Number of youth completing vocational training in Nairobi',
            isDonorIndicator: true,
            disaggregators: ['Male', 'Female', 'Trade'],
            linkedProgramIndicatorName: 'Youth accessing vocational training',
            linkedStrategicObjectiveNumber: 'SO1',
            allDisaggregators: ['Male', 'Female', 'Trade']
      },
      {
            id: 'proj-ind-05',
            name: 'Youth leadership roles in community projects',
            isDonorIndicator: false,
            disaggregators: ['Male', 'Female', 'Youth'],
            linkedProgramIndicatorName: 'Percentage of community members in leadership roles',
            linkedStrategicObjectiveNumber: 'SO3',
            allDisaggregators: ['Male', 'Female', 'Youth']
      }
    ],
    activities: [
        { id: 'act-03', name: 'Recruit 200 youth for training', description: 'Community mobilization and recruitment drives in target informal settlements.', linkedIndicatorId: 'proj-ind-02' },
        { id: 'act-04', name: 'Leadership and life skills training', description: 'Deliver a 2-week leadership course for all recruited youth.', linkedIndicatorId: 'proj-ind-05' },
    ],
    tasks: [],
    reporting: {
      schedules: [
        { id: 'sched-03', name: 'Bi-Annual Donor Report', recipient: 'Donor', frequency: 'Bi-Annually' },
      ],
      submissions: [
        { id: 'sub-03', scheduleId: 'sched-03', title: 'H1 2024 Report', date: '2024-07-20', url: '#', status: 'Returned for Amendments' },
      ]
    }
  },
   {
    id: "prj-uuid-003",
    code: "PRJ-003",
    title: "Primary School Support",
    description: "Providing books and materials to 50 primary schools.",
    program: "Education Program",
    manager: "Alice Johnson",
    startDate: "2023-01-01",
    endDate: "2024-12-31",
    currency: "EUR",
    status: "Completed",
    donors: [
       { id: "donor-04", name: "European Union" },
    ],
    team: [
        { id: 'usr-003', name: 'Alice Johnson', role: 'PROJECT_MANAGER', phone: '254-734-567890' },
    ],
    locations: [],
    indicatorTargets: [],
    resultsFramework: {
      objective: "To improve the quality of primary education in 50 schools.",
      outcomes: []
    },
    indicators: [
        {
            id: 'proj-ind-03',
            name: 'Enrollment rate in supported schools',
            isDonorIndicator: true,
            disaggregators: ['Male', 'Female', 'Rural'],
            linkedProgramIndicatorName: 'Primary school enrollment rate',
            linkedStrategicObjectiveNumber: 'SO1',
            allDisaggregators: ['Male', 'Female', 'Urban', 'Rural']
        },
        {
            id: 'proj-ind-06',
            name: 'Teachers trained in new curriculum',
            isDonorIndicator: false,
            disaggregators: ['Male', 'Female', 'Subject'],
            linkedProgramIndicatorName: 'Number of teachers trained',
            linkedStrategicObjectiveNumber: 'SO1',
            allDisaggregators: ['Male', 'Female', 'Subject']
        }
    ],
    activities: [
        { id: 'act-05', name: 'Procure and distribute textbooks', description: 'Distribution of 50,000 textbooks across 50 schools.', linkedIndicatorId: 'proj-ind-03' },
    ],
    tasks: [],
    reporting: {
      schedules: [],
      submissions: []
    }
  },
];

export const initialAllDisaggregators = [
    'Male', 'Female', 'Boys', 'Girls', 'Youth', 'PWD', 'Urban', 'Rural', 'By Grade', 'By Subject', 
    'Trade', 'Cause of Death', 'Household', 'School', 'Health Facility',
    'Community', 'Doctors', 'Nurses', 'Community Health Volunteers', 'Vaccine Type',
    'By Region', 'Project Type', 'Source Type', 'Domestic', 'International', 'Program', 'Overall'
];

export const reportRecipients = ['Donor', 'Partner', 'Management', 'Internal'];
export const reportFrequencies = ['Monthly', 'Quarterly', 'Bi-Annually', 'Annually'];


export const decisionStatuses = ['Not Started', 'In Progress', 'Completed', 'Overdue'];

export const initialDecisions = [
  {
    id: "DEC-001",
    decision: "Approve Q3 budget allocation",
    owner: "Jane Doe",
    deadline: "2024-08-15",
    status: "Completed",
  },
  {
    id: "DEC-002",
    decision: "Select vendor for water project",
    owner: "John Smith",
    deadline: "2024-09-01",
    status: "In Progress",
  },
  {
    id: "DEC-003",
    decision: "Finalize community outreach plan",
    owner: "Alice Johnson",
    deadline: "2024-08-20",
    status: "In Progress",
  },
  {
    id: "DEC-004",
    decision: "Review mid-term project report",
    owner: "Michael Chen",
    deadline: "2024-07-30",
    status: "Overdue",
  },
    {
    id: "DEC-005",
    decision: "Onboard new field volunteers",
    owner: "Samantha Bee",
    deadline: "2024-09-05",
    status: "In Progress",
  },
];

export const fieldTypes = ['text', 'textarea', 'number', 'select', 'checkbox', 'date', 'field_group'];
export const subFieldTypes = ['text', 'number', 'select'];


export const initialDataForms = [
  {
    id: 'form-001',
    title: 'Household Baseline Survey',
    description: 'A survey to collect baseline socio-economic data from households.',
    projectIds: ['prj-uuid-001', 'prj-uuid-003'],
    createdAt: '2024-07-10',
    fields: [
      { id: 'f-1', label: 'Household Head Name', type: 'text', required: true },
      { id: 'f-6', label: 'Interview Date', type: 'date', required: true },
      { id: 'f-12', label: 'Family Members', type: 'field_group', required: true, fields: [
          { id: 'f-12-1', label: 'Name', type: 'text', required: true },
          { id: 'f-12-2', label: 'Age', type: 'number', required: true },
          { id: 'f-12-3', label: 'Relationship', type: 'select', required: true, options: ['Spouse', 'Son', 'Daughter', 'Other'] },
      ]},
      { id: 'f-3', label: 'Main Source of Income', type: 'select', required: true, options: ['Farming', 'Small Business', 'Formal Employment', 'Casual Labor'] },
      { id: 'f-4', label: 'Do you have children in school?', type: 'select', options: ['Yes', 'No'], required: true },
      { id: 'f-5', label: 'How many children in school?', type: 'number', required: true, condition: { fieldId: 'f-4', operator: 'equals', value: 'Yes' } },
    ],
  },
  {
    id: 'form-002',
    title: 'Training Attendance',
    description: 'To record attendance at vocational training sessions.',
    projectIds: ['prj-uuid-002'],
    createdAt: '2024-06-15',
    fields: [
      { id: 'f-7', label: 'Participant Name', type: 'text', required: true },
      { id: 'f-8', label: 'Age', type: 'number', required: true },
      { id: 'f-9', label: 'Gender', type: 'select', required: true, options: ['Male', 'Female', 'Other'] },
      { id: 'f-10', label: 'Training Module', type: 'text', required: true, defaultValue: 'Introduction to Plumbing' },
      { id: 'f-11', label: 'Date', type: 'date', required: true },
    ],
  }
];

export const initialSubmissions = {
  'form-001': [
    { id: 'sub-1-1', submittedAt: '2024-07-20T10:00:00Z', data: { 
        'f-1': 'John Omondi', 
        'f-6': '2024-07-20',
        'f-12': [
            { 'f-12-1': 'Mary Omondi', 'f-12-2': 34, 'f-12-3': 'Spouse' },
            { 'f-12-1': 'Peter Omondi', 'f-12-2': 12, 'f-12-3': 'Son' },
        ],
        'f-3': 'Farming', 
        'f-4': 'Yes', 
        'f-5': 1, 
    } },
    { id: 'sub-1-2', submittedAt: '2024-07-20T11:30:00Z', data: { 
        'f-1': 'Alice Akinyi', 
        'f-6': '2024-07-20',
        'f-12': [],
        'f-3': 'Small Business', 
        'f-4': 'No', 
    } },
  ],
  'form-002': [
     { id: 'sub-2-1', submittedAt: '2024-07-21T09:00:00Z', data: { 'f-7': 'Peter Kamau', 'f-8': 22, 'f-9': 'Male', 'f-10': 'Introduction to Plumbing', 'f-11': '2024-07-21' } },
     { id: 'sub-2-2', submittedAt: '2024-07-21T09:05:00Z', data: { 'f-7': 'Esther Wanjiru', 'f-8': 19, 'f-9': 'Female', 'f-10': 'Introduction to Plumbing', 'f-11': '2024-07-21' } },
  ],
};
    
