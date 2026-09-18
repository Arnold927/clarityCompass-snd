-- =============================================
-- ClarityCompass Data Model
-- =============================================

-- ---------------------------------------------
-- Core & Strategic Planning Tables
-- ---------------------------------------------

CREATE TABLE Users (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50)
);

CREATE TABLE Strategic_Plans (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    version VARCHAR(50),
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    overall_objective TEXT
);

CREATE TABLE Strategic_Objectives (
    id VARCHAR(255) PRIMARY KEY,
    strategic_plan_id VARCHAR(255) NOT NULL REFERENCES Strategic_Plans(id),
    "number" VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT
);

CREATE TABLE Disaggregators (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE Corporate_Indicators (
    id VARCHAR(255) PRIMARY KEY,
    strategic_objective_id VARCHAR(255) NOT NULL REFERENCES Strategic_Objectives(id),
    name TEXT NOT NULL
);

CREATE TABLE Corporate_Indicator_Disaggregators (
    indicator_id VARCHAR(255) NOT NULL REFERENCES Corporate_Indicators(id),
    disaggregator_id INTEGER NOT NULL REFERENCES Disaggregators(id),
    PRIMARY KEY (indicator_id, disaggregator_id)
);

-- ---------------------------------------------
-- Program & Project Management Tables
-- ---------------------------------------------

CREATE TABLE Programs (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT
);

CREATE TABLE Program_Strategic_Objectives (
    program_id VARCHAR(255) NOT NULL REFERENCES Programs(id),
    strategic_objective_id VARCHAR(255) NOT NULL REFERENCES Strategic_Objectives(id),
    PRIMARY KEY (program_id, strategic_objective_id)
);

-- Program-specific indicators are a subset of corporate indicators linked through the Program's SOs.
CREATE TABLE Program_Indicators (
    id VARCHAR(255) PRIMARY KEY,
    program_id VARCHAR(255) NOT NULL REFERENCES Programs(id),
    strategic_objective_id VARCHAR(255) NOT NULL REFERENCES Strategic_Objectives(id),
    corporate_indicator_id VARCHAR(255) NOT NULL REFERENCES Corporate_Indicators(id),
    UNIQUE (program_id, corporate_indicator_id)
);

CREATE TABLE Donors (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE Projects (
    id VARCHAR(255) PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    program_id VARCHAR(255) REFERENCES Programs(id),
    manager_id VARCHAR(255) REFERENCES Users(id),
    start_date DATE,
    end_date DATE,
    status VARCHAR(50),
    currency VARCHAR(10)
);

CREATE TABLE Project_Donors (
    project_id VARCHAR(255) NOT NULL REFERENCES Projects(id),
    donor_id VARCHAR(255) NOT NULL REFERENCES Donors(id),
    PRIMARY KEY (project_id, donor_id)
);

CREATE TABLE Project_Indicators (
    id VARCHAR(255) PRIMARY KEY,
    project_id VARCHAR(255) NOT NULL REFERENCES Projects(id),
    name TEXT NOT NULL,
    program_indicator_id VARCHAR(255) REFERENCES Program_Indicators(id)
);

CREATE TABLE Project_Indicator_Disaggregators (
    project_indicator_id VARCHAR(255) NOT NULL REFERENCES Project_Indicators(id),
    disaggregator_id INTEGER NOT NULL REFERENCES Disaggregators(id),
    PRIMARY KEY (project_indicator_id, disaggregator_id)
);

CREATE TABLE Indicator_Targets (
    id VARCHAR(255) PRIMARY KEY,
    project_indicator_id VARCHAR(255) NOT NULL REFERENCES Project_Indicators(id),
    financial_year VARCHAR(10),
    quarter VARCHAR(5),
    target_value DECIMAL(18, 2) NOT NULL,
    UNIQUE(project_indicator_id, financial_year, quarter)
);

CREATE TABLE Project_Team_Members (
    id VARCHAR(255) PRIMARY KEY,
    project_id VARCHAR(255) NOT NULL REFERENCES Projects(id),
    user_id VARCHAR(255) NOT NULL REFERENCES Users(id),
    "role" VARCHAR(100) NOT NULL
);

CREATE TABLE Key_Activities (
    id VARCHAR(255) PRIMARY KEY,
    project_id VARCHAR(255) NOT NULL REFERENCES Projects(id),
    linked_indicator_id VARCHAR(255) REFERENCES Project_Indicators(id),
    name VARCHAR(255) NOT NULL,
    description TEXT
);

-- ---------------------------------------------
-- Task Management & Data Collection
-- ---------------------------------------------

CREATE TABLE Tasks (
    id VARCHAR(255) PRIMARY KEY,
    activity_id VARCHAR(255) NOT NULL REFERENCES Key_Activities(id),
    focal_person_id VARCHAR(255) REFERENCES Project_Team_Members(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    budget DECIMAL(18, 2)
);

CREATE TABLE Task_Updates (
    id SERIAL PRIMARY KEY,
    task_id VARCHAR(255) NOT NULL REFERENCES Tasks(id),
    status_date DATE NOT NULL,
    status VARCHAR(50), -- e.g., 'green', 'amber', 'red'
    status_justification TEXT,
    is_complete BOOLEAN DEFAULT FALSE,
    amount_spent DECIMAL(18, 2)
);

CREATE TABLE Task_Attachments (
    id SERIAL PRIMARY KEY,
    task_id VARCHAR(255) NOT NULL REFERENCES Tasks(id),
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER
);

CREATE TABLE Task_Indicator_Data (
    id SERIAL PRIMARY KEY,
    task_update_id INTEGER NOT NULL REFERENCES Task_Updates(id),
    project_indicator_id VARCHAR(255) NOT NULL REFERENCES Project_Indicators(id),
    disaggregator_id INTEGER NOT NULL REFERENCES Disaggregators(id),
    reported_value DECIMAL(18, 2) NOT NULL,
    UNIQUE (task_update_id, project_indicator_id, disaggregator_id)
);

CREATE TABLE QA_Adjustments (
    id SERIAL PRIMARY KEY,
    task_id VARCHAR(255) NOT NULL REFERENCES Tasks(id),
    project_indicator_id VARCHAR(255) NOT NULL REFERENCES Project_Indicators(id),
    disaggregator_id INTEGER NOT NULL REFERENCES Disaggregators(id),
    adjusted_value DECIMAL(18, 2) NOT NULL,
    justification TEXT NOT NULL,
    UNIQUE (task_id, project_indicator_id, disaggregator_id)
);

-- ---------------------------------------------
-- Accountability & Reporting
-- ---------------------------------------------

CREATE TABLE Decisions (
    id VARCHAR(255) PRIMARY KEY,
    decision TEXT NOT NULL,
    owner_id VARCHAR(255) REFERENCES Users(id),
    deadline DATE,
    status VARCHAR(50)
);

CREATE TABLE Reporting_Schedules (
    id VARCHAR(255) PRIMARY KEY,
    project_id VARCHAR(255) NOT NULL REFERENCES Projects(id),
    name VARCHAR(255) NOT NULL,
    recipient VARCHAR(100), -- e.g., 'Donor', 'Internal'
    frequency VARCHAR(50)  -- e.g., 'Monthly', 'Quarterly'
);

CREATE TABLE Report_Submissions (
    id VARCHAR(255) PRIMARY KEY,
    schedule_id VARCHAR(255) NOT NULL REFERENCES Reporting_Schedules(id),
    title VARCHAR(255) NOT NULL,
    submission_date DATE NOT NULL,
    document_url TEXT,
    status VARCHAR(50), -- 'Pending Review', 'Accepted', 'Rejected'
    notes TEXT
);

CREATE TABLE Report_Feedback (
    id SERIAL PRIMARY KEY,
    submission_id VARCHAR(255) NOT NULL REFERENCES Report_Submissions(id),
    reviewer_id VARCHAR(255) REFERENCES Users(id),
    feedback_date DATE NOT NULL,
    notes TEXT,
    new_status VARCHAR(50)
);

-- ---------------------------------------------
-- Donor & Funding Opportunities
-- ---------------------------------------------

CREATE TABLE Funding_Opportunities (
    id VARCHAR(255) PRIMARY KEY,
    donor_id VARCHAR(255) NOT NULL REFERENCES Donors(id),
    "number" VARCHAR(50) UNIQUE,
    title VARCHAR(255) NOT NULL,
    budget DECIMAL(18, 2),
    status VARCHAR(50),
    posted_date DATE,
    closing_date DATE,
    funding_type VARCHAR(50),
    eligibility TEXT,
    additional_info TEXT,
    link TEXT
);

CREATE TABLE Opportunity_Attachments (
    id SERIAL PRIMARY KEY,
    opportunity_id VARCHAR(255) NOT NULL REFERENCES Funding_Opportunities(id),
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER
);

CREATE TABLE Bids (
    id VARCHAR(255) PRIMARY KEY,
    opportunity_id VARCHAR(255) NOT NULL REFERENCES Funding_Opportunities(id),
    ngo_name VARCHAR(255) NOT NULL, -- Simplified for now, could be a foreign key to an NGO table
    proposal_url TEXT,
    budget DECIMAL(18, 2),
    focal_person_name VARCHAR(255),
    focal_person_email VARCHAR(255),
    focal_person_phone VARCHAR(50),
    status VARCHAR(50)
);

CREATE TABLE Bid_Notes (
    id SERIAL PRIMARY KEY,
    bid_id VARCHAR(255) NOT NULL REFERENCES Bids(id),
    author_id VARCHAR(255) REFERENCES Users(id),
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
