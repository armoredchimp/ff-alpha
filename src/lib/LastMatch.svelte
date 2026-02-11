<script lang="ts">
    import { supabaseScaling } from "./client/supabase/supaClient";
	import type { Team } from "./types/types";

    let {
        team = {} as Team,
    } = $props<{
        team?: Team | null;
    }>();

    
</script>