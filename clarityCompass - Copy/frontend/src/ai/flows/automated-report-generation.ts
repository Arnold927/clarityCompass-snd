
'use server';

/**
 * @fileOverview AI-powered automated report generation flow.
 *
 * - generateReport - A function that generates a project report based on provided data, a target audience, and a specific context.
 * - GenerateReportInput - The input type for the generateReport function.
 * - GenerateReportOutput - The return type for the generateReport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateReportInputSchema = z.object({
  projectData: z
    .string()
    .describe('A detailed JSON-like string containing all relevant data for the project. This includes project description, indicators, tasks, financials, etc.'),
  targetAudience: z
    .string()
    .describe('A string value for the AI to tailor the report to. Examples: Donor, Executive Management, Project Team, Government Partners.'),
  reportContext: z
    .string()
    .describe('Specific context or theme for the report provided by the user. The AI should focus on this theme.'),
});
export type GenerateReportInput = z.infer<typeof GenerateReportInputSchema>;

const GenerateReportOutputSchema = z.object({
  report: z.string().describe('A comprehensive report summarizing the project data. It should be well-structured with clear headings, tailored to the specified audience and context.'),
});
export type GenerateReportOutput = z.infer<typeof GenerateReportOutputSchema>;

export async function generateReport(input: GenerateReportInput): Promise<GenerateReportOutput> {
  return generateReportFlow(input);
}


const prompt = ai.definePrompt({
  name: 'generateReportPrompt',
  model: 'models/gemini-2.5-flash',
  input: {schema: GenerateReportInputSchema},
  output: {schema: GenerateReportOutputSchema},
  prompt: `You are an AI assistant specialized in generating high-quality project reports for NGOs. Your task is to create an insightful and well-structured report based on the provided project data, tailored for a specific audience and context.

  **Target Audience:** {{{targetAudience}}}
  **Specific Context/Theme for this Report:** {{{reportContext}}}
  **Comprehensive Project Data:**
  {{{projectData}}}

  **Your Instructions:**

  1.  **Analyze the Audience and Context:** First, understand the needs of the **Target Audience**. A report for a donor will be different from one for the project team. Then, incorporate the **Specific Context/Theme** as the central focus of your report.

  2.  **Synthesize the Data:** Use the provided **Project Data** as the single source of truth. Refer to project details, financials, indicators, activities, and task statuses to build your narrative.

  3.  **Structure the Report:** Generate a report in markdown format with a logical structure. Based on the audience and context, you might include sections like:
      *   **Executive Summary:** A brief, high-level overview. For a donor, this might focus on impact and financial stewardship. For a project team, it might focus on progress and roadblocks.
      *   **Progress Against Key Indicators:** Highlight performance against indicators, relating it back to the report's main theme.
      *   **Thematic Analysis:** A dedicated section that deeply explores the **Specific Context/Theme**. For example, if the theme is "Challenges in Field Operations," detail the tasks that are 'Red' or 'Amber' and explain the justifications.
      *   **Financial Overview:** Summarize the budget, spending, and burn rate. Frame this information according to the audience's interest (e.g., ROI for donors, budget adherence for managers).
      *   **Risks and Mitigation:** Identify potential risks based on the data and suggest mitigation strategies relevant to the audience.
      *   **Conclusion and Recommendations:** Conclude with a summary and provide actionable recommendations appropriate for the target audience.

  4.  **Tone and Language:** Adjust your tone. For an executive, be concise and strategic. For a government partner, be formal and data-driven. For a donor, be inspiring and impact-focused.

  **Final Output:** Produce only the formatted markdown report in the 'report' field of the output JSON.
  `,
});

const generateReportFlow = ai.defineFlow(
  {
    name: 'generateReportFlow',
    inputSchema: GenerateReportInputSchema,
    outputSchema: GenerateReportOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);




