
'use client';

import React from 'react';
import { ProjectEvaluator } from '@/components/projects/project-evaluator';

export function ProjectEvaluationTab({ project }: { project: any }) {
    return <ProjectEvaluator project={project} />;
}
