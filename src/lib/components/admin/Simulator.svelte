<script lang="ts">
    import { onMount } from "svelte";
    import { zoneMatchups, zoneAdjacency } from "$lib/utils/formation";
    
    let {
        scoreMap = new Map(),
        leagueMatchups = [],
        leagueId = 0,
    } = $props<{
        scoreMap?: Map<number, any>;
        leagueMatchups?: Array<any>;
        leagueId?: number;
    }>();
    
    onMount(() => {
        if (leagueMatchups.length > 0 && scoreMap.size > 0) {
            simulateMatchups();
        }
    });
    
    function simulateMatchups() {
        console.log(`\n========================================`);
        console.log(`SIMULATING LEAGUE ${leagueId}`);
        console.log(`Total matchups to process: ${leagueMatchups.length}`);
        console.log(`========================================\n`);
        
        leagueMatchups.forEach((matchup, index) => {
            console.log(`\n--- Matchup ${index + 1}/${leagueMatchups.length} ---`);
            console.log(`Matchup ID: ${matchup.matchupId}`);
            console.log(`Home Team: ${matchup.homeTeam.teamId}`);
            console.log(`Away Team: ${matchup.awayTeam.teamId}`);
            
            const result = simulateMatchup(matchup);
            
            if (result) {
                console.log(`Result processed for matchup ${matchup.matchupId}`);
            }
        });
        
        console.log(`\n✅ Completed simulation for League ${leagueId}\n`);
    }
    
    function simulateMatchup(matchup) {
        const { homeTeam, awayTeam, matchupId } = matchup;
        
        console.log('\nHome Team Roster:');
        console.log('Selected players:', homeTeam.selected);
        console.log('Subs:', homeTeam.subs);
        
        console.log('\nAway Team Roster:');
        console.log('Selected players:', awayTeam.selected);
        console.log('Subs:', awayTeam.subs);
        
        // Organize players by zones for matchup simulation
        const posGroupOrganization = organizePlayersByGroup(homeTeam.selected, awayTeam.selected);
        const zoneOrganization = organizePlayersByZones(homeTeam.selected, awayTeam.selected);
        console.log('\nPositional Groups Organization:',posGroupOrganization)
        console.log('\nZone Organization:', zoneOrganization);
        
        return {
            matchupId,
            status: 'simulated',
            zoneOrganization
        };
    }

    function organizePlayersByGroup(homeSelected, awaySelected){
        // Extract all players by positional group for each team
        const homePlayersByGroup = extractPlayersByGroup(homeSelected);
        const awayPlayersByGroup = extractPlayersByGroup(awaySelected);

        console.log('Home players by group:', homePlayersByGroup);
        console.log('Away players by group:', awayPlayersByGroup);

        const groupOrg = {};

        Object.keys(homePlayersByGroup).forEach(group =>{
            groupOrg[group] = {
                homePlayers: homePlayersByGroup[group],
                awayPlayers: awayPlayersByGroup[group]
            }
        })

        return groupOrg;
    }
    
    function organizePlayersByZones(homeSelected, awaySelected) {
        // Extract all players by zone for each team
        const homePlayersByZone = extractPlayersByZone(homeSelected);
        const awayPlayersByZone = extractPlayersByZone(awaySelected);
        
        console.log('Home players by zone:', homePlayersByZone);
        console.log('Away players by zone:', awayPlayersByZone);
        
        const zoneOrg = {};
        
        // Iterate through zones 3-17 (GK and adjacent zones ignored)
        for (let zone = 3; zone <= 17; zone++) {
            const homePlayersInZone = homePlayersByZone[zone] || [];
            const awayPlayersInZone = awayPlayersByZone[zone] || [];
            
            // Get opposing zone
            const opposingZone = zoneMatchups[zone];
            const opposingPlayers = opposingZone ? (awayPlayersByZone[opposingZone] || []) : [];
            
            // Get adjacent zones and players
            const adjacentZones = zoneAdjacency[zone] || [];
            const homeAdjacentPlayers = [];
            const awayAdjacentPlayers = [];
            
            adjacentZones.forEach(adjZone => {
                if (homePlayersByZone[adjZone]) {
                    homeAdjacentPlayers.push(...homePlayersByZone[adjZone]);
                }
                
                const opposingAdjZone = zoneMatchups[adjZone];
                if (opposingAdjZone && awayPlayersByZone[opposingAdjZone]) {
                    awayAdjacentPlayers.push(...awayPlayersByZone[opposingAdjZone]);
                }
            });
            
            // Only include zone if there are any players (own, adjacent, or opposing)
            if (homePlayersInZone.length > 0 || homeAdjacentPlayers.length > 0 || 
                opposingPlayers.length > 0 || awayAdjacentPlayers.length > 0) {
                zoneOrg[zone] = {
                    homePlayers: homePlayersInZone,
                    homeAdjacentPlayers: homeAdjacentPlayers,
                    awayPlayers: opposingPlayers,
                    awayAdjacentPlayers: awayAdjacentPlayers
                };
            }
        }
        
        return zoneOrg;
    }

    function extractPlayersByGroup(selected) {
        const playersByGroup = {}

        Object.keys(selected).forEach(positionGroup => {
            playersByGroup[positionGroup] = []
            const group = selected[positionGroup]
            Object.keys(group).forEach(position =>{
                const positionData = group[position];
                const players = positionData.players || [];
                playersByGroup[positionGroup].push(...players)
            })
       
        })
        return playersByGroup;
    }

    function extractPlayersByZone(selected) {
        const playersByZone = {};
        
        // Iterate through each position group 
        Object.keys(selected).forEach(positionGroup => {
            // Skip keepers
            if (positionGroup === 'keepers') return;
            
            const group = selected[positionGroup];
            
            // Iterate through each position in the group
            Object.keys(group).forEach(position => {
                const positionData = group[position];
                const zone = positionData.zone;
                const players = positionData.players || [];
                
                if (zone && zone > 2) {
                    if (!playersByZone[zone]) {
                        playersByZone[zone] = [];
                    }
                    playersByZone[zone].push(...players);
                }
            });
        });
        
        return playersByZone;
    }
</script>