import { config } from 'dotenv';
config({path: '.env.local'});

import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

try {
  const ai = genkit({
    plugins: [googleAI({apiKey: process.env.GEMINI_API_KEY})],
  });
} catch (error) {
  console.error("Genkit initialization error:", error);
}