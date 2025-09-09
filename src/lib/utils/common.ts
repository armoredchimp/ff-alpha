export function calculateAge(date_of_birth) {
    const dob = new Date(date_of_birth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDifference = today.getMonth() - dob.getMonth();
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < dob.getDate())) {
        age--;
    }
    return age;
}

export function positionAbbrev(detailed_position) {
    const posMap = {
        'Goalkeeper' : 'GK',
        'Centre Back' : 'CB',
        'Right Back' : 'RB',
        'Left Back' : 'LB',
        'Defensive Midfield' : 'DM',
        'Central Midfield' : 'CM',
        'Right-Mid' : 'RM',
        'Left-Mid' : 'LM',
        'Attacking Midfield' : 'AM',
        'Right Wing' : 'RW',
        'Left Wing' : 'LW',
        'Centre Forward' : 'CF'
    }

    if(posMap[detailed_position]){
        return posMap[detailed_position]
    }else {
        return detailed_position
    }
}

export function formatStatKey(stat) {
    // Insert underscores before capital letters (except the first character) and make the string lowercase
    const formattedStat = stat.replace(/([A-Z])/g, '_$1').toLowerCase();

    // Add 'avg_' at the beginning and ensure no double underscores
    return `avg_${formattedStat.replace(/^_/, '').replace(/__/g, '_')}`;
}

export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function getRandomItem(array) {
    const randomIndex = Math.floor(Math.random() * array.length);
    return array.splice(randomIndex, 1)[0];
} 

export function playerLastName(name: string): string {
    if (!name) return 'Empty'

    const splitName = name.trim().split(' ');
    
    return splitName[splitName.length - 1]
}

export function formatPlayerName(name: string, maxLength: number = 14): string {
    if (!name) return 'Empty';
    
    // If name fits, return as-is
    if (name.length <= maxLength) return name;
    
    // Try to abbreviate first name(s)
    const parts = name.trim().split(' ');
    if (parts.length > 1) {
    
        const lastName = parts[parts.length - 1];
        const firstNames = parts.slice(0, -1);
        
        const initials = firstNames.map(n => n.charAt(0).toUpperCase() + '.').join(' ');
        const abbreviated = `${initials} ${lastName}`;
        
        if (abbreviated.length > maxLength && lastName.length <= maxLength) {
        return lastName;
        }
        
        return abbreviated;
    }
    
    return name.substring(0, maxLength - 3) + '...';
}