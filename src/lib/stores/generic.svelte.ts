import type { Player, Manager } from "$lib/types/types"

export let allPlayers = $state<Player[]>([])
export let playersByID = $state<Record<number, Player>>({})

export let playerCall = $state(false)

export let managers = $state<Manager[]>([])
export let managersByID = $state<Record<number, Manager>>({});

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
