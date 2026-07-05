export const CURRENT_SEASON = '2425'

export const TABLE_PREFIXES: Record<number, string> = {
    1: 'prem',     // Premier League
    2: 'laliga',   // La Liga
    3: 'bundes',    // Bundesliga
    4: 'ligue1',   // Ligue 1
    5: 'seriea'    // Serie A
};

//THIS IS LAST SEASON (24/25) VALUES, STILL IN PLACE SO NOTHING BREAKS
export const SEASON_ID_LOOKUP: Record<number, number> = {
    1: 23614,
    2: 23621,
    3: 23744,
    4: 23643,
    5: 23746
}

export const LEAGUE_ID_LOOKUP: Record<number, number> = {
    1: 8,
    2: 564,
    3: 82,
    4: 301,
    5: 384
}

export const LEAGUE_MAX_GAMES = {
    prem: 38,
    laliga: 38,
    bundes: 34,
    seriea: 38,
    ligue1: 34
};