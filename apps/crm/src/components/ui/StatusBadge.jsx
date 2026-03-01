import React from 'react';
import { getStatusConfig } from '../../lib/constants';

export default function StatusBadge({ status, size = 'sm' }) {
    const config = getStatusConfig(status);

    const sizeClasses = {
        xs: 'px-1.5 py-0.5 text-[9px]',
        sm: 'px-2 py-1 text-[10px]',
        md: 'px-3 py-1.5 text-xs',
    };

    return (
        <span className={`inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wider ${config.bgClass} ${sizeClasses[size]}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`} />
            {config.label}
        </span>
    );
}
