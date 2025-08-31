<script lang="ts">
    import { playerTeam, teams } from "$lib/stores/teams.svelte";
    import { getPlayerInit, setPlayerInit } from "$lib/stores/generic.svelte";
    import Formation from "$lib/Formation.svelte";
    import { formationConfig } from "$lib/data/formationConfig";
    import SelectedList from "$lib/SelectedList.svelte";
    import TeamHeader from "$lib/TeamHeader.svelte";
    import TeamScores from "$lib/TeamScores.svelte";
    import { onMount } from "svelte";
    import { createFormationStructure, resetScores, populateLineup, delay, extractPlayerIds } from "$lib/utils";
    import { calculateTotalScores } from "$lib/utils";
    import type { Team } from "$lib/types/types";
	import { getLeagueState } from "$lib/stores/league.svelte";
    
    // Key for #key to force formation to re-render and all its child components
    let formationKey = $state<number>(0);
    let init = getPlayerInit()
    let uploading = $state<boolean>(false);
    let uploadMessage = $state<string>('');

    onMount(() => {
        calculateTotalScores(playerTeam as Team)
       
        if(!init){
            // Check if selected is empty or hasn't been populated with players yet
            if(!playerTeam.selected || Object.keys(playerTeam.selected).length === 0 || !hasPlayersInFormation(playerTeam.selected)){
                playerTeam.selected = createFormationStructure(playerTeam.formation)
                delay(100)
                populateLineup(playerTeam as Team)
                setPlayerInit(true)
            }
        }
        
        console.log(playerTeam)
       
        // Listen for player swap events from FormationPlayer components
        const handlePlayerSwap = (): void => {
            console.log('player swap event')
            formationKey++;
        };
        document.addEventListener('playerSwapped', handlePlayerSwap);
       
        // Cleanup listener on component destroy
        return () => {
            document.removeEventListener('playerSwapped', handlePlayerSwap);
        };
    })
    
    // Helper function to check if formation has any players
    function hasPlayersInFormation(selected: any): boolean {
        if (!selected || typeof selected !== 'object') return false;
        
        for (const group of Object.values(selected)) {
            if (typeof group === 'object') {
                for (const position of Object.values(group as any)) {
                    const pos = position as { players?: any[] };
                    if (pos?.players && Array.isArray(pos.players) && pos.players.length > 0) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    
    function formationChange(e: Event): void {
        const target = e.target as HTMLSelectElement;
        playerTeam.formation = target.value;
        resetScores(playerTeam as Team)
        playerTeam.selected = createFormationStructure(playerTeam.formation)
        formationKey++;
    }
    
    function autoPick(): void {
        populateLineup(playerTeam as Team)
        formationKey++
    }
    
    async function uploadLeaguePlayers(): Promise<void> {
        uploading = true;
        uploadMessage = '';
        
        try {
            const teamPlayersData = [];
            const teamFormations = [];


            console.log('Processing player team...');
            console.log('playerTeam.dbId:', playerTeam.dbId);
            
            if (playerTeam.dbId) {
                // Extract IDs for selected, subs, unused
                const lightweightPlayerTeam = extractPlayerIds(playerTeam);
                
                const playerTeamData = {
                    team_id: playerTeam.dbId,
                    attackers: playerTeam.attackers || [],
                    midfielders: playerTeam.midfielders || [],
                    defenders: playerTeam.defenders || [],
                    keepers: playerTeam.keepers || [],
                    selected: lightweightPlayerTeam.selected,
                    subs: lightweightPlayerTeam.subs,
                    unused: lightweightPlayerTeam.unused
                };
                console.log('Player team data prepared:', playerTeamData);
                teamPlayersData.push(playerTeamData);

                teamFormations.push({
                    team_id: playerTeam.dbId,
                    formation: playerTeam.formation
                });
            } else {
                console.error('Player team missing database ID');
            }
            
            const leagueState = getLeagueState()
            console.log('Processing AI teams...');
            if(!leagueState && !leagueState.numOfTeams){
                console.error('League state error')
                return;
            }
            for (let i = 1; i <= leagueState.numOfTeams -1; i++) {  
                const teamKey = `team${i}` as keyof typeof teams;
                const team = teams[teamKey];
                
                if (team && team.dbId && team.dbId > 0) {
                    console.log(`Processing team ${i}...`);
                    
                    // Extract IDs for selected, subs, unused
                    const lightweightTeam = extractPlayerIds(team);
                    
                    const aiTeamData = {
                        team_id: team.dbId,
                        attackers: team.attackers || [],
                        midfielders: team.midfielders || [],
                        defenders: team.defenders || [],
                        keepers: team.keepers || [],
                        selected: lightweightTeam.selected,
                        subs: lightweightTeam.subs,
                        unused: lightweightTeam.unused
                    };
                    console.log(`Team ${i} data prepared:`, aiTeamData);
                    teamPlayersData.push(aiTeamData);

                     teamFormations.push({
                        team_id: team.dbId,
                        formation: team.formation
                    });
                }
            }
            
            console.log('Total teams to upload:', teamPlayersData.length);
            
            if (teamPlayersData.length === 0) {
                uploadMessage = '✗ No teams with valid data to upload';
                return;
            }
            
           
            const uploadFormData = new FormData();
            uploadFormData.append('teamPlayers', JSON.stringify(teamPlayersData));
            uploadFormData.append('teamFormations', JSON.stringify(teamFormations));
            
            console.log('Calling /api/supabase/player_upload...');
            const response = await fetch('/api/supabase/player_upload', {
                method: 'POST',
                body: uploadFormData
            });
            
            console.log('Response status:', response.status);
            const result = await response.json();
            console.log('Result:', result);
            
            if (response.ok && result.success) {
                uploadMessage = `✓ Successfully uploaded ${teamPlayersData.length} teams`;
                console.log('Upload successful');
            } else {
                uploadMessage = `✗ ${result.error || 'Failed to upload league players'}`;
                console.error('Upload failed:', result);
            }
        } catch (error) {
            uploadMessage = '✗ Network error during upload';
            console.error('Upload error:', error);
        } finally {
            uploading = false;
            // Clear message after 5 seconds
            setTimeout(() => {
                uploadMessage = '';
            }, 5000);
        }
    }
</script>

<div class="page-container">
    <div class="top-buttons">
        <button><a href="/teams/player/matchup">Matchup</a></button>
        <button 
            onclick={() => uploadLeaguePlayers()}
            disabled={uploading}
            class="upload-button"
        >
            {uploading ? 'Uploading...' : 'Upload League Players'}
        </button>
        {#if uploadMessage}
            <span class="upload-message" class:success={uploadMessage.startsWith('✓')}>
                {uploadMessage}
            </span>
        {/if}
    </div>
    <div>
        <TeamHeader team={playerTeam} computer={false} />
    </div>
    <div>
        <TeamScores
            scores={playerTeam.scores.total}
            playerCount={playerTeam.playerCount}
            keeperCount={playerTeam.keepers.length}
        />
    </div>
    <div class="middle-section">
        <div class="dropdown-wrapper">
            <select
                bind:value={playerTeam.formation}
                onchange={(e) => formationChange(e)}
            >
                {#each Object.keys(formationConfig) as f}
                    <option value={f}>{f}</option>
                {/each}
            </select>
        </div>
        <button onclick={() => autoPick()}>Auto-Pick Team</button>
       
        <div class="content-wrapper">
            {#key formationKey}
                <Formation team={playerTeam} />
                <SelectedList team={playerTeam} />
            {/key}
        </div>
    </div>
</div>

<style>
    .top-buttons {
        display: flex;
        gap: 1rem;
        align-items: center;
        margin-bottom: 1rem;
    }
    
    .middle-section {
        display: flex;
        flex-direction: column;  
        gap: 1.5rem;              
        padding: 1rem 0;        
        overflow: visible;      
    }
 
    .dropdown-wrapper {
        position: relative;
        z-index: 1000;
        overflow: visible;
        margin-left: 1rem;        
    }
 
    select {
        position: relative;
        z-index: 1001;
        padding: 0.5rem 1rem;
        font-size: 1rem;
        border: 1px solid #ccc;
        border-radius: 6px;
        background: #fafafa;
        cursor: pointer;
        transition: border-color 0.2s;
    }
    
    select:hover {
        border-color: #888;
    }
 
    button {
        align-self: center;    
        margin-left: 0;
        padding: 0.5rem 1.2rem;
        font-size: 1rem;
        font-weight: 500;
        color: #fff;
        background: #0070f3;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        transition: background 0.2s, transform 0.1s;
    }
    
    button:hover {
        background: #005bb5;
    }
    
    button:active {
        transform: scale(0.98);
    }
    
    button:disabled {
        background: #ccc;
        cursor: not-allowed;
    }
    
    .upload-button {
        background: #28a745;
    }
    
    .upload-button:hover:not(:disabled) {
        background: #218838;
    }
    
    .upload-message {
        padding: 0.5rem 1rem;
        border-radius: 4px;
        font-size: 0.9rem;
        animation: fadeIn 0.3s ease;
    }
    
    .upload-message.success {
        color: #155724;
        background-color: #d4edda;
        border: 1px solid #c3e6cb;
    }
    
    .upload-message:not(.success) {
        color: #721c24;
        background-color: #f8d7da;
        border: 1px solid #f5c6cb;
    }
    
    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
 
    .content-wrapper {
        display: flex;
        gap: 1rem;
        position: relative;
        overflow: visible;
    }
</style>