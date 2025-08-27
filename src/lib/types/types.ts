export type Team = {
    name: string;
    dbId: number;
    draftOrder: number;
    attackers: (Player | number)[];
    midfielders: (Player | number)[];
    defenders: (Player | number)[];
    keepers: (Player | number)[];
    selected: (Player | number)[];
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