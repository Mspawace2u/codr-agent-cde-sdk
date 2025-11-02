// src/services/oauth.ts
// Codr — OAuth authentication system

export interface OAuthConfig {
  google?: {
    clientId: string;
    clientSecret: string;
  };
  github?: {
    clientId: string;
    clientSecret: string;
  };
}

export interface User {
  id: string;
  email: string;
  name: string;
  provider: 'google' | 'github';
  avatar?: string;
}

export class OAuthManager {
  constructor(private config: OAuthConfig, private env: any) {}

  async authenticateGoogle(code: string): Promise<User> {
    if (!this.config.google) {
      throw new Error('Google OAuth not configured');
    }

    // Exchange code for token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.config.google.clientId,
        client_secret: this.config.google.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${this.env.APP_URL}/api/auth/callback/google`
      })
    });

    const tokens = await tokenResponse.json();

    // Get user info
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { 'Authorization': `Bearer ${tokens.access_token}` }
    });

    const userInfo = await userResponse.json();

    return {
      id: userInfo.id,
      email: userInfo.email,
      name: userInfo.name,
      provider: 'google',
      avatar: userInfo.picture
    };
  }

  async authenticateGitHub(code: string): Promise<User> {
    if (!this.config.github) {
      throw new Error('GitHub OAuth not configured');
    }

    // Exchange code for token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        client_id: this.config.github.clientId,
        client_secret: this.config.github.clientSecret,
        code,
        redirect_uri: `${this.env.APP_URL}/api/auth/callback/github`
      })
    });

    const tokens = await tokenResponse.json();

    // Get user info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'User-Agent': 'Codr-Agent'
      }
    });

    const userInfo = await userResponse.json();

    return {
      id: userInfo.id.toString(),
      email: userInfo.email,
      name: userInfo.name || userInfo.login,
      provider: 'github',
      avatar: userInfo.avatar_url
    };
  }

  getGoogleAuthUrl(): string {
    if (!this.config.google) {
      throw new Error('Google OAuth not configured');
    }

    const params = new URLSearchParams({
      client_id: this.config.google.clientId,
      redirect_uri: `${this.env.APP_URL}/api/auth/callback/google`,
      scope: 'openid email profile',
      response_type: 'code',
      state: 'google'
    });

    return `https://accounts.google.com/oauth/authorize?${params}`;
  }

  getGitHubAuthUrl(): string {
    if (!this.config.github) {
      throw new Error('GitHub OAuth not configured');
    }

    const params = new URLSearchParams({
      client_id: this.config.github.clientId,
      redirect_uri: `${this.env.APP_URL}/api/auth/callback/github`,
      scope: 'user:email',
      state: 'github'
    });

    return `https://github.com/login/oauth/authorize?${params}`;
  }
}

// Factory function
export function createOAuthManager(config: OAuthConfig, env: any): OAuthManager {
  return new OAuthManager(config, env);
}