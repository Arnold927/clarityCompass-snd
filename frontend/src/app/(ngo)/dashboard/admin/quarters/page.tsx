"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays, Plus, Save, Trash2, Edit, Calendar,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import api from "@/lib/api";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface ReportingQuarter {
  id: number;
  year: number;
  quarter: 1 | 2 | 3 | 4;
  start_date: string;
  end_date: string;
}

const getQuarterName = (quarter: number): string => `Q${quarter}`;
const getQuarterNumber = (quarterName: string): 1 | 2 | 3 | 4 => {
  const num = parseInt(quarterName.replace("Q", ""), 10);
  return num as 1 | 2 | 3 | 4;
};

const years = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

export default function QuartersPage() {
  const [isAddingQuarter, setIsAddingQuarter] = useState(false);
  const [quarters, setQuarters] = useState<ReportingQuarter[]>([]);
  const [editingQuarter, setEditingQuarter] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [formKey, setFormKey] = useState(0);
  const [selectedYear, setSelectedYear] = useState<number | "all">("all");

  useEffect(() => {
    fetchQuarters();
  }, []);

  const fetchQuarters = async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/programs/reporting-quarters/");
      setQuarters(response.data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load reporting quarters",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentQuarter = (): ReportingQuarter | undefined => {
    const today = new Date();
    return quarters.find(q => {
      const startDate = new Date(q.start_date);
      const endDate = new Date(q.end_date);
      return today >= startDate && today <= endDate;
    });
  };

  const currentQuarter = getCurrentQuarter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    const name = formData.get("name");
    const year = formData.get("year");
    const startDate = formData.get("startDate");
    const endDate = formData.get("endDate");

    if (
      typeof name !== "string" ||
      typeof year !== "string" ||
      typeof startDate !== "string" ||
      typeof endDate !== "string"
    ) {
      toast({
        title: "Error",
        description: "Invalid form data",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    const quarterData = {
      year: parseInt(year, 10),
      quarter: getQuarterNumber(name),
      start_date: startDate,
      end_date: endDate,
    };

    try {
      let savedQuarter: any;

      if (editingQuarter) {
        const response = await api.patch(
          `/programs/reporting-quarters/${editingQuarter}/`,
          quarterData
        );
        savedQuarter = response.data;

        setQuarters(quarters.map(q =>
          q.id === editingQuarter ? savedQuarter : q
        ));

        toast({
          title: "Success",
          description: "Quarter updated successfully",
        });
      } else {
        const response = await api.post(
          "/programs/reporting-quarters/",
          quarterData
        );
        savedQuarter = response.data;
        setQuarters([...quarters, savedQuarter]);

        toast({
          title: "Success",
          description: "Quarter added successfully",
        });
      }

      setIsAddingQuarter(false);
      setEditingQuarter(null);
      setFormKey(prev => prev + 1);
      event.currentTarget.reset();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save quarter",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (currentQuarter?.id === id) {
      toast({
        title: "Cannot delete",
        description: "You cannot delete the current active quarter",
        variant: "destructive",
      });
      return;
    }

    try {
      await api.delete(`/programs/reporting-quarters/${id}/`);
      setQuarters(quarters.filter(q => q.id !== id));
      
      toast({
        title: "Success",
        description: "Quarter deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete quarter",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (quarter: ReportingQuarter) => {
    setEditingQuarter(quarter.id);
    setIsAddingQuarter(true);
  };

  const handleCancel = () => {
    setIsAddingQuarter(false);
    setEditingQuarter(null);
  };

  const sortedQuarters = [...quarters].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.quarter - a.quarter;
  });

  const filteredQuarters = selectedYear === "all" 
    ? sortedQuarters 
    : sortedQuarters.filter(q => q.year === selectedYear);

  const availableYears = Array.from(new Set(quarters.map(q => q.year))).sort((a, b) => b - a);

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const startFormatted = start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    
    const endFormatted = end.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    
    return `${startFormatted} - ${endFormatted}`;
  };

  const getQuarterStatus = (quarter: ReportingQuarter) => {
    const today = new Date();
    const startDate = new Date(quarter.start_date);
    const endDate = new Date(quarter.end_date);
    
    if (today > endDate) return "past";
    if (today < startDate) return "upcoming";
    return "current";
  };

  const getQuarterMonths = (quarter: number) => {
    switch(quarter) {
      case 1: return "Jan-Mar";
      case 2: return "Apr-Jun";
      case 3: return "Jul-Sep";
      case 4: return "Oct-Dec";
      default: return "";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary border-t-2 mx-auto"></div>
            <Calendar className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-5 w-5 text-primary/60" />
          </div>
          <p className="text-muted-foreground animate-pulse">Loading quarters...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link href="/programs">
          <Button variant="outline">
            ← Back
          </Button>
        </Link>
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Reporting Quarters
          </h1>
          <p className="text-muted-foreground">
            Manage and track reporting periods for your organization
          </p>
        </div>
        <Button 
          onClick={() => setIsAddingQuarter(true)} 
          disabled={isAddingQuarter}
          size="lg"
          className="shadow-lg hover:shadow-xl transition-all duration-200 bg-gradient-to-r from-primary to-primary/90"
        >
          <Plus className="mr-2 h-5 w-5" />
          Add Quarter
        </Button>
      </div>

      {/* Add/Edit Quarter Form */}
      {isAddingQuarter && (
        <Card className="border-2 border-primary/20 shadow-xl animate-in slide-in-from-top-5 duration-300">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
            <CardTitle className="text-xl flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              {editingQuarter ? "Edit Quarter" : "Create New Quarter"}
            </CardTitle>
            <CardDescription>
              {editingQuarter
                ? "Update the reporting quarter details below"
                : "Fill in the details to create a new reporting quarter"}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form key={formKey} onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">
                    Quarter <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    name="name"
                    defaultValue={
                      editingQuarter
                        ? getQuarterName(quarters.find(q => q.id === editingQuarter)?.quarter ?? 1)
                        : undefined
                    }
                    required
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select quarter" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4].map((q) => (
                        <SelectItem key={q} value={`Q${q}`}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Q{q}</span>
                            <span className="text-xs text-muted-foreground">
                              ({getQuarterMonths(q)})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="year" className="text-sm font-medium">
                    Year <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    name="year"
                    defaultValue={
                      editingQuarter
                        ? quarters.find(q => q.id === editingQuarter)?.year.toString()
                        : undefined
                    }
                    required
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startDate" className="text-sm font-medium">
                    Start Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="startDate"
                    name="startDate"
                    type="date"
                    className="h-11"
                    defaultValue={
                      editingQuarter
                        ? quarters.find(q => q.id === editingQuarter)?.start_date
                        : undefined
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate" className="text-sm font-medium">
                    End Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="endDate"
                    name="endDate"
                    type="date"
                    className="h-11"
                    defaultValue={
                      editingQuarter
                        ? quarters.find(q => q.id === editingQuarter)?.end_date
                        : undefined
                    }
                    required
                  />
                </div>
              </div>

              <Separator className="my-6" />

              <div className="flex justify-end gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleCancel} 
                  disabled={isSubmitting}
                  className="h-11 px-6"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="h-11 px-6 bg-gradient-to-r from-primary to-primary/90"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {editingQuarter ? "Updating..." : "Saving..."}
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {editingQuarter ? "Update" : "Save"} Quarter
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filters and Stats */}
      {quarters.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => setSelectedYear(value === "all" ? "all" : parseInt(value))}
            >
              <SelectTrigger className="w-[180px] h-10">
                <SelectValue placeholder="Filter by year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="secondary" className="h-10 px-4 text-sm">
              {filteredQuarters.length} {filteredQuarters.length === 1 ? 'Quarter' : 'Quarters'}
            </Badge>
          </div>
          {currentQuarter && (
            <Badge variant="outline" className="h-10 px-4 text-sm border-primary/20 bg-primary/5 text-primary">
              <Calendar className="mr-2 h-4 w-4" />
              Current: Q{currentQuarter.quarter} {currentQuarter.year}
            </Badge>
          )}
        </div>
      )}

      {/* Quarters Grid */}
      {filteredQuarters.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredQuarters.map((quarter) => {
            const status = getQuarterStatus(quarter);
            const isCurrentQuarter = status === "current";
            
            return (
              <Card
                key={quarter.id}
                className={cn(
                  "group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02]",
                  isCurrentQuarter && "border-2 border-primary shadow-lg shadow-primary/10",
                  status === "past" && "opacity-75 hover:opacity-100",
                  status === "upcoming" && "border-dashed border-muted-foreground/25"
                )}
              >
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-10 transition-opacity duration-300",
                  isCurrentQuarter ? "from-primary to-primary/60" : "from-muted to-muted/60"
                )} />
                
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "p-2 rounded-lg",
                          isCurrentQuarter ? "bg-primary/10" : "bg-muted"
                        )}>
                          <CalendarDays className={cn(
                            "h-5 w-5",
                            isCurrentQuarter ? "text-primary" : "text-muted-foreground"
                          )} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">
                            Q{quarter.quarter} {quarter.year}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {getQuarterMonths(quarter.quarter)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Reporting Period
                        </p>
                        <p className="text-sm bg-muted/50 p-2 rounded-md font-mono">
                          {formatDateRange(quarter.start_date, quarter.end_date)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <Badge 
                          variant={isCurrentQuarter ? "default" : "secondary"}
                          className={cn(
                            "text-xs",
                            isCurrentQuarter && "bg-primary/10 text-primary hover:bg-primary/20",
                            status === "past" && "bg-muted text-muted-foreground",
                            status === "upcoming" && "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          )}
                        >
                          {status === "current" && "● Active"}
                          {status === "past" && "✓ Completed"}
                          {status === "upcoming" && "○ Upcoming"}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(quarter)}
                        disabled={isSubmitting}
                        className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isCurrentQuarter || isSubmitting}
                            className={cn(
                              "h-8 w-8",
                              !isCurrentQuarter && "hover:bg-destructive/10 hover:text-destructive"
                            )}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>

                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-xl">
                              Delete Q{quarter.quarter} {quarter.year}?
                            </AlertDialogTitle>
                            <AlertDialogDescription className="space-y-2">
                              <p>This action cannot be undone.</p>
                              <p className="font-medium text-destructive">
                                This will permanently delete the reporting quarter and may affect associated reports.
                              </p>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(quarter.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete Quarter
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-2 border-dashed border-muted-foreground/25 shadow-none hover:shadow-lg transition-all duration-300">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <Calendar className="h-12 w-12 text-primary/60" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No quarters found</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
              {selectedYear !== "all" 
                ? `No reporting quarters found for ${selectedYear}. Try selecting a different year or create a new quarter.`
                : "Get started by creating your first reporting quarter."}
            </p>
            <Button 
              onClick={() => setIsAddingQuarter(true)}
              size="lg"
              className="bg-gradient-to-r from-primary to-primary/90"
            >
              <Plus className="mr-2 h-5 w-5" />
              Create Your First Quarter
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}