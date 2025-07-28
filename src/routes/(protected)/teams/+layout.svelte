<script>
    import { page } from '$app/state';
</script>

<p>Currently at {page.url.pathname}</p>


{#key page.url.pathname}
    <slot />
{/key}