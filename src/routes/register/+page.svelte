<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/state";
      import { registerStore } from "$lib/stores/helper";
      import { onMount } from "svelte";
  
      let email = $state('');
      let password = $state('');
      let confirmPassword = $state('');
    
      let emailVerified = $derived<boolean>($registerStore.isEmailVerified);
  
      let codeSent = $state(false);
      let loading = $state(false);
      let error = $state('');
      let success = $state('');

      let countDown = $state(0);
      let timer: NodeJS.Timeout;
      let countDone = $state(false);

      function startCountdown() {
        timer = setInterval(() => {
          if (countDown > 0) {
            countDown -= 1;
          } else {
            countDone = true;
            clearInterval(timer);
          }
        }, 1000);
      }
    
      // Send verification link to email
      async function sendVerificationEmail(e: any) {
        e.preventDefault();
        
        loading = true;
        error = '';
        success = '';
    
        try {
          const res = await fetch('/api/auth/magic-link/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, purpose: 'code' })
          });
    
          if (!res.ok) throw new Error('Failed to send verification link.');
    
          codeSent = true;
          success = 'A verification link has been sent to your email. Please click the link to verify your email.';


          if (codeSent && countDown === 0 && !countDone) {
            countDown = 59;
            startCountdown();
          }

        } catch (err: any) {
          error = err.message || 'Something went wrong.';
        } finally {
          loading = false;
        }
      }
    
      // Register user
      async function register(e: any) {
        e.preventDefault();

        loading = true;
        error = '';
        success = '';
    
        if (password !== confirmPassword) {
          error = "Passwords don't match.";
          loading = false;
          return;
        }
    
        try {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
    
          if (!res.ok) throw new Error('Registration failed.');
    
          success = 'Registration successful!';
        } catch (err: any) {
          error = err.message || 'Something went wrong.';
        } finally {
          loading = false;
        }
      }
  
      onMount(()=>{
        const email = page.url.searchParams.get('email');
        const verified = page.url.searchParams.get('verified');
  
        if( email && verified){
          if(email === $registerStore.email && verified === $registerStore.isEmailVerified.toString()){
           emailVerified = true;
          }else{
            emailVerified = false;
            registerStore.reset()
            // goto('/register');
            console.log('--- IGNORE ---)
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

      <form onsubmit={emailVerified ? register : sendVerificationEmail}>
        
        {#if !emailVerified}
          <!-- Email Step -->
          <div class="mb-16 md:mb-20">
            <h1 class="text-4xl md:text-5xl lg:text-6xl font-light text-black mb-8 md:mb-12 leading-none tracking-tight">
              Verify Your Email
            </h1>
            
            <p class="text-lg md:text-xl text-gray-600 mb-16 md:mb-20 leading-relaxed font-normal">
              We'll send you a verification link to make sure it's really you.
            </p>
          </div>
  
          {#if codeSent}
            <div class="mb-12 md:mb-16">
              <p class="text-base md:text-lg text-gray-800 mb-2">Check your email</p>
              <p class="text-sm md:text-base text-gray-500">
                We sent a link to <span class="text-gray-800">{email}</span>
              </p>
            </div>
          {:else}
            <div class="mb-12 md:mb-16">
              <input
                type="email"
                placeholder="Email"
                class="w-full text-lg md:text-xl py-4 md:py-6 border-0 border-b border-gray-200 bg-transparent focus:outline-none focus:ring-0 focus:border-gray-800 transition-colors duration-300 placeholder-gray-400"
                bind:value={email}
                required
                disabled={codeSent}
              />
            </div>
          {/if}
  
          <button
            type="submit"
            class="w-full bg-gray-800 text-white text-lg md:text-xl py-4 md:py-6 rounded-full font-medium hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || (codeSent && countDown > 0)}
          >
            {loading ? 'Sending...' : codeSent ? `Resend${countDone ? '': ' in '+ countDown} `: 'Continue'}
          </button>
  
        {:else}
          <!-- Password Step -->
          <div class="mb-16 md:mb-20">
            <h1 class="text-4xl md:text-5xl lg:text-6xl font-light text-black mb-8 md:mb-12 leading-none tracking-tight">
              Create Password
            </h1>
            
            <p class="text-lg md:text-xl text-gray-600 mb-16 md:mb-20 leading-relaxed font-normal">
              Choose a strong password to secure your account.
            </p>
          </div>
  
          <div class="mb-8 md:mb-12">
            <input
              type="password"
              placeholder="Password"
              class="w-full text-lg md:text-xl py-4 md:py-6 border-0 border-b border-gray-200 bg-transparent focus:outline-none focus:border-gray-800 transition-colors duration-300 placeholder-gray-400"
              bind:value={password}
              required
            />
          </div>
  
          <div class="mb-12 md:mb-16">
            <input
              type="password"
              placeholder="Confirm Password"
              class="w-full text-lg md:text-xl py-4 md:py-6 border-0 border-b border-gray-200 bg-transparent focus:outline-none focus:border-gray-800 transition-colors duration-300 placeholder-gray-400"
              bind:value={confirmPassword}
              required
            />
          </div>
  
          <button
            type="submit"
            class="w-full bg-gray-800 text-white text-lg md:text-xl py-4 md:py-6 rounded-full font-medium hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        {/if}
  
        <!-- Messages -->
        {#if error}
          <div class="mt-8 md:mt-12">
            <p class="text-red-500 text-base md:text-lg">{error}</p>
          </div>
        {/if}
  
        {#if success && !codeSent}
          <div class="mt-8 md:mt-12">
            <p class="text-green-600 text-base md:text-lg">{success}</p>
          </div>
        {/if}
  
      </form>

      <!-- Login Link -->
      <div class="absolute bottom-6 md:bottom-8 text-left">
        <p class="text-gray-500 text-base md:text-lg px-3 py-.5 ">
          Already have an account? 
          <a href="/login" class="text-gray-800 hover:text-black transition-colors duration-200 font-medium">
            Sign in
          </a>
        </p>
      </div>

    </div>
  
    

  </main>