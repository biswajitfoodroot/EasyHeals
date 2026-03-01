// EasyHeals Knowledge Base - Provider & Hospital Directory
// This simulates a RAG (Retrieval Augmented Generation) source or Vector Database.

export const DOCTORS = [
    {
        id: 'dr1',
        name: 'Dr. Sameer Kulkarni',
        specialty: 'Cardiologist',
        subSpecialty: 'Interventional Cardiology',
        city: 'Pune',
        hospital: 'Jupiter Hospital',
        experience: '15+ Years',
        fees: '₹800 - ₹1200',
        languages: ['English', 'Marathi', 'Hindi'],
    },
    {
        id: 'dr2',
        name: 'Dr. Anjali Deshpande',
        specialty: 'Gastroenterologist',
        city: 'Pune',
        hospital: 'Sahyadri Hospital',
        experience: '12+ Years',
        fees: '₹600 - ₹1000',
        languages: ['English', 'Marathi', 'Hindi'],
    },
    {
        id: 'dr3',
        name: 'Dr. Rajesh Khanna',
        specialty: 'Orthopedic Surgeon',
        subSpecialty: 'Knee & Hip Replacement',
        city: 'Mumbai',
        hospital: 'Nanavati Max Super Speciality Hospital',
        experience: '20+ Years',
        fees: '₹1500 - ₹2500',
        languages: ['English', 'Hindi', 'Gujarati'],
    }
];

export const HOSPITALS = [
    {
        id: 'h1',
        name: 'Jupiter Hospital',
        city: 'Pune',
        departments: ['Cardiology', 'Neurology', 'Oncology', 'Orthopedics'],
        accreditation: 'NABH',
        packages: {
            'Knee Replacement': '₹1,50,000 - ₹2,20,000',
            'Cardiac Bypass': '₹3,00,000 - ₹4,50,000'
        }
    },
    {
        id: 'h2',
        name: 'Apollo Hospitals',
        city: 'Chennai',
        departments: ['Transplant', 'Oncology', 'Cardiology'],
        accreditation: 'JCI, NABH',
        packages: {
            'Liver Transplant': '₹20,00,000 - ₹25,00,000'
        }
    }
];

export async function searchProviders(query) {
    const q = query.toLowerCase();

    // Simple filter simulating a semantic search
    const drs = DOCTORS.filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.specialty.toLowerCase().includes(q) ||
        d.city.toLowerCase().includes(q)
    );

    const hosps = HOSPITALS.filter(h =>
        h.name.toLowerCase().includes(q) ||
        h.city.toLowerCase().includes(q) ||
        h.departments.some(d => d.toLowerCase().includes(q))
    );

    return { doctors: drs, hospitals: hosps };
}
