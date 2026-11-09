import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import React from 'react';
import Icon from './Icon.js';
import ShapeParameterControl from './ShapeParameterControl.js';
import TemplateControls from './TemplateControls.js';
import ProjectControls from './ProjectControls.js';
import { EditingState } from '../types.js';

/** Desktop inspector. Only the properties scroll; document actions stay visible. */
const ControlPanel = ({ uiState, actions }) => {
    const {
        editingState, anchorCount, arrowName, savedArrows, templateFileNames,
        hasUnsavedChanges, projectFileName, notice, editorError,
        canUndo, canRedo, canFinishArrow, canCopyArrow, canDeleteArrow,
        canEditName, canEditParameters, canPickShape, isPickingShape,
        canCopyGeoJson, canSaveAllGeoJson,
        shaftThickness, headLength, headWidth, rearTaper, frontTaper,
    } = uiState;
    const {
        onDrawArrow, onFinishArrow, onCancelArrow, onUndo, onRedo,
        onBeginChange, onEndChange, onArrowNameChange, onShapeParamChange,
        onToggleShapePicker, onCopyArrow, onDeleteArrow, onSelectArrow,
        onSaveProject, onLoadProject, onLoadTemplate, onClearTemplate,
        onCopyGeoJson, onSaveGeoJson, onSaveAllGeoJson, onNotify, onDismissNotice,
    } = actions;
    const isActive = editingState !== EditingState.Idle;
    const isDrawing = editingState === EditingState.DrawingNew;
    const [showForm, setShowForm] = React.useState(true);
    const slider = (id, label, min, max, step, value, paramKey) => _jsx(ShapeParameterControl, {
        id, label, min, max, step, value, paramKey, disabled: !canEditParameters,
        onChange: onShapeParamChange, onBegin: onBeginChange, onEnd: onEndChange,
    });

    return _jsxs('aside', { id: 'controlPanel', className: 'control-panel', 'aria-label': 'Pfeil- und Projektwerkzeuge', children: [
        _jsxs('header', { className: 'panel-header', children: [
            _jsxs('div', { className: 'app-brand', children: [
                _jsx('span', { className: 'brand-icon', children: _jsx(Icon, { name: 'arrow' }) }),
                _jsxs('div', { children: [
                    _jsx('h1', { children: 'Pfeile zeichnen' }),
                    _jsx('p', { className: 'app-subtitle', children: 'ThisIsBerts Kartenwerkzeug' }),
                ] }),
            ] }),
            _jsxs('div', { id: 'saveState', className: `save-state ${hasUnsavedChanges ? 'is-dirty' : ''}`, role: 'status', children: [
                _jsx('span', { className: 'status-dot', 'aria-hidden': 'true' }),
                _jsx('span', { children: hasUnsavedChanges ? 'Ungesicherte Änderungen' : projectFileName ? 'Projektstand gesichert' : 'Neues Projekt' }),
                projectFileName && _jsx('span', { className: 'project-filename', title: projectFileName, children: projectFileName }),
            ] }),
        ] }),
        _jsxs('div', { className: 'history-toolbar', 'aria-label': 'Bearbeitungsverlauf', children: [
            _jsxs('button', { id: 'undoBtn', type: 'button', className: 'button button-quiet', title: canUndo ? 'Rückgängig (Strg/Cmd+Z)' : 'Noch keine Änderung zum Rückgängigmachen', disabled: !canUndo, onClick: onUndo, children: [_jsx(Icon, { name: 'undo' }), 'Rückgängig'] }),
            _jsxs('button', { id: 'redoBtn', type: 'button', className: 'button button-quiet', title: canRedo ? 'Wiederholen (Strg+Y / Strg/Cmd+Umschalt+Z)' : 'Keine rückgängig gemachte Änderung vorhanden', disabled: !canRedo, onClick: onRedo, children: [_jsx(Icon, { name: 'redo' }), 'Wiederholen'] }),
        ] }),
        _jsxs('div', { className: 'panel-content', children: [
            editorError && _jsx('p', { id: 'editorError', role: 'alert', className: 'message message-error', children: editorError }),
            isActive ? _jsxs(React.Fragment, { children: [
                _jsxs('section', { className: 'inspector-section arrow-identity', 'aria-labelledby': 'editingHeading', children: [
                    _jsxs('div', { className: 'section-heading', children: [
                        _jsx('h2', { id: 'editingHeading', children: isDrawing ? 'Neuer Pfeil' : 'Pfeil bearbeiten' }),
                        _jsx('span', { className: 'count-badge', role: 'status', children: `${anchorCount} ${anchorCount === 1 ? 'Stützpunkt' : 'Stützpunkte'}` }),
                    ] }),
                    _jsx('label', { htmlFor: 'arrowNameInput', className: 'field-label', children: 'Name' }),
                    _jsx('input', { id: 'arrowNameInput', type: 'text', className: 'text-input', placeholder: 'Pfeil benennen', value: arrowName, disabled: !canEditName, onFocus: onBeginChange, onBlur: onEndChange, onChange: event => onArrowNameChange(event.target.value) }),
                    _jsx('p', { className: 'hint', children: isDrawing
                        ? anchorCount < 2 ? 'Setze mindestens zwei Punkte auf der Karte.' : 'Klicke für weitere Punkte oder stelle den Pfeil fertig.'
                        : 'Ziehe die Punkte und Griffe. Umschalt + Klick auf den Pfeil fügt einen Punkt hinzu.' }),
                ] }),
                _jsxs('section', { className: 'inspector-section', 'aria-labelledby': 'formHeading', children: [
                    _jsx('h2', { id: 'formHeading', children: _jsxs('button', { id: 'toggleFormBtn', type: 'button', className: 'section-toggle', onClick: () => setShowForm(value => !value), 'aria-expanded': showForm, 'aria-controls': 'formControls', children: [
                        _jsx('span', { children: 'Form' }),
                        _jsx(Icon, { name: 'chevron', className: showForm ? 'is-open' : '' }),
                    ] }) }),
                    _jsxs('div', { id: 'formControls', hidden: !showForm, children: [
                        !canEditParameters && _jsx('p', { className: 'hint', children: 'Ab zwei Stützpunkten kannst du die Form anpassen.' }),
                        slider('shaftThicknessSlider', 'Schaftdicke', 2, 120, 1, shaftThickness, 'shaftThickness'),
                        slider('headLengthSlider', 'Spitzenlänge', 2, 240, 1, headLength, 'headLength'),
                        slider('headWidthSlider', 'Spitzenbreite', 2, 240, 1, headWidth, 'headWidth'),
                        slider('rearTaperSlider', 'Schaft hinten', 0.2, 2.5, 0.01, rearTaper, 'rearTaper'),
                        slider('frontTaperSlider', 'Schaft vorne', 0.2, 2.5, 0.01, frontTaper, 'frontTaper'),
                        _jsxs('div', { className: 'object-actions', children: [
                            _jsxs('button', { id: 'pickShapeBtn', type: 'button', className: `button button-secondary full-width ${isPickingShape ? 'is-pressed' : ''}`, 'aria-pressed': isPickingShape, disabled: !canPickShape, title: canPickShape ? 'Form von anderem Pfeil kopieren' : 'Du brauchst zwei Stützpunkte und einen weiteren fertigen Pfeil als Quelle', onClick: onToggleShapePicker, children: [_jsx(Icon, { name: 'pipette' }), isPickingShape ? 'Kopieren der Form abbrechen' : 'Form von anderem Pfeil kopieren'] }),
                            isPickingShape && _jsx('p', { id: 'shapePickerHint', role: 'status', className: 'hint accent-text', children: 'Klicke auf den Pfeil, dessen Form du kopieren möchtest. Esc bricht ab.' }),
                            _jsxs('button', { id: 'copyArrowBtn', type: 'button', className: 'button button-secondary full-width', disabled: !canCopyArrow, title: canCopyArrow ? 'Pfeil duplizieren' : 'Setze zuerst mindestens zwei Stützpunkte', onClick: onCopyArrow, children: [_jsx(Icon, { name: 'copy' }), 'Duplizieren'] }),
                            canDeleteArrow && _jsxs('button', { id: 'deleteArrowBtn', type: 'button', className: 'button button-secondary full-width', onClick: onDeleteArrow, title: 'Pfeil löschen; lässt sich rückgängig machen', children: [_jsx(Icon, { name: 'trash' }), 'Löschen'] }),
                        ] }),
                    ] }),
                    _jsx('p', { id: 'pointKeyboardHint', className: 'sr-only', children: 'Mit Tab einen Punkt fokussieren. Pfeiltasten verschieben ihn, mit Umschalt in größeren Schritten.' }),
                ] }),
            ] }) : _jsxs(React.Fragment, { children: [
                _jsxs('section', { className: 'inspector-section start-section', 'aria-labelledby': 'drawHeading', children: [
                    _jsx('h2', { id: 'drawHeading', children: 'Zeichnen' }),
                    _jsx('p', { className: 'hint', children: 'Verbinde Punkte auf der Karte zu einem Pfeil. Die Form kannst du anschließend verfeinern.' }),
                    _jsxs('button', { id: 'drawArrowBtn', type: 'button', className: 'button button-primary full-width', onClick: onDrawArrow, children: [_jsx(Icon, { name: 'plus' }), 'Neuen Pfeil zeichnen'] }),
                ] }),
                _jsxs('section', { className: 'inspector-section', 'aria-labelledby': 'arrowsHeading', children: [
                    _jsxs('div', { className: 'section-heading', children: [_jsx('h2', { id: 'arrowsHeading', children: 'Pfeile im Projekt' }), _jsx('span', { className: 'count-badge', children: savedArrows.length })] }),
                    savedArrows.length ? _jsx('ul', { className: 'arrow-list', children: savedArrows.map(arrow => _jsx('li', { children: _jsxs('button', {
                        className: 'arrow-list-item', type: 'button', onClick: () => onSelectArrow(arrow.id), title: `${arrow.name} bearbeiten`, children: [
                            _jsx(Icon, { name: 'arrow' }), _jsx('span', { children: arrow.name }), _jsx(Icon, { name: 'chevronRight' }),
                        ],
                    }) }, arrow.id)) }) : _jsx('p', { className: 'empty-state', children: 'Noch keine Pfeile. Starte mit deinem ersten Pfeil oder lade eine Projektdatei.' }),
                ] }),
            ] }),
        ] }),
        _jsxs('footer', { className: 'panel-footer', children: [
            isActive && _jsxs('div', { className: 'editing-actions', children: [
                _jsxs('button', { id: 'finishArrowBtn', type: 'button', className: 'button button-primary', disabled: !canFinishArrow, title: canFinishArrow ? 'Pfeil ins Projekt übernehmen (Enter). Die Projektdatei separat speichern.' : 'Setze mindestens zwei unterschiedliche Stützpunkte', onClick: onFinishArrow, children: [_jsx(Icon, { name: 'check' }), 'Pfeil fertigstellen'] }),
                _jsx('button', { id: 'cancelArrowBtn', type: 'button', className: 'button button-secondary', title: 'Bearbeitung verwerfen (Esc)', onClick: onCancelArrow, children: 'Abbrechen' }),
            ] }),
            _jsxs('div', { className: `feedback ${notice?.tone === 'error' ? 'message-error' : ''}`, 'aria-live': 'polite', 'aria-atomic': 'true', children: notice ? [
                _jsx(Icon, { name: notice.tone === 'error' ? 'info' : 'check' }),
                _jsx('span', { children: notice.message }, notice.id),
                _jsx('button', { type: 'button', className: 'dismiss-button', 'aria-label': 'Meldung schließen', onClick: onDismissNotice, children: _jsx(Icon, { name: 'close' }) }),
            ] : _jsx('span', { className: 'footer-hint', children: isActive ? 'Fertigstellen übernimmt den Pfeil ins Projekt.' : 'Als Projektdatei später weiterbearbeiten.' }) }),
            _jsxs('div', { className: 'document-tools', 'aria-label': 'Export, Projektdatei und Vorlagen', onKeyDown: event => {
                if (event.key !== 'Escape' || event.target.closest('dialog[open]')) return;
                const section = event.target.closest('details[open]');
                if (section) { event.preventDefault(); event.stopPropagation(); section.open = false; section.querySelector('summary').focus(); }
            }, children: [
            _jsxs('details', { className: 'document-tool export-control', name: 'documentTools', children: [
                _jsxs('summary', { id: 'exportMenuBtn', children: [_jsx(Icon, { name: 'download' }), 'GeoJSON exportieren'] }),
                _jsxs('div', { id: 'exportOptions', className: 'export-options', children: [
                    _jsxs('button', { id: 'saveGeoJsonBtn', type: 'button', className: 'export-option', disabled: !canCopyGeoJson, onClick: onSaveGeoJson, children: [_jsx('strong', { children: 'Ausgewählten Pfeil als Datei exportieren' }), _jsx('span', { children: canCopyGeoJson ? 'Ausgewählte Form inklusive Bearbeitung · .geojson' : 'Pfeil auswählen oder mindestens zwei Punkte zeichnen.' })] }),
                    _jsxs('button', { id: 'saveAllGeoJsonBtn', type: 'button', className: 'export-option', disabled: !canSaveAllGeoJson, onClick: onSaveAllGeoJson, children: [_jsx('strong', { children: 'Alle Pfeile als Datei exportieren' }), _jsx('span', { children: isActive ? 'Zuerst die Bearbeitung des ausgewählten Pfeils fertigstellen.' : savedArrows.length ? `${savedArrows.length} ${savedArrows.length === 1 ? 'Pfeil' : 'Pfeile'} · .geojson` : 'Zeichne zuerst einen Pfeil.' })] }),
                    _jsxs('button', { id: 'copyGeoJsonBtn', type: 'button', className: 'export-option', disabled: !canCopyGeoJson, onClick: onCopyGeoJson, children: [_jsx('strong', { children: 'Ausgewählten Pfeil kopieren' }), _jsx('span', { children: canCopyGeoJson ? 'GeoJSON in die Zwischenablage kopieren.' : 'Pfeil auswählen oder mindestens zwei Punkte zeichnen.' })] }),
                ] }),
            ] }),
            _jsx(ProjectControls, { onSave: onSaveProject, onLoad: onLoadProject, hasUnsavedChanges, onNotify }),
            _jsx(TemplateControls, { fileNames: templateFileNames, onLoad: onLoadTemplate, onClear: onClearTemplate, onNotify }),
            ] }),
        ] }),
    ] });
};

export default ControlPanel;
