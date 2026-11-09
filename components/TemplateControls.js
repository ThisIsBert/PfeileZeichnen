import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import React from 'react';
import Icon from './Icon.js';

const TemplateControls = ({ onLoad, onClear, fileNames, onNotify }) => {
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
            onNotify(`${files.length === 1 ? 'Vorlage' : 'Vorlagen'} geladen.`);
        } catch (failure) {
            setError(failure.message || 'Die Vorlage konnte nicht geladen werden.');
        } finally { setIsLoading(false); }
    };
    return _jsxs('details', { className: 'inspector-section template-controls', children: [
        _jsxs('summary', { children: [_jsx(Icon, { name: 'layers' }), 'Vorlagen', fileNames.length > 0 && _jsx('span', { className: 'count-badge', children: fileNames.length })] }),
        _jsx('p', { className: 'hint', children: 'GeoJSON als Vorlage laden. Über „Vorlage“ links ein- und ausblenden. Vorlagen werden nicht mit den Pfeilen exportiert.' }),
        _jsx('input', { ref: inputRef, id: 'templateFileInput', type: 'file', hidden: true, multiple: true, accept: '.geojson,.json,application/geo+json,application/json', onChange: loadFiles }),
        _jsxs('div', { className: 'template-actions', children: [
            _jsxs('button', { id: 'loadTemplateBtn', type: 'button', disabled: isLoading, onClick: () => inputRef.current.click(), className: 'button button-secondary', children: [_jsx(Icon, { name: 'folder' }), isLoading ? 'Wird geladen …' : 'Vorlage laden'] }),
            fileNames.length > 0 && _jsx('button', { id: 'clearTemplateBtn', type: 'button', disabled: isLoading, onClick: () => { onClear(); setError(''); onNotify('Vorlagen entfernt.'); }, className: 'button button-quiet', children: 'Entfernen' }),
        ] }),
        fileNames.length > 0 && _jsx('p', { id: 'templateStatus', className: 'hint template-filenames', children: fileNames.join(', ') }),
        error && _jsx('p', { role: 'alert', className: 'message message-error', children: error }),
    ] });
};

export default TemplateControls;
