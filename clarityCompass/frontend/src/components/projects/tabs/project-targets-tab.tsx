'use client';

import React, { useState, useEffect } from 'react';
import { IndicatorTargets } from '@/components/projects/indicator-targets';
import api from '@/lib/api';

export function ProjectTargetsTab({ project, setProject }: { project: any, setProject: Function }) {
    const [indicators, setIndicators] = useState<any[]>([]);
    const [targets, setTargets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const indicatorsRes = await api.get(
                    `/projects/project-indicators/?project=${project.id}`
                );
                setIndicators(indicatorsRes.data);
                setTargets([]); 
            } catch (error) {
                console.error(' Failed to fetch indicators:', error);
            } finally {
                setLoading(false);
            }
        };

        if (project?.id) {
            fetchData();
        }
    }, [project.id]);

    if (loading) {
        return <div>Loading targets...</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Project Indicator Targets</h3>
                <p className="text-sm text-muted-foreground">
                    Project: {project.title} (ID: {project.id})
                </p>
            </div>
            
            <IndicatorTargets
                indicators={indicators}
                targets={targets}
                onSetTargets={setTargets}
                projectId={project.id}
            />
        </div>
    );
}