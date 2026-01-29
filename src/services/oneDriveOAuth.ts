/**
 * Browser-based OneDrive OAuth Handler with PKCE
 * Handles the complete OAuth flow in the browser without requiring client_secret
 * Uses PKCE (Proof Key for Code Exchange) for enhanced security
 */

interface OneDriveAuthToken {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export class OneDriveOAuthService {
  private clientId: string;
  private redirectUri: string;
  private scope: string = 'files.readwrite offline_access sites.readwrite.all';

  constructor(clientId: string, redirectUri: string) {
    this.clientId = clientId;
    this.redirectUri = redirectUri;
  }

  /**
   * Generate a cryptographically random code verifier for PKCE
   * Must be between 43-128 characters, using [A-Z, a-z, 0-9, -, ., _, ~]
   */
  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return this.base64URLEncode(array);
  }

  /**
   * Generate code challenge from verifier using SHA-256
   */
  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return this.base64URLEncode(new Uint8Array(digest));
  }

  /**
   * Base64 URL encode (no padding, URL-safe characters)
   */
  private base64URLEncode(buffer: Uint8Array): string {
    const base64 = btoa(String.fromCharCode(...buffer));
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Generate the authorization URL for OneDrive OAuth with PKCE
   * Returns both the URL and the code_verifier (which must be stored for token exchange)
   */
  async getAuthUrlWithPKCE(): Promise<{ authUrl: string; codeVerifier: string }> {
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);

    const params = new URLSearchParams({
      client_id: this.clientId,
      scope: this.scope,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      prompt: 'login',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    // Use /consumers for personal Microsoft accounts
    const authUrl = `https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize?${params.toString()}`;

    return { authUrl, codeVerifier };
  }

  /**
   * Exchange authorization code for access token with PKCE
   */
  async exchangeCodeForToken(code: string, codeVerifier: string): Promise<OneDriveAuthToken> {
    const tokenUrl = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token';

    // For public clients with PKCE, we include code_verifier instead of client_secret
    const formData = new URLSearchParams({
      client_id: this.clientId,
      code: code,
      redirect_uri: this.redirectUri,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier,
    });

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorJson;
        try {
          errorJson = JSON.parse(errorText);
        } catch {
          errorJson = { error: 'unknown', error_description: errorText };
        }
        
        throw new Error(
          `OAuth token exchange failed (${response.status}): ${errorJson.error_description || errorJson.error}`
        );
      }

      const tokenData = await response.json();
      return tokenData as OneDriveAuthToken;
    } catch (error) {
      console.error('Failed to exchange code for token:', error);
      throw error;
    }
  }

  /**
   * Refresh an existing access token using refresh_token
   */
  async refreshToken(refreshToken: string): Promise<OneDriveAuthToken> {
    const tokenUrl = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token';

    const formData = new URLSearchParams({
      client_id: this.clientId,
      refresh_token: refreshToken,
      redirect_uri: this.redirectUri,
      grant_type: 'refresh_token',
    });

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token refresh failed (${response.status}): ${errorText}`);
      }

      const tokenData = await response.json();
      return tokenData as OneDriveAuthToken;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      throw error;
    }
  }
}
