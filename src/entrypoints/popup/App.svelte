<script lang="ts">
	import finitudeLogo from "../../../public/icon/128.png?url";
	import "./app.css";
	import Checkbox from "$lib/components/ui/checkbox/checkbox.svelte";
	import Switch from "$lib/components/ui/switch/switch.svelte";
	import { Slider } from "$lib/components/ui/slider/index";
	import { PowerIcon, PowerOffIcon } from "lucide-svelte";
	import Button from "$lib/components/ui/button/button.svelte";

	let power = $state(true);
	let quantity = $state("24");
	let unit = $state("hours");
	let hideMostRelevantSection = $state(true);
	let hideShortsSection = $state(true);
	let hideWatchedVideos = $state(false);
	let hideVideoPercentage = $state(0.75);

	let loading = $state(true);
	let saving = $state(false);

	async function loadSettings() {
		try {
			const response = (await browser.runtime.sendMessage({
				type: "getFilterSettings",
			})) as
				| {
						power: boolean;
						quantity: string;
						unit: string;
						hideMostRelevantSection: boolean;
						hideShortsSection: boolean;
						hideWatchedVideos: boolean;
						hideVideoPercentage: number;
				  }
				| undefined;
			if (response) {
				power = response.power;
				quantity = response.quantity;
				unit = response.unit;
				hideMostRelevantSection = response.hideMostRelevantSection;
				hideShortsSection = response.hideShortsSection;
				hideWatchedVideos = response.hideWatchedVideos;
				hideVideoPercentage = response.hideVideoPercentage;
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
				power,
				unit,
				quantity,
				hideMostRelevantSection,
				hideShortsSection,
				hideWatchedVideos,
				hideVideoPercentage,
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
		<div class="flex flex-row">
			<img src={finitudeLogo} class="logo" alt="Finitude Logo" />
			<h1 class="pl-2">finitude</h1>
		</div>
		<div class="float-right">
			<Button
				onclick={() => {
					power = !power;
					handleChange();
				}}
			>
				{#if power}
					<PowerIcon />
				{:else}
					<PowerOffIcon />
				{/if}
			</Button>
		</div>
	</div>
	<div>
		{#if loading}
			<p>Loading...</p>
		{:else if !power}
			<p class="text-center">Finitude is disabled.</p>
		{:else}
			<div class="filter-controls">
				<label for="quantity">limit subscriptions to less than</label>
				<div class="input-row mb-4">
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

			<div class="flex flex-col gap-3">
				<label class="flex items-center justify-between gap-2 text-sm">
					<span>hide Most relevant section</span>
					<Switch
						checked={hideMostRelevantSection}
						onCheckedChange={(checked) => {
							hideMostRelevantSection = !!checked;
							handleChange();
						}}
					/>
				</label>
				<label class="flex items-center justify-between gap-2 text-sm">
					<span>hide Shorts section</span>
					<Switch
						checked={hideShortsSection}
						onCheckedChange={(checked) => {
							hideShortsSection = !!checked;
							handleChange();
						}}
					/>
				</label>
				<label class="flex items-center justify-between gap-2 text-sm">
					<span>hide watched videos</span>
					<Switch
						checked={hideWatchedVideos}
						onCheckedChange={(checked) => {
							hideWatchedVideos = !!checked;
							console.log({ hideWatchedVideos });
							handleChange();
						}}
					/>
				</label>
				<label class="flex items-center gap-2 text-sm">
					<span>hide videos at</span>
					<Slider
						class="max-w-[75px]"
						type="single"
						bind:value={hideVideoPercentage}
						onValueChange={handleChange}
						max={1}
						step={0.01}
					/>
					<span>{Math.round(hideVideoPercentage * 100)}% watched</span
					>
				</label>
			</div>
		{/if}

		{#if saving}
			<p class="saving">Saving...</p>
		{/if}
	</div>
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
