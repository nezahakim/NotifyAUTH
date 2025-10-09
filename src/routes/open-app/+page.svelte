<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

    let deepLink = $state('')

    onMount(()=>{
        const token = new URLSearchParams(window.location.search).get('token') as string;
        if(!token){
            goto('/login');
        }
        deepLink = `deliveryplus://callback?token=${encodeURIComponent(token)}`;
    })
    

  </script>

  <main class="flex justify-center items-center h-screen">
    <a href={deepLink} class=" bg-green-500 text-xl text-amber-100 font-bold rounded-full py-4 px-6 ">
        Back to App
    </a>
  </main>


  