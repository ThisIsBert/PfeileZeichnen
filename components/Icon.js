import { jsx as _jsx } from 'react/jsx-runtime';

const paths = {
    arrow: 'M4 17 11 10h7M12 4h8v8M4 11V4h6',
    plus: 'M12 5v14M5 12h14',
    undo: 'M9 5 4 10l5 5M4 10h10a6 6 0 0 1 6 6v3',
    redo: 'm15 5 5 5-5 5M20 10H10a6 6 0 0 0-6 6v3',
    copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
    trash: 'M3 6h18M9 6V4h6v2M6 6l1 14h10l1-14M10 10v6M14 10v6',
    pipette: 'm16 3 5 5-3 3-2-2-8 8-4 1 1-4 8-8-2-2 3-3z',
    check: 'm5 12 4 4L19 6',
    close: 'm6 6 12 12M6 18 18 6',
    chevron: 'm6 9 6 6 6-6',
    chevronRight: 'm9 6 6 6-6 6',
    download: 'M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4',
    save: 'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12l4 4v12a2 2 0 0 1-2 2zM7 3v6h10V3M7 21v-8h10v8',
    folder: 'M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z',
    info: 'M12 11v6M12 7h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
    layers: 'm12 3 10 5-10 5L2 8l10-5zM2 12l10 5 10-5M2 16l10 5 10-5',
};

export default function Icon({ name, className = '' }) {
    return _jsx('svg', { className: `icon ${className}`, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true', children: _jsx('path', { d: paths[name] ?? paths.arrow }) });
}
