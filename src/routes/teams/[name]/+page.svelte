<script>
    import { onMount } from "svelte";
    import { teams } from "$lib/stores/teams.svelte";
    import TeamHeader from "$lib/TeamHeader.svelte";
    import TeamScores from "$lib/TeamScores.svelte";
    import { formationConfig } from "$lib/data/formationConfig";
	import Formation from "$lib/Formation.svelte";

    let { data } = $props()

    onMount(() => {
        data.team.selected = createFormationStructure(data.team.formation)
        console.log('structure', data.team.selected)
        populateLineup(data.team)
    })

    function createFormationStructure(formationName){
        const config = formationConfig[formationName]
        const structure = {}

        config.forEach(([group, ...positions]) => {
            structure[group] = {},
            positions.forEach(([pos, max, zone]) => {
                structure[group][pos] = {
                    players: [],
                    max,
                    zone
                }
            })
        })

        
        return structure;
    }

    function populateLineup(team) {
        const selected = team.selected;
        const usedIds = new Set(); // Use player.id to track

        const getAvailablePlayer = (players, detailedPosition) => {
            const player = players.find(p => 
                p.detailed_position === detailedPosition && !usedIds.has(p.id)
            );
            if (player) {
                // console.log(`Found match for ${detailedPosition}:`, player.player_name);
            }
            return player;
        };

        const getFallbackPlayer = (group, pos) => {
            const groupPlayers = team[group] || [];

            const fallbackOrder = {
                'Centre Forward': ['Left Wing','Right Wing'],
                'Left-Mid': ['Left Wing','Central Midfield'],
                'Right-Mid': ['Right Wing','Central Midfield'],
                'Defensive-Mid': ['Centre Back','Central Midfield']
            };

            const fallbacks = fallbackOrder[pos] || [];

            for (const alt of fallbacks) {
                const fallback = getAvailablePlayer(groupPlayers, alt);
                if (fallback) {
                    // console.log(`Fallback used for ${pos}: ${fallback.player_name} (${alt})`);
                    return fallback;
                }
            }

            return null;
        };

        for (const group in selected) {
            const groupPlayers = team[group] || [];
            // console.log(`Processing group: ${group} with ${groupPlayers.length} players`);

            for (const pos in selected[group]) {
                const max = selected[group][pos].max;
                const picked = [];

                for (let i = 0; i < max; i++) {
                    // First, try exact match
                    const exact = getAvailablePlayer(groupPlayers, pos);
                    if (exact) {
                        picked.push(exact);
                        usedIds.add(exact.id);
                        continue;
                    }

                    // Then, try fallback if defined
                    const fallback = getFallbackPlayer(group, pos);
                    if (fallback) {
                        picked.push(fallback);
                        usedIds.add(fallback.id);
                    }
                }

                selected[group][pos].players = picked;
                // console.log(`Filled ${pos}:`, picked.map(p => p.player_name));
            }
        }

        console.log('FINAL selected:', team.selected);
    }
</script>

<div class="page-container">
    <button><a href="/..">Home</a></button>
    <div>
        <TeamHeader team={data.team} computer={true} />
    </div>
    <div>
        <TeamScores scores={data.team.scores} playerCount={data.team.playerCount}/>
    </div>

    <div>
        <Formation team={data.team} />
    </div>

</div>