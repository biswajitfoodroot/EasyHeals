import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import Modal from '../components/ui/Modal';
import SearchableSelect from '../components/ui/SearchableSelect';
import { INVOICE_STATUSES, CURRENCIES } from '../lib/constants';
import { formatCurrency, formatDate, timeAgo } from '../lib/utils';
import { Plus, FileText, DollarSign, Download, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Invoices() {
    const queryClient = useQueryClient();
    const [showModal, setShowModal] = useState(false);
    const [filter, setFilter] = useState({ type: '', status: '' });
    const [page, setPage] = useState(1);

    const { data: invoicesRes, isLoading } = useQuery({
        queryKey: ['invoices', filter, page],
        queryFn: () => api.get('/invoices', { params: { ...filter, page, limit: 20 } }).then(r => r.data),
    });

    const invoices = invoicesRes?.data || [];

    return (
        <div className="page-container pb-24 lg:pb-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="page-title">Invoices</h1>
                    <p className="page-subtitle">{invoicesRes?.total || 0} invoices</p>
                </div>
                <button onClick={() => setShowModal(true)} className="btn-primary btn-sm"><Plus size={14} /> New Invoice</button>
            </div>

            {/* Filters */}
            <div className="card p-4 mb-4 flex flex-wrap gap-3">
                <select value={filter.type} onChange={(e) => setFilter(f => ({ ...f, type: e.target.value }))} className="form-select w-auto">
                    <option value="">All Types</option>
                    <option value="hospital">Hospital</option>
                    <option value="agent_payout">Agent Payout</option>
                </select>
                <select value={filter.status} onChange={(e) => setFilter(f => ({ ...f, status: e.target.value }))} className="form-select w-auto">
                    <option value="">All Statuses</option>
                    {INVOICE_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
            </div>

            {/* Desktop Table */}
            <div className="card hidden sm:block overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr>
                                <th className="table-header">Invoice #</th>
                                <th className="table-header">Type</th>
                                <th className="table-header">Lead / Entity</th>
                                <th className="table-header">Amount</th>
                                <th className="table-header">Status</th>
                                <th className="table-header">Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                Array.from({ length: 3 }).map((_, i) => <tr key={i}><td colSpan={6} className="p-4"><div className="skeleton h-10 w-full" /></td></tr>)
                            ) : invoices.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-12 text-muted">No invoices found</td></tr>
                            ) : (
                                invoices.map(inv => {
                                    const statusConfig = INVOICE_STATUSES.find(s => s.value === inv.status);
                                    return (
                                        <tr key={inv.id} className="table-row">
                                            <td className="table-cell font-mono font-bold text-teal">{inv.invoiceNumber}</td>
                                            <td className="table-cell">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${inv.invoiceType === 'hospital' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                                    {inv.invoiceType === 'hospital' ? 'Hospital' : 'Agent Payout'}
                                                </span>
                                            </td>
                                            <td className="table-cell">
                                                <div className="text-sm font-medium">{inv.leadName || inv.hospitalName || inv.agentName || '—'}</div>
                                                {inv.leadRefId && <div className="text-[10px] text-muted font-mono">{inv.leadRefId}</div>}
                                            </td>
                                            <td className="table-cell font-bold">{formatCurrency(inv.totalAmount, inv.currency)}</td>
                                            <td className="table-cell">
                                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${statusConfig?.bgClass || ''}`}>{statusConfig?.label || inv.status}</span>
                                            </td>
                                            <td className="table-cell text-xs text-muted">{timeAgo(inv.createdAt)}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Cards */}
            <div className="sm:hidden space-y-3">
                {invoices.map(inv => {
                    const statusConfig = INVOICE_STATUSES.find(s => s.value === inv.status);
                    return (
                        <div key={inv.id} className="mobile-card">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-mono font-bold text-teal text-sm">{inv.invoiceNumber}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusConfig?.bgClass || ''}`}>{statusConfig?.label}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm">{inv.leadName || inv.hospitalName || inv.agentName}</span>
                                <span className="font-bold text-lg">{formatCurrency(inv.totalAmount, inv.currency)}</span>
                            </div>
                            <div className="text-xs text-muted mt-2">{formatDate(inv.createdAt)}</div>
                        </div>
                    );
                })}
            </div>

            {showModal && <InvoiceFormModal onClose={() => setShowModal(false)} />}
        </div>
    );
}

function InvoiceFormModal({ onClose }) {
    const queryClient = useQueryClient();
    const [form, setForm] = useState({
        invoiceType: 'hospital', leadId: null, hospitalId: null, agentId: null,
        currency: 'INR', lineItems: [{ description: '', quantity: 1, rate: 0, amount: 0 }],
        notes: '', dueDate: '',
    });

    const { data: nextNum } = useQuery({
        queryKey: ['invoice-next-number'],
        queryFn: () => api.get('/invoices/next-number').then(r => r.data),
    });

    const { data: hospitalsList } = useQuery({ queryKey: ['hospitals'], queryFn: () => api.get('/masters/hospitals').then(r => r.data) });
    const { data: agentsData } = useQuery({ queryKey: ['agents'], queryFn: () => api.get('/agents').then(r => r.data) });

    const mutation = useMutation({
        mutationFn: (data) => api.post('/invoices', data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['invoices'] }); toast.success('Invoice created'); onClose(); },
        onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
    });

    const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const updateLineItem = (idx, field, value) => {
        const items = [...form.lineItems];
        items[idx] = { ...items[idx], [field]: value };
        items[idx].amount = items[idx].quantity * items[idx].rate;
        update('lineItems', items);
    };

    const addLineItem = () => update('lineItems', [...form.lineItems, { description: '', quantity: 1, rate: 0, amount: 0 }]);
    const removeLineItem = (idx) => update('lineItems', form.lineItems.filter((_, i) => i !== idx));

    const subtotal = form.lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);

    const handleSubmit = () => {
        mutation.mutate({
            ...form,
            amount: String(subtotal),
            taxAmount: '0',
            totalAmount: String(subtotal),
            lineItems: form.lineItems,
        });
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="New Invoice" size="xl"
            footer={<><button onClick={onClose} className="btn-secondary">Cancel</button><button onClick={handleSubmit} disabled={mutation.isPending} className="btn-primary">{mutation.isPending ? 'Creating...' : 'Create Invoice'}</button></>}>
            <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <FileText size={18} className="text-teal" />
                    <span className="font-mono font-bold text-teal">{nextNum?.invoiceNumber || 'Generating...'}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div><label className="form-label">Invoice Type</label>
                        <select value={form.invoiceType} onChange={(e) => update('invoiceType', e.target.value)} className="form-select">
                            <option value="hospital">Hospital Invoice</option>
                            <option value="agent_payout">Agent Payout</option>
                        </select>
                    </div>
                    <div><label className="form-label">Currency</label>
                        <select value={form.currency} onChange={(e) => update('currency', e.target.value)} className="form-select">
                            {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}
                        </select>
                    </div>
                </div>

                {form.invoiceType === 'hospital' && (
                    <SearchableSelect label="Hospital" options={hospitalsList || []} value={form.hospitalId} onChange={(v) => update('hospitalId', v)} placeholder="Select hospital" />
                )}
                {form.invoiceType === 'agent_payout' && (
                    <SearchableSelect label="Agent" options={agentsData?.data || []} value={form.agentId} onChange={(v) => update('agentId', v)} placeholder="Select agent" />
                )}

                <div><label className="form-label">Due Date</label><input type="date" value={form.dueDate} onChange={(e) => update('dueDate', e.target.value)} className="form-input" /></div>

                {/* Line Items */}
                <div>
                    <label className="form-label">Line Items</label>
                    <div className="space-y-2">
                        {form.lineItems.map((item, idx) => (
                            <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                                <div className="col-span-5"><input value={item.description} onChange={(e) => updateLineItem(idx, 'description', e.target.value)} className="form-input" placeholder="Description" /></div>
                                <div className="col-span-2"><input type="number" value={item.quantity} onChange={(e) => updateLineItem(idx, 'quantity', Number(e.target.value))} className="form-input" placeholder="Qty" min={1} /></div>
                                <div className="col-span-2"><input type="number" value={item.rate} onChange={(e) => updateLineItem(idx, 'rate', Number(e.target.value))} className="form-input" placeholder="Rate" min={0} /></div>
                                <div className="col-span-2 text-sm font-bold py-2 text-right">{formatCurrency(item.amount, form.currency)}</div>
                                <div className="col-span-1">{form.lineItems.length > 1 && <button onClick={() => removeLineItem(idx)} className="text-red-400 hover:text-red-600 text-sm font-bold p-2">✕</button>}</div>
                            </div>
                        ))}
                        <button onClick={addLineItem} className="text-sm font-bold text-teal hover:underline">+ Add Line Item</button>
                    </div>
                </div>

                <div className="border-t border-border pt-3 text-right">
                    <span className="text-sm text-muted mr-4">Total:</span>
                    <span className="text-2xl font-bold text-teal">{formatCurrency(subtotal, form.currency)}</span>
                </div>

                <div><label className="form-label">Notes</label><textarea rows={2} value={form.notes} onChange={(e) => update('notes', e.target.value)} className="form-textarea" /></div>
            </div>
        </Modal>
    );
}
