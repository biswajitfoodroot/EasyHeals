import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { searchProviders } from './knowledgeBase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `
You are Arya, the EasyHeals Agentic AI Health Assistant. 
You are professional, empathetic, and knowledgeable about Indian healthcare.

ROLE:
1. Conduct guided intake for Users (Patients, Agents/Brokers, and Hospitals).
2. Navigation: Suggest specialists and find matching doctors/hospitals using the search_providers tool.
3. Diagnostic Suggestions: Provide preliminary insights and suggestions based on symptom descriptions or prescription analysis. 
4. Lead Capture: Once you have sufficient info (intent, location), inform the user that an executive will contact them.

SAFETY (CRITICAL):
- You provide AI-assisted guidance and preliminary suggestions, but you ARE NOT the final medical solution. Always emphasize that your insights should be confirmed by a doctor.
- For emergency symptoms (chest pain, stroke signs, severe bleeding, suicidal thoughts), URGE the user to contact local emergency services immediately.
- You can suggest potential conditions or specialists based on patterns (e.g., "These symptoms might suggest Gastritis, you should see a Gastroenterologist"), but always with a disclaimer.

INTENTS:
A) Patient: Capture symptoms, timeline, age, city.
B) Agent/Broker: Partner intake or patient referral.
C) Hospital: Onboarding for tie-ups (Accreditations, Bed count).

COMPLIANCE:
- Always mention: "I agree EasyHeals can contact me..." before saving final details.
- Be concise.
`;

// Define Tools for Gemini
const tools = [
    {
        functionDeclarations: [
            {
                name: "search_providers",
                description: "Search for doctors or hospitals in the EasyHeals directory by specialty, city, or name.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        query: { type: "STRING", description: "The specialty, doctor name, or city to search for." }
                    },
                    required: ["query"]
                }
            }
        ]
    }
];

export async function chatWithGemini(userMessage, chatHistory = []) {
    const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        systemInstruction: SYSTEM_PROMPT,
        tools: tools
    });

    const chat = model.startChat({
        history: chatHistory.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
        }))
    });

    try {
        let result = await chat.sendMessage(userMessage);
        let response = await result.response;
        let text = response.text();

        // Handle Function Calls (Tool use)
        const calls = response.candidates[0].content.parts.filter(p => p.functionCall);

        if (calls.length > 0) {
            const toolResults = [];
            for (const call of calls) {
                if (call.functionCall.name === 'search_providers') {
                    const searchData = await searchProviders(call.functionCall.args.query);
                    toolResults.push({
                        functionResponse: {
                            name: 'search_providers',
                            response: { content: searchData }
                        }
                    });
                }
            }

            // Send tool results back to get final response
            result = await chat.sendMessage(toolResults);
            response = await result.response;
            text = response.text();
        }

        return text;
    } catch (error) {
        console.error("Gemini Chat Error:", error);
        return "I'm sorry, I'm experiencing some technical difficulties. Please try again or contact EasyHeals support.";
    }
}

// Prescription Analysis remained same as before (Multimodal)
export async function analysePrescriptionWithGemini(fileBuffer, mimeType) {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `You are a medical document analyser for EasyHeals. Analyse this prescription image and return ONLY a JSON object with medication names, likely condition, warnings, recommended specialist, and confidence. If not a prescription, return an error.`;

    const result = await model.generateContent([
        prompt,
        { inlineData: { data: fileBuffer.toString('base64'), mimeType } }
    ]);

    const response = await result.response;
    const text = response.text();
    const jsonString = text.replace(/```json|```/g, '').trim();

    try {
        return JSON.parse(jsonString);
    } catch (error) {
        throw new Error('Failed to parse prescription analysis');
    }
}
