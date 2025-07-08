'use server';

/**
 * @fileOverview This file contains the Genkit flow for analyzing user performance on exam questions.
 *
 * - analyzePerformance - Analyzes user performance and identifies weak areas.
 * - AnalyzePerformanceInput - The input type for the analyzePerformance function.
 * - AnalyzePerformanceOutput - The return type for the analyzePerformance function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzePerformanceInputSchema = z.object({
  correctAnswers: z
    .array(z.string())
    .describe('An array of question IDs that the user answered correctly.'),
  incorrectAnswers: z
    .array(z.string())
    .describe('An array of question IDs that the user answered incorrectly.'),
  totalQuestions: z
    .number()
    .describe('The total number of questions answered by the user.'),
});
export type AnalyzePerformanceInput = z.infer<typeof AnalyzePerformanceInputSchema>;

const AnalyzePerformanceOutputSchema = z.object({
  weakAreas: z
    .string()
    .describe('A summary of the user\'s weak areas based on their performance.'),
});
export type AnalyzePerformanceOutput = z.infer<typeof AnalyzePerformanceOutputSchema>;

export async function analyzePerformance(input: AnalyzePerformanceInput): Promise<AnalyzePerformanceOutput> {
  return analyzePerformanceFlow(input);
}

const analyzePerformancePrompt = ai.definePrompt({
  name: 'analyzePerformancePrompt',
  input: {schema: AnalyzePerformanceInputSchema},
  output: {schema: AnalyzePerformanceOutputSchema},
  prompt: `You are an expert learning analyst. Analyze the user's performance on a series of exam questions to identify their weak areas.

The user answered a total of {{totalQuestions}} questions.

Correctly answered questions (IDs): {{#each correctAnswers}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
Incorrectly answered questions (IDs): {{#each incorrectAnswers}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

Based on this data, provide a concise summary of the user's weak areas. Focus on identifying patterns and common themes in the incorrectly answered questions.
`,config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_LOW_AND_ABOVE',
      },
    ],
  },
});

const analyzePerformanceFlow = ai.defineFlow(
  {
    name: 'analyzePerformanceFlow',
    inputSchema: AnalyzePerformanceInputSchema,
    outputSchema: AnalyzePerformanceOutputSchema,
  },
  async input => {
    const {output} = await analyzePerformancePrompt(input);
    return output!;
  }
);
