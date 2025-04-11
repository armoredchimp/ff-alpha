<script>
    let {
        player = {},
        currentPositon = ''
    } = $props()


</script>

<div class='formation-player'>
    <div class="player-name">{player.player_name}</div>
	<img class="player-image" src={player.image_path} alt={player.player_name} />
    <div class="player-position">{currentPositon}</div>

    <select class="player-select">
		<option disabled selected>Select replacement</option>
		<!-- Options will go here later -->
	</select>
</div>

<style>
    .formation-player {
        background: rgba(255, 255, 255, 0.9);
        border-radius: 12px;
        padding: 0.75rem;
        width: 120px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        font-size: 0.8rem;
    }
    
    .player-name {
        font-weight: bold;
        margin-bottom: 0.5rem;
    }
    
    .player-image {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        object-fit: cover;
        margin-bottom: 0.5rem;
        border: 2px solid #ccc;
    }
    
    .player-position {
        font-size: 0.75rem;
        color: #333;
        margin-bottom: 0.5rem;
    }
    
    .player-select {
        width: 100%;
        padding: 0.25rem;
        font-size: 0.7rem;
    }
    </style>