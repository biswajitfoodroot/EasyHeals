const fs = require('fs');
const path = require('path');

async function listModels() {
    const envPath = path.join(__dirname, '../.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const key = envContent.match(/GEMINI_API_KEY=(.*)/)[1].trim().replace(/["']/g, '');
    console.log('Using API key ending in:', key.slice(-5));

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}&pageSize=100`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.models) {
        console.log(`\nFound ${data.models.length} models:\n`);
        // Only show multimodal models that support vision (for OCR)
        const visionModels = data.models.filter(m =>
            m.supportedGenerationMethods?.includes('generateContent') &&
            m.name.includes('gemini')
        );
        for (const m of visionModels) {
            console.log(`Name: ${m.name}`);
            console.log(`  Display: ${m.displayName}`);
            console.log(`  Methods: ${m.supportedGenerationMethods?.join(', ')}`);
            console.log('');
        }
    } else {
        console.log(JSON.stringify(data, null, 2));
    }
}
listModels().catch(console.error);
