import { useEffect } from 'react';
import { useChatStore } from '../store/chatStore';
import axios from 'axios';

const API_BASE = 'http://localhost:3000/v1';

const EMERGENCY_KEYWORDS = [
    'chest pain', 'heart attack', 'suicide', 'self harm', 'stroke', 'paralysis',
    'severe bleeding', 'breathing difficulty', 'unconscious', 'poison'
];

export function useChatFlow() {
    const store = useChatStore;

    useEffect(() => {
        const s = store.getState();
        if (s.messages.length === 0 && !s.isTyping) {
            const t = s.getT();
            s.addBotMessage(t.ask.welcome, ["Patient", "Agent / Broker", "Hospital"], 600);
            s.setProgress(5, 'Getting started...');
        }
    }, []);

    const checkEmergency = (text) => {
        const lower = text.toLowerCase();
        return EMERGENCY_KEYWORDS.some(k => lower.includes(k));
    };

    const askName = () => {
        const s = store.getState();
        const t = s.getT();
        s.addBotMessage(t.ask.askName, [], 700);
        s.setWaitingFor('name');
    };

    const askPhone = () => {
        const s = store.getState();
        const t = s.getT();
        const name = s.leadData.name || "friend";
        s.addBotMessage(t.ask.askPhone.replace('{name}', name), [], 700);
        s.setWaitingFor('phone');
    };

    const askLocation = () => {
        const s = store.getState();
        const t = s.getT();
        s.addBotMessage(t.ask.askCity, [], 700);
        s.setWaitingFor('location');
    };

    const askEnterpriseDetails = () => {
        const s = store.getState();
        const { category } = s.leadData;
        if (category === 'hospital_admin') {
            s.addBotMessage("Please tell me your Hospital Name and approximate bed count.", [], 700);
            s.setWaitingFor('hosp_info');
        } else if (category === 'agent' || category === 'broker') {
            s.addBotMessage("Please provide your Company Name and your primary service area.", [], 700);
            s.setWaitingFor('agent_info');
        }
    };

    const saveFinalLead = async () => {
        const s = store.getState();
        s.setProgress(80, 'Saving your details...');
        try {
            const res = await axios.post(`${API_BASE}/leads`, {
                ...s.leadData,
                lang: s.lang,
                source: 'agentic_v1'
            });
            s.setLeadSaved(res.data.refId);
            s.setProgress(100, 'Handing over to Arya...');
            s.addBotMessage(s.getT().ask.leadDone, ["Check Symptoms", "Find Hospital", "Upload Prescription"], 1000);
            s.setStep(10); // Active AI mode
        } catch (e) {
            console.error("Lead save failed", e);
            s.addBotMessage("I've saved your interest locally. How can I help you in the meantime?", ["Symptoms", "Prescription"], 1000);
            s.setStep(10);
        }
    };

    const callGemini = async (input) => {
        const s = store.getState();
        s.addUserMessage(input);
        s.setProgress(90, 'Arya is thinking...');

        try {
            const res = await axios.post(`${API_BASE}/chat`, {
                message: input,
                history: s.history || []
            });

            const reply = res.data.reply;
            s.addBotMessage(reply, ["Next specialist", "Compare costs", "Done"], 500);

            useChatStore.setState(prev => ({
                history: [...prev.history,
                { role: 'user', text: input },
                { role: 'bot', text: reply }
                ]
            }));
            s.setProgress(100, 'Ready');
        } catch (e) {
            s.addBotMessage("I'm having trouble connecting. Let's try again.", ["Retry"], 500);
        }
    };

    const handleAction = (input) => {
        const s = store.getState();
        const t = s.getT();
        const { flowStep, waitingFor, leadData } = s;

        if (checkEmergency(input)) {
            s.addUserMessage(input);
            s.addBotMessage("🚨 This sounds like it could be an emergency. Please contact your local emergency services (108 in India) immediately. Your safety is most important.", ["I am safe now", "Call Ambulance"], 1000);
            return;
        }

        // Step 0: Category Intent
        if (s.flowStep === 0) {
            s.addUserMessage(input);
            const cat = input.toLowerCase().includes('agent') ? 'agent' :
                input.toLowerCase().includes('hospital') ? 'hospital_admin' : 'patient';
            s.updateLeadData('category', cat);
            s.setStep(1);
            setTimeout(() => askName(), 500);
            return;
        }

        if (waitingFor === 'name') {
            s.addUserMessage(input);
            s.updateLeadData('name', input);
            s.setWaitingFor(null);
            setTimeout(() => askPhone(), 500);
            return;
        }

        if (waitingFor === 'phone') {
            if (!/^\d{10}$/.test(input.replace(/\s/g, ''))) {
                s.addBotMessage(t.errors.phone, [], 500);
                return;
            }
            s.addUserMessage(input);
            s.updateLeadData('phone', input);
            s.setWaitingFor(null);
            setTimeout(() => askLocation(), 500);
            return;
        }

        if (waitingFor === 'location') {
            s.addUserMessage(input);
            s.updateLeadData('city', input);
            s.setWaitingFor(null);
            if (leadData.category === 'patient') {
                saveFinalLead();
            } else {
                askEnterpriseDetails();
            }
            return;
        }

        // Intermediate Info for Agents/Hospitals
        if (waitingFor === 'hosp_info' || waitingFor === 'agent_info') {
            s.addUserMessage(input);
            s.updateLeadData('companyName', input);
            // In a real app, we'd parse fields here. For demo, we just store as companyName
            s.setWaitingFor(null);
            saveFinalLead();
            return;
        }

        // Post-Lead AI interaction
        if (input.toLowerCase().includes('upload prescription')) {
            s.addUserMessage(input);
            s.setRxZoneVisible(true);
            return;
        }

        callGemini(input);
    };

    return { handleAction };
}
