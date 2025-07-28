<script>
    import { getCurrentTeamPage } from '$lib/stores/generic.svelte'
    import { goto } from "$app/navigation";


    // This page is a duct-tape solution since navigating from team/(name) directly to another would invalidate onMount. 
    
    let tem = getCurrentTeamPage()

  
    goto(`/teams/${tem.teampage}`)

    


</script>