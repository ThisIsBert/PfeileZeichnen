import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import React from 'react';

const ProjectControls = ({ onSave, onLoad }) => {
    const inputRef = React.useRef(null);
    const [busy, setBusy] = React.useState(false);
    const [status, setStatus] = React.useState('');
    const [error, setError] = React.useState('');
    const run = async (action, success) => {
        setBusy(true);
        setError('');
        setStatus('');
        try { await action(); setStatus(success); }
        catch (failure) { setError(failure.message || 'Die Projektdatei konnte nicht verarbeitet werden.'); }
        finally { setBusy(false); }
    };
    const load = event => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (file) run(() => onLoad(file), `Projekt geladen: ${file.name}`);
    };
    const buttonClass = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-50';
    return _jsxs('section', { 'aria-labelledby': 'projectHeading', className: 'mt-3 rounded-xl border border-cyan-200 bg-cyan-50 p-3', children: [
        _jsx('h2', { id: 'projectHeading', className: 'text-sm font-semibold text-slate-800', children: 'Projektdatei' }),
        _jsx('p', { className: 'mt-1 text-xs text-slate-600', children: 'Pfeile, Entwurf, Vorlage und Kartenausschnitt zum Weiterbearbeiten speichern.' }),
        _jsx('input', { ref: inputRef, id: 'projectFileInput', type: 'file', hidden: true, accept: '.pfeile.json,.json,application/json', onChange: load }),
        _jsxs('div', { className: 'mt-2 grid grid-cols-2 gap-2', children: [
            _jsx('button', { id: 'saveProjectBtn', type: 'button', disabled: busy, onClick: () => run(onSave, 'Projektdatei zum Herunterladen erstellt.'), className: buttonClass, children: 'Projekt speichern' }),
            _jsx('button', { id: 'loadProjectBtn', type: 'button', disabled: busy, onClick: () => inputRef.current?.click(), className: buttonClass, children: busy ? 'Bitte warten …' : 'Projekt laden' }),
        ] }),
        _jsx('p', { className: 'mt-2 text-xs text-slate-600', children: 'Laden ersetzt den aktuellen Stand. Der Undo-Verlauf beginnt neu.' }),
        status && _jsx('p', { id: 'projectStatus', role: 'status', className: 'mt-2 break-words text-xs text-cyan-800', children: status }),
        error && _jsx('p', { id: 'projectError', role: 'alert', className: 'mt-2 text-xs text-rose-700', children: error }),
    ] });
};

export default ProjectControls;
