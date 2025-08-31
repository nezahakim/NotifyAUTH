
<script lang="ts">
    import { authStore } from '$lib/stores/auth';
    import { goto } from '$app/navigation';
    
    async function handleLogout() {
        authStore.logout();
        goto('/login');
    }
</script>

<div class="min-h-screen bg-gray-50">
    <nav class="bg-white shadow">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16">
                <div class="flex items-center">
                    <h1 class="text-xl font-semibold">Dashboard</h1>
                </div>
                <div class="flex items-center space-x-4">
                    <span class="text-gray-700">{$authStore.user?.email}</span>
                    <button
                        on:click={handleLogout}
                        class="text-gray-500 hover:text-gray-700"
                    >
                        Logout
                    </button>
                </div>
            </div>
        </div>
    </nav>

    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div class="px-4 py-6 sm:px-0">
            <div class="bg-white overflow-hidden shadow rounded-lg">
                <div class="px-4 py-5 sm:p-6">
                    <h2 class="text-lg font-medium text-gray-900 mb-4">Welcome to your dashboard</h2>
                    <p class="text-gray-600">You are successfully authenticated!</p>
                    
                    <div class="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
                        <div class="bg-gray-50 p-4 rounded">
                            <dt class="text-sm font-medium text-gray-500">User ID</dt>
                            <dd class="mt-1 text-sm text-gray-900">{$authStore.user?.id}</dd>
                        </div>
                        <div class="bg-gray-50 p-4 rounded">
                            <dt class="text-sm font-medium text-gray-500">Email</dt>
                            <dd class="mt-1 text-sm text-gray-900">{$authStore.user?.email}</dd>
                        </div>
                        <div class="bg-gray-50 p-4 rounded">
                            <dt class="text-sm font-medium text-gray-500">Role</dt>
                            <dd class="mt-1 text-sm text-gray-900">{$authStore.user?.role}</dd>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>
</div> 