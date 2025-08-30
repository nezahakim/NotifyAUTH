<!-- 
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
</div>  -->

<!-- src/routes/dashboard/+page.svelte -->
<script lang="ts">
	import { supabase } from '$lib/server/supabase';
    import { onMount } from 'svelte';
    
    let activeTab = 'profile';
    let user: { full_name: any; email: string; avatar_url: any; email_verified: any; } | null = null;
    let userProfile: {username:any, full_name: any; avatar_url: any; phone: any
        company: any;
          job_title: any;
          location: any;
          bio: any;
          website_url: any;
    } | null = null;
    
    let userApps: string | any[] = [];
    let recentSessions: any[] = [];
    let loading = false;
    let saving = false;
    
    // Get current user (this would come from your auth context)
    let currentUserId = 'current-user-id'; // Replace with actual user ID from auth
    
    onMount(async () => {
      await loadUserData();
    });
    
    async function loadUserData() {
      loading = true;
      try {
        await Promise.all([
          loadUserProfile(),
          loadUserApps(),
          loadRecentSessions()
        ]);
      } catch (error) {
        console.error('Error loading user data:', error);
      }
      loading = false;
    }
    
    async function loadUserProfile() {
      const { data, error } = await supabase
        .from('user_profile_complete')
        .select('*')
        .eq('id', currentUserId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        user = data;
        userProfile = {
          username: data.username || '',
          full_name: data.full_name || '',
          avatar_url: data.avatar_url || '',
          phone: data.phone || '',
          company: data.company || '',
          job_title: data.job_title || '',
          location: data.location || '',
          bio: data.bio || '',
          website_url: data.website_url || ''
        };
      }
    }
    
    async function loadUserApps() {
      const { data, error } = await supabase
        .from('user_app_access_details')
        .select('*')
        .eq('user_id', currentUserId)
        .eq('is_active', true)
        .eq('access_valid', true);
      
      if (error) throw error;
      userApps = data || [];
    }
    
    async function loadRecentSessions() {
      const { data, error } = await supabase
        .from('user_app_sessions')
        .select(`
          *,
          sso_applications(app_name, app_key, app_icon_url)
        `)
        .eq('user_id', currentUserId)
        .order('last_accessed_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      recentSessions = data || [];
    }
    
    async function updateProfile() {
      saving = true;
      try {
        // First check if profile exists
        const { data: existingProfile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('user_id', currentUserId)
          .single();
        
        if (existingProfile) {
          // Update existing profile
          const { error } = await supabase
            .from('user_profiles')
            .update(userProfile)
            .eq('user_id', currentUserId);
          
          if (error) throw error;
        } else {
          // Create new profile
          const { error } = await supabase
            .from('user_profiles')
            .insert([{ ...userProfile, user_id: currentUserId }]);
          
          if (error) throw error;
        }
        
        alert('Profile updated successfully!');
        await loadUserProfile();
      } catch (error: any) {
        console.error('Error updating profile:', error);
        alert('Error updating profile: ' + error.message);
      }
      saving = false;
    }
    
    async function disconnectApp(appId: any) {
      if (!confirm('Are you sure you want to disconnect from this app?')) return;
      
      try {
        const { error } = await supabase
          .from('user_app_access')
          .update({ is_active: false })
          .eq('user_id', currentUserId)
          .eq('app_id', appId);
        
        if (error) throw error;
        
        // Also deactivate sessions
        await supabase
          .from('user_app_sessions')
          .update({ is_active: false })
          .eq('user_id', currentUserId)
          .eq('app_id', appId);
        
        await loadUserData();
      } catch (error: any) {
        console.error('Error disconnecting app:', error);
        alert('Error disconnecting app: ' + error.message);
      }
    }
    
    function formatDate(dateString: string | number | Date) {
      return new Date(dateString).toLocaleString();
    }
    
    function getRelativeTime(dateString: string | number | Date) {
      const now = new Date() as any;
      const date = new Date(dateString) as any;
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    }
  </script>
  
  <svelte:head>
    <title>My Dashboard - SSO</title>
  </svelte:head>
  
  <div class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
    <!-- Header -->
    <header class="bg-white shadow-sm border-b backdrop-blur-sm">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center py-6">
          <div class="flex items-center space-x-4">
            <div class="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span class="text-white text-lg font-bold">S</span>
            </div>
            <div>
              <h1 class="text-2xl font-bold text-gray-900">My Dashboard</h1>
              <p class="text-sm text-gray-500">Manage your SSO profile and applications</p>
            </div>
          </div>
          <div class="flex items-center space-x-4">
            {#if user}
              <div class="text-right">
                <p class="text-sm font-medium text-gray-900">{user.full_name || user.email}</p>
                <p class="text-xs text-gray-500">{user.email}</p>
              </div>
              {#if user.avatar_url}
                <img src={user.avatar_url} alt="" class="w-10 h-10 rounded-full" />
              {:else}
                <div class="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <span class="text-white text-sm font-medium">{user.email.charAt(0).toUpperCase()}</span>
                </div>
              {/if}
            {/if}
          </div>
        </div>
      </div>
    </header>
  
    <!-- Navigation Tabs -->
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="border-b border-gray-200">
        <nav class="-mb-px flex space-x-8">
          {#each [
            { id: 'profile', label: 'Profile', icon: '👤' },
            { id: 'applications', label: 'My Applications', icon: '🔗' },
            { id: 'sessions', label: 'Recent Activity', icon: '📱' },
            { id: 'security', label: 'Security', icon: '🔒' }
          ] as tab}
            <button
              class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === tab.id 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
              on:click={() => activeTab = tab.id}
            >
              <span class="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          {/each}
        </nav>
      </div>
    </div>
  
    <!-- Main Content -->
    <main class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {#if loading}
        <div class="flex justify-center items-center h-64">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      {:else}
        
        <!-- Profile Tab -->
        {#if activeTab === 'profile'}
          <div class="max-w-2xl">
            <div class="bg-white shadow-lg rounded-xl p-8">
              <div class="flex items-center space-x-6 mb-8">
                {#if userProfile?.avatar_url}
                  <img src={userProfile?.avatar_url} alt="" class="w-20 h-20 rounded-full object-cover" />
                {:else}
                  <div class="w-20 h-20 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                    <span class="text-white text-2xl font-bold">
                      {userProfile?.full_name ? userProfile?.full_name.charAt(0).toUpperCase() : user?.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                {/if}
                <div>
                  <h2 class="text-2xl font-bold text-gray-900">{userProfile?.full_name || 'Complete your profile'}</h2>
                  <p class="text-gray-500">{user?.email}</p>
                  {#if userProfile?.username}
                    <p class="text-sm text-blue-600">@{userProfile?.username}</p>
                  {/if}
                </div>
              </div>
              
              <form on:submit|preventDefault={updateProfile} class="space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Username</label>
                    <input
                      bind:value={userProfile.username}
                      type="text"
                      placeholder="Choose a username"
                      class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                    <input
                      bind:value={userProfile.full_name}
                      type="text"
                      placeholder="Your full name"
                      class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input
                      bind:value={userProfile.phone}
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Location</label>
                    <input
                      bind:value={userProfile.location}
                      type="text"
                      placeholder="City, Country"
                      class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Company</label>
                    <input
                      bind:value={userProfile.company}
                      type="text"
                      placeholder="Your company"
                      class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Job Title</label>
                    <input
                      bind:value={userProfile.job_title}
                      type="text"
                      placeholder="Your job title"
                      class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                  
                  <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Avatar URL</label>
                    <input
                      bind:value={userProfile.avatar_url}
                      type="url"
                      placeholder="https://example.com/avatar.jpg"
                      class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                  
                  <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Website</label>
                    <input
                      bind:value={userProfile.website_url}
                      type="url"
                      placeholder="https://yourwebsite.com"
                      class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                  
                  <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                    <textarea
                      bind:value={userProfile.bio}
                      placeholder="Tell us about yourself..."
                      rows="3"
                      class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                    ></textarea>
                  </div>
                </div>
                
                <div class="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    class="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-3 rounded-lg font-medium transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        
        <!-- Applications Tab -->
        {:else if activeTab === 'applications'}
          <div class="space-y-6">
            <!-- Stats Cards -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div class="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
                <div class="flex items-center">
                  <div class="flex-shrink-0">
                    <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span class="text-blue-600 font-bold">🔗</span>
                    </div>
                  </div>
                  <div class="ml-4">
                    <p class="text-sm font-medium text-gray-500">Connected Apps</p>
                    <p class="text-2xl font-bold text-gray-900">{userApps.length}</p>
                  </div>
                </div>
              </div>
              
              <div class="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
                <div class="flex items-center">
                  <div class="flex-shrink-0">
                    <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <span class="text-green-600 font-bold">✅</span>
                    </div>
                  </div>
                  <div class="ml-4">
                    <p class="text-sm font-medium text-gray-500">Active Sessions</p>
                    <p class="text-2xl font-bold text-gray-900">{recentSessions.filter(s => s.is_active).length}</p>
                  </div>
                </div>
              </div>
              
              <div class="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
                <div class="flex items-center">
                  <div class="flex-shrink-0">
                    <div class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <span class="text-purple-600 font-bold">⏰</span>
                    </div>
                  </div>
                  <div class="ml-4">
                    <p class="text-sm font-medium text-gray-500">Last Activity</p>
                    <p class="text-sm font-bold text-gray-900">
                      {recentSessions.length > 0 ? getRelativeTime(recentSessions[0].last_accessed_at) : 'No activity'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Connected Applications -->
            <div class="bg-white shadow-lg rounded-xl overflow-hidden">
              <div class="px-6 py-4 border-b border-gray-200">
                <h2 class="text-lg font-semibold text-gray-900">Connected Applications</h2>
                <p class="text-sm text-gray-500">Applications you've connected to via SSO</p>
              </div>
              <div class="p-6">
                {#if userApps.length === 0}
                  <div class="text-center py-12">
                    <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span class="text-gray-400 text-2xl">🔗</span>
                    </div>
                    <h3 class="text-lg font-medium text-gray-900 mb-2">No Connected Apps</h3>
                    <p class="text-gray-500">Connect to applications by signing in through SSO</p>
                  </div>
                {:else}
                  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {#each userApps as app}
                      <div class="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all">
                        <div class="flex items-start justify-between mb-4">
                          <div class="flex items-center space-x-3">
                            {#if app.app_icon_url}
                              <img src={app.app_icon_url} alt="" class="w-12 h-12 rounded-xl" />
                            {:else}
                              <div class="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                                <span class="text-white font-bold">{app.app_key.charAt(0).toUpperCase()}</span>
                              </div>
                            {/if}
                            <div>
                              <h3 class="font-semibold text-gray-900">{app.app_name}</h3>
                              <p class="text-xs text-gray-500">{app.app_key}</p>
                            </div>
                          </div>
                          <span class="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                            {app.access_level}
                          </span>
                        </div>
                        
                        <div class="space-y-2 mb-4">
                          <div class="flex justify-between text-sm">
                            <span class="text-gray-500">First Access:</span>
                            <span class="text-gray-700">{formatDate(app.first_accessed_at).split(',')[0]}</span>
                          </div>
                          <div class="flex justify-between text-sm">
                            <span class="text-gray-500">Last Access:</span>
                            <span class="text-gray-700">{getRelativeTime(app.last_accessed_at)}</span>
                          </div>
                        </div>
                        
                        <div class="flex justify-between items-center">
                          <a
                            href={app.app_url || '#'}
                            target="_blank"
                            class="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Open App →
                          </a>
                          <button
                            on:click={() => disconnectApp(app.app_id)}
                            class="text-red-600 hover:text-red-800 text-sm"
                          >
                            Disconnect
                          </button>
                        </div>
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>
            </div>
          </div>
        
        <!-- Sessions Tab -->
        {:else if activeTab === 'sessions'}
          <div class="bg-white shadow-lg rounded-xl overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-200">
              <h2 class="text-lg font-semibold text-gray-900">Recent Activity</h2>
              <p class="text-sm text-gray-500">Your recent application sessions and activities</p>
            </div>
            <div class="divide-y divide-gray-200">
              {#if recentSessions.length === 0}
                <div class="text-center py-12">
                  <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span class="text-gray-400 text-2xl">📱</span>
                  </div>
                  <h3 class="text-lg font-medium text-gray-900 mb-2">No Recent Activity</h3>
                  <p class="text-gray-500">Your recent sessions will appear here</p>
                </div>
              {:else}
                {#each recentSessions as session}
                  <div class="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center space-x-4">
                        {#if session.sso_applications?.app_icon_url}
                          <img src={session.sso_applications.app_icon_url} alt="" class="w-10 h-10 rounded-lg" />
                        {:else}
                          <div class="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                            <span class="text-white font-bold text-sm">
                              {session.sso_applications?.app_key?.charAt(0).toUpperCase() || '?'}
                            </span>
                          </div>
                        {/if}
                        <div>
                          <p class="font-medium text-gray-900">{session.sso_applications?.app_name || 'Unknown App'}</p>
                          <p class="text-sm text-gray-500">
                            Active session • Last accessed {getRelativeTime(session.last_accessed_at)}
                          </p>
                          {#if session.ip_address}
                            <p class="text-xs text-gray-400">From {session.ip_address}</p>
                          {/if}
                        </div>
                      </div>
                      <div class="text-right">
                        <span class="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                          {session.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <p class="text-xs text-gray-500 mt-1">
                          Started {formatDate(session.started_at).split(',')[0]}
                        </p>
                      </div>
                    </div>
                  </div>
                {/each}
              {/if}
            </div>
          </div>
        
        <!-- Security Tab -->
        {:else if activeTab === 'security'}
          <div class="space-y-6">
            <!-- Account Security -->
            <div class="bg-white shadow-lg rounded-xl p-6">
              <h2 class="text-lg font-semibold text-gray-900 mb-6">Account Security</h2>
              
              <div class="space-y-6">
                <!-- Email Verification -->
                <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span class="text-blue-600">📧</span>
                    </div>
                    <div>
                      <p class="font-medium text-gray-900">Email Verification</p>
                      <p class="text-sm text-gray-500">Verify your email address for enhanced security</p>
                    </div>
                  </div>
                  <span class="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                    {user?.email_verified ? 'Verified' : 'Pending'}
                  </span>
                </div>
                
                <!-- Password Management -->
                <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <span class="text-yellow-600">🔐</span>
                    </div>
                    <div>
                      <p class="font-medium text-gray-900">Password</p>
                      <p class="text-sm text-gray-500">Update your password regularly</p>
                    </div>
                  </div>
                  <button class="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    Change Password
                  </button>
                </div>
                
                <!-- Two-Factor Authentication -->
                <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <span class="text-purple-600">🛡️</span>
                    </div>
                    <div>
                      <p class="font-medium text-gray-900">Two-Factor Authentication</p>
                      <p class="text-sm text-gray-500">Add an extra layer of security</p>
                    </div>
                  </div>
                  <button class="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    Enable 2FA
                  </button>
                </div>
              </div>
            </div>
            
            <!-- Privacy Settings -->
            <div class="bg-white shadow-lg rounded-xl p-6">
              <h2 class="text-lg font-semibold text-gray-900 mb-6">Privacy & Data</h2>
              
              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="font-medium text-gray-900">Profile Visibility</p>
                    <p class="text-sm text-gray-500">Control who can see your profile information</p>
                  </div>
                  <select class="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option>Public</option>
                    <option>Organization Only</option>
                    <option>Private</option>
                  </select>
                </div>
                
                <div class="flex items-center justify-between">
                  <div>
                    <p class="font-medium text-gray-900">Activity Tracking</p>
                    <p class="text-sm text-gray-500">Allow tracking of your application usage</p>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked class="sr-only peer" />
                    <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                <div class="flex items-center justify-between">
                  <div>
                    <p class="font-medium text-gray-900">Data Export</p>
                    <p class="text-sm text-gray-500">Download all your data</p>
                  </div>
                  <button class="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    Export Data
                  </button>
                </div>
                
                <div class="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div>
                    <p class="font-medium text-red-900">Delete Account</p>
                    <p class="text-sm text-gray-500">Permanently delete your account and all data</p>
                  </div>
                  <button class="text-red-600 hover:text-red-800 text-sm font-medium">
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        {/if}
      {/if}
    </main>
  </div>
  
  <style>
    /* Custom animations */
    @keyframes slideInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    :global(.animate-slide-in) {
      animation: slideInUp 0.3s ease-out;
    }
    
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
    
    /* Focus styles */
    :global(input:focus, textarea:focus, select:focus) {
      outline: none;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
  </style>