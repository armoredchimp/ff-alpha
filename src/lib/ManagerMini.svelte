<script>
    import { getCountry } from "./data/countries";
    import { calculateAge } from "./utils/utils";

    let {
        manager = {}
        } = $props();

</script>

<div class="manager-image-container">
    <img src={manager.image_path} alt={manager.display_name} class="manager-photo" />
    <div class="manager-popup">
        <h5>{manager.display_name}</h5>
        <p>Age: {manager.age} yrs</p>
        <p>Nationality: {manager.nationality}</p>
    </div>
</div>

<style>
    .manager-image-container {
        position: relative;
        width: 50px;
        height: 50px;
    }
    .manager-photo {
        width: 100%;
        height: 100%;
        border-radius: 25px;
        object-fit: cover;
    }
    .manager-popup {
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
    .manager-image-container:hover .manager-popup {
        display: block;
    }
    .manager-popup h5 {
        margin: 0 0 0.5rem 0;
        font-size: 0.9rem;
        font-weight: 600;
    }
    .manager-popup p {
        margin: 0.25rem 0;
        font-size: 0.8rem;
        color: #4a5568;
    }
</style>