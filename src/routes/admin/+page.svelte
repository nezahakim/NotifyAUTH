<!-- src/routes/admin/+page.svelte -->
<script>
	import { supabase } from '$lib/server/supabase';
    import { onMount } from 'svelte';
    
    let activeTab = 'applications';
    let applications = [];
    let users = [];
    let userSessions = [];
    let authEvents = [];
    let loading = false;
    
    // Application form
    let newApp = {
      app_key: '',
      app_name: '',
      app_description: '',
      app_url: '',
      app_icon_url: '',
      is_active: true
    };
    
    // Edit states
    let editingApp = null;
    let editingUser = null;
    
    onMount(async () => {
      await loadData();
    });
    
    async function loadData() {
      loading = true;
      try {
        await Promise.all([
          loadApplications(),
          loadUsers(),
          loadUserSessions(),
          loadAuthEvents()
        ]);
      } catch (error) {
        console.error('Error loading data:', error);
      }
      loading = false;
    }
    
    async function loadApplications() {
      const { data, error } = await supabase
        .from('sso_applications')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      applications = data || [];
    }
    
    async function loadUsers() {
      const { data, error } = await supabase
        .from('user_profile_complete')
        .select('*')
        .order('user_created_at', { ascending: false });
      
      if (error) throw error;
      users = data || [];
    }
    
    async function loadUserSessions() {
      const { data, error } = await supabase
        .from('user_app_sessions')
        .select(`
          *,
          auth_users(email),
          sso_applications(app_name, app_key)
        `)
        .eq('is_active', true)
        .order('last_accessed_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      userSessions = data || [];
    }
    
    async function loadAuthEvents() {
      const { data, error } = await supabase
        .from('auth_events')
        .select(`
          *,
          auth_users(email),
          sso_applications(app_name, app_key)
        `)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      authEvents = data || [];
    }
    
    async function createApplication() {
      if (!newApp.app_key || !newApp.app_name) return;
      
      try {
        const { error } = await supabase
          .from('sso_applications')
          .insert([newApp]);
        
        if (error) throw error;
        
        // Reset form
        newApp = {
          app_key: '',
          app_name: '',
          app_description: '',
          app_url: '',
          app_icon_url: '',
          is_active: true
        };
        
        await loadApplications();
      } catch (error) {
        console.error('Error creating application:', error);
        alert('Error creating application: ' + error.message);
      }
    }
    
    async function updateApplication(app) {
      try {
        const { error } = await supabase
          .from('sso_applications')
          .update(app)
          .eq('id', app.id);
        
        if (error) throw error;
        
        editingApp = null;
        await loadApplications();
      } catch (error) {
        console.error('Error updating application:', error);
        alert('Error updating application: ' + error.message);
      }
    }
    
    async function deleteApplication(appId) {
      if (!confirm('Are you sure you want to delete this application?')) return;
      
      try {
        const { error } = await supabase
          .from('sso_applications')
          .delete()
          .eq('id', appId);
        
        if (error) throw error;
        await loadApplications();
      } catch (error) {
        console.error('Error deleting application:', error);
        alert('Error deleting application: ' + error.message);
      }
    }
    
    async function toggleUserStatus(userId, isActive) {
      try {
        const { error } = await supabase
          .from('auth_users')
          .update({ is_active: !isActive })
          .eq('id', userId);
        
        if (error) throw error;
        await loadUsers();
      } catch (error) {
        console.error('Error updating user status:', error);
        alert('Error updating user status: ' + error.message);
      }
    }
    
    async function revokeUserAppAccess(userId, appId) {
      if (!confirm('Are you sure you want to revoke this user\'s access to this app?')) return;
      
      try {
        const { error } = await supabase
          .from('user_app_access')
          .update({ is_active: false })
          .eq('user_id', userId)
          .eq('app_id', appId);
        
        if (error) throw error;
        await loadData();
      } catch (error) {
        console.error('Error revoking access:', error);
        alert('Error revoking access: ' + error.message);
      }
    }
    
    function formatDate(dateString) {
      return new Date(dateString).toLocaleString();
    }
  </script>
  
  <svelte:head>
    <title>SSO Admin Dashboard</title>
  </svelte:head>
  
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm border-b">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center py-6">
          <div class="flex items-center">
            <h1 class="text-3xl font-bold text-gray-900">SSO Admin Dashboard</h1>
          </div>
          <div class="flex items-center space-x-4">
            <span class="text-sm text-gray-500">Admin Portal</span>
            <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <span class="text-white text-sm font-medium">A</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  
    <!-- Navigation Tabs -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="border-b border-gray-200">
        <nav class="-mb-px flex space-x-8">
          {#each [
            { id: 'applications', label: 'Applications', icon: '🔧' },
            { id: 'users', label: 'Users', icon: '👥' },
            { id: 'sessions', label: 'Active Sessions', icon: '🔐' },
            { id: 'events', label: 'Auth Events', icon: '📊' }
          ] as tab}
            <button
              class="py-2 px-1 border-b-2 font-medium text-sm {activeTab === tab.id 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
              on:click={() => activeTab = tab.id}
            >
              {tab.icon} {tab.label}
            </button>
          {/each}
        </nav>
      </div>
    </div>
  
    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {#if loading}
        <div class="flex justify-center items-center h-64">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      {:else}
        
        <!-- Applications Tab -->
        {#if activeTab === 'applications'}
          <div class="space-y-6">
            <!-- Add New Application -->
            <div class="bg-white shadow rounded-lg p-6">
              <h2 class="text-lg font-medium text-gray-900 mb-4">Add New Application</h2>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  bind:value={newApp.app_key}
                  placeholder="App Key (e.g., gmail)"
                  class="border border-gray-300 rounded-md px-3 py-2"
                />
                <input
                  bind:value={newApp.app_name}
                  placeholder="App Name (e.g., Gmail)"
                  class="border border-gray-300 rounded-md px-3 py-2"
                />
                <input
                  bind:value={newApp.app_url}
                  placeholder="App URL"
                  class="border border-gray-300 rounded-md px-3 py-2"
                />
                <input
                  bind:value={newApp.app_icon_url}
                  placeholder="Icon URL (optional)"
                  class="border border-gray-300 rounded-md px-3 py-2"
                />
                <textarea
                  bind:value={newApp.app_description}
                  placeholder="Description"
                  class="border border-gray-300 rounded-md px-3 py-2 md:col-span-2"
                  rows="2"
                ></textarea>
              </div>
              <div class="mt-4 flex items-center space-x-4">
                <label class="flex items-center">
                  <input
                    type="checkbox"
                    bind:checked={newApp.is_active}
                    class="rounded border-gray-300"
                  />
                  <span class="ml-2 text-sm text-gray-700">Active</span>
                </label>
                <button
                  on:click={createApplication}
                  class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
                >
                  Add Application
                </button>
              </div>
            </div>
  
            <!-- Applications List -->
            <div class="bg-white shadow rounded-lg overflow-hidden">
              <div class="px-6 py-4 border-b border-gray-200">
                <h2 class="text-lg font-medium text-gray-900">Applications ({applications.length})</h2>
              </div>
              <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Application</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">URL</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    {#each applications as app}
                      <tr>
                        <td class="px-6 py-4 whitespace-nowrap">
                          <div class="flex items-center">
                            {#if app.app_icon_url}
                              <img src={app.app_icon_url} alt="" class="h-8 w-8 rounded mr-3" />
                            {:else}
                              <div class="h-8 w-8 bg-gray-200 rounded mr-3 flex items-center justify-center">
                                <span class="text-xs font-medium">{app.app_key.charAt(0).toUpperCase()}</span>
                              </div>
                            {/if}
                            <div>
                              <div class="text-sm font-medium text-gray-900">{app.app_name}</div>
                              <div class="text-sm text-gray-500">{app.app_key}</div>
                            </div>
                          </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {#if app.app_url}
                            <a href={app.app_url} target="_blank" class="text-blue-500 hover:text-blue-700">
                              {app.app_url}
                            </a>
                          {:else}
                            <span class="text-gray-400">No URL</span>
                          {/if}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                          <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full {app.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                            {app.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(app.created_at)}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            on:click={() => editingApp = editingApp?.id === app.id ? null : {...app}}
                            class="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                          <button
                            on:click={() => deleteApplication(app.id)}
                            class="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                      {#if editingApp?.id === app.id}
                        <tr class="bg-gray-50">
                          <td colspan="5" class="px-6 py-4">
                            <div class="grid grid-cols-2 gap-4">
                              <input
                                bind:value={editingApp.app_key}
                                placeholder="App Key"
                                class="border border-gray-300 rounded-md px-3 py-2"
                              />
                              <input
                                bind:value={editingApp.app_name}
                                placeholder="App Name"
                                class="border border-gray-300 rounded-md px-3 py-2"
                              />
                              <input
                                bind:value={editingApp.app_url}
                                placeholder="App URL"
                                class="border border-gray-300 rounded-md px-3 py-2"
                              />
                              <input
                                bind:value={editingApp.app_icon_url}
                                placeholder="Icon URL"
                                class="border border-gray-300 rounded-md px-3 py-2"
                              />
                              <textarea
                                bind:value={editingApp.app_description}
                                placeholder="Description"
                                class="border border-gray-300 rounded-md px-3 py-2 col-span-2"
                                rows="2"
                              ></textarea>
                            </div>
                            <div class="mt-4 flex items-center space-x-4">
                              <label class="flex items-center">
                                <input
                                  type="checkbox"
                                  bind:checked={editingApp.is_active}
                                  class="rounded border-gray-300"
                                />
                                <span class="ml-2 text-sm text-gray-700">Active</span>
                              </label>
                              <button
                                on:click={() => updateApplication(editingApp)}
                                class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md text-sm"
                              >
                                Save
                              </button>
                              <button
                                on:click={() => editingApp = null}
                                class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </tr>
                      {/if}
                    {/each}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        
        <!-- Users Tab -->
        {:else if activeTab === 'users'}
          <div class="bg-white shadow rounded-lg overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-200">
              <h2 class="text-lg font-medium text-gray-900">Users ({users.length})</h2>
            </div>
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  {#each users as user}
                    <tr>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                          {#if user.avatar_url}
                            <img src={user.avatar_url} alt="" class="h-10 w-10 rounded-full mr-3" />
                          {:else}
                            <div class="h-10 w-10 bg-gray-200 rounded-full mr-3 flex items-center justify-center">
                              <span class="text-sm font-medium">{user.email.charAt(0).toUpperCase()}</span>
                            </div>
                          {/if}
                          <div>
                            <div class="text-sm font-medium text-gray-900">{user.full_name || 'No name'}</div>
                            <div class="text-sm text-gray-500">{user.email}</div>
                            {#if user.username}
                              <div class="text-xs text-gray-400">@{user.username}</div>
                            {/if}
                          </div>
                        </div>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full {user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(user.user_created_at)}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          on:click={() => toggleUserStatus(user.id, user.is_active)}
                          class="{user.is_active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}"
                        >
                          {user.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
        
        <!-- Sessions Tab -->
        {:else if activeTab === 'sessions'}
          <div class="bg-white shadow rounded-lg overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-200">
              <h2 class="text-lg font-medium text-gray-900">Active Sessions ({userSessions.length})</h2>
            </div>
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Application</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Started</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Access</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  {#each userSessions as session}
                    <tr>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {session.auth_users?.email || 'Unknown'}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {session.sso_applications?.app_name || session.sso_applications?.app_key || 'Unknown'}
                        </span>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(session.started_at)}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(session.last_accessed_at)}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {session.ip_address || 'N/A'}
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
        
        <!-- Events Tab -->
        {:else if activeTab === 'events'}
          <div class="bg-white shadow rounded-lg overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-200">
              <h2 class="text-lg font-medium text-gray-900">Recent Auth Events ({authEvents.length})</h2>
            </div>
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Application</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  {#each authEvents as event}
                    <tr>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          {event.event_type === 'login' ? 'bg-green-100 text-green-800' : 
                           event.event_type === 'logout' ? 'bg-yellow-100 text-yellow-800' : 
                           event.event_type === 'app_access_granted' ? 'bg-blue-100 text-blue-800' : 
                           'bg-gray-100 text-gray-800'}">
                          {event.event_type}
                        </span>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {event.auth_users?.email || 'Unknown'}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {event.sso_applications?.app_name || 'System'}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(event.created_at)}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {event.ip_address || 'N/A'}
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
        {/if}
      {/if}
    </main>
  </div>
  
  <style>
    /* Custom scrollbar */
    :global(html) {
      scrollbar-width: thin;
      scrollbar-color: #cbd5e0 #f7fafc;
    }
    
    :global(::-webkit-scrollbar) {
      width: 6px;
      height: 6px;
    }
    
    :global(::-webkit-scrollbar-track) {
      background: #f7fafc;
    }
    
    :global(::-webkit-scrollbar-thumb) {
      background: #cbd5e0;
      border-radius: 3px;
    }
    
    :global(::-webkit-scrollbar-thumb:hover) {
      background: #a0aec0;
    }
  </style>