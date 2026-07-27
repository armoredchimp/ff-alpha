// $lib/utils/ratingColor.ts
// Post-match player ring colour from Sportmonks match rating.
// Collapses 1-2 fixtures via the sim's favored weighting, then maps to a
// red(low) -> neutral -> blue(high) ramp, desaturated for low minutes.

const NEUTRAL = 6.0;   // baseline average rating
const RED_AT = 5.5;    // at/below -> full red
const BLUE_AT = 7.0;   // at/above -> clearly blue
const SATURATE_AT = 8.5; // full saturation
const MIN_MINUTES = 20;  // below this, desaturate (low confidence)

export interface RatingResult {
    color: string;
    rating: number | null;   // collapsed rating, null if did-not-play
    didNotPlay: boolean;
}

interface FixtureRow {
    rating?: number | null;
    minutes_played?: number | null;
    fixture_id: number;
}

// Weighted collapse of 1-2 fixtures. Favored fixture (human explicit pick)
// weighted 0.75/0.25; otherwise even. AI/skip pass favoredFixtureId null -> even.
function collapseRating(
    rows: FixtureRow[],
    favoredFixtureId: number | null
): { rating: number | null; minutes: number } {
    const rated = rows.filter((r) => r.rating != null);
    if (rated.length === 0) return { rating: null, minutes: 0 };

    if (rated.length === 1) {
        return { rating: rated[0].rating as number, minutes: rated[0].minutes_played ?? 0 };
    }

    // 2 fixtures
    const [a, b] = rated;
    let wA = 0.5;
    let wB = 0.5;
    if (favoredFixtureId != null) {
        if (a.fixture_id === favoredFixtureId) { wA = 0.75; wB = 0.25; }
        else if (b.fixture_id === favoredFixtureId) { wA = 0.25; wB = 0.75; }
    }
    const rating = (a.rating as number) * wA + (b.rating as number) * wB;
    const minutes = (a.minutes_played ?? 0) + (b.minutes_played ?? 0);
    return { rating, minutes };
}

function ratingToRamp(rating: number): { r: number; g: number; b: number } {
    // clamp to [RED_AT, SATURATE_AT] and map through neutral grey at NEUTRAL
    const RED = { r: 220, g: 68, b: 68 };
    const GREY = { r: 148, g: 163, b: 184 };
    const BLUE = { r: 37, g: 99, b: 235 };

    if (rating <= NEUTRAL) {
        // RED_AT..NEUTRAL -> red..grey
        const t = Math.max(0, Math.min((rating - RED_AT) / (NEUTRAL - RED_AT), 1));
        return lerp(RED, GREY, t);
    }
    // NEUTRAL..SATURATE_AT -> grey..blue (BLUE_AT is where it's clearly blue)
    const t = Math.max(0, Math.min((rating - NEUTRAL) / (SATURATE_AT - NEUTRAL), 1));
    return lerp(GREY, BLUE, t);
}

function lerp(a: any, b: any, t: number) {
    return {
        r: Math.round(a.r + (b.r - a.r) * t),
        g: Math.round(a.g + (b.g - a.g) * t),
        b: Math.round(a.b + (b.b - a.b) * t)
    };
}

export function getPlayerRatingColor(
    statsRows: FixtureRow[],
    favoredFixtureId: number | null
): RatingResult {
    // Did not play: no rows at all, or rows exist but none has a rating.
    if (!statsRows || statsRows.length === 0) {
        return { color: 'rgb(203, 213, 225)', rating: null, didNotPlay: true }; // grey
    }

    const { rating, minutes } = collapseRating(statsRows, favoredFixtureId);
    if (rating == null) {
        return { color: 'rgb(203, 213, 225)', rating: null, didNotPlay: true };
    }

    const { r, g, b } = ratingToRamp(rating);

    // Low-minutes confidence: fade toward grey when the player barely featured.
    let alpha = 1;
    if (minutes < MIN_MINUTES) {
        alpha = 0.45 + (minutes / MIN_MINUTES) * 0.55; // 0.45..1.0
    }

    return { color: `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`, rating, didNotPlay: false };
}