<script lang="ts">
	import finitudeLogo from "../../../public/icon/128.png";
	import "./app.css";

	let quantity = $state("24");
	let unit = $state("hours");
	let loading = $state(true);
	let saving = $state(false);

	async function loadSettings() {
		try {
			const response = (await browser.runtime.sendMessage({
				type: "getFilterSettings",
			})) as { quantity: string; unit: string } | undefined;
			if (response) {
				quantity = response.quantity;
				unit = response.unit;
			}
		} catch (err) {
			console.error("[Popup] Error loading settings:", err);
		} finally {
			loading = false;
		}
	}

	async function saveSettings() {
		saving = true;
		try {
			await browser.runtime.sendMessage({
				type: "saveFilterSettings",
				unit,
				quantity,
			});
		} catch (err) {
			console.error("[Popup] Error saving settings:", err);
		} finally {
			saving = false;
		}
	}

	function handleChange() {
		saveSettings();
	}

	loadSettings();
</script>

<main>
	<div class="header">
		<img src={finitudeLogo} class="logo" alt="Finitude Logo" />
		<h1>Finitude</h1>
	</div>

	{#if loading}
		<p>Loading...</p>
	{:else}
		<div class="filter-controls">
			<label for="quantity">Limit subscriptions to</label>
			<div class="input-row">
				<input
					type="number"
					id="quantity"
					name="quantity"
					min="1"
					bind:value={quantity}
					onchange={handleChange}
				/>
				<select
					id="unit"
					name="unit"
					bind:value={unit}
					onchange={handleChange}
				>
					<option value="hours">hours</option>
					<option value="days">days</option>
					<option value="weeks">weeks</option>
					<option value="months">months</option>
				</select>
			</div>
		</div>
	{/if}

	{#if saving}
		<p class="saving">Saving...</p>
	{/if}
</main>

<style>
	.header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.logo {
		height: 2rem;
		width: 2rem;
	}

	h1 {
		font-size: 1.25rem;
		margin: 0;
	}

	.filter-controls {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.input-row {
		display: flex;
		gap: 0.5rem;
	}

	input {
		width: 60px;
	}

	select {
		flex: 1;
	}

	.saving {
		font-size: 0.75rem;
		color: #666;
	}
</style>
