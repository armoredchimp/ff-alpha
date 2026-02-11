<script lang="ts">
	import type { Team } from "./types/types";

    let {
        team = {} as Team,
    } = $props<{
        team?: Team | null;
    }>();


</script>