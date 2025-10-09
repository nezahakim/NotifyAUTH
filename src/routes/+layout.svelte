<script lang="ts">
	import '../app.css';
	import logo from '$lib/assets/logo-mini.jpg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={logo} />
	<title>NotifyAuth</title>
</svelte:head>

{@render children?.()}
