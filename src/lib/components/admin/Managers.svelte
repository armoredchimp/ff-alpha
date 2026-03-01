<script>
	const leagueConfig = [
		{ prefix: 'prem', label: 'Premier League' },
		{ prefix: 'laliga', label: 'La Liga' },
		{ prefix: 'bundes', label: 'Bundesliga' },
		{ prefix: 'ligue1', label: 'Ligue 1' },
		{ prefix: 'seriea', label: 'Serie A' }
	];

	let selectedPrefix = leagueConfig[0].prefix;
	let loading = false;
	let loadingAll = false;
	let status = '';

	async function importManagers(leagues) {
		const res = await fetch('/dev/managers', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ leagues })
		});
		return res.json();
	}

	async function handleSingle() {
		loading = true;
		status = `Importing ${selectedPrefix}...`;
		try {
			const data = await importManagers([selectedPrefix]);
			const r = data.results?.[0];
			status = r?.error
				? `❌ ${selectedPrefix}: ${r.error}`
				: `✅ ${selectedPrefix}: ${r?.imported}/${r?.total} managers`;
		} catch (err) {
			status = `❌ ${err.message}`;
		}
		loading = false;
	}

	async function handleAll() {
		loadingAll = true;
		status = 'Importing all leagues...';
		try {
			const data = await importManagers('all');
			status = (data.results || [])
				.map((r) =>
					r.error
						? `❌ ${r.league}: ${r.error}`
						: `✅ ${r.league}: ${r.imported}/${r.total}`
				)
				.join('\n');
		} catch (err) {
			status = `❌ ${err.message}`;
		}
		loadingAll = false;
	}
</script>

<div class="admin-panel">
	<h2>Manager Import</h2>

	<div class="single-section">
		<label for="league-select">Single League:</label>
		<div class="row">
			<select id="league-select" bind:value={selectedPrefix}>
				{#each leagueConfig as league}
					<option value={league.prefix}>{league.label}</option>
				{/each}
			</select>
			<button on:click={handleSingle} disabled={loading || loadingAll}>
				{loading ? 'Running...' : 'Import'}
			</button>
		</div>
	</div>

	<button class="all-btn" on:click={handleAll} disabled={loading || loadingAll}>
		{loadingAll ? 'Running All...' : 'Import All Leagues'}
	</button>

	{#if status}
		<pre class="status">{status}</pre>
	{/if}
</div>

<style>
	.admin-panel {
		max-width: 420px;
		padding: 1.5rem;
		border: 1px solid #333;
		border-radius: 8px;
		background: #1a1a1a;
		color: #eee;
		font-family: sans-serif;
	}
	h2 { margin-top: 0; }
	.single-section { margin-bottom: 1rem; }
	label { display: block; margin-bottom: 0.25rem; font-size: 0.85rem; color: #aaa; }
	.row { display: flex; gap: 0.5rem; }
	select {
		flex: 1; padding: 0.5rem; border-radius: 4px;
		border: 1px solid #555; background: #2a2a2a; color: #eee;
	}
	button {
		padding: 0.5rem 1rem; border: none; border-radius: 4px;
		background: #4a6cf7; color: #fff; cursor: pointer; font-weight: 600;
	}
	button:disabled { opacity: 0.5; cursor: not-allowed; }
	button:hover:not(:disabled) { background: #3b5de7; }
	.all-btn {
		width: 100%; padding: 0.75rem; font-size: 1.05rem; background: #2ea043;
	}
	.all-btn:hover:not(:disabled) { background: #278a38; }
	.status {
		margin-top: 1rem; padding: 0.75rem; background: #2a2a2a;
		border-radius: 4px; font-size: 0.85rem; white-space: pre-wrap; line-height: 1.5;
	}
</style>