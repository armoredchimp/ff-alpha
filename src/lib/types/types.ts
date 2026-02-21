export type PositionConfig = {
  players: (Player | number)[];
  max: number;
  zone: string;
};

export type FormationStructure = {
  [group: string]: {
    [position: string]: PositionConfig;
  };
};

// lastResult: {
//     result: '',
//     goalsFor: 0,
//     goalsAgainst: 0,
//     chancePoints: 0,
//     chancePointsOpp: 0,
//     possWins: 0,
//     possWinsOpp: 0
// },

export type Team = {
  name: string;
  dbId: number;
  draftOrder: number;
  attackers: (Player | number)[];
  midfielders: (Player | number)[];
  defenders: (Player | number)[];
  keepers: (Player | number)[];
  selected: FormationStructure;
  subs: (Player | number)[];
  unused: (Player | number)[];
  playerCount: number;
  traits?: any[];
  rivals: any[];
  transferBudget: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  formation: string;
  formationDisplayed: boolean;
  manager?: (Manager | number | null)[];
  nextOpponentID: number;
  player?: boolean;
  lastResult: {
    matchId: string | number;
    oppId: number;
    home: boolean;
    result: string;
    goalsFor: number;
    goalsAgainst: number;
    chancePoints: number;
    chancePointsOpp: number;
    possWins: number;
    possWinsOpp: number;
  }
  scores: {
    total: {
      finishing: number;
      attacking: number;
      possession: number;
      passing: number;
      defense: number;
      keeping: number;
    };
    attackers: {
      finishing: number;
      attacking: number;
      possession: number;
      passing: number;
      defense: number;
    };
    midfielders: {
      finishing: number;
      attacking: number;
      possession: number;
      passing: number;
      defense: number;
    };
    defenders: {
      finishing: number;
      attacking: number;
      possession: number;
      passing: number;
      defense: number;
    };
    keeper: {
      passing: number;
      keeping: number;
    };
  };
};

export type Player = {
  id: number;
  player_name: string;
  player_team: string;
  player_age: number;
  nationality: string;
  position: string;
  detailed_position: string;
  image_path: string;
  transfer_value: number;
  total_score: number;
  finishing_score: number;
  attacking_score: number;
  possession_score: number;
  passing_score: number;
  defensive_score: number;
  keeper_score: number | null;
  goals_per90: number;
  assists_per90: number;
  key_passes_per90: number;
  accurate_crosses_per90: number;
  successful_dribbles_per90: number;
  tackles_per90: number;
  ints_per90: number;
  fouls_per90: number;
  created_at: string;
  injured: {
    category: string;
    start_date: string;
  }
};

export type Manager = {
  id: number;
  display_name: string;
  age: number;
  nationality: string;
  image_path: string;
  league_id: number;
  preferred_formation: string | null;
};

export interface Schedule {
  [weekNumber: string]: Array<[number, number]>;
}

export function isValidSchedule(schedule: unknown): schedule is Schedule {
  if (!schedule || typeof schedule !== 'object') {
    return false;
  }

  const scheduleObj = schedule as Record<string, unknown>;

  // Check if all keys are numeric strings and values are valid matchup arrays
  for (const [key, value] of Object.entries(scheduleObj)) {
    // Check if key is a numeric string
    if (!/^\d+$/.test(key)) {
      return false;
    }

    if (!Array.isArray(value)) {
      return false;
    }

    for (const matchup of value) {
      if (!Array.isArray(matchup) ||
        matchup.length !== 2 ||
        typeof matchup[0] !== 'number' ||
        typeof matchup[1] !== 'number') {
        return false;
      }
    }
  }

  return true;
}