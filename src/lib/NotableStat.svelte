<script>
	import { onMount } from "svelte";
    import { outfieldAverages, keeperAverages } from "./stores/stores.svelte";
    import { formatStatKey } from "./utils/utils";

    let {
        name = '',
        hiddenScore = '',
        ranking = '',
        value = '',
        color = '',
        position = ''
    } = $props()

    let isExpanded = $state(false)
    let avgName = $state('')
    let avgValue = $state(0)
    let avgDiff = $state(0)

    onMount(()=>{
        avgName = formatStatKey(name)
        console.log('avgName', avgName)
    })

    function toggleExpand(e){
        e.stopPropagation()
        isExpanded = !isExpanded
        if (position !== 'Goalkeeper'){
            avgValue = outfieldAverages.data[0][avgName]
            console.log('avgValue', avgValue)
            console.log(outfieldAverages.data)
            avgDiff = (value - avgValue).toFixed(2) 
        } else {
            avgValue = keeperAverages.data[0][avgName]
            avgDiff = (value - avgValue).toFixed(2)
        }
    }



</script>

<div onclick={toggleExpand} 
    role="button"
    tabindex="0"
    onkeydown={e => e.key === 'Shift' && {toggleExpand}}
    class="notable-row" 
    style="background-color: {color}; color: white;">
        <span class="notable-name">{name}</span>
        <span class="notable-value">{value}</span>
        <span class="notable-ranking">{ranking}</span>
    {#if isExpanded}
        <div class="expanded-section">
            <span>League Average:</span>
            <span class="expanded-value">{avgValue.toFixed(2)}</span>
            <span></span>
        </div>
        <div class="expanded-section">
            <span>Difference:</span>
            <span class="expanded-value">{value < avgValue ? `-${avgDiff} `:`+${avgDiff}` }</span>
            <span></span> 
        </div>
    {/if}
</div>

<style>
    
    .notable-row {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr; 
        align-items: center;
        padding: 0.8rem;
        margin: 0.5rem;
        border-radius: 5px;
        color: white;
        cursor: pointer;
    }


    .notable-name {
        /* min-width: 150px;  */
        white-space: nowrap; 
        overflow: hidden; 
        text-overflow: ellipsis;
        /* color: white; */
    }

    .notable-value, .notable-ranking {
        text-align: right; 
        /* color: white; */
    }
   
    .expanded-section {
        grid-column: 1 / -1; /* Span all columns */
        display: grid;
        grid-template-columns: 2fr 1fr 1fr; /* Match the main row layout */
        padding: 0.8rem 0; /* Add breathing room above and below */
        margin-top: 0.5rem; /* Additional spacing */
        margin-bottom: 0.5rem; /* Additional spacing */
        border-top: 1px solid rgba(255, 255, 255, 0.2); /* Visual separation */
    }

    .expanded-value {
        text-align: right;
    }

</style>