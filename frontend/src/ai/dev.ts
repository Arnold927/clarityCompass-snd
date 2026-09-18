import { config } from 'dotenv';
config({path: '.env.local'});
console.log("Key Loaded:", !!process.env.GEMINI_API_KEY);
import '@/ai/flows/automated-report-generation.ts';
import '@/ai/flows/project-evaluation.ts';
