import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, ChevronDown, X, Check } from 'lucide-react';

export default function SearchableSelect({
    label,
    options = [],
    value,
    onChange,
    onAddNew,
    placeholder = 'Select...',
    displayKey = 'name',
    valueKey = 'id',
    disabled = false,
    error,
    className = '',
    addNewLabel = '+ Add New',
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const filtered = options.filter(opt =>
        (opt[displayKey] || '').toLowerCase().includes(search.toLowerCase())
    );

    const selectedOption = options.find(opt => opt[valueKey] === value);

    const handleSelect = (opt) => {
        onChange(opt[valueKey]);
        setIsOpen(false);
        setSearch('');
    };

    const handleClear = (e) => {
        e.stopPropagation();
        onChange(null);
        setSearch('');
    };

    return (
        <div className={`relative ${className}`} ref={ref}>
            {label && (
                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1.5">{label}</label>
            )}

            {/* Trigger */}
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`w-full flex items-center justify-between gap-2 bg-white border rounded-xl px-3 py-2.5 text-sm text-left transition-all ${error ? 'border-red-300 focus:ring-red-200' : 'border-border hover:border-gray-300 focus:ring-teal/20'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} focus:outline-none focus:ring-2`}
            >
                <span className={selectedOption ? 'text-text font-medium' : 'text-muted'}>
                    {selectedOption ? selectedOption[displayKey] : placeholder}
                </span>
                <div className="flex items-center gap-1">
                    {value && !disabled && (
                        <span onClick={handleClear} className="p-0.5 hover:bg-gray-100 rounded">
                            <X size={14} className="text-muted" />
                        </span>
                    )}
                    <ChevronDown size={16} className={`text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-border rounded-xl shadow-xl max-h-64 flex flex-col animate-scale-in origin-top">
                    {/* Search */}
                    <div className="p-2 border-b border-border">
                        <div className="relative">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search..."
                                className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-transparent rounded-lg focus:outline-none focus:border-teal/30 focus:bg-white"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Options */}
                    <div className="flex-1 overflow-y-auto py-1">
                        {filtered.length === 0 ? (
                            <div className="px-3 py-4 text-sm text-muted text-center">No results found</div>
                        ) : (
                            filtered.map(opt => (
                                <button
                                    key={opt[valueKey]}
                                    type="button"
                                    onClick={() => handleSelect(opt)}
                                    className={`w-full px-3 py-2 text-sm text-left flex items-center justify-between hover:bg-gray-50 transition-colors ${opt[valueKey] === value ? 'bg-teal/5 text-teal font-semibold' : ''
                                        }`}
                                >
                                    <span>{opt[displayKey]}</span>
                                    {opt[valueKey] === value && <Check size={14} />}
                                </button>
                            ))
                        )}
                    </div>

                    {/* Add New */}
                    {onAddNew && (
                        <button
                            type="button"
                            onClick={() => { setIsOpen(false); onAddNew(); }}
                            className="w-full px-3 py-2.5 text-sm font-bold text-teal hover:bg-teal/5 border-t border-border flex items-center gap-2 transition-colors"
                        >
                            <Plus size={14} /> {addNewLabel}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
