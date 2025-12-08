    // RNG for chance point variance, otherwise intervals would have same # of chance points always
    const VARIANCE_CONFIG = {
        weights: [1, 2, 5, 10, 20, 30, 20, 10, 5, 2, 1],  
        modifiers: [-3, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 3],  
        minPoints: 0  
    };
    
    export function applyVariance(basePoints) {
        const { weights, modifiers, minPoints } = VARIANCE_CONFIG;
        
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        let roll = Math.random() * totalWeight;
        
        let selectedModifier = 0;
        for (let i = 0; i < weights.length; i++) {
            roll -= weights[i];
            if (roll <= 0) {
                selectedModifier = modifiers[i];
                break;
            }
        }
        
        const finalPoints = Math.max(minPoints, Math.round(basePoints + selectedModifier));
        return { finalPoints, modifier: selectedModifier };
    }