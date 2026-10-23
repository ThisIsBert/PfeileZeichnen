import ClipperLib from 'clipper-lib';
// Point here refers to our custom {x, y} type. Leaflet's L.Point also has x, y properties.
export function pointSubtract(p1, p2) { return { x: p1.x - p2.x, y: p1.y - p2.y }; }
export function pointAdd(p1, p2) { return { x: p1.x + p2.x, y: p1.y + p2.y }; }
export function pointMultiply(p, scalar) { return { x: p.x * scalar, y: p.y * scalar }; }
export function pointLength(p) { return Math.sqrt(p.x * p.x + p.y * p.y); }
export function normalize(p) { const len = pointLength(p); if (len < 1e-9)
    return { x: 0, y: 0 }; return { x: p.x / len, y: p.y / len }; }
export function perpendicular(p) { return { x: -p.y, y: p.x }; }

const DEBUG_CENTERLINE_GEOMETRY = false;
const DERIVATIVE_ENTER_THRESHOLD = 1e-7;
const DERIVATIVE_EXIT_THRESHOLD = 5e-8;

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
function debugCenterlineFallback(label, payload) {
    if (!DEBUG_CENTERLINE_GEOMETRY)
        return;
    console.debug(`[centerline:fallback] ${label}`, payload);
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
function densifyTValues(ts, maxDeltaT = 1 / 24) {
    if (!Array.isArray(ts) || ts.length === 0) {
        return [0, 1];
    }
    const sorted = Array.from(new Set(ts)).sort((a, b) => a - b);
    const dense = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const next = sorted[i];
        const dt = next - prev;
        if (dt > maxDeltaT) {
            const insertCount = Math.floor(dt / maxDeltaT);
            for (let j = 1; j <= insertCount; j++) {
                dense.push(prev + (dt * j) / (insertCount + 1));
            }
        }
        dense.push(next);
    }
    return dense;
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
function tangentWithFallback(segment, t, nearestSampleA, nearestSampleB, context = null) {
    const preferDerivative = context?.lastMode === 'derivative';
    const directDerivative = cubicBezierDerivative(segment.p0, segment.cp1, segment.cp2, segment.p3, t);
    const directMag = pointLength(directDerivative);
    const directThreshold = preferDerivative ? DERIVATIVE_EXIT_THRESHOLD : DERIVATIVE_ENTER_THRESHOLD;
    if (directMag > directThreshold) {
        return { tangent: normalize(directDerivative), mode: 'derivative' };
    }
    const adaptiveEps = [1e-4, 5e-4, 1e-3, 5e-3, 1e-2];
    for (const eps of adaptiveEps) {
        const t0 = Math.max(0, t - eps);
        const t1 = Math.min(1, t + eps);
        if (t1 <= t0)
            continue;
        const p0 = cubicBezier(segment.p0, segment.cp1, segment.cp2, segment.p3, t0);
        const p1 = cubicBezier(segment.p0, segment.cp1, segment.cp2, segment.p3, t1);
        const d = pointSubtract(p1, p0);
        const scaledMag = pointLength(d) / Math.max(1e-9, (t1 - t0));
        const finiteDiffThreshold = preferDerivative ? DERIVATIVE_EXIT_THRESHOLD : DERIVATIVE_ENTER_THRESHOLD;
        if (scaledMag > finiteDiffThreshold) {
            debugCenterlineFallback('finite-diff-derivative', { segIndex: segment.index, t, eps, scaledMag });
            return { tangent: normalize(d), mode: 'derivative' };
        }
    }
    if (nearestSampleA && nearestSampleB) {
        const chord = pointSubtract(nearestSampleB.pt, nearestSampleA.pt);
        const chordLength = pointLength(chord);
        if (chordLength > 1e-9) {
            debugCenterlineFallback('sample-chord', { segIndex: segment.index, t, chordLength });
            return { tangent: normalize(chord), mode: 'chord' };
        }
        if (chordLength <= 1e-6) {
            debugCenterlineFallback('degenerate-chord', { segIndex: segment.index, t, chordLength });
            return { tangent: null, mode: 'none' };
        }
    }
    debugCenterlineFallback('no-valid-tangent', { segIndex: segment.index, t });
    return { tangent: null, mode: 'none' };
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
export function sampleCenterlineAtDistance(centerline, s, stationContext = null) {
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
    // At a segment boundary, the lower sample can belong to the previous
    // cubic. Its endpoint is t=0 on the next cubic; never snap to a junction.
    const segment = centerline.segments[upper.segIndex];
    if (!segment) {
        const ratio = upper.s > lower.s ? (clampedS - lower.s) / (upper.s - lower.s) : 0;
        const pt = pointAdd(lower.pt, pointMultiply(pointSubtract(upper.pt, lower.pt), ratio));
        const tangent = normalize(pointSubtract(upper.pt, lower.pt));
        return { ...upper, s: clampedS, pt, tangent, normal: perpendicular(tangent) };
    }
    const ratio = upper.s > lower.s + 1e-9 ? (clampedS - lower.s) / (upper.s - lower.s) : 1;
    const lowerT = lower.segIndex === upper.segIndex ? lower.t : 0;
    const t = lowerT + (upper.t - lowerT) * ratio;
    const sampledTangentResult = tangentWithFallback(segment, t, lower, upper, stationContext);
    const pt = cubicBezier(segment.p0, segment.cp1, segment.cp2, segment.p3, t);
    const sampledTangent = sampledTangentResult?.tangent ?? null;
    const reference = Math.abs(clampedS - lower.s) <= Math.abs(upper.s - clampedS) ? lower.normal : upper.normal;
    const lastKnownTangent = stationContext?.lastValidTangent;
    const lastKnownNormal = stationContext?.lastValidNormal;
    const tangent = sampledTangent
        ?? lastKnownTangent
        ?? (reference && pointLength(reference) > 1e-9 ? normalize(perpendicular(reference)) : { x: 1, y: 0 });
    const normal = sampledTangent
        ? stableNormalFromTangent(tangent, reference ?? lastKnownNormal)
        : (lastKnownNormal ?? reference ?? { x: 0, y: 1 });
    if (stationContext) {
        if (sampledTangent && pointLength(sampledTangent) > 1e-9) {
            stationContext.lastValidTangent = tangent;
            stationContext.lastValidNormal = normal;
        }
        stationContext.lastMode = sampledTangentResult?.mode ?? 'none';
    }
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
        const p0 = map.latLngToLayerPoint({ lat: a0Data.latlng.lat, lng: a0Data.latlng.lng });
        const cp1 = map.latLngToLayerPoint(a0Data.handle2 ? { lat: a0Data.handle2.lat, lng: a0Data.handle2.lng } : { lat: a0Data.latlng.lat, lng: a0Data.latlng.lng });
        const cp2 = map.latLngToLayerPoint(a1Data.handle1 ? { lat: a1Data.handle1.lat, lng: a1Data.handle1.lng } : { lat: a1Data.latlng.lat, lng: a1Data.latlng.lng });
        const p3 = map.latLngToLayerPoint({ lat: a1Data.latlng.lat, lng: a1Data.latlng.lng });
        segments.push({ index: segments.length, anchorIndex: i - 1, p0, cp1, cp2, p3 });
    }
    let s = 0;
    let prevSample = null;
    let prevNormal = null;
    for (const segment of segments) {
        const ts = densifyTValues(adaptiveCubicTValues(segment.p0, segment.cp1, segment.cp2, segment.p3));
        for (let idx = 0; idx < ts.length; idx++) {
            const t = ts[idx];
            const pt = cubicBezier(segment.p0, segment.cp1, segment.cp2, segment.p3, t);
            if (prevSample) {
                s += pointLength(pointSubtract(pt, prevSample.pt));
            }
            const tangentResult = tangentWithFallback(segment, t, prevSample, null);
            const tangent = tangentResult?.tangent ?? { x: 1, y: 0 };
            const normal = stableNormalFromTangent(tangent, prevNormal);
            const sample = { segIndex: segment.index, t, s, pt, tangent, normal };
            samples.push(sample);
            prevSample = sample;
            prevNormal = normal;
        }
    }
    const points = samples.map(sample => sample.pt);
    const cumLengths = samples.map(sample => sample.s);
    const validCurveData = samples.map(sample => ({ pt: sample.pt, segIndex: segments[sample.segIndex].anchorIndex }));
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
        const a0LatLng = { lat: a0Data.latlng.lat, lng: a0Data.latlng.lng };
        const a1LatLng = { lat: a1Data.latlng.lat, lng: a1Data.latlng.lng };
        const handle1Latlng = a0Data.handle2 ? { lat: a0Data.handle2.lat, lng: a0Data.handle2.lng } : a0LatLng;
        const handle2Latlng = a1Data.handle1 ? { lat: a1Data.handle1.lat, lng: a1Data.handle1.lng } : a1LatLng;
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
/**
 * Sweep tapered strips along the centerline, with round joins at bends.
 * Union removes overlaps at tight turns and crossings, preserving any holes.
 * Returns MultiPolygon-shaped arrays of polygons, rings and {x, y} points.
 * The preview, saved arrows and GeoJSON all use this same geometry.
 */
export function calculateArrowOutlinePolygons(centerline, rearWidthPx, neckWidthPx, headWidthPx, headLengthPx) {
    if (!centerline || centerline.points.length < 2 || centerline.totalLength <= 1e-6) {
        return null;
    }
    const safeWidth = value => Number.isFinite(value) ? Math.max(0, value) : 0;
    rearWidthPx = safeWidth(rearWidthPx);
    neckWidthPx = safeWidth(neckWidthPx);
    headWidthPx = safeWidth(headWidthPx);
    const totalLength = centerline.totalLength;
    headLengthPx = Math.min(safeWidth(headLengthPx), totalLength);
    const neckS = totalLength - headLengthPx;
    const pieces = [];
    const addPiece = points => {
        // Integer coordinates make unions stable at shared and nearly collinear
        // edges. 1/1024 px is well below the precision needed for map display.
        const path = points.map(p => ({ X: Math.round(p.x * 1024), Y: Math.round(p.y * 1024) }));
        if (!ClipperLib.Clipper.Orientation(path))
            path.reverse();
        pieces.push(path);
    };
    const sweep = (startS, endS, startWidth, endWidth) => {
        if (endS - startS <= 1e-6 || Math.max(startWidth, endWidth) <= 1e-6)
            return;
        const stations = [sampleCenterlineAtDistance(centerline, startS),
            ...centerline.samples.filter(sample => sample.s > startS && sample.s < endS),
            sampleCenterlineAtDistance(centerline, endS)];
        const path = [];
        for (const station of stations) {
            if (station && (!path.length || pointLength(pointSubtract(station.pt, path[path.length - 1].pt)) > 1e-6)) {
                // Straight cubic samples need only their endpoints. Removing
                // collinear stations avoids tiny slivers at shared strip edges.
                while (path.length >= 2) {
                    const a = path[path.length - 2].pt;
                    const b = path[path.length - 1].pt;
                    const ab = pointSubtract(b, a);
                    const bc = pointSubtract(station.pt, b);
                    const cross = ab.x * bc.y - ab.y * bc.x;
                    if (Math.abs(cross) > 1e-7 * Math.max(1, pointLength(ab) + pointLength(bc)) || ab.x * bc.x + ab.y * bc.y < 0)
                        break;
                    path.pop();
                }
                path.push(station);
            }
        }
        const halfWidth = station => (startWidth + (endWidth - startWidth) * ((station.s - startS) / (endS - startS))) / 2;
        let previousNormal = null;
        for (let i = 1; i < path.length; i++) {
            const a = path[i - 1];
            const b = path[i];
            const tangent = normalize(pointSubtract(b.pt, a.pt));
            const normal = perpendicular(tangent);
            // Overlap joins by eight grid units so rounding cannot create
            // hairline gaps or internal borders between consecutive strips.
            const start = a.s > 0 ? pointSubtract(a.pt, pointMultiply(tangent, 1 / 128)) : a.pt;
            const end = b.s < totalLength ? pointAdd(b.pt, pointMultiply(tangent, 1 / 128)) : b.pt;
            const rA = halfWidth(a);
            const rB = halfWidth(b);
            addPiece([
                pointAdd(start, pointMultiply(normal, rA)),
                pointAdd(end, pointMultiply(normal, rB)),
                pointSubtract(end, pointMultiply(normal, rB)),
                pointSubtract(start, pointMultiply(normal, rA)),
            ]);
            if (previousNormal && rA > 1e-6) {
                const cross = previousNormal.x * normal.y - previousNormal.y * normal.x;
                const dot = previousNormal.x * normal.x + previousNormal.y * normal.y;
                const turn = Math.atan2(cross, dot);
                if (Math.abs(turn) > 1e-9) {
                    const side = turn > 0 ? -1 : 1;
                    const angle = Math.atan2(previousNormal.y * side, previousNormal.x * side);
                    const steps = Math.max(1, Math.ceil(Math.abs(turn) / (Math.PI / 12)));
                    const join = [a.pt];
                    for (let step = 0; step <= steps; step++) {
                        const theta = angle + turn * step / steps;
                        join.push(pointAdd(a.pt, { x: Math.cos(theta) * rA, y: Math.sin(theta) * rA }));
                    }
                    addPiece(join);
                }
            }
            previousNormal = normal;
        }
    };
    sweep(0, neckS, rearWidthPx, neckWidthPx);
    // The head follows the last part of the curve, including bends in it.
    sweep(neckS, totalLength, headWidthPx, 0);
    if (!pieces.length)
        return null;
    const clipper = new ClipperLib.Clipper();
    clipper.AddPaths(pieces, ClipperLib.PolyType.ptSubject, true);
    const tree = new ClipperLib.PolyTree();
    clipper.Execute(ClipperLib.ClipType.ctUnion, tree, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
    const toRing = path => {
        const ring = ClipperLib.Clipper.CleanPolygon(path, 2).map(p => ({ x: p.X / 1024, y: p.Y / 1024 }));
        if (ring.length < 3)
            return [];
        ring.push({ ...ring[0] });
        return ring;
    };
    const polygons = ClipperLib.JS.PolyTreeToExPolygons(tree).map(polygon => {
        const outer = toRing(polygon.outer);
        return outer.length ? [outer, ...polygon.holes.map(toRing).filter(ring => ring.length)] : null;
    }).filter(Boolean);
    return polygons.length ? polygons : null;
}

// Retain the old single-ring API for callers using the legacy point-array form.
export function calculateArrowOutlinePoints(centerlineOrPts, rearWidthPx, neckWidthPx, headWidthPx, headLengthPx, legacyHeadWidthPx, legacyHeadLengthPx) {
    let centerline = centerlineOrPts;
    if (Array.isArray(centerlineOrPts)) {
        centerline = toLegacyCenterline(centerlineOrPts, rearWidthPx, neckWidthPx);
        rearWidthPx = headWidthPx;
        neckWidthPx = headLengthPx;
        headWidthPx = legacyHeadWidthPx;
        headLengthPx = legacyHeadLengthPx;
    }
    return calculateArrowOutlinePolygons(centerline, rearWidthPx, neckWidthPx, headWidthPx, headLengthPx)?.[0]?.[0] ?? null;
}
