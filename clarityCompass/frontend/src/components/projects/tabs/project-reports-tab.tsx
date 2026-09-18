
'use client';

import React from 'react';

import ProjectReportGenerator from '@/components/projects/project-report-generator';

export function ProjectReportsTab({ project }: { project: any }) {
    return <ProjectReportGenerator project={project} />;
}
