<!-- src/routes/register/+page.svelte -->
<script lang="ts">
    import { goto } from '$app/navigation';
    import { authStore } from '$lib/stores/auth';
    
    let email = '';
    let password = '';
    let confirmPassword = '';
    let loading = false;
    let error = '';
    let validationErrors: Record<string, string> = {};

    function validateForm() {
        validationErrors = {};
        
        if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            validationErrors.email = 'Invalid email address';
        }
        
        if (password.length < 8) {
            validationErrors.password = 'Password must be at least 8 characters';
        }
        
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
            validationErrors.password = 'Password must contain uppercase, lowercase, and numbers';
        }
        
        if (password !== confirmPassword) {
            validationErrors.confirmPassword = 'Passwords do not match';
        }
        
        return Object.keys(validationErrors).length === 0;
    }

    async function handleRegister() {
        if (!validateForm()) return;
        
        loading = true;
        error = '';
        
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }
            
            authStore.login(data.user, data.accessToken);
            goto('/dashboard');
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
            <h2 class="text-3xl font-bold text-center">Create Account</h2>
            <p class="mt-2 text-center text-gray-600">Join our platform</p>
        </div>

        <form on:submit|preventDefault={handleRegister} class="space-y-6">
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
                    class:border-red-500={validationErrors.email}
                />
                {#if validationErrors.email}
                    <p class="mt-1 text-sm text-red-600">{validationErrors.email}</p>
                {/if}
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
                    class:border-red-500={validationErrors.password}
                />
                {#if validationErrors.password}
                    <p class="mt-1 text-sm text-red-600">{validationErrors.password}</p>
                {/if}
            </div>

            <div>
                <label for="confirmPassword" class="block text-sm font-medium text-gray-700">
                    Confirm Password
                </label>
                <input
                    id="confirmPassword"
                    type="password"
                    bind:value={confirmPassword}
                    required
                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    class:border-red-500={validationErrors.confirmPassword}
                />
                {#if validationErrors.confirmPassword}
                    <p class="mt-1 text-sm text-red-600">{validationErrors.confirmPassword}</p>
                {/if}
            </div>

            <div>
                <button
                    type="submit"
                    disabled={loading}
                    class="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                    {loading ? 'Creating account...' : 'Create Account'}
                </button>
            </div>

            <div class="text-center text-sm">
                <span class="text-gray-600">Already have an account?</span>
                <a href="/login" class="ml-1 text-indigo-600 hover:text-indigo-500">
                    Sign in
                </a>
            </div>
        </form>
    </div>
</div>