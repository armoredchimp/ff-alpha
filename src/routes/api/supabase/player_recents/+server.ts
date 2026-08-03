import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isAuthenticated } from '$lib/server/auth';
import { getPlayerRecentMatches } from '$lib/server/playerMatchReads';

export const GET: RequestHandler = async ({ url, cookies }) => {
	if (!isAuthenticated(cookies)) {
		throw error(401, 'Not authenticated');
	}

	const playerId = url.searchParams.get('player_id');
	if (!playerId) {
		throw error(400, 'player_id is required');
	}

	const limit = Number(url.searchParams.get('limit') ?? 5);
	const offset = Number(url.searchParams.get('offset') ?? 0);

	if (!Number.isFinite(limit) || !Number.isFinite(offset) || limit < 1 || offset < 0) {
		throw error(400, 'Invalid limit or offset');
	}

	try {
		const matches = await getPlayerRecentMatches(playerId, limit, offset);
		return json({ matches });
	} catch (err) {
		console.error('player-recent-matches failed:', err);
		throw error(500, 'Failed to load recent matches');
	}
};