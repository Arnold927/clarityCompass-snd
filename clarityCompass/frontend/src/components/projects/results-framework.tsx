
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function ProjectResultsFramework() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Results Framework</CardTitle>
                <CardDescription>
                    This component is now managed centrally. Please visit the main "Results Framework" page.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">
                    The logic for displaying project-specific results frameworks has been moved to the new central framework builder to ensure consistency.
                </p>
            </CardContent>
        </Card>
    );
}
