import { 
    defenseWeightMap, 
    defenseImpMap, 
    keepingWeightMap, 
    keepingImpMap, 
    possessionWeightMap, 
    possessionImpMap,
    passingWeightMap, 
    passingImpMap, 
    attackingWeightMap, 
    attackingImpMap, 
    finishingWeightMap, 
    finishingImpMap
} from "$lib/stores/generic.svelte";
  
    export async function fetchAllWeights() {
        try {
            const res = await fetch('/api/supabase/weights');
            if (!res.ok) {
                console.error('Failed to load weights:', res.status);
                return;
            }

            const { weights } = await res.json();

            for (const [table, [weightMap, impMap]] of Object.entries(WEIGHT_MAPS)) {
                applyWeights(weights[table] ?? [], weightMap, impMap);
            }
            console.log('Weights applied')

        } catch (err) {
            console.error('Weights fetch failed:', err);
        }
    }

    function calculateImportance(weight) {
        if (weight >= 0) {
            if (weight < 100) return 1;
            if (weight < 200) return 2;
            if (weight < 300) return 3;
            if (weight < 500) return 4;
            return 5;
        } else {
            if (weight > -100) return -1;
            if (weight > -200) return -2;
            if (weight > -300) return -3;
            if (weight > -500) return -4;
            return -5;
        }
    }

    const WEIGHT_MAPS = {
        getDefensiveScore: [defenseWeightMap, defenseImpMap],
        getKeeperScore: [keepingWeightMap, keepingImpMap],
        getPossessionScore: [possessionWeightMap, possessionImpMap],
        getPassingScore: [passingWeightMap, passingImpMap],
        getAttackingScore: [attackingWeightMap, attackingImpMap],
        getFinishingScore: [finishingWeightMap, finishingImpMap]
    };

    function applyWeights(rows, weightMap, impMap) {
        rows.forEach(row => {
            const weights = Object.keys(row).reduce((acc, key) => {
                if (key !== 'Position') {
                    acc[key] = row[key];
                }
                return acc;
            }, {});

            weightMap[row.Position] = weights;

            const importances = {};
            Object.keys(weights).forEach(stat => {
                importances[stat] = calculateImportance(weights[stat]);
            });
            impMap[row.Position] = importances;
        });
    }

