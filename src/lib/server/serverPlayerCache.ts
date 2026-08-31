type Entry = { value: any; expires: number };

const PLAYER_TTL_MS = 6 * 60 * 60 * 1000;   // Sportmonks bio + season stats
const WEEK_TTL_MS = 15 * 60 * 1000;         // per-matchweek stats and scores

const players: Record<string, Entry> = {};
const stats: Record<string, Entry> = {};
const scores: Record<string, Entry> = {};

function read(map: Record<string, Entry>, key: string) {
    const hit = map[key];
    if (!hit) return undefined;
    if (hit.expires < Date.now()) {
        delete map[key];
        return undefined;
    }
    return hit.value;
}

function write(map: Record<string, Entry>, key: string, value: any, ttl: number) {
    map[key] = { value, expires: Date.now() + ttl };
}

export async function getCachedPlayer(id: string) {
    return read(players, id);
}
export async function setCachedPlayer(id: string, value: any) {
    write(players, id, value, PLAYER_TTL_MS);
}

export async function getCachedStats(id: string, week: number) {
    return read(stats, `${id}:${week}`);
}
export async function setCachedStats(id: string, week: number, value: any) {
    write(stats, `${id}:${week}`, value, WEEK_TTL_MS);
}

export async function getCachedScores(id: string, week: number) {
    return read(scores, `${id}:${week}`);
}
export async function setCachedScores(id: string, week: number, value: any) {
    write(scores, `${id}:${week}`, value, WEEK_TTL_MS);
}