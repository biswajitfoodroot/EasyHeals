import React from 'react';
import { Phone, MessageCircle } from 'lucide-react';
import { formatPhone, getTelUrl, getWhatsAppUrl, getCountryFlag } from '../../lib/utils';

export default function PhoneLink({ countryCode, phone, altPhone, altCountryCode, showWhatsApp = true, size = 'sm' }) {
    if (!phone) return <span className="text-muted text-xs">—</span>;

    const sizeClasses = {
        sm: 'text-xs',
        md: 'text-sm',
    };

    return (
        <div className={`flex flex-col gap-1 ${sizeClasses[size]}`}>
            {/* Primary phone */}
            <div className="flex items-center gap-1.5">
                <span className="text-xs">{getCountryFlag(countryCode)}</span>
                <a
                    href={getTelUrl(countryCode, phone)}
                    className="font-semibold text-text hover:text-teal transition-colors"
                    title="Click to call"
                >
                    {formatPhone(countryCode, phone)}
                </a>
                <a href={getTelUrl(countryCode, phone)} className="p-1 bg-green-50 text-green-600 rounded hover:bg-green-100 transition-colors" title="Call">
                    <Phone size={12} />
                </a>
                {showWhatsApp && (
                    <a
                        href={getWhatsAppUrl(countryCode, phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100 transition-colors"
                        title="WhatsApp"
                    >
                        <MessageCircle size={12} />
                    </a>
                )}
            </div>

            {/* Alt phone */}
            {altPhone && (
                <div className="flex items-center gap-1.5 text-muted">
                    <span className="text-xs">{getCountryFlag(altCountryCode)}</span>
                    <a
                        href={getTelUrl(altCountryCode, altPhone)}
                        className="hover:text-teal transition-colors"
                        title="Call alt"
                    >
                        {formatPhone(altCountryCode, altPhone)}
                    </a>
                    <a href={getTelUrl(altCountryCode, altPhone)} className="p-1 bg-green-50 text-green-600 rounded hover:bg-green-100 transition-colors" title="Call">
                        <Phone size={10} />
                    </a>
                    {showWhatsApp && (
                        <a
                            href={getWhatsAppUrl(altCountryCode, altPhone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100 transition-colors"
                            title="WhatsApp"
                        >
                            <MessageCircle size={10} />
                        </a>
                    )}
                </div>
            )}
        </div>
    );
}
