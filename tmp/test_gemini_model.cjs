const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

async function test() {
    const envPath = path.join(__dirname, '../.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const key = envContent.match(/GEMINI_API_KEY=(.*)/)[1].trim().replace(/["']/g, '');
    console.log('API key ends in:', key.slice(-5));

    const genAI = new GoogleGenerativeAI(key);

    // First list available models via REST
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}&pageSize=100`;
    const response = await fetch(url);
    const data = await response.json();

    console.log('\n--- Available models supporting generateContent ---');
    const goodModels = (data.models || []).filter(m =>
        m.supportedGenerationMethods?.includes('generateContent')
    );
    goodModels.forEach(m => console.log(' ' + m.name));

    // Test gemini-2.0-flash specifically
    console.log('\n--- Testing gemini-2.0-flash with text ---');
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent('Say hello');
        const text = result.response.text();
        console.log('Success! Response:', text.substring(0, 80));
    } catch (e) {
        console.log('FAILED:', e.message);
    }

    // Test gemini-2.0-flash-001
    console.log('\n--- Testing gemini-2.0-flash-001 with text ---');
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-001' });
        const result = await model.generateContent('Say hello');
        const text = result.response.text();
        console.log('Success! Response:', text.substring(0, 80));
    } catch (e) {
        console.log('FAILED:', e.message);
    }
}
test().catch(console.error);
