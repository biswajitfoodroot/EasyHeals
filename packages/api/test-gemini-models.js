import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function checkModels() {
    console.log('Checking models with API Key:', process.env.GEMINI_API_KEY.substring(0, 8) + '...');

    const tryModel = async (name) => {
        try {
            const model = genAI.getGenerativeModel({ model: name });
            const result = await model.generateContent('Say "OK"');
            const response = await result.response;
            console.log(`✅ ${name}: ${response.text().trim()}`);
            return true;
        } catch (e) {
            console.log(`❌ ${name}:`);
            console.log(e);
            return false;
        }
    };

    const modelsToTry = [
        'gemini-1.5-flash',
        'gemini-1.5-flash-latest',
        'gemini-1.5-pro',
        'gemini-2.0-flash-exp',
        'gemini-2.0-flash',
        'gemini-2.5-flash'
    ];

    for (const model of modelsToTry) {
        await tryModel(model);
    }
}

checkModels();
