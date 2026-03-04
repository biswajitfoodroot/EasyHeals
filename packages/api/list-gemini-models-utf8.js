import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function listModels() {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
        const data = await response.json();

        let output = 'Available Models:\n';
        if (data.models) {
            data.models.forEach(m => {
                output += `- ${m.name}\n`;
            });
        } else {
            output += 'No models found or error: ' + JSON.stringify(data);
        }
        fs.writeFileSync('models_list_utf8.txt', output, 'utf8');
        console.log('Saved to models_list_utf8.txt');
    } catch (e) {
        fs.writeFileSync('models_list_utf8.txt', 'Error: ' + e.message, 'utf8');
    }
}

listModels();
