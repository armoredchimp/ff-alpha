<script lang="ts">
    import type { Team } from "$lib/types/types";

    let {
        teams = {},
        playerTeam = {} as Team,
        mini = false
    }: {
        teams?: Record<string, Team>;
        playerTeam?: Team;
        mini?: boolean;
    } = $props();

    const sortedTeams = $derived.by(() => {
        const teamsArray = Object.values(teams).filter(team => team.name !== '');
        const allTeams: Team[] = [...teamsArray, playerTeam];
        
        // Check if all teams have zero points
        const allZeroPoints = allTeams.every(team => team.points === 0);
        
        return allTeams.sort((a, b) => {
            // If all teams have zero points, sort alphabetically
            if (allZeroPoints) {
                return (a.name || '').localeCompare(b.name || '');
            }
            
            // Otherwise use the regular sorting logic
            if (b.points !== a.points) {
                return b.points - a.points;
            }
            const aGoalDiff = a.goalsFor - a.goalsAgainst;
            const bGoalDiff = b.goalsFor - b.goalsAgainst;
            if (bGoalDiff !== aGoalDiff) {
                return bGoalDiff - aGoalDiff;
            }
            return b.goalsFor - a.goalsFor;
        });
    });
</script>


{#if mini}
    <div class="w-[400px]">
        <table class="w-full text-sm">
            <thead>
                <tr class="border-b border-gray-200">
                    <th class="py-1.5 text-left font-semibold text-gray-500">Team</th>
                    <th class="py-1.5 text-right font-semibold text-gray-500">Pts</th>
                </tr>
            </thead>
            <tbody>
                {#each sortedTeams as team, index}
                    <tr class="border-b border-gray-100 {team === playerTeam ? 'bg-blue-50' : ''}">
                        <td class="py-1 font-medium truncate max-w-[320px]">{team.name || `Team ${index + 1}`}</td>
                        <td class="py-1 text-right font-bold w-[40px]">{team.points}</td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
{:else}
    <div class="overflow-x-auto">
        <table class="min-w-full bg-white border border-gray-300">
            <thead class="bg-gray-100">
                <tr>
                    <th class="px-4 py-2 text-left border-b">Pos</th>
                    <th class="px-4 py-2 text-left border-b">Team</th>
                    <th class="px-4 py-2 text-center border-b">P</th>
                    <th class="px-4 py-2 text-center border-b">W</th>
                    <th class="px-4 py-2 text-center border-b">D</th>
                    <th class="px-4 py-2 text-center border-b">L</th>
                    <th class="px-4 py-2 text-center border-b">GF</th>
                    <th class="px-4 py-2 text-center border-b">GA</th>
                    <th class="px-4 py-2 text-center border-b">GD</th>
                    <th class="px-4 py-2 text-center border-b">Pts</th>
                </tr>
            </thead>
            <tbody>
                {#each sortedTeams as team, index}
                    {@const gamesPlayed = team.wins + team.draws + team.losses}
                    {@const goalDifference = team.goalsFor - team.goalsAgainst}
                    <tr class="hover:bg-gray-50 {team === playerTeam ? 'bg-blue-50' : ''}">
                        <td class="px-4 py-2 border-b">{index + 1}</td>
                        <td class="px-4 py-2 border-b font-medium">
                            <a href="teams/{team.player ? 'player/main' : team.name.toLowerCase()}">
                                {team.name || `Team ${index + 1}`}
                            </a>
                        </td>
                        <td class="px-4 py-2 text-center border-b">{gamesPlayed}</td>
                        <td class="px-4 py-2 text-center border-b">{team.wins}</td>
                        <td class="px-4 py-2 text-center border-b">{team.draws}</td>
                        <td class="px-4 py-2 text-center border-b">{team.losses}</td>
                        <td class="px-4 py-2 text-center border-b">{team.goalsFor}</td>
                        <td class="px-4 py-2 text-center border-b">{team.goalsAgainst}</td>
                        <td class="px-4 py-2 text-center border-b {goalDifference > 0 ? 'text-green-600' : goalDifference < 0 ? 'text-red-600' : ''}">
                            {goalDifference > 0 ? '+' : ''}{goalDifference}
                        </td>
                        <td class="px-4 py-2 text-center border-b font-bold">{team.points}</td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
{/if}