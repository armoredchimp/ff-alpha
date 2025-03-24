export function formatStatKey(stat) {
    // Insert underscores before capital letters (except the first character) and make the string lowercase
    const formattedStat = stat.replace(/([A-Z])/g, '_$1').toLowerCase();

    // Add 'avg_' at the beginning and ensure no double underscores
    return `avg_${formattedStat.replace(/^_/, '').replace(/__/g, '_')}`;
}

