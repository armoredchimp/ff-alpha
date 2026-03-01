import { json } from '@sveltejs/kit';
import { sportsmonksGet } from '$lib/server/sportsmonks';

export async function GET({ url }) {
	const playerId = url.searchParams.get('playerId');
	const seasonId = url.searchParams.get('seasonId');
	const endpoint = url.searchParams.get('endpoint');

	try {
		if (endpoint === 'teams') {
			const res = await sportsmonksGet(`/teams/seasons/${seasonId}`, {
				include: 'players.player;coaches;sidelined'
			});
			return json(res);
		}

		if (endpoint === 'player') {
			const res = await sportsmonksGet(`/players/${playerId}`, {
				include: 'statistics.details.type;position;detailedPosition',
				filters: `playerStatisticSeasons:${seasonId}`
			});
			return json(res);
		}

		return json({ error: 'Invalid endpoint' }, { status: 400 });
	} catch (err: any) {
		return json({ error: err.message }, { status: 500 });
	}
}