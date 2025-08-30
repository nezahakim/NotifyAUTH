<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();


	import { onMount } from 'svelte';
    import { authStore } from '$lib/stores/auth';
    import { browser } from '$app/environment';
    
    onMount(() => {
        if (browser) {
            refreshTokenOnLoad();
        }
    });
    
    async function refreshTokenOnLoad() {
        try {
            const response = await fetch('/api/auth/refresh', {
                method: 'POST',
                credentials: 'include'
            });
            
            if (response.ok) {
                const { accessToken } = await response.json();
                // Decode token to get user info
                const payload = JSON.parse(atob(accessToken.split('.')[1]));
                authStore.login({
                    id: payload.sub,
                    email: payload.email,
                    role: payload.role
                }, accessToken);
            }
        } catch (err) {
            console.error('Token refresh failed:', err);
        }
    }
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children?.()}
