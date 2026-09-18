import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';

export function ReportingQuarterSelector({
  selectedQuarter,
  onQuarterChange,
}: {
  selectedQuarter: any | null;
  onQuarterChange: (quarter: any) => void;
}) {
  const [quarters, setQuarters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchReportingQuarters();
  }, []);

  const fetchReportingQuarters = async () => {
    try {
      setLoading(true);
      const response = await api.get('/programs/reporting-quarters/');
      const data = response.data?.results || response.data || [];
      setQuarters(Array.isArray(data) ? data : []);
      
      if (!selectedQuarter && data.length > 0) {
        const mostRecent = data.sort((a: any, b: any) => 
          new Date(b.end_date).getTime() - new Date(a.end_date).getTime()
        )[0];
        onQuarterChange(mostRecent);
      }
    } catch (error) {
      console.error('Failed to fetch reporting quarters:', error);
    } finally {
      setLoading(false);
    }
  };

  const getQuarterLabel = (quarter: any) => {
    return quarter ? `${quarter.year} Q${quarter.quarter}` : 'Select Quarter';
  };

  const navigateQuarter = (direction: 'prev' | 'next') => {
    if (!selectedQuarter || quarters.length === 0) return;
    
    const currentIndex = quarters.findIndex(
      q => q.year === selectedQuarter.year && q.quarter === selectedQuarter.quarter
    );
    
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < quarters.length) {
      onQuarterChange(quarters[newIndex]);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={() => navigateQuarter('prev')}
        disabled={!selectedQuarter}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="min-w-[150px] justify-start">
            <Calendar className="mr-2 h-4 w-4" />
            {loading ? 'Loading...' : getQuarterLabel(selectedQuarter)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-60 p-0">
          <div className="p-2">
            <h4 className="font-medium mb-2">Select Reporting Quarter</h4>
            <Select
              value={selectedQuarter ? `${selectedQuarter.id}` : undefined}
              onValueChange={(value) => {
                const quarter = quarters.find(q => q.id === parseInt(value));
                if (quarter) {
                  onQuarterChange(quarter);
                  setIsOpen(false);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select quarter" />
              </SelectTrigger>
              <SelectContent>
                {quarters.map((quarter) => (
                  <SelectItem key={quarter.id} value={quarter.id.toString()}>
                    {quarter.year} Q{quarter.quarter} ({new Date(quarter.start_date).toLocaleDateString()} - {new Date(quarter.end_date).toLocaleDateString()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </PopoverContent>
      </Popover>

      <Button
        variant="outline"
        size="icon"
        onClick={() => navigateQuarter('next')}
        disabled={!selectedQuarter}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}