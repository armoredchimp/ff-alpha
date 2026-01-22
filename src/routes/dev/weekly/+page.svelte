<script>
    import FetchWeeklyMatches from "$lib/components/admin/FetchWeeklyMatches.svelte";
    import WeeklyScoring from "$lib/components/admin/WeeklyScoring.svelte";
    import LeagueMatchweeks from "$lib/components/admin/LeagueMatchweeks.svelte";
    import BasicScoring from "$lib/components/admin/BasicScoring.svelte";
    import NextMatchups from "$lib/components/admin/NextMatchups.svelte";
	import TeamMatchups from "$lib/components/admin/TeamMatchups.svelte";
    import ResetLeague from "$lib/components/admin/ResetLeague.svelte";
</script>

<LeagueMatchweeks />
<BasicScoring />
<div style="margin-top: 5rem;"></div>
<FetchWeeklyMatches />
<NextMatchups />
<ResetLeague />
<h1 style="margin-top: 5rem; margin-left: 3rem;">Weekly Scoring (Advanced)</h1>
<WeeklyScoring />
<TeamMatchups />