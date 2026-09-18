
'use server';

/**
 * @fileOverview AI-powered project evaluation flow.
 *
 * - evaluateProject - A function that generates an evaluation of a project based on its data.
 * - ProjectEvaluationInput - The input type for the evaluateProject function.
 * - ProjectEvaluationOutput - The return type for the evaluateProject function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ProjectEvaluationInputSchema = z.object({
  projectData: z
    .string()
    .describe('A detailed JSON string containing all relevant data for the project. This includes project description, indicators, tasks, financials, targets, etc.'),
});
export type ProjectEvaluationInput = z.infer<typeof ProjectEvaluationInputSchema>;

const ProjectEvaluationOutputSchema = z.object({
  overallSummary: z.string().describe('A high-level summary of the project\'s performance and health.'),
  strengths: z.array(z.string()).describe('A list of key strengths or successes of the project.'),
  weaknesses: z.array(z.string()).describe('A list of key weaknesses, challenges, or areas of underperformance.'),
  recommendations: z.array(z.string()).describe('A list of actionable recommendations to improve the project.'),
});
export type ProjectEvaluationOutput = z.infer<typeof ProjectEvaluationOutputSchema>;

export async function evaluateProject(input: ProjectEvaluationInput): Promise<ProjectEvaluationOutput> {
  return evaluateProjectFlow(input);
}

const prompt = ai.definePrompt({
  name: 'evaluateProjectPrompt',
  model: 'googleai/gemini-1.5-flash-latest',
  input: {schema: ProjectEvaluationInputSchema},
  output: {schema: ProjectEvaluationOutputSchema},
  prompt: `You are an expert Monitoring and Evaluation (M&E) specialist for an NGO. Your task is to conduct a minor, automated evaluation of a project based on the JSON data provided.

  **Project Data:**
  {{{projectData}}}

  **Your Instructions:**

  1.  **Analyze the Data:** Thoroughly review all aspects of the project data, including its description, financials (budget vs. spent), task statuses (especially 'Red' or 'Amber' flags), indicator targets, and reported data.
  2.  **Identify Strengths:** Pinpoint areas where the project is performing well. This could be high performance against targets, efficient budget utilization, or tasks being consistently on track. List at least 2-3 key strengths.
  3.  **Identify Weaknesses:** Identify challenges or areas of concern. This could include significant underperformance on indicators, budget overruns, tasks that are off-track ('Red'), or inconsistencies in the data. List at least 2-3 key weaknesses.
  4.  **Provide Recommendations:** Based on your analysis of strengths and weaknesses, provide clear, concise, and actionable recommendations. For example, if an indicator is underperforming, suggest a review of the related activities. If the budget is off, recommend a financial review.
  5.  **Write a Summary:** Draft a high-level summary of the project's overall health and performance.
  6.  **Format Output:** Structure your response according to the defined output schema, filling in 'overallSummary', 'strengths', 'weaknesses', and 'recommendations'.
  `,
});

const evaluateProjectFlow = ai.defineFlow(
  {
    name: 'evaluateProjectFlow',
    inputSchema: ProjectEvaluationInputSchema,
    outputSchema: ProjectEvaluationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
