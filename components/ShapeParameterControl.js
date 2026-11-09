import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';

const adjustmentKeys = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown']);

const ShapeParameterControl = ({ id, label, min, max, step, value, paramKey, disabled, onChange, onBegin, onEnd }) =>
    _jsxs('div', { className: 'parameter-control', children: [
        _jsx('label', { htmlFor: id, children: label }),
        _jsx('input', { id, type: 'range', min, max, step, value, disabled,
            onPointerDown: onBegin, onPointerUp: onEnd, onPointerCancel: onEnd, onBlur: onEnd,
            onKeyDown: event => { if (adjustmentKeys.has(event.key)) onBegin(); },
            onKeyUp: event => { if (adjustmentKeys.has(event.key)) onEnd(); },
            onChange: event => onChange(paramKey, Number(event.target.value)),
            className: 'parameter-range',
        }),
    ] });

export default ShapeParameterControl;
