import React, { useState, useRef, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import api from '../../lib/api';
import Modal from '../ui/Modal';
import {
    Upload, FileSpreadsheet, ClipboardPaste, X, Check,
    AlertCircle, ChevronRight, ArrowRight, Loader2, Download
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../lib/utils';

// Known field aliases → canonical field name
const FIELD_MAP = {
    'name': 'name', 'full name': 'name', 'patient name': 'name', 'patient': 'name', 'lead name': 'name',
    'email': 'email', 'email address': 'email', 'e-mail': 'email', 'mail': 'email',
    'phone': 'phone', 'phone number': 'phone', 'mobile': 'phone', 'mobile number': 'phone', 'contact': 'phone', 'contact number': 'phone', 'whatsapp': 'phone',
    'country code': 'countryCode', 'code': 'countryCode', 'dial code': 'countryCode',
    'alt phone': 'altPhone', 'alternate phone': 'altPhone', 'alternative phone': 'altPhone', 'secondary phone': 'altPhone',
    'country': 'country', 'nation': 'country', 'nationality': 'country',
    'city': 'city', 'town': 'city', 'location': 'city',
    'gender': 'gender', 'sex': 'gender',
    'medical issue': 'medicalIssue', 'medical': 'medicalIssue', 'disease': 'medicalIssue', 'diagnosis': 'medicalIssue', 'condition': 'medicalIssue', 'treatment': 'medicalIssue',
    'amount': 'approximateAmount', 'approximate amount': 'approximateAmount', 'cost': 'approximateAmount', 'budget': 'approximateAmount', 'price': 'approximateAmount',
    'currency': 'currency',
    'source': 'source', 'lead source': 'source', 'channel': 'source',
    'notes': 'notes', 'remark': 'notes', 'remarks': 'notes', 'comment': 'notes', 'comments': 'notes', 'note': 'notes', 'description': 'notes',
    'status': 'status',
};

const DISPLAY_FIELDS = [
    { key: 'name', label: 'Name', required: true },
    { key: 'phone', label: 'Phone', required: true },
    { key: 'email', label: 'Email' },
    { key: 'countryCode', label: 'Code' },
    { key: 'country', label: 'Country' },
    { key: 'city', label: 'City' },
    { key: 'medicalIssue', label: 'Medical Issue' },
    { key: 'approximateAmount', label: 'Amount' },
    { key: 'source', label: 'Source' },
    { key: 'notes', label: 'Notes' },
];

function autoMapColumn(colHeader) {
    const lower = colHeader.toLowerCase().trim();
    return FIELD_MAP[lower] || null;
}

function detectCountryCode(phone) {
    const p = String(phone).trim();
    if (p.startsWith('+880')) return { countryCode: '+880', phone: p.slice(4).trim() };
    if (p.startsWith('+91')) return { countryCode: '+91', phone: p.slice(3).trim() };
    if (p.startsWith('+971')) return { countryCode: '+971', phone: p.slice(4).trim() };
    if (p.startsWith('+1')) return { countryCode: '+1', phone: p.slice(2).trim() };
    if (p.startsWith('+44')) return { countryCode: '+44', phone: p.slice(3).trim() };
    if (p.startsWith('+')) {
        const match = p.match(/^\+(\d{1,4})\s*(.*)/);
        if (match) return { countryCode: `+${match[1]}`, phone: match[2].replace(/[\s\-()]/g, '') };
    }
    return { countryCode: '+91', phone: p.replace(/[\s\-()]/g, '') };
}

function parseRawRows(rawRows, columnMapping) {
    return rawRows.map((row, idx) => {
        const lead = { _row: idx + 1 };
        for (const [colIdx, field] of Object.entries(columnMapping)) {
            if (field && row[colIdx] !== undefined && row[colIdx] !== null) {
                lead[field] = String(row[colIdx]).trim();
            }
        }
        // Auto-detect country code from phone
        if (lead.phone) {
            const { countryCode, phone } = detectCountryCode(lead.phone);
            if (!lead.countryCode) lead.countryCode = countryCode;
            lead.phone = phone;
        }
        // Validation
        lead._errors = [];
        if (!lead.name) lead._errors.push('Name missing');
        if (!lead.phone) lead._errors.push('Phone missing');
        lead._valid = lead._errors.length === 0;
        return lead;
    });
}

function parsePastedText(text) {
    const lines = text.trim().split('\n').filter(l => l.trim());
    if (lines.length === 0) return [];

    // Detect delimiter
    const firstLine = lines[0];
    const tabCount = (firstLine.match(/\t/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    const delimiter = tabCount > commaCount ? '\t' : ',';

    const rawRows = lines.map(line => line.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, '')));

    // Detect if first row is header
    const firstRowLower = rawRows[0].map(c => c.toLowerCase().trim());
    const isHeader = firstRowLower.some(c => Object.keys(FIELD_MAP).includes(c));

    let columnMapping = {};
    let dataRows = rawRows;

    if (isHeader) {
        rawRows[0].forEach((col, i) => {
            const mapped = autoMapColumn(col);
            if (mapped) columnMapping[i] = mapped;
        });
        dataRows = rawRows.slice(1);
    } else {
        // Guess: col0=name, col1=phone, col2=email, col3=country, col4=notes
        const guessMap = ['name', 'phone', 'email', 'country', 'medicalIssue', 'notes'];
        rawRows[0].forEach((_, i) => {
            if (guessMap[i]) columnMapping[i] = guessMap[i];
        });
    }

    return { dataRows, columnMapping, headers: isHeader ? rawRows[0] : null };
}

export default function ImportLeads({ isOpen, onClose }) {
    const queryClient = useQueryClient();
    const fileRef = useRef(null);
    const [step, setStep] = useState('input'); // input → mapping → preview → result
    const [pasteText, setPasteText] = useState('');
    const [rawRows, setRawRows] = useState([]);
    const [headers, setHeaders] = useState([]);
    const [columnMapping, setColumnMapping] = useState({});
    const [parsedLeads, setParsedLeads] = useState([]);
    const [importResult, setImportResult] = useState(null);
    const [mode, setMode] = useState('file'); // file | paste

    // Reset
    const reset = () => {
        setStep('input');
        setPasteText('');
        setRawRows([]);
        setHeaders([]);
        setColumnMapping({});
        setParsedLeads([]);
        setImportResult(null);
        setMode('file');
    };

    // Handle file upload
    const handleFile = useCallback((e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const wb = XLSX.read(evt.target.result, { type: 'array' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

                if (jsonData.length < 2) {
                    toast.error('File appears empty');
                    return;
                }

                // First row = headers
                const hdrs = jsonData[0].map(h => String(h).trim());
                const data = jsonData.slice(1).filter(r => r.some(c => c !== ''));

                // Auto-map columns
                const mapping = {};
                hdrs.forEach((h, i) => {
                    const mapped = autoMapColumn(h);
                    if (mapped) mapping[i] = mapped;
                });

                setHeaders(hdrs);
                setRawRows(data);
                setColumnMapping(mapping);
                setStep('mapping');
                toast.success(`${data.length} rows found`);
            } catch (err) {
                toast.error('Failed to parse file');
            }
        };
        reader.readAsArrayBuffer(file);
    }, []);

    // Handle paste
    const handlePaste = () => {
        if (!pasteText.trim()) {
            toast.error('Paste some data first');
            return;
        }
        const result = parsePastedText(pasteText);
        if (result.dataRows.length === 0) {
            toast.error('No data found');
            return;
        }

        if (result.headers) {
            setHeaders(result.headers);
        } else {
            setHeaders(result.dataRows[0].map((_, i) => `Column ${i + 1}`));
        }
        setRawRows(result.dataRows);
        setColumnMapping(result.columnMapping);
        setStep('mapping');
        toast.success(`${result.dataRows.length} rows detected`);
    };

    // Apply mapping → preview
    const applyMapping = () => {
        const mapped = parseRawRows(rawRows, columnMapping);
        setParsedLeads(mapped);
        setStep('preview');
    };

    // Update column mapping
    const updateMapping = (colIdx, field) => {
        setColumnMapping(prev => {
            const next = { ...prev };
            if (field) next[colIdx] = field;
            else delete next[colIdx];
            return next;
        });
    };

    // Import mutation
    const importMutation = useMutation({
        mutationFn: (leads) => api.post('/leads/bulk', { leads }),
        onSuccess: (res) => {
            setImportResult(res.data);
            setStep('result');
            queryClient.invalidateQueries({ queryKey: ['leads'] });
            queryClient.invalidateQueries({ queryKey: ['lead-stats'] });
        },
        onError: (err) => toast.error(getErrorMessage(err, 'Import failed')),
    });

    const handleImport = () => {
        const validLeads = parsedLeads.filter(l => l._valid);
        if (validLeads.length === 0) {
            toast.error('No valid leads to import');
            return;
        }
        // Strip internal fields
        const clean = validLeads.map(({ _row, _errors, _valid, ...rest }) => rest);
        importMutation.mutate(clean);
    };

    const downloadTemplate = () => {
        const ws = XLSX.utils.aoa_to_sheet([
            ['Name', 'Phone', 'Email', 'Country Code', 'Country', 'City', 'Medical Issue', 'Amount', 'Notes'],
            ['John Doe', '9876543210', 'john@example.com', '+91', 'India', 'Delhi', 'Cardiac surgery', '500000', 'Referred by Dr Smith'],
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Leads');
        XLSX.writeFile(wb, 'lead_import_template.xlsx');
    };

    if (!isOpen) return null;

    const validCount = parsedLeads.filter(l => l._valid).length;
    const invalidCount = parsedLeads.filter(l => !l._valid).length;

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => { reset(); onClose(); }}
            title="Import Leads"
            size="xl"
            footer={
                <div className="flex gap-3 w-full">
                    {step === 'mapping' && (
                        <>
                            <button onClick={reset} className="btn-secondary flex-1">Back</button>
                            <button
                                onClick={applyMapping}
                                disabled={!Object.values(columnMapping).includes('name') || !Object.values(columnMapping).includes('phone')}
                                className="btn-primary flex-1"
                            >
                                Preview <ArrowRight size={14} />
                            </button>
                        </>
                    )}
                    {step === 'preview' && (
                        <>
                            <button onClick={() => setStep('mapping')} className="btn-secondary flex-1">Back</button>
                            <button
                                onClick={handleImport}
                                disabled={validCount === 0 || importMutation.isPending}
                                className="btn-primary flex-1"
                            >
                                {importMutation.isPending ? (
                                    <><Loader2 size={14} className="animate-spin" /> Importing...</>
                                ) : (
                                    <>Import {validCount} Lead{validCount !== 1 ? 's' : ''}</>
                                )}
                            </button>
                        </>
                    )}
                    {step === 'result' && (
                        <button onClick={() => { reset(); onClose(); }} className="btn-primary flex-1">
                            Done
                        </button>
                    )}
                    {step === 'input' && (
                        <button onClick={() => { reset(); onClose(); }} className="btn-secondary flex-1">
                            Cancel
                        </button>
                    )}
                </div>
            }
        >
            <div className="space-y-4">
                {/* Steps indicator */}
                <div className="flex items-center gap-2 text-xs font-bold mb-4">
                    {['Input', 'Map Columns', 'Preview', 'Done'].map((label, i) => {
                        const steps = ['input', 'mapping', 'preview', 'result'];
                        const currentIdx = steps.indexOf(step);
                        const isActive = i === currentIdx;
                        const isDone = i < currentIdx;
                        return (
                            <React.Fragment key={label}>
                                {i > 0 && <ChevronRight size={12} className="text-muted" />}
                                <span className={`px-2 py-1 rounded-lg ${isActive ? 'bg-teal text-white' : isDone ? 'bg-teal/10 text-teal' : 'text-muted'}`}>
                                    {label}
                                </span>
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* Step 1: Input */}
                {step === 'input' && (
                    <div className="space-y-6">
                        {/* Mode Toggle */}
                        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
                            <button onClick={() => setMode('file')}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${mode === 'file' ? 'bg-white shadow-sm text-teal' : 'text-muted'}`}>
                                <FileSpreadsheet size={16} className="inline mr-1.5" /> Upload File
                            </button>
                            <button onClick={() => setMode('paste')}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${mode === 'paste' ? 'bg-white shadow-sm text-teal' : 'text-muted'}`}>
                                <ClipboardPaste size={16} className="inline mr-1.5" /> Paste Data
                            </button>
                        </div>

                        {mode === 'file' && (
                            <>
                                <div
                                    className="border-2 border-dashed border-border rounded-2xl p-10 text-center hover:border-teal/50 transition-colors cursor-pointer group"
                                    onClick={() => fileRef.current?.click()}
                                >
                                    <Upload size={40} className="mx-auto mb-4 text-muted group-hover:text-teal transition-colors" />
                                    <p className="font-bold text-sm mb-1">Drop file or click to upload</p>
                                    <p className="text-xs text-muted">Supports CSV, XLS, XLSX files</p>
                                    <input ref={fileRef} type="file" accept=".csv,.xls,.xlsx" className="hidden" onChange={handleFile} />
                                </div>
                                <button onClick={downloadTemplate} className="btn-ghost btn-sm w-full text-xs">
                                    <Download size={14} /> Download Template
                                </button>
                            </>
                        )}

                        {mode === 'paste' && (
                            <>
                                <div>
                                    <label className="form-label">Paste leads data below</label>
                                    <textarea
                                        rows={12}
                                        value={pasteText}
                                        onChange={(e) => setPasteText(e.target.value)}
                                        className="form-input font-mono text-xs resize-none"
                                        placeholder={`Name\tPhone\tEmail\tCountry\nJohn Doe\t+919876543210\tjohn@mail.com\tIndia\nJane Smith\t+8801756789012\tjane@mail.com\tBangladesh\n\n— or use commas —\n\nName,Phone,Email,Country\nJohn Doe,+919876543210,john@mail.com,India`}
                                    />
                                    <p className="text-[10px] text-muted mt-1">
                                        Tab-separated or comma-separated. First row can be headers. System auto-detects format.
                                    </p>
                                </div>
                                <button onClick={handlePaste} disabled={!pasteText.trim()} className="btn-primary w-full">
                                    <ArrowRight size={16} /> Parse Data
                                </button>
                            </>
                        )}

                        {/* Help */}
                        <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                            <h4 className="text-sm font-bold text-blue-800 mb-2">💡 Smart Import Tips</h4>
                            <ul className="text-xs text-blue-700 space-y-1">
                                <li>• System auto-detects column headers (Name, Phone, Email, etc.)</li>
                                <li>• Country codes in phone numbers are auto-detected (+91, +880, etc.)</li>
                                <li>• Duplicates are detected by phone number and skipped</li>
                                <li>• Review all data before importing — you can fix issues in preview</li>
                            </ul>
                        </div>
                    </div>
                )}

                {/* Step 2: Column Mapping */}
                {step === 'mapping' && (
                    <div className="space-y-6">
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                            <AlertCircle size={14} className="inline mr-1" />
                            Map each column to a lead field. Auto-mapped columns are pre-selected.
                        </div>

                        <div className="space-y-3">
                            {headers.map((header, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                    <div className="min-w-0 flex-1">
                                        <div className="text-sm font-bold truncate">{header}</div>
                                        <div className="text-[10px] text-muted truncate">e.g. {rawRows[0]?.[i] || '—'}</div>
                                    </div>
                                    <ArrowRight size={14} className="text-muted shrink-0" />
                                    <select
                                        value={columnMapping[i] || ''}
                                        onChange={(e) => updateMapping(i, e.target.value)}
                                        className={`form-select w-40 text-xs ${columnMapping[i] ? 'border-teal text-teal font-bold' : ''}`}
                                    >
                                        <option value="">— Skip —</option>
                                        {DISPLAY_FIELDS.map(f => (
                                            <option key={f.key} value={f.key}>
                                                {f.label} {f.required ? '*' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>

                        {/* Validation */}
                        {!Object.values(columnMapping).includes('name') && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-bold">
                                ⚠️ "Name" column must be mapped
                            </div>
                        )}
                        {!Object.values(columnMapping).includes('phone') && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-bold">
                                ⚠️ "Phone" column must be mapped
                            </div>
                        )}
                    </div>
                )}

                {/* Step 3: Preview */}
                {step === 'preview' && (
                    <div className="space-y-4">
                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="p-3 bg-blue-50 rounded-xl text-center">
                                <div className="text-xl font-bold text-blue-700">{parsedLeads.length}</div>
                                <div className="text-[10px] font-bold text-blue-600 uppercase">Total</div>
                            </div>
                            <div className="p-3 bg-green-50 rounded-xl text-center">
                                <div className="text-xl font-bold text-green-700">{validCount}</div>
                                <div className="text-[10px] font-bold text-green-600 uppercase">Valid</div>
                            </div>
                            <div className="p-3 bg-red-50 rounded-xl text-center">
                                <div className="text-xl font-bold text-red-700">{invalidCount}</div>
                                <div className="text-[10px] font-bold text-red-600 uppercase">Invalid</div>
                            </div>
                        </div>

                        {/* Preview Table */}
                        <div className="overflow-x-auto border border-border rounded-xl">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-gray-50">
                                        <th className="table-header w-8">#</th>
                                        <th className="table-header">Status</th>
                                        {DISPLAY_FIELDS.filter(f => Object.values(columnMapping).includes(f.key)).map(f => (
                                            <th key={f.key} className="table-header">{f.label}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {parsedLeads.slice(0, 50).map((lead, i) => (
                                        <tr key={i} className={`border-t border-border ${lead._valid ? '' : 'bg-red-50/50'}`}>
                                            <td className="px-3 py-2 text-muted">{lead._row}</td>
                                            <td className="px-3 py-2">
                                                {lead._valid ? (
                                                    <Check size={14} className="text-green-500" />
                                                ) : (
                                                    <span className="text-red-500 text-[10px] font-bold">{lead._errors.join(', ')}</span>
                                                )}
                                            </td>
                                            {DISPLAY_FIELDS.filter(f => Object.values(columnMapping).includes(f.key)).map(f => (
                                                <td key={f.key} className="px-3 py-2 max-w-[120px] truncate">
                                                    {lead[f.key] || <span className="text-muted">—</span>}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {parsedLeads.length > 50 && (
                            <p className="text-xs text-muted text-center">Showing first 50 of {parsedLeads.length} rows</p>
                        )}
                    </div>
                )}

                {/* Step 4: Result */}
                {step === 'result' && importResult && (
                    <div className="space-y-6">
                        <div className="text-center py-4">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check size={32} className="text-green-600" />
                            </div>
                            <h3 className="text-xl font-bold mb-1">Import Complete!</h3>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div className="p-4 bg-green-50 rounded-xl text-center">
                                <div className="text-2xl font-bold text-green-700">{importResult.created?.length || 0}</div>
                                <div className="text-xs font-bold text-green-600">Created</div>
                            </div>
                            <div className="p-4 bg-amber-50 rounded-xl text-center">
                                <div className="text-2xl font-bold text-amber-700">{importResult.skipped?.length || 0}</div>
                                <div className="text-xs font-bold text-amber-600">Duplicates</div>
                            </div>
                            <div className="p-4 bg-red-50 rounded-xl text-center">
                                <div className="text-2xl font-bold text-red-700">{importResult.failed?.length || 0}</div>
                                <div className="text-xs font-bold text-red-600">Failed</div>
                            </div>
                        </div>

                        {importResult.skipped?.length > 0 && (
                            <div>
                                <h4 className="text-sm font-bold mb-2 text-amber-700">Skipped (Duplicates)</h4>
                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                    {importResult.skipped.map((s, i) => (
                                        <div key={i} className="text-xs p-2 bg-amber-50 rounded-lg">
                                            <span className="font-bold">{s.name}</span> — {s._error}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {importResult.failed?.length > 0 && (
                            <div>
                                <h4 className="text-sm font-bold mb-2 text-red-700">Failed</h4>
                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                    {importResult.failed.map((f, i) => (
                                        <div key={i} className="text-xs p-2 bg-red-50 rounded-lg">
                                            <span className="font-bold">{f.name || 'Unknown'}</span> — {f._error}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
}
