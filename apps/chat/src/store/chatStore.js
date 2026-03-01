import { create } from 'zustand';
import { en } from '../i18n/en';
import { hi } from '../i18n/hi';
import { mr } from '../i18n/mr';
import { bn } from '../i18n/bn';
import { ta } from '../i18n/ta';
import { te } from '../i18n/te';

const translations = { en, hi, mr, bn, ta, te };

export const useChatStore = create((set, get) => ({
    messages: [],
    history: [], // For Gemini AI
    chips: [],
    flowStep: 0,
    lang: 'en',
    leadData: { name: '', phone: '', city: '', category: 'patient', time: '' },

    leadSaved: false,
    leadRef: null,
    rxZoneVisible: false,
    rxAnalysis: null,
    waitingFor: null,
    isTyping: false,
    progress: 5,
    progressLabel: 'Getting started...',
    translations,

    getT: () => {
        const { lang } = get();
        return translations[lang] || translations.en;
    },

    setLang: (lang) => set({ lang }),

    addBotMessage: (text, chips = [], delay = null) => {
        set({ isTyping: true, chips: [] });
        const t = delay ?? Math.min(800 + text.length * 1.2, 3000);
        setTimeout(() => {
            set(s => ({
                messages: [...s.messages, { role: 'bot', text, id: Date.now() + Math.random() }],
                chips,
                isTyping: false,
            }));
        }, t);
    },

    addUserMessage: (text) => set(s => ({
        messages: [...s.messages, { role: 'user', text, id: Date.now() + Math.random() }],
        chips: [],
    })),

    updateLeadData: (key, value) => set(s => ({
        leadData: { ...s.leadData, [key]: value }
    })),

    setLeadSaved: (ref) => set({ leadSaved: true, leadRef: ref }),
    setRxAnalysis: (data) => set({ rxAnalysis: data, rxZoneVisible: false }),
    setRxZoneVisible: (v) => set({ rxZoneVisible: v }),
    setWaitingFor: (type) => set({ waitingFor: type }),
    nextStep: () => set(s => ({ flowStep: s.flowStep + 1 })),
    setStep: (n) => set({ flowStep: n }),

    setProgress: (pct, label) => set({ progress: pct, progressLabel: label }),

    resetChat: () => set({
        messages: [],
        history: [],
        chips: [],
        flowStep: 0,
        leadData: { name: '', phone: '', city: '', category: 'patient', time: '' },
        leadSaved: false,
        leadRef: null,
        rxZoneVisible: false,
        rxAnalysis: null,
        waitingFor: null,
        isTyping: false,
        progress: 5,
        progressLabel: 'Getting started...',
    }),
}));
