
'use client';

import React from 'react';
import { ProjectResultsFramework } from '@/components/projects/project-results-framework';

export function ProjectResultsFrameworkTab({ project, setProject }: { project: any, setProject: Function }) {
    return <ProjectResultsFramework project={project} setProject={setProject} />;
}
