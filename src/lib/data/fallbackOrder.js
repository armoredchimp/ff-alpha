const fallbackOrder = {
        "Centre Forward":       ["Left Wing", "Right Wing"],
        "Left Wing":            ["Right Wing", "Centre Forward","Attacking Midfield"],
        "Right Wing":           ["Left Wing", "Centre Forward","Attacking Midfield"],
        "Left-Mid":             ["Left Wing", "Central Midfield", "Centre Forward","Attacking Midfield"],
        "Right-Mid":            ["Right Wing", "Central Midfield", "Centre Forward","Attacking Midfield"],
        "Central Midfield":     ["Attacking Midfield", "Defensive Midfield", "Left Wing", "Right Wing"],
        "Attacking Midfield":   ["Central Midfield", "Left Wing", "Right Wing", "Centre Forward"],
        "Defensive Midfield":   ["Centre Back", "Central Midfield", "Left Back", "Right Back"],
        "Centre Back":          ["Left Back", "Right Back"],
        "Left Back":            ["Right Back", "Centre Back"],
        "Right Back":           ["Left Back", "Centre Back"]
    };

export function getFallbackPos(position){
    return fallbackOrder[position]
}