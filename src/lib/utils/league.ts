export function generateLeagueSchedule(numTeams: number, maxGames: number) {
  const teams = Array.from({ length: numTeams }, (_, i) => i);
  
  const halfSize = numTeams / 2;
  const singleRoundRobinGames = numTeams - 1;
  
  // Calculate how many complete round robins can fit
  const fullRounds = Math.floor(maxGames / singleRoundRobinGames);
  const remainingGames = maxGames % singleRoundRobinGames;
  
  const schedule = {};
  let weekNumber = 1;
  
  // Generate full round robins
  for (let round = 0; round < fullRounds; round++) {
    for (let week = 0; week < singleRoundRobinGames; week++) {
      const matches = [];
      
      // Create pairings for this week
      for (let i = 0; i < halfSize; i++) {
        let home, away;
        
        if (i === 0) {
          // First pairing: fixed team vs rotating opponent
          home = teams[numTeams - 1];
          away = teams[week % (numTeams - 1)];
        } else {
          // Other pairings: rotate through remaining teams
          const homeIndex = (week + i) % (numTeams - 1);
          const awayIndex = (numTeams - 1 - i + week) % (numTeams - 1);
          
          home = teams[homeIndex];
          away = teams[awayIndex];
        }
        
        // Alternate home/away 
        if ((round + week) % 2 === 0) {
          matches.push([home, away]);
        } else {
          matches.push([away, home]);
        }
      }
      
      schedule[weekNumber] = matches;
      weekNumber++;
    }
  }
  
  // Add remaining partial round if needed
  if (remainingGames > 0) {
    for (let week = 0; week < remainingGames; week++) {
      const matches = [];
      
      for (let i = 0; i < halfSize; i++) {
        let home, away;
        
        if (i === 0) {
          home = teams[numTeams - 1];
          away = teams[week % (numTeams - 1)];
        } else {
          const homeIndex = (week + i) % (numTeams - 1);
          const awayIndex = (numTeams - 1 - i + week) % (numTeams - 1);
          
          home = teams[homeIndex];
          away = teams[awayIndex];
        }
        
        if (week % 2 === 0) {
          matches.push([home, away]);
        } else {
          matches.push([away, home]);
        }
      }
      
      schedule[weekNumber] = matches;
      weekNumber++;
    }
  }
  
  return schedule;
}