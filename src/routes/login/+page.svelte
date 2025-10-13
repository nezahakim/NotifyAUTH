<script lang="ts">
    import { goto } from '$app/navigation';
    import { authStore } from '$lib/stores/auth';
    
    let email = $state('');
    let password = $state('');
    let loading = $state(false);
    let error = $state('');
    let magicLinkSent = $state(false);
    let loginMethod =  $state('password');
    let has_redirect = $state<boolean>(false);
    let redirect = $state<any | string>('');

async function handleLogin(e: any) {
    e.preventDefault();

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
        redirect = params.get('redirect') as string;

        if(redirect && redirect.length > 0){
          has_redirect = true;
        }
        
        authStore.login(data.user, data.accessToken);

        if (redirect) {
          
          if(redirect == 'deliveryplus://callback'){
            window.location.href = 'https://auth.notifycode.org/open-app?token='+encodeURIComponent(data.refresh_token);
          }else{
            window.location.href = `${redirect}?token=${encodeURIComponent(data.refresh_token)}`;
          }

        } else {
            goto('https://account.notifycode.org');
        }
    } catch (err: any) {
        error = err.message;
    } finally {
        loading = false;
    }
}

async function handleMagicLink(e: any) {
    e.preventDefault();

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

<main class="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-16 md:px-8 lg:px-12">
   
  <div class="w-full max-w-md">

     <!-- Top Brand -->
     <div class="absolute top-6 md:top-8">
        <div class="border border-gray-300 rounded-full px-3 py-.5 ">
          <span class="text-xs md:text-sm font-medium text-gray-700 tracking-wide">NotifyAUTH+</span>
        </div>
      </div> 
    
    {#if magicLinkSent}
      <!-- Magic Link Sent -->
      <div class="mb-16 md:mb-20">
        <h1 class="text-4xl md:text-5xl lg:text-6xl font-light text-black mb-8 md:mb-12 leading-none tracking-tight">
          Check Your Email
        </h1>
        
        <p class="text-lg md:text-xl text-gray-600 leading-relaxed font-normal">
          We've sent a magic link to <span class="text-gray-800">{email}</span>
        </p>
      </div>
    {:else}
      <form onsubmit={loginMethod === 'password' ? handleLogin : handleMagicLink}>
        
        <!-- Login Header -->
        <div class="mb-16 md:mb-20">
          <h1 class="text-4xl md:text-5xl lg:text-6xl font-light text-black mb-8 md:mb-12 leading-none tracking-tight">
            Welcome Back
          </h1>
          
          <p class="text-lg md:text-xl text-gray-600 mb-16 md:mb-20 leading-relaxed font-normal">
            Sign in to your account to continue.
          </p>
        </div>

        <!-- Email Input -->
        <div class="mb-8 md:mb-12">
          <input
            type="email"
            placeholder="Email"
            class="w-full focus:ring-0 text-lg md:text-xl py-4 md:py-6 border-0 border-b border-gray-200 bg-transparent focus:outline-none focus:border-gray-800 transition-colors duration-300 placeholder-gray-400"
            bind:value={email}
            required
          />
        </div>

        <!-- Password Input (only when password method selected) -->
        {#if loginMethod === 'password'}
          <div class="mb-8 md:mb-12">
            <input
              type="password"
              placeholder="Password"
              class="w-full focus:ring-0 text-lg md:text-xl py-4 md:py-6 border-0 border-b border-gray-200 bg-transparent focus:outline-none focus:border-gray-800 transition-colors duration-300 placeholder-gray-400"
              bind:value={password}
              required
            />
          </div>
        {/if}

        <!-- Method Toggle -->
        <div class="mb-12 md:mb-16 flex flex-row items-center justify-end">
          <!-- <button
            type="button"
            onclick={() => loginMethod = loginMethod === 'password' ? 'magic' : 'password'}
            class="text-gray-600 hover:text-gray-800 text-sm md:text-base transition-colors duration-200 underline underline-offset-4"
          >
            {loginMethod === 'password' ? 'Use a Link instead' : 'Use password instead'}
          </button> -->

          {#if loginMethod === 'password'}
            <p class="text-gray-500 text-base md:text-lg">
            <a href="/reset-password" class="text-gray-800 hover:text-black transition-colors duration-200 font-medium">
                Forgot password?
            </a>
            </p>
        {/if}
        </div>

        <!-- Single Action Button -->
        <button
          type="submit"
          class="w-full bg-gray-800 text-white text-lg md:text-xl py-4 md:py-6 rounded-full font-medium hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading || (loginMethod === 'magic' && !email)}
        >
          {#if loginMethod === 'password'}
            {loading ? 'Signing in...' : 'Sign In'}
          {:else}
            {loading ? 'Sending Link...' : 'Send a Link'}
          {/if}
        </button>

        <!-- Error Message -->
        {#if error}
          <div class="mt-8 md:mt-12">
            <p class="text-red-500 text-base md:text-lg">{error}</p>
          </div>
        {/if}

      </form>
    {/if}

    <!-- Signup Link -->
    <div class="mt-16 md:mt-20 text-left">
      <p class="text-gray-500 text-base md:text-lg px-3 py-.5 ">
          Don't have an account? 
          <a href={`${has_redirect ? '/register?redirect='+redirect : '/register'}`} class="text-gray-800 hover:text-black transition-colors duration-200 font-medium">
            Sign up
          </a>
      </p>
    </div>

  </div>

</main>