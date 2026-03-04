const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

async function list() {
    const envPath = path.join(__dirname, '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const key = envContent.match(/GEMINI_API_KEY=(.*)/)[1].trim().replace(/["']/g, '');

    console.log("Using Key ending in: " + key.slice(-5));
    const genAI = new GoogleGenerativeAI(key);
    try {
        // There is no direct "listModels" in the standard SDK easily but we can try different ones
        const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];
        for (const m of models) {
            try {
                const model = genAI.getGenerativeModel({ model: m });
                await model.generateContent("test");
                console.log(`✅ Model ${m} is available and working!`);
            } catch (e) {
                console.log(`❌ Model ${m} failed: ${e.message}`);
            }
        }
    } catch (e) {
        console.error("Connectivity error: " + e.message);
    }
}
list();
