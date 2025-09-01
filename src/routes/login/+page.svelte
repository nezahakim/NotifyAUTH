<!-- src/routes/login/+page.svelte -->
<script lang="ts">
    import { goto } from '$app/navigation';
    import { authStore } from '$lib/stores/auth';
    
    let email = '';
    let password = '';
    let loading = false;
    let error = '';
    let magicLinkSent = false;

    // async function handleLogin() {
    //     loading = true;
    //     error = '';
        
    //     try {
    //         const response = await fetch('/api/auth/login', {
    //             method: 'POST',
    //             headers: { 'Content-Type': 'application/json' },
    //             body: JSON.stringify({ email, password })
    //         });
            
    //         const data = await response.json();
            
    //         if (!response.ok) {
    //             throw new Error(data.error || 'Login failed');
    //         }
            
    //         authStore.login(data.user, data.accessToken);
    //         goto('/dashboard');
    //     } catch (err: any) {
    //         error = err.message;
    //     } finally {
    //         loading = false;
    //     }
    // }

async function handleLogin() {
    loading = true;
    error = '';

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }

        const params = new URLSearchParams(window.location.search);
        const redirect = params.get('redirect');
        
        authStore.login(data.user, data.accessToken);

        if (redirect) {
            window.location.href = `${redirect}?token=${encodeURIComponent(data.accessToken)}`;
        } else {
            goto('/dashboard');
        }
    } catch (err: any) {
        error = err.message;
    } finally {
        loading = false;
    }
}


    async function handleMagicLink() {
        loading = true;
        error = '';
        
        try {
            const response = await fetch('/api/auth/magic-link/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, purpose: 'login' })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to send magic link');
            }
            
            magicLinkSent = true;
        } catch (err: any) {
            error = err.message;
        } finally {
            loading = false;
        }
    }
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
            <h2 class="text-3xl font-bold text-center">Sign In</h2>
            <p class="mt-2 text-center text-gray-600">Access your account</p>
        </div>

        {#if magicLinkSent}
            <div class="bg-green-50 p-4 rounded-md">
                <p class="text-green-800">Magic link sent! Check your email to continue.</p>
            </div>
        {:else}
            <form on:submit|preventDefault={handleLogin} class="space-y-6">
                {#if error}
                    <div class="bg-red-50 p-4 rounded-md">
                        <p class="text-red-800">{error}</p>
                    </div>
                {/if}

                <div>
                    <label for="email" class="block text-sm font-medium text-gray-700">
                        Email
                    </label>
                    <input
                        id="email"
                        type="email"
                        bind:value={email}
                        required
                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                </div>

                <div>
                    <label for="password" class="block text-sm font-medium text-gray-700">
                        Password
                    </label>
                    <input
                        id="password"
                        type="password"
                        bind:value={password}
                        required
                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                </div>

                <div>
                    <button
                        type="submit"
                        disabled={loading}
                        class="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </div>

                <div class="relative">
                    <div class="absolute inset-0 flex items-center">
                        <div class="w-full border-t border-gray-300"></div>
                    </div>
                    <div class="relative flex justify-center text-sm">
                        <span class="px-2 bg-white text-gray-500">Or</span>
                    </div>
                </div>

                <button
                    type="button"
                    on:click={handleMagicLink}
                    disabled={loading || !email}
                    class="w-full py-2 px-4 bg-gray-800 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
                >
                    Send Magic Link
                </button>

                <div class="flex items-center justify-between text-sm">
                    <a href="/register" class="text-indigo-600 hover:text-indigo-500">
                        Create account
                    </a>
                    <a href="/reset-password" class="text-indigo-600 hover:text-indigo-500">
                        Forgot password?
                    </a>
                </div>
            </form>
        {/if}
    </div>
</div>