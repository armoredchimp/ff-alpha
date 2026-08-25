export function generateLeagueSchedule(numTeams: number, maxGames: number) {
  const teams = Array.from({ length: numTeams }, (_, i) => i);

  const halfSize = numTeams / 2;
  const singleRoundRobinGames = numTeams - 1;

  // Calculate how many complete round robins can fit
  const fullRounds = Math.floor(maxGames / singleRoundRobinGames);
  const remainingGames = maxGames % singleRoundRobinGames;

  const schedule = {};
  let weekNumber = 1;

  // Generate full round robins
  for (let round = 0; round < fullRounds; round++) {
    for (let week = 0; week < singleRoundRobinGames; week++) {
      const matches = [];

      // Create pairings for this week
      for (let i = 0; i < halfSize; i++) {
        let home, away;

        if (i === 0) {
          // First pairing: fixed team vs rotating opponent
          home = teams[numTeams - 1];
          away = teams[week % (numTeams - 1)];
        } else {
          // Other pairings: rotate through remaining teams
          const homeIndex = (week + i) % (numTeams - 1);
          const awayIndex = (numTeams - 1 - i + week) % (numTeams - 1);

          home = teams[homeIndex];
          away = teams[awayIndex];
        }

        // Alternate home/away 
        if ((round + week) % 2 === 0) {
          matches.push([home, away]);
        } else {
          matches.push([away, home]);
        }
      }

      schedule[weekNumber] = matches;
      weekNumber++;
    }
  }

  // Add remaining partial round if needed
  if (remainingGames > 0) {
    for (let week = 0; week < remainingGames; week++) {
      const matches = [];

      for (let i = 0; i < halfSize; i++) {
        let home, away;

        if (i === 0) {
          home = teams[numTeams - 1];
          away = teams[week % (numTeams - 1)];
        } else {
          const homeIndex = (week + i) % (numTeams - 1);
          const awayIndex = (numTeams - 1 - i + week) % (numTeams - 1);

          home = teams[homeIndex];
          away = teams[awayIndex];
        }

        if (week % 2 === 0) {
          matches.push([home, away]);
        } else {
          matches.push([away, home]);
        }
      }

      schedule[weekNumber] = matches;
      weekNumber++;
    }
  }

  return schedule;
}

export interface NextMatchupsResult {
  ok: true;
  leagueId: string;
  week: number;
  matchups: number;
  teamsUpdated: number;
  unresolved: string[];
}

export async function setNextMatchups(leagueId: string): Promise<NextMatchupsResult> {
  const res = await fetch('/api/supabase/next_matchups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leagueId })
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new Error(detail?.message ?? `next_matchups failed (${res.status})`);
  }

  const result: NextMatchupsResult = await res.json();

  if (result.unresolved.length) {
    console.warn(
      `[setNextMatchups] league ${leagueId}: ${result.unresolved.length} scheduled pairs ` +
      `did not resolve to teams — ${result.unresolved.join(', ')}`
    );
  }

  return result;
}