import { json } from '@sveltejs/kit';
import { sportsmonksGet } from '$lib/server/sportsmonks';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_KEY } from '$env/static/private';

const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY);

const leagueConfig = [
	{ seasonID: 23614, prefix: 'prem', label: 'Premier League' },
	{ seasonID: 23621, prefix: 'laliga', label: 'La Liga' },
	{ seasonID: 23744, prefix: 'bundes', label: 'Bundesliga' },
	{ seasonID: 23643, prefix: 'ligue1', label: 'Ligue 1' },
	{ seasonID: 23746, prefix: 'seriea', label: 'Serie A' }
];

function calculateAge(dob: string): number {
	const birth = new Date(dob);
	const now = new Date();
	let age = now.getFullYear() - birth.getFullYear();
	if (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate())) age--;
	return age;
}

function getCountry(nationalityId: number): string {
	return String(nationalityId);
}

async function processLeague(seasonID: number, leaguePrefix: string) {
	const res = await sportsmonksGet(`/teams/seasons/${seasonID}`, {
		include: 'players.player;coaches'
	});

	const teams = res.data;
	const coaches: [any, string][] = [];

	for (const team of teams) {
		if (team.coaches?.length > 0) {
			for (const coach of team.coaches) {
				if (coach.active === true) {
					coaches.push([coach, team.name]);
				}
			}
		}
	}

	let imported = 0;
	for (const [coach] of coaches) {
		const coachRes = await sportsmonksGet(`/coaches/${coach.coach_id}`);
		if (!coachRes) continue;

		const manager = coachRes.data;
		if (!manager) continue;

		manager.age = calculateAge(manager.date_of_birth);
		manager.league_id = seasonID;
		manager.nationality = getCountry(manager.nationality_id);

		const fieldsToRemove = [
			'city_id', 'common_name', 'country_id', 'date_of_birth',
			'firstname', 'gender', 'height', 'lastname', 'name',
			'nationality_id', 'player_id', 'sport_id', 'weight'
		];
		for (const field of fieldsToRemove) {
			delete manager[field];
		}

		const { error } = await supabase
			.from(`${leaguePrefix}_managers`)
			.upsert(manager);

		if (error) console.error('supa error:', error);
		else imported++;
	}

	return { league: leaguePrefix, total: coaches.length, imported };
}

export async function POST({ request }) {
	const { leagues } = await request.json();

	const targets =
		leagues === 'all'
			? leagueConfig
			: leagueConfig.filter((l) => leagues.includes(l.prefix));

	if (targets.length === 0) {
		return json({ error: 'No valid leagues specified' }, { status: 400 });
	}

	const results = [];
	for (const league of targets) {
		try {
			const result = await processLeague(league.seasonID, league.prefix);
			results.push(result);
		} catch (err: any) {
			results.push({ league: league.prefix, error: err.message });
		}
	}

	return json({ results });
}