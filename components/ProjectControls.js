import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import React from 'react';
import Icon from './Icon.js';

const ProjectControls = ({ onSave, onLoad, hasUnsavedChanges, onNotify }) => {
    const inputRef = React.useRef(null);
    const dialogRef = React.useRef(null);
    const [busy, setBusy] = React.useState(false);
    const [pendingFile, setPendingFile] = React.useState(null);
    const [dialogError, setDialogError] = React.useState('');
    React.useEffect(() => {
        if (pendingFile && !dialogRef.current.open) dialogRef.current.showModal();
        else if (!pendingFile && dialogRef.current.open) dialogRef.current.close();
    }, [pendingFile]);
    const run = async (action, success) => {
        setBusy(true);
        try { await action(); onNotify(success); return true; }
        catch (failure) { onNotify(failure.message || 'Die Projektdatei konnte nicht verarbeitet werden.', 'error'); return false; }
        finally { setBusy(false); }
    };
    const load = event => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        if (hasUnsavedChanges) { setDialogError(''); setPendingFile(file); }
        else run(() => onLoad(file), `Projekt geladen: ${file.name}`);
    };
    const replace = async saveFirst => {
        setBusy(true);
        setDialogError('');
        try {
            if (saveFirst) await onSave();
            await onLoad(pendingFile);
            onNotify(`Projekt geladen: ${pendingFile.name}`);
            setPendingFile(null);
        } catch (failure) {
            setDialogError(failure.message || 'Das Projekt konnte nicht geladen werden. Der aktuelle Stand bleibt erhalten.');
        } finally { setBusy(false); }
    };
    return _jsxs(React.Fragment, { children: [
        _jsx('input', { ref: inputRef, id: 'projectFileInput', type: 'file', hidden: true, accept: '.pfeile.json,.json,application/json', onChange: load }),
        _jsxs('div', { className: 'project-actions', 'aria-label': 'Projektdatei', children: [
            _jsxs('button', { id: 'saveProjectBtn', type: 'button', disabled: busy, onClick: () => run(onSave, 'Projektdatei zum Herunterladen erstellt.'), className: 'button button-secondary', children: [_jsx(Icon, { name: 'save' }), 'Projekt speichern'] }),
            _jsxs('button', { id: 'loadProjectBtn', type: 'button', disabled: busy, onClick: () => inputRef.current.click(), className: 'button button-secondary', children: [_jsx(Icon, { name: 'folder' }), busy ? 'Wird geladen …' : 'Projekt laden'] }),
        ] }),
        _jsxs('dialog', { ref: dialogRef, id: 'replaceProjectDialog', className: 'project-dialog', 'aria-labelledby': 'replaceProjectHeading', 'aria-describedby': 'replaceProjectDescription', onCancel: event => {
            if (busy) event.preventDefault(); else setPendingFile(null);
        }, onClose: () => setPendingFile(null), children: [
            _jsx('span', { className: 'dialog-icon', children: _jsx(Icon, { name: 'folder' }) }),
            _jsx('h2', { id: 'replaceProjectHeading', children: 'Aktuellen Stand sichern?' }),
            _jsx('p', { id: 'replaceProjectDescription', children: 'Dein Projekt enthält ungesicherte Änderungen. Beim Laden werden die aktuellen Pfeile, Vorlagen und der Bearbeitungsverlauf ersetzt.' }),
            _jsx('p', { className: 'dialog-filename', children: pendingFile?.name }),
            dialogError && _jsx('p', { role: 'alert', className: 'message message-error', children: dialogError }),
            _jsxs('div', { className: 'dialog-actions', children: [
                _jsx('button', { id: 'cancelProjectLoadBtn', type: 'button', autoFocus: true, disabled: busy, className: 'button button-secondary', onClick: () => setPendingFile(null), children: 'Abbrechen' }),
                _jsx('button', { id: 'discardAndLoadBtn', type: 'button', disabled: busy, className: 'button button-quiet', onClick: () => replace(false), children: 'Ohne Speichern laden' }),
                _jsx('button', { id: 'saveAndLoadBtn', type: 'button', disabled: busy, className: 'button button-primary', onClick: () => replace(true), children: 'Speichern und laden' }),
            ] }),
        ] }),
    ] });
};

export default ProjectControls;
