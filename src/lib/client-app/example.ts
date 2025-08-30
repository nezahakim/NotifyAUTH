// Example integration for client apps
// client-app/src/lib/auth.ts
import { writable } from 'svelte/store';

const AUTH_SERVER = 'https://auth.yourdomain.com';

export class AuthClient {
    private accessToken: string | null = null;
    
    async login() {
        // Redirect to auth server
        window.location.href = `${AUTH_SERVER}/login?redirect=${encodeURIComponent(window.location.origin)}/callback`;
    }
    
    async handleCallback() {
        // Parse token from URL params or handle OAuth flow
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        
        if (token) {
            this.accessToken = token;
            // Validate token with auth server
            const isValid = await this.validateToken();
            if (isValid) {
                return { success: true };
            }
        }
        
        return { success: false };
    }
    
    async validateToken(): Promise<boolean> {
        if (!this.accessToken) return false;
        
        try {
            const response = await fetch(`${AUTH_SERVER}/api/auth/validate`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });
            
            return response.ok;
        } catch {
            return false;
        }
    }
    
    async makeAuthenticatedRequest(url: string, options: RequestInit = {}) {
        if (!this.accessToken) {
            throw new Error('Not authenticated');
        }
        
        return fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${this.accessToken}`
            }
        });
    }
    
    logout() {
        this.accessToken = null;
        window.location.href = `${AUTH_SERVER}/api/auth/logout?redirect=${encodeURIComponent(window.location.origin)}`;
    }
}