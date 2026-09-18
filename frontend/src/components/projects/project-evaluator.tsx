
'use client';

import React, { useState, useTransition } from "react";
import { evaluateProjectAction, generateDocxAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BotMessageSquare, CheckCircle, Download, Loader2, List, ThumbsDown, ThumbsUp, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { ProjectEvaluationOutput } from "@/ai/flows/project-evaluation";
import { saveAs } from 'file-saver';

export function ProjectEvaluator({ project }: { project: any }) {
  const [evaluation, setEvaluation] = useState<ProjectEvaluationOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEvaluating, startEvaluationTransition] = useTransition();
  const [isExporting, startExportTransition] = useTransition();


  const synthesizeProjectData = () => {
    if (!project) return "";
    return JSON.stringify(project, null, 2);
  };

  const handleEvaluate = () => {
    setError(null);
    setEvaluation(null);

    startEvaluationTransition(async () => {
      const projectDataString = synthesizeProjectData();
      const result = await evaluateProjectAction({ projectData: projectDataString });

      if (result.error) {
        setError(result.error);
      } else {
        const evaluationData = result.evaluation?.evaluation || result.evaluation;
        
        if (evaluationData) {
          setEvaluation({
            overallSummary: evaluationData.overallSummary || '',
            strengths: Array.isArray(evaluationData.strengths) ? evaluationData.strengths : [],
            weaknesses: Array.isArray(evaluationData.weaknesses) ? evaluationData.weaknesses : [],
            recommendations: Array.isArray(evaluationData.recommendations) ? evaluationData.recommendations : [],
          });
        } else {
          setError('No evaluation data received');
        }
      }
    });
  };

  const handleExport = async () => {
     if (!evaluation) return;
     setError(null);

    startExportTransition(async () => {
      const strengthsList = evaluation.strengths.map(s => `<li>${s}</li>`).join('');
      const weaknessesList = evaluation.weaknesses.map(w => `<li>${w}</li>`).join('');
      const recommendationsList = evaluation.recommendations.map(r => `<li>${r}</li>`).join('');
      
      const htmlContent = `
          <h1>Project Evaluation: ${project.title}</h1>
          <h2>Overall Summary</h2>
          <p>${evaluation.overallSummary}</p>
          <h2>Strengths</h2>
          <ul>${strengthsList}</ul>
          <h2>Weaknesses</h2>
          <ul>${weaknessesList}</ul>
          <h2>Recommendations</h2>
          <ul>${recommendationsList}</ul>
      `;

      const result = await generateDocxAction(htmlContent);

      if (result.error || !result.docx) {
        setError(result.error || "Failed to generate DOCX file.");
        return;
      }

      try {
        const byteCharacters = atob(result.docx);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

        saveAs(blob, 'Project-Evaluation.docx');
      } catch (e) {
        console.error("Error saving file:", e);
        setError("There was an error saving the Word document.");
      }
    });
  };


  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>AI Project Evaluation</CardTitle>
          <CardDescription>
            Generate an automated evaluation of this project's health and performance based on its current data.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground">
                The AI will analyze financials, task statuses, and indicator progress to provide a high-level assessment with strengths, weaknesses, and recommendations.
            </p>
        </CardContent>
        <CardFooter>
          <Button onClick={handleEvaluate} disabled={isEvaluating} className="w-full">
            {isEvaluating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <BotMessageSquare className="mr-2 h-4 w-4" />
            )}
            {isEvaluating ? "Evaluating..." : "Evaluate Project"}
          </Button>
        </CardFooter>
      </Card>

      <div className="lg:col-span-2">
        {error && (
            <Alert variant="destructive" className="mb-4">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}

        {evaluation ? (
            <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <CardTitle>Evaluation Results</CardTitle>
                    <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
                        {isExporting ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="mr-2 h-4 w-4" />
                        )}
                        {isExporting ? "Exporting..." : "Export to Word"}
                    </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <h3 className="font-semibold mb-2">Overall Summary</h3>
                        <p className="text-sm text-muted-foreground">{evaluation.overallSummary}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="font-semibold mb-3 flex items-center"><ThumbsUp className="mr-2 h-5 w-5 text-green-500" /> Strengths</h3>
                            <ul className="space-y-2">
                                {evaluation.strengths.map((item, index) => (
                                    <li key={index} className="flex items-start">
                                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-1 shrink-0" />
                                        <span className="text-sm text-muted-foreground">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                             <h3 className="font-semibold mb-3 flex items-center"><ThumbsDown className="mr-2 h-5 w-5 text-red-500" /> Weaknesses</h3>
                            <ul className="space-y-2">
                                {evaluation.weaknesses.map((item, index) => (
                                    <li key={index} className="flex items-start">
                                        <XCircle className="h-4 w-4 text-red-500 mr-2 mt-1 shrink-0" />
                                        <span className="text-sm text-muted-foreground">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                     <div>
                        <h3 className="font-semibold mb-3 flex items-center"><List className="mr-2 h-5 w-5" /> Recommendations</h3>
                        <ul className="space-y-2">
                            {evaluation.recommendations.map((item, index) => (
                                <li key={index} className="flex items-start">
                                     <div className="h-4 w-4 border-l-2 border-primary mr-2 mt-1 shrink-0" />
                                    <span className="text-sm text-muted-foreground">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                </CardContent>
            </Card>
        ) : (
            <Card className="flex items-center justify-center h-full min-h-[300px]">
                <div className="text-center text-muted-foreground">
                    <p>Your evaluation results will appear here.</p>
                </div>
            </Card>
        )}
      </div>
    </div>
  );
}
