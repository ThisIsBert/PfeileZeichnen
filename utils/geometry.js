import L from 'leaflet';
// Point here refers to our custom {x, y} type. Leaflet's L.Point also has x, y properties.
export function pointSubtract(p1, p2) { return { x: p1.x - p2.x, y: p1.y - p2.y }; }
export function pointAdd(p1, p2) { return { x: p1.x + p2.x, y: p1.y + p2.y }; }
export function pointMultiply(p, scalar) { return { x: p.x * scalar, y: p.y * scalar }; }
export function pointLength(p) { return Math.sqrt(p.x * p.x + p.y * p.y); }
export function normalize(p) { const len = pointLength(p); if (len < 1e-9)
    return { x: 0, y: 0 }; return { x: p.x / len, y: p.y / len }; }
export function perpendicular(p) { return { x: -p.y, y: p.x }; }
export function cubicBezier(p0, p1, p2, p3, t) {
    const mt = 1 - t;
    return {
        x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
        y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y
    };
}
export function computeCumulativeLengths(points) {
    const lengths = [0];
    for (let i = 1; i < points.length; i++) {
        if (points[i] && points[i - 1]) {
            const d = pointLength(pointSubtract(points[i], points[i - 1]));
            lengths.push(lengths[i - 1] + d);
        }
        else {
            lengths.push(lengths[i - 1]);
        }
    }
    return lengths;
}
export function interpolatePoint(pts, cumLengths, target) {
    if (!pts || pts.length === 0)
        return { x: 0, y: 0 };
    if (target <= 0)
        return pts[0];
    if (!cumLengths || cumLengths.length === 0 || cumLengths.length !== pts.length)
        return pts[0];
    if (target >= cumLengths[cumLengths.length - 1])
        return pts[pts.length - 1];
    for (let i = 0; i < cumLengths.length - 1; i++) {
        if (cumLengths[i] !== undefined && cumLengths[i + 1] !== undefined && pts[i] && pts[i + 1]) {
            if (cumLengths[i] <= target && cumLengths[i + 1] >= target) {
                const segmentLength = cumLengths[i + 1] - cumLengths[i];
                if (segmentLength < 1e-9)
                    return pts[i];
                const ratio = (target - cumLengths[i]) / segmentLength;
                const p1 = pts[i], p2 = pts[i + 1];
                return { x: p1.x + ratio * (p2.x - p1.x), y: p1.y + ratio * (p2.y - p1.y) };
            }
        }
    }
    return pts[pts.length - 1];
}
export function computeCurvePoints(map, currentAnchorsData) {
    const data = [];
    if (currentAnchorsData.length < 2)
        return data;
    for (let i = 1; i < currentAnchorsData.length; i++) {
        const a0Data = currentAnchorsData[i - 1];
        const a1Data = currentAnchorsData[i];
        if (!a0Data || !a1Data || !a0Data.latlng || !a1Data.latlng) {
            console.warn("computeCurvePoints: Skipping segment due to missing anchor or latlng", i - 1, i);
            continue;
        }
        const a0LatLng = L.latLng(a0Data.latlng.lat, a0Data.latlng.lng);
        const a1LatLng = L.latLng(a1Data.latlng.lat, a1Data.latlng.lng);
        const handle1Latlng = a0Data.handle2 ? L.latLng(a0Data.handle2.lat, a0Data.handle2.lng) : a0LatLng;
        const handle2Latlng = a1Data.handle1 ? L.latLng(a1Data.handle1.lat, a1Data.handle1.lng) : a1LatLng;
        try {
            const p0 = map.latLngToLayerPoint(a0LatLng); // L.Point
            const cp1 = map.latLngToLayerPoint(handle1Latlng); // L.Point
            const cp2 = map.latLngToLayerPoint(handle2Latlng); // L.Point
            const p3 = map.latLngToLayerPoint(a1LatLng); // L.Point
            const steps = 50;
            let lastPt = null;
            for (let t = 0; t <= 1.00001; t += 1 / steps) {
                const clampedT = Math.min(t, 1.0);
                // cubicBezier expects our Point type, L.Point has x,y so it's compatible for reading
                const currentPt = cubicBezier(p0, cp1, cp2, p3, clampedT); // Returns our Point type
                if (currentPt && (!lastPt || pointLength(pointSubtract(currentPt, lastPt)) > 1e-6)) {
                    data.push({ pt: currentPt, segIndex: i - 1 });
                    lastPt = currentPt;
                }
            }
            if (p3 && (!lastPt || pointLength(pointSubtract(p3, lastPt)) > 1e-6)) { // p3 is L.Point
                data.push({ pt: { x: p3.x, y: p3.y }, segIndex: i - 1 }); // Convert L.Point to our Point
            }
        }
        catch (error) {
            console.error("Error converting LatLng in computeCurvePoints:", error, "Segment:", i - 1, "Anchors:", a0Data, a1Data, "Handles:", handle1Latlng, handle2Latlng);
            continue;
        }
    }
    return data;
}
export function getValidPointsAndLength(map, anchorArray) {
    if (!map)
        return { pts: [], totalLength: 0, cumLengths: [], validCurveData: [] };
    const curveData = computeCurvePoints(map, anchorArray);
    const validCurveData = curveData.filter(d => d && d.pt && isFinite(d.pt.x) && isFinite(d.pt.y) && typeof d.segIndex === 'number');
    if (validCurveData.length < 2) {
        return { pts: [], totalLength: 0, cumLengths: [], validCurveData: [] };
    }
    const pts = validCurveData.map(d => d.pt);
    const cumLengths = computeCumulativeLengths(pts);
    const totalLength = cumLengths.length > 0 ? cumLengths[cumLengths.length - 1] : 0;
    return { pts, totalLength, cumLengths, validCurveData };
}
export function calculateArrowOutlinePoints(pts, totalLength, cumLengths, rearWidthPx, neckWidthPx, headWidthPx, headLengthPx) {
    if (!pts || pts.length < 2 || totalLength <= 1e-6) {
        return null;
    }
    rearWidthPx = Math.max(0, rearWidthPx);
    neckWidthPx = Math.max(0, neckWidthPx);
    headWidthPx = Math.max(0, headWidthPx);
    headLengthPx = Math.max(0, Math.min(headLengthPx, totalLength));
    const tip = pts[pts.length - 1];
    const neckTargetCum = Math.max(0, totalLength - headLengthPx);
    const neckPoint = interpolatePoint(pts, cumLengths, neckTargetCum);
    let tipTangent = { x: 1, y: 0 };
    for (let pIdx = pts.length - 2; pIdx >= 0; pIdx--) {
        const diff = pointSubtract(tip, pts[pIdx]);
        if (pointLength(diff) > 1e-6) {
            tipTangent = normalize(diff);
            break;
        }
    }
    if (tipTangent.x === 0 && tipTangent.y === 0) {
        tipTangent = { x: 1, y: 0 };
    }
    const neckPerp = normalize(perpendicular(tipTangent));
    const leftHeadBase = pointAdd(neckPoint, pointMultiply(neckPerp, headWidthPx / 2));
    const rightHeadBase = pointSubtract(neckPoint, pointMultiply(neckPerp, headWidthPx / 2));
    const leftShaft = [];
    const rightShaft = [];
    const shaftPoints = [];
    for (let i = 0; i < pts.length; i++) {
        if (cumLengths[i] <= neckTargetCum + 1e-9) {
            if (shaftPoints.length === 0 || pointLength(pointSubtract(pts[i], shaftPoints[shaftPoints.length - 1])) > 1e-6) {
                shaftPoints.push(pts[i]);
            }
        }
        else {
            break;
        }
    }
    if (shaftPoints.length === 0 || pointLength(pointSubtract(neckPoint, shaftPoints[shaftPoints.length - 1])) > 1e-6) {
        shaftPoints.push(neckPoint);
    }
    if (shaftPoints.length < 2) {
        shaftPoints.unshift(pts[0]);
    }
    const shaftCumLengths = computeCumulativeLengths(shaftPoints);
    const neckLength = Math.max(shaftCumLengths[shaftCumLengths.length - 1] ?? neckTargetCum, 1e-6);
    for (let i = 0; i < shaftPoints.length; i++) {
        const p = shaftPoints[i];
        let tangent = { ...tipTangent };
        if (i === 0 && shaftPoints.length > 1) {
            tangent = normalize(pointSubtract(shaftPoints[1], shaftPoints[0]));
        }
        else if (i > 0 && i < shaftPoints.length - 1) {
            tangent = normalize(pointSubtract(shaftPoints[i + 1], shaftPoints[i - 1]));
        }
        else if (i > 0) {
            tangent = normalize(pointSubtract(shaftPoints[i], shaftPoints[i - 1]));
        }
        if (tangent.x === 0 && tangent.y === 0) {
            tangent = { x: 1, y: 0 };
        }
        const perpT = normalize(perpendicular(tangent));
        const shaftS = Math.min(neckLength, Math.max(0, shaftCumLengths[i] ?? 0));
        const t = neckLength > 1e-6 ? shaftS / neckLength : 1;
        const halfWidth = ((rearWidthPx + (neckWidthPx - rearWidthPx) * t) / 2);
        leftShaft.push(pointAdd(p, pointMultiply(perpT, halfWidth)));
        rightShaft.push(pointSubtract(p, pointMultiply(perpT, halfWidth)));
    }
    const mergedOutlinePoints = [];
    const MIN_DIST_SQ = 1e-12;
    function addPointIfNotDuplicate(point) {
        if (!point || !isFinite(point.x) || !isFinite(point.y))
            return;
        if (mergedOutlinePoints.length === 0) {
            mergedOutlinePoints.push(point);
            return;
        }
        const lastPt = mergedOutlinePoints[mergedOutlinePoints.length - 1];
        const dx = point.x - lastPt.x;
        const dy = point.y - lastPt.y;
        if ((dx * dx + dy * dy) > MIN_DIST_SQ) {
            mergedOutlinePoints.push(point);
        }
    }
    for (let i = 0; i < leftShaft.length; i++) {
        addPointIfNotDuplicate(leftShaft[i]);
    }
    addPointIfNotDuplicate(leftHeadBase);
    addPointIfNotDuplicate(tip);
    addPointIfNotDuplicate(rightHeadBase);
    for (let i = rightShaft.length - 1; i >= 0; i--) {
        addPointIfNotDuplicate(rightShaft[i]);
    }
    if (mergedOutlinePoints.length > 0) {
        addPointIfNotDuplicate(mergedOutlinePoints[0]);
    }
    if (mergedOutlinePoints.length < 4) {
        return null;
    }
    return mergedOutlinePoints;
}
