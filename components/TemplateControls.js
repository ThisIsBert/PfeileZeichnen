import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import React from 'react';

const TemplateControls = ({ onLoad, onClear, fileNames }) => {
    const inputRef = React.useRef(null);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    const loadFiles = async event => {
        const files = Array.from(event.target.files ?? []);
        event.target.value = '';
        if (!files.length) return;
        setIsLoading(true);
        setError('');
        try {
            await onLoad(files);
        } catch (failure) {
            setError(failure.message || 'Die Vorlage konnte nicht geladen werden.');
        } finally {
            setIsLoading(false);
        }
    };
    const clear = () => {
        onClear();
        setError('');
    };
    const buttonClass = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-50';
    return _jsxs('section', { 'aria-labelledby': 'templateHeading', className: 'mt-3 rounded-xl border border-violet-200 bg-violet-50 p-3', children: [
        _jsx('h2', { id: 'templateHeading', className: 'text-sm font-semibold text-slate-800', children: 'Vorlage' }),
        _jsx('p', { className: 'mt-1 text-xs text-slate-600', children: 'Unveränderliche Zeichenhilfe. Über „Vorlage“ links ein- und ausblenden.' }),
        _jsx('input', { ref: inputRef, id: 'templateFileInput', type: 'file', hidden: true, multiple: true, accept: '.geojson,.json,application/geo+json,application/json', onChange: loadFiles }),
        _jsxs('div', { className: 'mt-2 flex gap-2', children: [
            _jsx('button', { id: 'loadTemplateBtn', type: 'button', disabled: isLoading, onClick: () => inputRef.current?.click(), className: buttonClass, children: isLoading ? 'Wird geladen …' : 'GeoJSON laden' }),
            _jsx('button', { id: 'clearTemplateBtn', type: 'button', disabled: isLoading || !fileNames.length, onClick: clear, className: buttonClass, children: 'Leeren' }),
        ] }),
        fileNames.length > 0 && _jsx('p', { id: 'templateStatus', role: 'status', className: 'mt-2 break-words text-xs text-slate-600', children: fileNames.join(', ') }),
        error && _jsx('p', { role: 'alert', className: 'mt-2 text-xs text-rose-700', children: error }),
    ] });
};

export default TemplateControls;
