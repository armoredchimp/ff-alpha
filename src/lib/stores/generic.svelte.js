export let allPlayers = $state([])
export let playersByID = $state({})

export let playerCall = $state(false)

export let managers = $state([])

export let defenseWeightMap = $state({})
export let passingWeightMap = $state({})
export let possessionWeightMap = $state({})
export let attackingWeightMap = $state({})
export let keepingWeightMap = $state({})

export let defenseImpMap = $state({})
export let passingImpMap = $state({})
export let possessionImpMap = $state({})
export let attackingImpMap = $state({})
export let keepingImpMap = $state({})

export let outfieldAverages = $state({})
export let keeperAverages = $state({})

// export function setAvgs(outData, kData){
//     return {
//         setOutfieldAv(outData) { outfieldAverages = outData},
//         setKeeperAv(kData) { keeperAverages = kData}
//     }
// }
