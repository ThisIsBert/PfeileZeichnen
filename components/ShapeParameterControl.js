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
    return _jsxs('div', { className: 'flex flex-col gap-1', children: [
        _jsxs('div', { className: 'flex items-center justify-between gap-2 text-xs', children: [
            _jsx('label', { htmlFor: `${id}Number`, className: 'font-medium text-slate-700', children: `${label} (${unit})` }),
            _jsx('input', { id: `${id}Number`, type: 'number', min, max, step, value: draft, disabled,
                className: 'w-20 rounded border border-slate-300 px-1.5 py-1 text-right tabular-nums focus:border-cyan-600 focus:outline-none disabled:bg-slate-100',
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
            className: 'w-full accent-cyan-600 disabled:cursor-not-allowed disabled:opacity-40',
        }),
    ] });
};
export default ShapeParameterControl;
