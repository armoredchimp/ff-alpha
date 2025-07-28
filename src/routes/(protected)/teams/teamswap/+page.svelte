<script>
    import { getCurrentTeamPage } from '$lib/stores/generic.svelte'
    import { goto, invalidateAll } from "$app/navigation";

    
    let tem = getCurrentTeamPage()

  
    goto(`/teams/${tem.teampage}`)

    


</script>