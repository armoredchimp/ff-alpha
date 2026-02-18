import axios from "axios";
import { teams, playerTeam } from "$lib/stores/teams.svelte";
import { results } from "$lib/stores/generic.svelte";

export async function loadMatchResults(matchWeek: number) {
    try {
        const response = await axios.get('/api/supabase/results', {
            params: matchWeek ? { matchWeek } : {}
        })
        return hydrateMatchResults(response.data.results);
    } catch (err) {
        console.error('error loading match results', err)
    }
}

function hydrateMatchResults(matchResults) {
    const allTeams = [...Object.values(teams), playerTeam];
    const teamMap = new Map();
    for (const team of allTeams) {
        teamMap.set(team.dbId, team);
    }

    for (const result of matchResults) {
        const homeTeam = teamMap.get(result.home_team_id);
        const awayTeam = teamMap.get(result.away_team_id);

        // Store in results store with team references
        results[result.id] = {
            homeTeam,
            awayTeam,
            homeScore: result.home_score,
            awayScore: result.away_score,
            homeChancePts: result.home_chance_pts,
            awayChancePts: result.away_chance_pts,
            homePossWins: result.home_possession_wins,
            awayPossWins: result.away_possession_wins
        };

        if (homeTeam) {
            homeTeam.lastResult = {
                matchId: result.id,
                oppId: result.away_team_id,
                home: true,
                result: result.home_score > result.away_score ? 'W' : result.home_score < result.away_score ? 'L' : 'D',
                goalsFor: result.home_score,
                goalsAgainst: result.away_score,
                chancePoints: result.home_chance_pts,
                chancePointsOpp: result.away_chance_pts,
                possWins: result.home_possession_wins,
                possWinsOpp: result.away_possession_wins
            };
        }
        if (awayTeam) {
            awayTeam.lastResult = {
                matchId: result.id,
                oppId: result.home_team_id,
                home: false,
                result: result.away_score > result.home_score ? 'W' : result.away_score < result.home_score ? 'L' : 'D',
                goalsFor: result.away_score,
                goalsAgainst: result.home_score,
                chancePoints: result.away_chance_pts,
                chancePointsOpp: result.home_chance_pts,
                possWins: result.away_possession_wins,
                possWinsOpp: result.home_possession_wins
            };
        }
    }
}