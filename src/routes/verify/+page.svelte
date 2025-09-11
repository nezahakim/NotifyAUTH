<script lang="ts">
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import { authStore } from '$lib/stores/auth';
	import { page } from '$app/state';
	import { passwordStore, registerStore } from '$lib/stores/helper';
    
    let verifying = true;
    let error = '';
    
    onMount(async () => {
        const token = page.url.searchParams.get('token');
        const purpose = page.url.searchParams.get('purpose');
        
        if (!token) {
            error = 'Invalid verification link';
            verifying = false;
            return;
        }
        
        try {
            const response = await fetch('/api/auth/magic-link/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Verification failed');
            }
            
            if (data.purpose === 'login') {
                authStore.login(data.user, data.accessToken);
                goto('/dashboard');
            } else if (data.purpose === 'reset_password') {
                passwordStore.setEmailVerified({ status: true, email: data.user.email });
                goto(`/reset-password?email=${data.user.email}&verified=true`);
            }else if (data.purpose === 'code' && data.user.status) {
                registerStore.setEmailVerified({ status: data.user.status, email: $registerStore.email as string });
                goto(`/register?email=${data.user.email}&verified=true`);
            }
        } catch (err: any) {
            error = err.message;
        } finally {
            verifying = false;
        }
    });
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="max-w-md w-full p-8 bg-white rounded-lg shadow">
        {#if verifying}
            <div class="text-center">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <p class="mt-4">Verifying your link...</p>
            </div>
        {:else if error}
            <div class="text-center">
                <div class="bg-red-50 p-4 rounded-md">
                    <p class="text-red-800">{error}</p>
                </div>
                <a href="/login" class="mt-4 inline-block text-indigo-600 hover:text-indigo-500">
                    Back to login
                </a>
            </div>
        {/if}
    </div>
</div>