<script lang="ts">
    import { supabaseScaling } from "./client/supabase/supaClient";
	

    let {
        team = {} as Team,
    } = $props<{
        team?: Team | null;
    }>();

    
</script>