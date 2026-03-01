import { db } from './index.js';
import { hospitals, departments, doctors } from './schema.js';

const seedData = async () => {
    console.log('🌱 Seeding Master Data...');

    try {
        // 1. Seed Departments
        console.log('  Adding Departments...');
        const deptData = [
            { name: 'Cardiology', description: 'Heart and vascular treatments' },
            { name: 'Oncology', description: 'Cancer care and chemotherapy' },
            { name: 'Orthopedics', description: 'Bone and joint surgeries' },
            { name: 'Neurology', description: 'Brain and nervous system' },
            { name: 'Gastroenterology', description: 'Digestive system disorders' },
            { name: 'Nephrology', description: 'Kidney care and dialysis' },
            { name: 'Transplant', description: 'Liver, Kidney, and Heart transplants' }
        ];
        const insertedDepts = await db.insert(departments).values(deptData).returning();
        const deptMap = Object.fromEntries(insertedDepts.map(d => [d.name, d.id]));

        // 2. Seed Hospitals
        console.log('  Adding Hospitals...');
        const hospData = [
            { name: 'Apollo Hospitals', city: 'Chennai', state: 'Tamil Nadu', country: 'India', accreditation: 'JCI, NABH' },
            { name: 'Fortis Memorial Research Institute', city: 'Gurugram', state: 'Haryana', country: 'India', accreditation: 'JCI, NABH' },
            { name: 'Medanta - The Medicity', city: 'Gurugram', state: 'Haryana', country: 'India', accreditation: 'JCI, NABH' },
            { name: 'Max Super Speciality Hospital', city: 'New Delhi', state: 'Delhi', country: 'India', accreditation: 'NABH' },
            { name: 'Manipal Hospital', city: 'Bengaluru', state: 'Karnataka', country: 'India', accreditation: 'JCI, NABH' }
        ];
        const insertedHosps = await db.insert(hospitals).values(hospData).returning();
        const hospMap = Object.fromEntries(insertedHosps.map(h => [h.name, h.id]));

        // 3. Seed Doctors (Sample)
        console.log('  Adding Doctors...');
        const docData = [
            { name: 'Dr. Ashok Seth', specialization: 'Interventional Cardiology', hospitalId: hospMap['Fortis Memorial Research Institute'], departmentId: deptMap['Cardiology'], qualification: 'MD, DM, FRCP', experienceYears: 30 },
            { name: 'Dr. Naresh Trehan', specialization: 'Cardiovascular Surgery', hospitalId: hospMap['Medanta - The Medicity'], departmentId: deptMap['Cardiology'], qualification: 'MBBS, MD', experienceYears: 40 },
            { name: 'Dr. Harit Chaturvedi', specialization: 'Surgical Oncology', hospitalId: hospMap['Max Super Speciality Hospital'], departmentId: deptMap['Oncology'], qualification: 'MBBS, MS, MCh', experienceYears: 25 },
            { name: 'Dr. Sandeep Vaishya', specialization: 'Neurosurgery', hospitalId: hospMap['Fortis Memorial Research Institute'], departmentId: deptMap['Neurology'], qualification: 'MBBS, MS, MCh', experienceYears: 22 }
        ];
        await db.insert(doctors).values(docData);

        console.log('✅ Seeding Complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding Failed:', error);
        process.exit(1);
    }
};

seedData();
