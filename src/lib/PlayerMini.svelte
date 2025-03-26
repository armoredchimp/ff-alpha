<script>
    let {
        player = {},
        statistics = {}
    } = $props();
</script>

<div class="player-image-container">
    <img src={player.photo} alt={player.name} class="player-photo" />
    <div class="player-popup">
        <h5>{player.name || `${player.firstname} ${player.lastname}`}</h5>
        <p>Age: {player.age}</p>
        <p>Nationality: {player.nationality}</p>
    </div>
</div>

<style>
    .player-image-container {
        position: relative;
        width: 50px;
        height: 50px;
    }
    .player-photo {
        width: 100%;
        height: 100%;
        border-radius: 25px;
        object-fit: cover;
    }
    .player-popup {
        display: none;
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        background: white;
        padding: 0.75rem;
        border-radius: 4px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        width: 200px;
        z-index: 10;
    }
    .player-image-container:hover .player-popup {
        display: block;
    }
    .player-popup h5 {
        margin: 0 0 0.5rem 0;
        font-size: 0.9rem;
        font-weight: 600;
    }
    .player-popup p {
        margin: 0.25rem 0;
        font-size: 0.8rem;
        color: #4a5568;
    }
</style>