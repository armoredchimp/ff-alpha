import { teams } from "$lib/stores/teams.svelte";
import { calculateTotalScores } from "$lib/utils";


export function hydrateTeams(){
    Object.values(teams).forEach((team)=>{
        calculateTotalScores(team)
    })
   
}