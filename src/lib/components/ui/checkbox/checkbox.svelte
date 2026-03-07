<script lang="ts">
	import { Checkbox as CheckboxPrimitive } from "bits-ui";
	import { cn } from "$lib/utils";
	import Check from "lucide-svelte/icons/check";

	type Props = CheckboxPrimitive.RootProps & {
		class?: string;
	};

	let { class: className, checked = $bindable(false), ...restProps }: Props = $props();
</script>

<CheckboxPrimitive.Root
	class={cn(
		"peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
		className
	)}
	bind:checked
	{...restProps}
>
	{#snippet children({ checked })}
		<div class="flex h-4 w-4 items-center justify-center text-current">
			{#if checked}
				<Check class="h-3 w-3" />
			{/if}
		</div>
	{/snippet}
</CheckboxPrimitive.Root>
