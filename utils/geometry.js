import L from 'leaflet';
// Point here refers to our custom {x, y} type. Leaflet's L.Point also has x, y properties.
export function pointSubtract(p1, p2) { return { x: p1.x - p2.x, y: p1.y - p2.y }; }
export function pointAdd(p1, p2) { return { x: p1.x + p2.x, y: p1.y + p2.y }; }
export function pointMultiply(p, scalar) { return { x: p.x * scalar, y: p.y * scalar }; }
export function pointLength(p) { return Math.sqrt(p.x * p.x + p.y * p.y); }
export function normalize(p) { const len = pointLength(p); if (len < 1e-9)
    return { x: 0, y: 0 }; return { x: p.x / len, y: p.y / len }; }
export function perpendicular(p) { return { x: -p.y, y: p.x }; }

const DEBUG_CENTERLINE_GEOMETRY = false;
function debugCenterlineStation(label, station) {
    if (!DEBUG_CENTERLINE_GEOMETRY || !station)
        return;
    console.debug(`[centerline] ${label}`, {
        s: station.s,
        segIndex: station.segIndex,
        t: station.t,
        tangent: station.tangent,
        normal: station.normal,
    });
}
export function cubicBezier(p0, p1, p2, p3, t) {
    const mt = 1 - t;
    return {
        x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
        y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y
    };
}
export function cubicBezierDerivative(p0, p1, p2, p3, t) {
    const mt = 1 - t;
    return {
        x: 3 * mt * mt * (p1.x - p0.x) + 6 * mt * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x),
        y: 3 * mt * mt * (p1.y - p0.y) + 6 * mt * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y),
    };
}
function cubicFlatness(p0, p1, p2, p3) {
    const chord = pointSubtract(p3, p0);
    const chordLen = Math.max(pointLength(chord), 1e-9);
    const distanceToChord = (pt) => Math.abs((pt.x - p0.x) * chord.y - (pt.y - p0.y) * chord.x) / chordLen;
    return Math.max(distanceToChord(p1), distanceToChord(p2));
}
function adaptiveCubicTValues(p0, p1, p2, p3, tolerance = 1.25, maxDepth = 10) {
    const ts = [0, 1];
    function subdivide(a, b, c, d, t0, t1, depth) {
        if (depth >= maxDepth || cubicFlatness(a, b, c, d) <= tolerance) {
            return;
        }
        const tMid = (t0 + t1) * 0.5;
        const ab = pointMultiply(pointAdd(a, b), 0.5);
        const bc = pointMultiply(pointAdd(b, c), 0.5);
        const cd = pointMultiply(pointAdd(c, d), 0.5);
        const abc = pointMultiply(pointAdd(ab, bc), 0.5);
        const bcd = pointMultiply(pointAdd(bc, cd), 0.5);
        const abcd = pointMultiply(pointAdd(abc, bcd), 0.5);
        ts.push(tMid);
        subdivide(a, ab, abc, abcd, t0, tMid, depth + 1);
        subdivide(abcd, bcd, cd, d, tMid, t1, depth + 1);
    }
    subdivide(p0, p1, p2, p3, 0, 1, 0);
    return Array.from(new Set(ts)).sort((a, b) => a - b);
}
function findByDistance(samples, s) {
    let lo = 0;
    let hi = samples.length - 1;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (samples[mid].s < s) {
            lo = mid + 1;
        }
        else {
            hi = mid;
        }
    }
    return lo;
}
function tangentWithFallback(segment, t, nearestSampleA, nearestSampleB) {
    const derivative = cubicBezierDerivative(segment.p0, segment.cp1, segment.cp2, segment.p3, t);
    if (pointLength(derivative) > 1e-9) {
        return normalize(derivative);
    }
    const eps = 1e-3;
    const t0 = Math.max(0, t - eps);
    const t1 = Math.min(1, t + eps);
    if (t1 > t0) {
        const p0 = cubicBezier(segment.p0, segment.cp1, segment.cp2, segment.p3, t0);
        const p1 = cubicBezier(segment.p0, segment.cp1, segment.cp2, segment.p3, t1);
        const d = pointSubtract(p1, p0);
        if (pointLength(d) > 1e-9) {
            return normalize(d);
        }
    }
    if (nearestSampleA && nearestSampleB) {
        const chord = pointSubtract(nearestSampleB.pt, nearestSampleA.pt);
        const chordLength = pointLength(chord);
        if (chordLength > 1e-9) {
            return normalize(chord);
        }
        if (chordLength <= 1e-6) {
            return null;
        }
    }
    return { x: 1, y: 0 };
}
function stableNormalFromTangent(tangent, referenceNormal) {
    let normal = normalize(perpendicular(tangent));
    if (normal.x === 0 && normal.y === 0) {
        normal = referenceNormal ?? { x: 0, y: 1 };
    }
    if (referenceNormal && ((normal.x * referenceNormal.x) + (normal.y * referenceNormal.y)) < 0) {
        normal = pointMultiply(normal, -1);
    }
    return normal;
}
export function sampleCenterlineAtDistance(centerline, s) {
    if (!centerline || !centerline.samples || centerline.samples.length === 0) {
        return null;
    }
    const totalLength = centerline.totalLength;
    const clampedS = Math.max(0, Math.min(s, totalLength));
    const samples = centerline.samples;
    const upperIdx = findByDistance(samples, clampedS);
    const lowerIdx = Math.max(0, upperIdx - 1);
    const lower = samples[lowerIdx];
    const upper = samples[Math.min(samples.length - 1, upperIdx)];
    let segment = centerline.segments[upper.segIndex] ?? centerline.segments[lower.segIndex];
    if (!segment) {
        return null;
    }
    let t = upper.t;
    if (upper.s > lower.s + 1e-9 && lower.segIndex === upper.segIndex) {
        const ratio = (clampedS - lower.s) / (upper.s - lower.s);
        t = lower.t + (upper.t - lower.t) * ratio;
        segment = centerline.segments[lower.segIndex] ?? segment;
    }
    else if (Math.abs(clampedS - lower.s) < Math.abs(upper.s - clampedS)) {
        t = lower.t;
        segment = centerline.segments[lower.segIndex] ?? segment;
    }
    const pt = cubicBezier(segment.p0, segment.cp1, segment.cp2, segment.p3, t);
    const sampledTangent = tangentWithFallback(segment, t, lower, upper);
    const reference = Math.abs(clampedS - lower.s) <= Math.abs(upper.s - clampedS) ? lower.normal : upper.normal;
    const tangent = sampledTangent ?? (reference && pointLength(reference) > 1e-9 ? normalize(perpendicular(reference)) : { x: 1, y: 0 });
    const normal = sampledTangent ? stableNormalFromTangent(tangent, reference) : (reference ?? { x: 0, y: 1 });
    const station = { s: clampedS, pt, tangent, normal, segIndex: segment.index, t };
    debugCenterlineStation('sample', station);
    return station;
}
export function buildArrowCenterline(map, currentAnchorsData) {
    const segments = [];
    const samples = [];
    if (!map || !currentAnchorsData || currentAnchorsData.length < 2) {
        return { segments, samples, points: [], cumLengths: [], totalLength: 0, validCurveData: [] };
    }
    for (let i = 1; i < currentAnchorsData.length; i++) {
        const a0Data = currentAnchorsData[i - 1];
        const a1Data = currentAnchorsData[i];
        if (!a0Data?.latlng || !a1Data?.latlng)
            continue;
        const p0 = map.latLngToLayerPoint(L.latLng(a0Data.latlng.lat, a0Data.latlng.lng));
        const cp1 = map.latLngToLayerPoint(a0Data.handle2 ? L.latLng(a0Data.handle2.lat, a0Data.handle2.lng) : L.latLng(a0Data.latlng.lat, a0Data.latlng.lng));
        const cp2 = map.latLngToLayerPoint(a1Data.handle1 ? L.latLng(a1Data.handle1.lat, a1Data.handle1.lng) : L.latLng(a1Data.latlng.lat, a1Data.latlng.lng));
        const p3 = map.latLngToLayerPoint(L.latLng(a1Data.latlng.lat, a1Data.latlng.lng));
        segments.push({ index: i - 1, p0, cp1, cp2, p3 });
    }
    let s = 0;
    let prevSample = null;
    let prevNormal = null;
    for (const segment of segments) {
        const ts = adaptiveCubicTValues(segment.p0, segment.cp1, segment.cp2, segment.p3);
        for (let idx = 0; idx < ts.length; idx++) {
            const t = ts[idx];
            if (samples.length > 0 && idx === 0)
                continue;
            const pt = cubicBezier(segment.p0, segment.cp1, segment.cp2, segment.p3, t);
            if (prevSample) {
                s += pointLength(pointSubtract(pt, prevSample.pt));
            }
            const tangent = tangentWithFallback(segment, t, prevSample, null);
            const normal = stableNormalFromTangent(tangent, prevNormal);
            const sample = { segIndex: segment.index, t, s, pt, tangent, normal };
            samples.push(sample);
            prevSample = sample;
            prevNormal = normal;
        }
    }
    const points = samples.map(sample => sample.pt);
    const cumLengths = samples.map(sample => sample.s);
    const validCurveData = samples.map(sample => ({ pt: sample.pt, segIndex: sample.segIndex }));
    return { segments, samples, points, cumLengths, totalLength: samples.length > 0 ? samples[samples.length - 1].s : 0, validCurveData };
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
        return { pts: [], totalLength: 0, cumLengths: [], validCurveData: [], centerline: null };
    const centerline = buildArrowCenterline(map, anchorArray);
    if (centerline.points.length < 2 || centerline.totalLength <= 1e-9) {
        return { pts: [], totalLength: 0, cumLengths: [], validCurveData: [], centerline: null };
    }
    return {
        pts: centerline.points,
        totalLength: centerline.totalLength,
        cumLengths: centerline.cumLengths,
        validCurveData: centerline.validCurveData,
        centerline,
    };
}
function toLegacyCenterline(pts, totalLength, cumLengths) {
    if (!Array.isArray(pts) || pts.length < 2) {
        return null;
    }
    const lengths = Array.isArray(cumLengths) && cumLengths.length === pts.length
        ? cumLengths
        : computeCumulativeLengths(pts);
    const inferredTotalLength = Number.isFinite(totalLength) ? totalLength : lengths[lengths.length - 1];
    const samples = [];
    let prevNormal = null;
    for (let i = 0; i < pts.length; i++) {
        const curr = pts[i];
        const prev = i > 0 ? pts[i - 1] : null;
        const next = i < pts.length - 1 ? pts[i + 1] : null;
        const tangentVec = next && prev
            ? pointSubtract(next, prev)
            : next
                ? pointSubtract(next, curr)
                : prev
                    ? pointSubtract(curr, prev)
                    : { x: 1, y: 0 };
        const tangent = pointLength(tangentVec) > 1e-9 ? normalize(tangentVec) : { x: 1, y: 0 };
        const normal = stableNormalFromTangent(tangent, prevNormal);
        const sample = {
            segIndex: Math.max(0, Math.min(i, pts.length - 2)),
            t: i,
            s: lengths[i] ?? 0,
            pt: curr,
            tangent,
            normal,
        };
        samples.push(sample);
        prevNormal = normal;
    }
    return {
        segments: [],
        samples,
        points: pts,
        cumLengths: lengths,
        totalLength: Math.max(inferredTotalLength, lengths[lengths.length - 1] ?? 0),
        validCurveData: samples.map(sample => ({ pt: sample.pt, segIndex: sample.segIndex })),
    };
}
export function calculateArrowOutlinePoints(centerlineOrPts, rearWidthPx, neckWidthPx, headWidthPx, headLengthPx, legacyHeadWidthPx, legacyHeadLengthPx) {
    let centerline = centerlineOrPts;
    if (Array.isArray(centerlineOrPts)) {
        centerline = toLegacyCenterline(centerlineOrPts, rearWidthPx, neckWidthPx);
        rearWidthPx = headWidthPx;
        neckWidthPx = headLengthPx;
        headWidthPx = legacyHeadWidthPx;
        headLengthPx = legacyHeadLengthPx;
    }
    if (!centerline || centerline.points.length < 2 || centerline.totalLength <= 1e-6) {
        return null;
    }
    const { points: pts, totalLength } = centerline;
    rearWidthPx = Math.max(0, rearWidthPx);
    neckWidthPx = Math.max(0, neckWidthPx);
    headWidthPx = Math.max(0, headWidthPx);
    headLengthPx = Math.max(0, Math.min(headLengthPx, totalLength));
    const tipStation = sampleCenterlineAtDistance(centerline, totalLength);
    const tip = tipStation?.pt ?? pts[pts.length - 1];
    const neckTargetCum = Math.max(0, totalLength - headLengthPx);
    const neckStation = sampleCenterlineAtDistance(centerline, neckTargetCum);
    const neckPoint = neckStation?.pt ?? pts[pts.length - 1];
    const neckPerp = neckStation?.normal ?? { x: 0, y: 1 };
    const leftHeadBase = pointAdd(neckPoint, pointMultiply(neckPerp, headWidthPx / 2));
    const rightHeadBase = pointSubtract(neckPoint, pointMultiply(neckPerp, headWidthPx / 2));
    const leftShaft = [];
    const rightShaft = [];
    const shaftSamples = centerline.samples.filter(sample => sample.s <= neckTargetCum + 1e-9);
    if (shaftSamples.length === 0 || Math.abs(shaftSamples[shaftSamples.length - 1].s - neckTargetCum) > 1e-6) {
        const neckSample = sampleCenterlineAtDistance(centerline, neckTargetCum);
        if (neckSample)
            shaftSamples.push(neckSample);
    }
    if (shaftSamples.length < 2) {
        const tipSample = sampleCenterlineAtDistance(centerline, totalLength);
        if (tipSample)
            shaftSamples.push(tipSample);
    }
    const neckLength = Math.max(neckTargetCum, 1e-6);
    for (let i = 0; i < shaftSamples.length; i++) {
        const sample = shaftSamples[i];
        const p = sample.pt;
        const perpT = sample.normal;
        const t = neckLength > 1e-6 ? Math.min(1, Math.max(0, sample.s / neckLength)) : 1;
        const halfWidth = ((rearWidthPx + (neckWidthPx - rearWidthPx) * t) / 2);
        leftShaft.push(pointAdd(p, pointMultiply(perpT, halfWidth)));
        rightShaft.push(pointSubtract(p, pointMultiply(perpT, halfWidth)));
    }
    if (leftShaft.length > 0 && rightShaft.length > 0) {
        const neckHalf = neckWidthPx / 2;
        leftShaft[leftShaft.length - 1] = pointAdd(neckPoint, pointMultiply(neckPerp, neckHalf));
        rightShaft[rightShaft.length - 1] = pointSubtract(neckPoint, pointMultiply(neckPerp, neckHalf));
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
