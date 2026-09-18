-- ClarityCompass SQL Data Model
-- This schema is designed for a relational database like PostgreSQL.

-- =============================================
-- Core & User Management
-- =============================================

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    org_type VARCHAR(50) NOT NULL, -- 'NGO', 'Donor', 'Government'
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    password_hash VARCHAR(255), -- Store hashed passwords
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE project_team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    role VARCHAR(100) NOT NULL, -- e.g., 'PROJECT_MANAGER', 'M_E_OFFICER'
    UNIQUE(user_id, project_id)
);


-- =============================================
-- Strategic Planning (NGO)
-- =============================================

CREATE TABLE strategic_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id),
    title VARCHAR(255) NOT NULL,
    version VARCHAR(50),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT false,
    overall_objective TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE strategic_objectives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES strategic_plans(id) ON DELETE CASCADE,
    number VARCHAR(20) NOT NULL, -- e.g., 'SO1'
    name VARCHAR(255) NOT NULL,
    description TEXT,
    UNIQUE(plan_id, number)
);

CREATE TABLE disaggregators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id),
    name VARCHAR(100) NOT NULL,
    UNIQUE(org_id, name)
);

CREATE TABLE corporate_indicators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    objective_id UUID NOT NULL REFERENCES strategic_objectives(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT
);

CREATE TABLE corporate_indicator_disaggregators (
    indicator_id UUID NOT NULL REFERENCES corporate_indicators(id) ON DELETE CASCADE,
    disaggregator_id UUID NOT NULL REFERENCES disaggregators(id) ON DELETE CASCADE,
    PRIMARY KEY (indicator_id, disaggregator_id)
);


-- =============================================
-- Programs & Projects (NGO)
-- =============================================

CREATE TABLE programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    UNIQUE(org_id, name)
);

CREATE TABLE program_objective_links (
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    objective_id UUID NOT NULL REFERENCES strategic_objectives(id) ON DELETE CASCADE,
    PRIMARY KEY (program_id, objective_id)
);

CREATE TABLE program_indicators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    corporate_indicator_id UUID NOT NULL REFERENCES corporate_indicators(id),
    -- Custom name/description for this program if needed, otherwise inherits from corporate
    name_override VARCHAR(255),
    description_override TEXT
);

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL REFERENCES programs(id),
    code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    manager_id UUID REFERENCES users(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    currency VARCHAR(10) NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'On Track', 'At Risk', 'Completed'
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE project_indicators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    program_indicator_id UUID REFERENCES program_indicators(id),
    name VARCHAR(255) NOT NULL, -- Project-specific name
    description TEXT
);

CREATE TABLE project_indicator_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_indicator_id UUID NOT NULL REFERENCES project_indicators(id) ON DELETE CASCADE,
    financial_year INT NOT NULL,
    quarter VARCHAR(2) NOT NULL, -- 'Q1', 'Q2', 'Q3', 'Q4'
    value NUMERIC NOT NULL,
    UNIQUE(project_indicator_id, financial_year, quarter)
);


-- =============================================
-- Activities & Tasks (NGO)
-- =============================================

CREATE TABLE key_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    linked_project_indicator_id UUID REFERENCES project_indicators(id),
    name VARCHAR(255) NOT NULL,
    description TEXT
);

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES key_activities(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    focal_person_id UUID REFERENCES users(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    budget NUMERIC(15, 2),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE task_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    status_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'green', 'amber', 'red'
    status_justification TEXT,
    is_complete BOOLEAN DEFAULT false,
    amount_spent NUMERIC(15, 2),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE task_indicator_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_update_id UUID NOT NULL REFERENCES task_updates(id) ON DELETE CASCADE,
    project_indicator_id UUID NOT NULL REFERENCES project_indicators(id) ON DELETE CASCADE,
    disaggregator_id UUID NOT NULL REFERENCES disaggregators(id) ON DELETE CASCADE,
    value NUMERIC NOT NULL,
    UNIQUE(task_update_id, project_indicator_id, disaggregator_id)
);

CREATE TABLE task_qa_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    project_indicator_id UUID NOT NULL REFERENCES project_indicators(id) ON DELETE CASCADE,
    disaggregator_id UUID NOT NULL REFERENCES disaggregators(id) ON DELETE CASCADE,
    adjustment_value NUMERIC NOT NULL,
    justification TEXT NOT NULL,
    adjusted_by_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(task_id, project_indicator_id, disaggregator_id)
);

CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID NOT NULL, -- Can be task_id, opportunity_id, etc.
    parent_type VARCHAR(50) NOT NULL, -- 'TASK', 'OPPORTUNITY', 'PROPOSAL', 'REPORT'
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(512) NOT NULL,
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    uploaded_by_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);


-- =============================================
-- Donor & Shared Portal
-- =============================================

CREATE TABLE funding_opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donor_org_id UUID NOT NULL REFERENCES organizations(id),
    number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    budget NUMERIC(15, 2),
    status VARCHAR(50) NOT NULL, -- 'Forecasted', 'Posted', 'Closed', 'Suspended'
    posted_date DATE,
    closing_date DATE NOT NULL,
    funding_type VARCHAR(50),
    eligibility TEXT,
    link_to_details VARCHAR(512),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Many-to-many relationship between projects and donors
CREATE TABLE project_funders (
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    donor_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    funding_amount NUMERIC(15, 2),
    PRIMARY KEY (project_id, donor_org_id)
);

CREATE TABLE proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id UUID NOT NULL REFERENCES funding_opportunities(id),
    ngo_org_id UUID NOT NULL REFERENCES organizations(id),
    focal_person_id UUID NOT NULL REFERENCES users(id),
    proposed_budget NUMERIC(15, 2) NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'Under Review', 'Short-listed', 'Awarded', 'Rejected'
    submission_date TIMESTAMPTZ DEFAULT now(),
    notes_to_donor TEXT
);

CREATE TABLE proposal_communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES proposals(id),
    sender_id UUID NOT NULL REFERENCES users(id),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- Reporting
-- =============================================

CREATE TABLE project_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id),
    title VARCHAR(255) NOT NULL,
    submission_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'Pending Review', 'Accepted', 'Returned for Amendments'
    report_url VARCHAR(512), -- Link to the stored report file
    notes_to_donor TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE report_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES project_reports(id),
    reviewer_id UUID NOT NULL REFERENCES users(id), -- User from donor org
    feedback_notes TEXT NOT NULL,
    new_status VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
