import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import React from 'react';
import { clampFormValue } from '../app/types/shapeParameters.js';

const ShapeParameterControl = ({ id, label, min, max, step, value, paramKey, disabled, onChange, onBegin, onEnd }) => {
    const [draft, setDraft] = React.useState(String(value));
    const focused = React.useRef(false);
    const initial = React.useRef(value);
    React.useEffect(() => {
        if (!focused.current) setDraft(String(value));
    }, [value]);
    const commit = event => {
        focused.current = false;
        const next = clampFormValue(paramKey, event.target.value) ?? value;
        setDraft(String(next));
        onChange(paramKey, next);
        onEnd();
    };
    const unit = paramKey.endsWith('Taper') ? '×' : 'px';
    return _jsxs('div', { className: 'parameter-control', children: [
        _jsxs('div', { className: 'parameter-heading', children: [
            _jsx('label', { htmlFor: `${id}Number`, children: `${label} (${unit})` }),
            _jsx('input', { id: `${id}Number`, type: 'number', min, max, step, value: draft, disabled,
                className: 'number-input',
                onFocus: () => { focused.current = true; initial.current = value; onBegin(); },
                onChange: event => {
                    const text = event.target.value;
                    setDraft(text);
                    const number = Number(text);
                    if (text !== '' && Number.isFinite(number) && number >= min && number <= max) onChange(paramKey, number);
                },
                onBlur: commit,
                onKeyDown: event => {
                    if (event.key !== 'Enter' && event.key !== 'Escape') return;
                    event.preventDefault();
                    event.stopPropagation();
                    if (event.key === 'Escape') {
                        event.currentTarget.value = String(initial.current);
                        setDraft(String(initial.current));
                        onChange(paramKey, initial.current);
                    }
                    event.currentTarget.blur();
                },
            }),
        ] }),
        _jsx('input', { id, type: 'range', min, max, step, value, disabled, 'aria-label': `${label} (${unit})`,
            onPointerDown: onBegin, onPointerUp: onEnd, onPointerCancel: onEnd, onBlur: onEnd,
            onChange: event => onChange(paramKey, Number(event.target.value)),
            className: 'parameter-range',
        }),
    ] });
};
export default ShapeParameterControl;
