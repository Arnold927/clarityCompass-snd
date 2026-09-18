'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormBuilder } from './form-builder';
import { KoboFormLinker } from './kobo-linker';

interface FormTypeSelectorProps {
  projectId?: string;
  onBack?: () => void;

}

export function FormTypeSelector({ projectId, onBack }: FormTypeSelectorProps) {
  const [selectedType, setSelectedType] = useState<'internal' | 'kobo' | null>(null);
  
  if (selectedType === 'internal') {
  }
  
  if (selectedType === 'kobo') {
    return <KoboFormLinker projectId={projectId} onBack={() => setSelectedType(null)} />;
  }
  
  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Create New Form</h2>
      <p className="text-muted-foreground mb-8">
        Choose the type of form you want to create:
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card 
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => setSelectedType('internal')}
        >
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg">Internal Form</h3>
              <p className="text-sm text-muted-foreground">
                Build a custom form directly in the app. Best for:
              </p>
              <ul className="text-sm text-left space-y-1 text-muted-foreground">
                <li>• Task status updates</li>
                <li>• Meeting notes</li>
                <li>• Internal reports</li>
                <li>• Quick data collection</li>
              </ul>
            </div>
          </CardContent>
        </Card>
        
        <Card 
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => setSelectedType('kobo')}
        >
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg">Kobo Toolbox Form</h3>
              <p className="text-sm text-muted-foreground">
                Link an existing Kobo form. Best for:
              </p>
              <ul className="text-sm text-left space-y-1 text-muted-foreground">
                <li>• Offline field surveys</li>
                <li>• GPS location data</li>
                <li>• Photo/video capture</li>
                <li>• Complex skip logic</li>
                <li>• External data collectors</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {onBack && (
        <div className="mt-8">
          <Button variant="outline" onClick={onBack}>
            Back to Forms List
          </Button>
        </div>
      )}
    </div>
  );
}