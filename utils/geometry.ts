
import L from 'leaflet';
import type { Point, CurvePointData, AnchorData, ValidatedCurveData } from '../types';

// Point here refers to our custom {x, y} type. Leaflet's L.Point also has x, y properties.
export function pointSubtract(p1: {x: number, y:number}, p2: {x: number, y:number}): Point { return { x: p1.x - p2.x, y: p1.y - p2.y }; }
export function pointAdd(p1: {x: number, y:number}, p2: {x: number, y:number}): Point { return { x: p1.x + p2.x, y: p1.y + p2.y }; }
export function pointMultiply(p: Point, scalar: number): Point { return { x: p.x * scalar, y: p.y * scalar }; }
export function pointLength(p: Point): number { return Math.sqrt(p.x * p.x + p.y * p.y); }
export function normalize(p: Point): Point { const len = pointLength(p); if (len < 1e-9) return { x: 0, y: 0 }; return { x: p.x / len, y: p.y / len }; }
export function perpendicular(p: Point): Point { return { x: -p.y, y: p.x }; }

export function cubicBezier(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
    const mt = 1 - t;
    return {
        x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
        y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y
    };
}

export function computeCumulativeLengths(points: Point[]): number[] {
    const lengths = [0];
    for (let i = 1; i < points.length; i++) {
        if (points[i] && points[i - 1]) {
            const d = pointLength(pointSubtract(points[i], points[i - 1]));
            lengths.push(lengths[i - 1] + d);
        } else {
            lengths.push(lengths[i - 1]);
        }
    }
    return lengths;
}

export function interpolatePoint(pts: Point[], cumLengths: number[], target: number): Point {
    if (!pts || pts.length === 0) return { x: 0, y: 0 };
    if (target <= 0) return pts[0];
    if (!cumLengths || cumLengths.length === 0 || cumLengths.length !== pts.length) return pts[0];
    if (target >= cumLengths[cumLengths.length - 1]) return pts[pts.length - 1];

    for (let i = 0; i < cumLengths.length - 1; i++) {
        if (cumLengths[i] !== undefined && cumLengths[i + 1] !== undefined && pts[i] && pts[i + 1]) {
            if (cumLengths[i] <= target && cumLengths[i + 1] >= target) {
                const segmentLength = cumLengths[i + 1] - cumLengths[i];
                if (segmentLength < 1e-9) return pts[i];
                const ratio = (target - cumLengths[i]) / segmentLength;
                const p1 = pts[i], p2 = pts[i + 1];
                return { x: p1.x + ratio * (p2.x - p1.x), y: p1.y + ratio * (p2.y - p1.y) };
            }
        }
    }
    return pts[pts.length - 1];
}

export function computeCurvePoints(map: L.Map, currentAnchorsData: AnchorData[]): CurvePointData[] {
    const data: CurvePointData[] = [];
    if (currentAnchorsData.length < 2) return data;

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
            let lastPt: Point | null = null;
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
                data.push({ pt: {x:p3.x, y:p3.y}, segIndex: i - 1 }); // Convert L.Point to our Point
            }
        } catch (error) {
            console.error("Error converting LatLng in computeCurvePoints:", error, "Segment:", i - 1, "Anchors:", a0Data, a1Data, "Handles:", handle1Latlng, handle2Latlng);
            continue;
        }
    }
    return data;
}

export function getValidPointsAndLength(map: L.Map | null, anchorArray: AnchorData[]): ValidatedCurveData {
    if (!map) return { pts: [], totalLength: 0, cumLengths: [], validCurveData: [] };
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


export function calculateArrowOutlinePoints(
    pts: Point[], // These are our Point type
    totalLength: number,
    cumLengths: number[],
    shaftThicknessPx: number,
    arrowHeadLengthPx: number,
    arrowHeadWidthPx: number
): Point[] | null { // Returns our Point type
    if (!pts || pts.length < 2 || totalLength <= 1e-6) { return null; }

    arrowHeadLengthPx = Math.min(arrowHeadLengthPx, totalLength);
    shaftThicknessPx = Math.max(0, shaftThicknessPx);
    arrowHeadWidthPx = Math.max(0, arrowHeadWidthPx);

    const tip = pts[pts.length - 1];
    const headBaseTargetCum = Math.max(0, totalLength - arrowHeadLengthPx);
    let basePt = interpolatePoint(pts, cumLengths, headBaseTargetCum);
    
    let leftBase = basePt, rightBase = basePt;
    let tipTangent: Point = { x: 1, y: 0 };

    const headExists = arrowHeadLengthPx > 1e-6 && arrowHeadWidthPx > 1e-6 && pointLength(pointSubtract(tip, basePt)) > 1e-6;

    if (headExists) {
        const tangentPtBeforeTip = interpolatePoint(pts, cumLengths, Math.max(0, totalLength - 0.1));
        tipTangent = normalize(pointSubtract(tip, tangentPtBeforeTip));
        if (tipTangent.x === 0 && tipTangent.y === 0) {
            let pIdx = pts.length - 2;
            while (pIdx >= 0 && pointLength(pointSubtract(tip, pts[pIdx])) < 1e-6) pIdx--;
            if (pIdx >= 0) tipTangent = normalize(pointSubtract(tip, pts[pIdx]));
            else tipTangent = { x: 1, y: 0 };
        }
        const perp = normalize(perpendicular(tipTangent));
        leftBase = pointAdd(basePt, pointMultiply(perp, arrowHeadWidthPx / 2));
        rightBase = pointSubtract(basePt, pointMultiply(perp, arrowHeadWidthPx / 2));
    } else {
        basePt = tip; leftBase = tip; rightBase = tip; 
        if (pts.length >= 2) {
            let pIdx = pts.length - 2;
            while (pIdx >= 0 && pointLength(pointSubtract(tip, pts[pIdx])) < 1e-6) pIdx--;
            if (pIdx >= 0) tipTangent = normalize(pointSubtract(tip, pts[pIdx]));
            else tipTangent = { x: 1, y: 0 };
        }
    }

    const leftShaft: Point[] = [];
    const rightShaft: Point[] = [];
    const shaftExists = headBaseTargetCum > 1e-6 && shaftThicknessPx > 1e-6;

    if (shaftExists) {
        const shaftPts: Point[] = [];
        for (let i = 0; i < pts.length; i++) {
            if (cumLengths[i] <= headBaseTargetCum + 1e-9) { 
                if (shaftPts.length === 0 || pointLength(pointSubtract(pts[i], shaftPts[shaftPts.length - 1])) > 1e-6) {
                    shaftPts.push(pts[i]);
                }
            } else {
                break;
            }
        }
        const shaftEndBasePt = interpolatePoint(pts, cumLengths, headBaseTargetCum);
        if (shaftPts.length === 0 || pointLength(pointSubtract(shaftEndBasePt, shaftPts[shaftPts.length - 1])) > 1e-6) {
           shaftPts.push(shaftEndBasePt);
        }
        
        if (shaftPts.length >= 2) {
            for (let i = 0; i < shaftPts.length; i++) {
                const p = shaftPts[i];
                let tangent: Point = { x: 1, y: 0 };

                if (i === 0 && shaftPts.length > 1) {
                    let nextIdx = 1;
                    while(nextIdx < shaftPts.length && pointLength(pointSubtract(shaftPts[nextIdx], shaftPts[0])) < 1e-6) nextIdx++;
                    if (nextIdx < shaftPts.length) tangent = normalize(pointSubtract(shaftPts[nextIdx], shaftPts[0]));
                } else if (i === shaftPts.length - 1) { 
                    tangent = tipTangent; 
                     if ((tangent.x === 0 && tangent.y === 0) && i > 0) {
                        let prevIdx = i - 1;
                        while(prevIdx >=0 && pointLength(pointSubtract(shaftPts[i], shaftPts[prevIdx])) < 1e-6) prevIdx--;
                        if(prevIdx >=0) tangent = normalize(pointSubtract(shaftPts[i], shaftPts[prevIdx]));
                     }
                } else {
                    let prevIdx = i - 1;
                    while (prevIdx >= 0 && pointLength(pointSubtract(shaftPts[i], shaftPts[prevIdx])) < 1e-6) prevIdx--;
                    let nextIdx = i + 1;
                    while (nextIdx < shaftPts.length && pointLength(pointSubtract(shaftPts[nextIdx], shaftPts[i])) < 1e-6) nextIdx++;

                    if (prevIdx >= 0 && nextIdx < shaftPts.length) {
                        tangent = normalize(pointSubtract(shaftPts[nextIdx], shaftPts[prevIdx]));
                    } else if (nextIdx < shaftPts.length) {
                        tangent = normalize(pointSubtract(shaftPts[nextIdx], shaftPts[i]));
                    } else if (prevIdx >= 0) {
                        tangent = normalize(pointSubtract(shaftPts[i], shaftPts[prevIdx]));
                    }
                }
                if (tangent.x === 0 && tangent.y === 0) tangent = { x: 1, y: 0 }; 
                const perpT = normalize(perpendicular(tangent));
                leftShaft.push(pointAdd(p, pointMultiply(perpT, shaftThicknessPx / 2)));
                rightShaft.push(pointSubtract(p, pointMultiply(perpT, shaftThicknessPx / 2)));
            }
        }
    }
    
    const mergedOutlinePoints: Point[] = [];
    const MIN_DIST_SQ = 1e-12; 

    function addPointIfNotDuplicate(point: Point) {
        if (!point || !isFinite(point.x) || !isFinite(point.y)) return;
        if (mergedOutlinePoints.length === 0) {
            mergedOutlinePoints.push(point);
        } else {
            const lastPt = mergedOutlinePoints[mergedOutlinePoints.length - 1];
            const dx = point.x - lastPt.x;
            const dy = point.y - lastPt.y;
            if ((dx * dx + dy * dy) > MIN_DIST_SQ) {
                mergedOutlinePoints.push(point);
            }
        }
    }
    
    if (shaftExists && leftShaft.length > 0) {
        for (let i = 0; i < leftShaft.length; i++) {
            addPointIfNotDuplicate(leftShaft[i]);
        }
    }

    if (headExists) {
        addPointIfNotDuplicate(leftBase); 
        addPointIfNotDuplicate(tip);
        addPointIfNotDuplicate(rightBase);
    } else if (!shaftExists) { 
         if (arrowHeadWidthPx > 1e-6 && arrowHeadLengthPx > 1e-6 ) { 
            const p_start = pts[0];
            const p_end = pts[pts.length -1];
            const dir = normalize(pointSubtract(p_end, p_start));
            const perp_dir = perpendicular(dir);
            const triangle_base_center = pointSubtract(p_end, pointMultiply(dir, arrowHeadLengthPx));

            addPointIfNotDuplicate(pointAdd(triangle_base_center, pointMultiply(perp_dir, arrowHeadWidthPx/2)));
            addPointIfNotDuplicate(p_end); 
            addPointIfNotDuplicate(pointSubtract(triangle_base_center, pointMultiply(perp_dir, arrowHeadWidthPx/2)));
        } else {
            return null; 
        }
    }


    if (shaftExists && rightShaft.length > 0) {
        for (let i = rightShaft.length - 1; i >= 0; i--) {
            addPointIfNotDuplicate(rightShaft[i]); 
        }
    }

    if (mergedOutlinePoints.length > 0) {
        const firstPt = mergedOutlinePoints[0];
        addPointIfNotDuplicate(firstPt); 
    }

    if (mergedOutlinePoints.length < 4 && !(headExists && !shaftExists && mergedOutlinePoints.length ===3)) { 
        console.warn("Calculated outline has too few points (< 4):", mergedOutlinePoints.length, mergedOutlinePoints);
         if (headExists && !shaftExists && mergedOutlinePoints.length === 3) {
             if (mergedOutlinePoints.length < 4) {
                console.error("Failed to close triangle outline properly.");
                return null;
             }
         } else if (!headExists && !shaftExists){
             console.warn("No head and no shaft resulted in no points.");
             return null;
         }
          else {
            console.error("Merged outline invalid (< 4 points).");
            return null;
          }
    }
    return mergedOutlinePoints;
}