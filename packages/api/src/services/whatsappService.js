import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

export async function sendWhatsAppTemplate(phone, templateName, variables) {
    const url = `https://graph.facebook.com/v18.0/${process.env.WA_PHONE_NUMBER_ID}/messages`;

    const body = {
        messaging_product: 'whatsapp',
        to: `91${phone}`, // Assuming India destination
        type: 'template',
        template: {
            name: templateName,
            language: { code: 'en_IN' },
            components: [
                {
                    type: 'body',
                    parameters: Object.entries(variables).map(([key, value]) => ({
                        type: 'text',
                        text: String(value),
                    })),
                },
            ],
        },
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.WA_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    const result = await response.json();
    if (!response.ok) {
        throw new Error(`WhatsApp API error: ${JSON.stringify(result)}`);
    }

    return result;
}
