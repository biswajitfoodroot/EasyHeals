// ─── Lead Statuses ───────────────────────────────────────────────────────────
export const LEAD_STATUSES = [
    { value: 'new', label: 'New', color: 'blue', bgClass: 'bg-blue-100 text-blue-700', dotClass: 'bg-blue-500' },
    { value: 'junk', label: 'Junk', color: 'gray', bgClass: 'bg-gray-100 text-gray-600', dotClass: 'bg-gray-400' },
    { value: 'valid', label: 'Valid', color: 'cyan', bgClass: 'bg-cyan-100 text-cyan-700', dotClass: 'bg-cyan-500' },
    { value: 'prospect', label: 'Prospect', color: 'amber', bgClass: 'bg-amber-100 text-amber-700', dotClass: 'bg-amber-500' },
    { value: 'visa_letter_requested', label: 'Visa Letter Requested', color: 'violet', bgClass: 'bg-violet-100 text-violet-700', dotClass: 'bg-violet-500' },
    { value: 'visa_received', label: 'Visa Received', color: 'indigo', bgClass: 'bg-indigo-100 text-indigo-700', dotClass: 'bg-indigo-500' },
    { value: 'appointment_booked', label: 'Appointment Booked', color: 'purple', bgClass: 'bg-purple-100 text-purple-700', dotClass: 'bg-purple-500' },
    { value: 'visited', label: 'Visited', color: 'teal', bgClass: 'bg-teal-pale text-teal', dotClass: 'bg-teal' },
    { value: 'service_taken', label: 'Service Taken', color: 'green', bgClass: 'bg-green-100 text-green-700', dotClass: 'bg-green-500' },
    { value: 'lost', label: 'Lost', color: 'red', bgClass: 'bg-red-100 text-red-700', dotClass: 'bg-red-500' },
];

export const getStatusConfig = (status) => LEAD_STATUSES.find(s => s.value === status) || LEAD_STATUSES[0];

// ─── Status Groups ───────────────────────────────────────────────────────────
// Leads page: only new
export const LEAD_PAGE_STATUSES = ['new'];
// Pipeline: active stages
export const PIPELINE_STATUSES = ['valid', 'prospect', 'visa_letter_requested', 'visa_received', 'appointment_booked', 'visited'];
// Closed Cases
export const CLOSED_STATUSES = ['service_taken'];
// Auto-archive on these
export const AUTO_ARCHIVE_STATUSES = ['junk', 'lost'];

// ─── Country Codes ───────────────────────────────────────────────────────────
export const COUNTRY_CODES = [
    { code: '+91', country: 'India', flag: '🇮🇳', format: '10 digits' },
    { code: '+880', country: 'Bangladesh', flag: '🇧🇩', format: '10 digits' },
    { code: '+971', country: 'UAE', flag: '🇦🇪', format: '9 digits' },
    { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦', format: '9 digits' },
    { code: '+968', country: 'Oman', flag: '🇴🇲', format: '8 digits' },
    { code: '+974', country: 'Qatar', flag: '🇶🇦', format: '8 digits' },
    { code: '+973', country: 'Bahrain', flag: '🇧🇭', format: '8 digits' },
    { code: '+965', country: 'Kuwait', flag: '🇰🇼', format: '8 digits' },
    { code: '+977', country: 'Nepal', flag: '🇳🇵', format: '10 digits' },
    { code: '+94', country: 'Sri Lanka', flag: '🇱🇰', format: '9 digits' },
    { code: '+95', country: 'Myanmar', flag: '🇲🇲', format: '9 digits' },
    { code: '+998', country: 'Uzbekistan', flag: '🇺🇿', format: '9 digits' },
    { code: '+234', country: 'Nigeria', flag: '🇳🇬', format: '10 digits' },
    { code: '+254', country: 'Kenya', flag: '🇰🇪', format: '9 digits' },
    { code: '+255', country: 'Tanzania', flag: '🇹🇿', format: '9 digits' },
    { code: '+1', country: 'USA / Canada', flag: '🇺🇸', format: '10 digits' },
    { code: '+44', country: 'United Kingdom', flag: '🇬🇧', format: '10 digits' },
    { code: '+61', country: 'Australia', flag: '🇦🇺', format: '9 digits' },
    { code: '+7', country: 'Russia', flag: '🇷🇺', format: '10 digits' },
    { code: '+960', country: 'Maldives', flag: '🇲🇻', format: '7 digits' },
];

// ─── Currencies ──────────────────────────────────────────────────────────────
export const CURRENCIES = [
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
    { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
];

export const getCurrencySymbol = (code) => CURRENCIES.find(c => c.code === code)?.symbol || '₹';

// ─── Document Types ──────────────────────────────────────────────────────────
export const DOCUMENT_TYPES = [
    { value: 'passport', label: 'Passport', icon: '🛂' },
    { value: 'visa_letter', label: 'Visa Letter', icon: '📋' },
    { value: 'medical_report', label: 'Medical Report', icon: '🏥' },
    { value: 'prescription', label: 'Prescription', icon: '💊' },
    { value: 'travel_doc', label: 'Travel Document', icon: '✈️' },
    { value: 'insurance', label: 'Insurance', icon: '🛡️' },
    { value: 'agreement', label: 'Agreement', icon: '📝' },
    { value: 'other', label: 'Other', icon: '📎' },
];

// ─── Invoice Statuses ────────────────────────────────────────────────────────
export const INVOICE_STATUSES = [
    { value: 'draft', label: 'Draft', bgClass: 'bg-gray-100 text-gray-600' },
    { value: 'sent', label: 'Sent', bgClass: 'bg-blue-100 text-blue-700' },
    { value: 'paid', label: 'Paid', bgClass: 'bg-green-100 text-green-700' },
    { value: 'cancelled', label: 'Cancelled', bgClass: 'bg-red-100 text-red-700' },
];

// ─── User Roles ──────────────────────────────────────────────────────────────
export const USER_ROLES = [
    { value: 'owner', label: 'Owner', description: 'Full access + user management', bgClass: 'bg-amber-100 text-amber-700' },
    { value: 'admin', label: 'Admin', description: 'Full access + user management', bgClass: 'bg-purple-100 text-purple-700' },
    { value: 'advisor', label: 'Advisor', description: 'Can manage leads and communicate', bgClass: 'bg-blue-100 text-blue-700' },
    { value: 'viewer', label: 'Viewer', description: 'Read-only access', bgClass: 'bg-gray-100 text-gray-600' },
];

// ─── Permissions Map ─────────────────────────────────────────────────────────
export const PERMISSION_SECTIONS = [
    {
        group: 'Main', items: [
            { key: 'dashboard', label: 'Dashboard' },
            { key: 'leads', label: 'Leads' },
            { key: 'pipeline', label: 'Pipeline' },
            { key: 'whatsapp', label: 'WhatsApp' },
        ]
    },
    {
        group: 'Manage', items: [
            { key: 'agents', label: 'Agents' },
            { key: 'masters', label: 'Master Data' },
            { key: 'invoices', label: 'Invoices' },
            { key: 'archive', label: 'Archive' },
            { key: 'closed_cases', label: 'Closed Cases' },
            { key: 'reports', label: 'Reports' },
        ]
    },
    {
        group: 'Admin', items: [
            { key: 'users', label: 'Users & Access' },
        ]
    },
];

// ─── Lead Sources ────────────────────────────────────────────────────────────
export const LEAD_SOURCES = [
    'manual', 'chat', 'website', 'whatsapp', 'phone', 'referral', 'social_media', 'email', 'walk_in', 'other'
];

// ─── Gender Options ──────────────────────────────────────────────────────────
export const GENDERS = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
];

// ─── Languages ───────────────────────────────────────────────────────────────
export const LANGUAGES = [
    'English', 'Hindi', 'Bengali', 'Arabic', 'Urdu', 'Tamil', 'Telugu', 'Marathi',
    'Gujarati', 'Kannada', 'Malayalam', 'Odia', 'Nepali', 'Sinhala', 'French', 'Russian'
];

// ─── WhatsApp Template Categories ────────────────────────────────────────────
export const WA_CATEGORIES = [
    { value: 'greeting', label: 'Greeting' },
    { value: 'follow_up', label: 'Follow Up' },
    { value: 'visa', label: 'Visa Related' },
    { value: 'appointment', label: 'Appointment' },
    { value: 'custom', label: 'Custom' },
];

// ─── Relationships (attendants) ──────────────────────────────────────────────
export const RELATIONSHIPS = [
    { value: 'spouse', label: 'Spouse' },
    { value: 'parent', label: 'Parent' },
    { value: 'child', label: 'Child' },
    { value: 'sibling', label: 'Sibling' },
    { value: 'relative', label: 'Relative' },
    { value: 'friend', label: 'Friend' },
    { value: 'other', label: 'Other' },
];

// ─── Verification Statuses ───────────────────────────────────────────────────
export const VERIFICATION_STATUSES = [
    { value: 'pending', label: 'Pending', bgClass: 'bg-amber-100 text-amber-700' },
    { value: 'accepted', label: 'Accepted', bgClass: 'bg-green-100 text-green-700' },
    { value: 'rejected', label: 'Rejected', bgClass: 'bg-red-100 text-red-700' },
];

export const getVerificationConfig = (status) => VERIFICATION_STATUSES.find(s => s.value === status) || VERIFICATION_STATUSES[0];

