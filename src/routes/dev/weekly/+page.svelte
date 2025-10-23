<script>
    import WeeklyMatches from "$lib/components/admin/WeeklyMatches.svelte";
    import WeeklyScoring from "$lib/components/admin/WeeklyScoring.svelte";
    import LeagueReference from "$lib/components/admin/LeagueReference.svelte";
    import Scoring from "$lib/components/admin/Scoring.svelte";
    import NextMatchups from "$lib/components/admin/NextMatchups.svelte";
</script>

<LeagueReference />
<Scoring />
<div style="margin-top: 5rem;"></div>
<WeeklyMatches />
<NextMatchups />
<h1 style="margin-top: 5rem; margin-left: 3rem;">Weekly Scoring (Advanced)</h1>
<WeeklyScoring />