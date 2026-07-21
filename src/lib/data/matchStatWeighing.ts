export const MATCH_TO_WEIGHT_KEY: Record<string, string> = {
  blocked_shots: 'BlockedShotsPer90',
  clearances: 'ClearancesPer90',
  error_lead_to_goal: 'ErrorLeadToGoal',
  goals: 'GoalsPer90',
  interceptions: 'InterceptionsPer90',
  goalkeeper_goals_conceded: 'GoalsConcededPer90',
  tackles: 'TacklesPer90',
  accurate_crosses: 'AccurateCrossesPer90',
  assists: 'AssistsPer90',
  big_chances_created: 'BigChancesCreatedPer90',
  big_chances_missed: 'BigChancesMissedPer90',
  successful_dribbles: 'SuccessfulDribblesPer90',
  shots_on_target: 'ShotsOnTargetPer90',
  key_passes: 'KeyPassesPer90',
};

export const STAT_CATEGORIES: Record<string, string[]> = {
  TacklesPer90: ['defense'],
  AerialsWonPer90: ['defense'],
  ShotsOffTargetPer90: ['attacking', 'possession', 'finishing'],
  ShotsOnTargetPer90: ['attacking', 'finishing'],
  OffsidesPer90: ['attacking', 'possession', 'finishing'],
  GoalsPer90: ['attacking', 'finishing'],
  ShotsBlockedPer90: ['attacking', 'finishing'],
  HitWoodworkPer90: ['attacking', 'finishing'],
  AssistsPer90: ['passing', 'attacking'],
  PassesPer90: ['passing', 'possession'],
  GoalsConcededPer90: ['defense', 'keeping'],
  DispossessedPer90: ['possession'],
  FoulsPer90: ['defense', 'possession'],
  FoulsDrawnPer90: ['possession'],
  BlockedShotsPer90: ['defense'],
  AccurateCrossesPer90: ['passing'],
  InterceptionsPer90: ['defense'],
  ClearancesPer90: ['defense'],
  SuccessfulDribblesPer90: ['attacking', 'possession'],
  DribbledPastPer90: ['defense'],
  ErrorLeadToGoal: ['defense', 'keeping'],
  KeyPassesPer90: ['passing', 'possession'],
  LongBallsWonPer90: ['defense', 'possession'],
  Cleansheets: ['defense', 'keeping'],
  BigChancesCreatedPer90: ['passing', 'possession'],
  BigChancesMissedPer90: ['attacking', 'finishing'],
  AccuratePassesPercentage: ['possession'],
  CrossesBlockedPer90: ['defense'],
};

export const KEEPER_ALWAYS_SHOW = ['saves', 'punches', 'goalkeeper_goals_conceded']

// Outfield fallback fill order. When fewer than TOP_STAT_LIMIT ranked stats
// exist, top up from this list (skipping any already shown), shown even when
// null/zero (rendered blank, no number). current_week_stats column keys.
export const FALLBACK_STAT_ORDER = [
	'goals',
	'assists',
	'big_chances_created',
	'error_lead_to_goal',
	'interceptions',
	'tackles',
	'successful_dribbles',
	'dispossessed'
];
 
export const TOP_STAT_LIMIT = 6;
 
// Columns on a current_week_stats row that are metadata, not stats — excluded
// from the dropdown's "everything not null" listing.
export const STATS_ROW_METADATA = new Set([
	'player_id',
	'fixture_id',
	'season_id',
	'team_id',
	'player_name',
	'created_at',
	'detailed_position'
]);
