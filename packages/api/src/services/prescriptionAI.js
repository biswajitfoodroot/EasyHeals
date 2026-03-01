import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

const PRESCRIPTION_PROMPT = `
You are a medical document analyser for EasyHeals, an Indian healthcare platform.
Analyse this prescription image and return ONLY a JSON object (no markdown) with:
{
  "medications": [
    { "name": string, "dosage": string, "frequency": string, "duration": string }
  ],
  "likely_condition": string,
  "doctor_name": string | null,
  "date": string | null,
  "warnings": [string],
  "recommended_specialist": string,
  "language": "English" | "Hindi" | "Mixed",
  "confidence": "high" | "medium" | "low",
  "disclaimer": "AI-assisted summary only. Not medical advice."
}
If the image is not a prescription, return { "error": "not_a_prescription" }.
`;

export async function analysePrescription(fileBuffer, mimeType) {
    const base64Image = fileBuffer.toString('base64');

    const message = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20240620', // Using a current model name
        max_tokens: 1024,
        messages: [
            {
                role: 'user',
                content: [
                    {
                        type: 'image',
                        source: {
                            type: 'base64',
                            media_type: mimeType,
                            data: base64Image,
                        },
                    },
                    {
                        type: 'text',
                        text: PRESCRIPTION_PROMPT,
                    },
                ],
            },
        ],
    });

    const text = message.content[0].text;
    // Clean JSON string if Claude includes markdown fences
    const jsonString = text.replace(/```json|```/g, '').trim();

    try {
        return JSON.parse(jsonString);
    } catch (error) {
        console.error('Failed to parse AI response:', text);
        throw new Error('Failed to parse prescription analysis');
    }
}
