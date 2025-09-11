<script lang="ts">
    import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { passwordStore } from '$lib/stores/helper';
	import { onMount } from 'svelte';
    
    let email = $state('');
    let newPassword = $state('');
    let confirmPassword = $state('');
    let loading = $state(false);
    let error = $state('');
    let success = $state(false);
    let isVerified = $derived<boolean>($passwordStore.isEmailVerified);

    async function handleSendResetLink(e:any) {
        e.preventDefault();


        loading = true;
        error = '';
        try {
            const response = await fetch('/api/auth/magic-link/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, purpose: 'reset_password' })
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Failed to send reset link');

            success = true;
        } catch (err: any) {
            error = err.message;
        } finally {
            loading = false;
        }
    }

    async function handleResetPassword(e:any) {
        e.preventDefault();
        
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

            if (!response.ok) throw new Error(data.error || 'Failed to reset password');

            goto('/login?reset=success');
        } catch (err: any) {
            error = err.message;
        } finally {
            loading = false;
        }
    }

onMount(()=>{
    const email = page.url.searchParams.get('email');
    const verified = page.url.searchParams.get('verified');

    if( email && verified){
          if(email === $passwordStore.email && verified === $passwordStore.isEmailVerified.toString()){
           isVerified = true;
          }else{
            isVerified = false;
            passwordStore.reset()
            goto('/reset-password');
          }
    }
  
})

</script>

<main class="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-16 md:px-8 lg:px-12">
    <div class="w-full max-w-md">
<!-- Top Brand -->
<div class="absolute top-6 md:top-8">
    <div class="border border-gray-300 rounded-full px-3 py-.5 ">
      <span class="text-xs md:text-sm font-medium text-gray-700 tracking-wide">NotifyAUTH+</span>
    </div>
  </div>   

        <!-- Heading -->
        <div class="mb-16 md:mb-20">
            <h1 class="text-4xl md:text-5xl lg:text-6xl font-light text-black mb-8 md:mb-12 leading-none tracking-tight">
                {isVerified ? 'Create Password' : 'Reset Password'}
            </h1>

            <p class="text-lg md:text-xl text-gray-600 leading-relaxed font-normal">
                {isVerified
                    ? 'Choose a new password to secure your account.'
                    : 'We’ll send you a reset link to get you back in.'}
            </p>
        </div>

        {#if success}
            <div class="mb-12 md:mb-16 bg-green-50 p-4 rounded-md">
                <p class="text-green-800 text-base md:text-lg">
                    Reset link sent! Check your email to continue.
                </p>
            </div>
        {:else if isVerified}
            <!-- Password Reset Form -->
            <form onsubmit={handleResetPassword}>
                {#if error}
                    <div class="mb-8 bg-red-50 p-4 rounded-md">
                        <p class="text-red-800 text-base md:text-lg">{error}</p>
                    </div>
                {/if}

                <div class="mb-8 md:mb-12">
                    <input
                        type="password"
                        placeholder="New Password"
                        bind:value={newPassword}
                        required
                        class="w-full focus:ring-0 text-lg md:text-xl py-4 md:py-6 border-0 border-b border-gray-200 bg-transparent focus:outline-none focus:border-gray-800 transition-colors duration-300 placeholder-gray-400"
                    />
                </div>

                <div class="mb-12 md:mb-16">
                    <input
                        type="password"
                        placeholder="Confirm New Password"
                        bind:value={confirmPassword}
                        required
                        class="w-full focus:ring-0 text-lg md:text-xl py-4 md:py-6 border-0 border-b border-gray-200 bg-transparent focus:outline-none focus:border-gray-800 transition-colors duration-300 placeholder-gray-400"
                    />
                </div>

                <button
                    type="submit"
                    class="w-full bg-gray-800 text-white text-lg md:text-xl py-4 md:py-6 rounded-full font-medium hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading}
                >
                    {loading ? 'Resetting...' : 'Reset Password'}
                </button>
            </form>

        {:else}
            <!-- Email Form -->
            <form onsubmit={handleSendResetLink}>
                {#if error}
                    <div class="mb-8 bg-red-50 p-4 rounded-md">
                        <p class="text-red-800 text-base md:text-lg">{error}</p>
                    </div>
                {/if}

                <div class="mb-12 md:mb-16">
                    <input
                        type="email"
                        placeholder="Email"
                        bind:value={email}
                        required
                        class="w-full focus:ring-0 text-lg md:text-xl py-4 md:py-6 border-0 border-b border-gray-200 bg-transparent focus:outline-none focus:border-gray-800 transition-colors duration-300 placeholder-gray-400"
                    />
                </div>

                <button
                    type="submit"
                    class="w-full bg-gray-800 text-white text-lg md:text-xl py-4 md:py-6 rounded-full font-medium hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading}
                >
                    {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
            </form>
        {/if}

         <!-- Login Link -->
      <div class="absolute bottom-6 md:bottom-8 text-left">
        <p class="text-gray-500 text-base md:text-lg px-3 py-.5 ">
            Remember your password?
          <a href="/login" class="text-gray-800 hover:text-black transition-colors duration-200 font-medium">
            Sign in
          </a>
        </p>
      </div>

    </div>
</main>
