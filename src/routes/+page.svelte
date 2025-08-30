<!-- src/routes/+page.svelte -->
<script lang="ts">
    import { authStore, isAuthenticated } from '$lib/stores/auth';
</script>

<div class="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
    <div class="text-center text-white">
        <h1 class="text-5xl font-bold mb-4">Auth Server</h1>
        <p class="text-xl mb-8">Secure centralized authentication for your applications</p>
        
        {#if $isAuthenticated}
            <a 
                href="/dashboard" 
                class="inline-block px-8 py-3 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-gray-100 transition"
            >
                Go to Dashboard
            </a>
        {:else}
            <div class="space-x-4">
                <a 
                    href="/login" 
                    class="inline-block px-8 py-3 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-gray-100 transition"
                >
                    Sign In
                </a>
                <a 
                    href="/register" 
                    class="inline-block px-8 py-3 bg-indigo-700 text-white rounded-lg font-semibold hover:bg-indigo-800 transition"
                >
                    Create Account
                </a>
            </div>
        {/if}
    </div>
</div>