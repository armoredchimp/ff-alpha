import type { PageServerLoad } from './$types';
import { isAuthenticated, getLeagueId } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';
import { sportsmonksGet } from '$lib/server/sportsmonks';
import { getFantasyStats } from '$lib/server/fantasyStats';
import { getCurrentStats } from '$lib/server/currentStats';
import { getCurrentScores } from '$lib/server/currentScores';
import { serverPlayerCache } from '$lib/server/serverPlayerCache';

export const load: PageServerLoad = async ({ params, cookies }) => {
	if (!isAuthenticated(cookies)) {
		throw redirect(302, '/');
	}

	const id = params.id;
	const cached = serverPlayerCache[id];

	// Serve from cache only when everything the page needs is present.
	// currentStats/currentScores are [] when queried-but-empty, undefined when never queried.
	if (cached?.player && cached?.currentStats !== undefined && cached?.currentScores !== undefined) {
		console.log('player found on player cache');
		return {
			player: cached.player,
			fantasyStats: cached.fantasyStats,
			currentStats: cached.currentStats,
			currentScores: cached.currentScores,
			error: null
		};
	}

	let player = cached?.player ?? null;
	let fantasyStats = cached?.fantasyStats ?? null;
	let currentStats = cached?.currentStats;
	let currentScores = cached?.currentScores;
	let error = null;

	if (!player) {
		try {
			const data = await sportsmonksGet(`/players/${id}`, {
				include: 'statistics.details.type'
			});
			player = data.data;
		} catch (err) {
			console.error('Error loading player:', err);
			error = 'Failed to load player data';
		}
	}

	if (fantasyStats == null) {
		try {
			const leagueId = getLeagueId(cookies);
			if (leagueId) {
				fantasyStats = await getFantasyStats(leagueId, id);
			}
		} catch (err) {
			console.error('Error loading fantasy stats:', err);
		}
	}

	if (currentStats === undefined || currentScores === undefined) {
		const [statsResult, scoresResult] = await Promise.allSettled([
			getCurrentStats(id),
			getCurrentScores(id)
		]);
		if (statsResult.status === 'fulfilled') currentStats = statsResult.value;
		else console.error('current_week_stats load failed:', statsResult.reason);
		if (scoresResult.status === 'fulfilled') currentScores = scoresResult.value;
		else console.error('current_week_scores load failed:', scoresResult.reason);
	}

	if (player) {
		serverPlayerCache[id] = {
			...serverPlayerCache[id],
			player,
			fantasyStats,
			currentStats,
			currentScores
		};
	}

	return {
		player,
		fantasyStats,
		currentStats: currentStats ?? [],
		currentScores: currentScores ?? [],
		error
	};
};