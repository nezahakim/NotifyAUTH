<!-- src/routes/reset-password/+page.svelte -->
<script lang="ts">
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    
    let email = '';
    let newPassword = '';
    let confirmPassword = '';
    let loading = false;
    let error = '';
    let success = false;
    let isVerified = false;
    
    // Check if coming from verified magic link
    $: isVerified = $page.url.searchParams.get('verified') === 'true';
    $: if (isVerified) {
        email = $page.url.searchParams.get('email') || '';
    }

    async function handleSendResetLink() {
        loading = true;
        error = '';
        
        try {
            const response = await fetch('/api/auth/magic-link/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, purpose: 'reset_password' })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to send reset link');
            }
            
            success = true;
        } catch (err) {
            error = err.message;
        } finally {
            loading = false;
        }
    }

    async function handleResetPassword() {
        if (newPassword !== confirmPassword) {
            error = 'Passwords do not match';
            return;
        }
        
        if (newPassword.length < 8) {
            error = 'Password must be at least 8 characters';
            return;
        }
        
        loading = true;
        error = '';
        
        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, newPassword })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to reset password');
            }
            
            goto('/login?reset=success');
        } catch (err) {
            error = err.message;
        } finally {
            loading = false;
        }
    }
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
            <h2 class="text-3xl font-bold text-center">Reset Password</h2>
            <p class="mt-2 text-center text-gray-600">
                {isVerified ? 'Create a new password' : 'We\'ll send you a reset link'}
            </p>
        </div>

        {#if success}
            <div class="bg-green-50 p-4 rounded-md">
                <p class="text-green-800">Reset link sent! Check your email to continue.</p>
            </div>
        {:else if isVerified}
            <form on:submit|preventDefault={handleResetPassword} class="space-y-6">
                {#if error}
                    <div class="bg-red-50 p-4 rounded-md">
                        <p class="text-red-800">{error}</p>
                    </div>
                {/if}

                <div>
                    <label for="newPassword" class="block text-sm font-medium text-gray-700">
                        New Password
                    </label>
                    <input
                        id="newPassword"
                        type="password"
                        bind:value={newPassword}
                        required
                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                </div>

                <div>
                    <label for="confirmPassword" class="block text-sm font-medium text-gray-700">
                        Confirm New Password
                    </label>
                    <input
                        id="confirmPassword"
                        type="password"
                        bind:value={confirmPassword}
                        required
                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    class="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                    {loading ? 'Resetting...' : 'Reset Password'}
                </button>
            </form>
        {:else}
            <form on:submit|preventDefault={handleSendResetLink} class="space-y-6">
                {#if error}
                    <div class="bg-red-50 p-4 rounded-md">
                        <p class="text-red-800">{error}</p>
                    </div>
                {/if}

                <div>
                    <label for="email" class="block text-sm font-medium text-gray-700">
                        Email Address
                    </label>
                    <input
                        id="email"
                        type="email"
                        bind:value={email}
                        required
                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    class="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                    {loading ? 'Sending...' : 'Send Reset Link'}
                </button>

                <div class="text-center text-sm">
                    <a href="/login" class="text-indigo-600 hover:text-indigo-500">
                        Back to login
                    </a>
                </div>
            </form>
        {/if}
    </div>
</div>