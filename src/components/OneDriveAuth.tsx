import { useState, useEffect } from 'react';
import './OneDriveAuth.css';

interface OneDriveAuthProps {
  onAuthComplete: (authToken: string) => void;
  clientId: string;
}

interface AuthConfig {
  clientId: string;
  scopes: string[];
  redirectUri: string;
  authority: string;
}

/**
 * OneDrive OAuth Component for Single Page Applications
 * 
 * This component handles the OAuth 2.0 Authorization Code flow for OneDrive.
 * It's designed to work without a backend, using PKCE for security.
 * 
 * Usage:
 * <OneDriveAuth 
 *   clientId="your-azure-app-client-id"
 *   onAuthComplete={(token) => console.log('Got token:', token)}
 * />
 */
export default function OneDriveAuth({ onAuthComplete, clientId }: OneDriveAuthProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config: AuthConfig = {
    clientId: clientId,
    scopes: ['Files.ReadWrite', 'offline_access', 'Files.ReadWrite.All'],
    redirectUri: window.location.origin + window.location.pathname,
    authority: 'https://login.microsoftonline.com/common',
  };

  // Check if we're coming back from OAuth redirect
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const errorParam = params.get('error');
      const errorDescription = params.get('error_description');

      if (errorParam) {
        setError(`OAuth Error: ${errorParam} - ${errorDescription || 'Unknown error'}`);
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      if (code) {
        setIsAuthenticating(true);
        try {
          const token = await exchangeCodeForToken(code, config);
          onAuthComplete(token);
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to authenticate');
        } finally {
          setIsAuthenticating(false);
        }
      }
    };

    handleOAuthCallback();
  }, [clientId]);

  /**
   * Generate PKCE code verifier and challenge
   * PKCE (Proof Key for Code Exchange) adds security for public clients
   */
  const generatePKCE = async (): Promise<{ verifier: string; challenge: string }> => {
    const verifier = generateRandomString(128);
    const challenge = await sha256(verifier);
    
    // Store verifier for later use
    sessionStorage.setItem('pkce_verifier', verifier);
    
    return { verifier, challenge };
  };

  /**
   * Start the OAuth authorization flow
   */
  const startAuth = async () => {
    setError(null);
    setIsAuthenticating(true);

    try {
      // Generate PKCE codes
      const { challenge } = await generatePKCE();

      // Build authorization URL
      const authUrl = new URL(`${config.authority}/oauth2/v2.0/authorize`);
      authUrl.searchParams.append('client_id', config.clientId);
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('redirect_uri', config.redirectUri);
      authUrl.searchParams.append('scope', config.scopes.join(' '));
      authUrl.searchParams.append('response_mode', 'query');
      authUrl.searchParams.append('code_challenge', challenge);
      authUrl.searchParams.append('code_challenge_method', 'S256');
      authUrl.searchParams.append('prompt', 'select_account');

      // Redirect to Microsoft login
      window.location.href = authUrl.toString();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start authentication');
      setIsAuthenticating(false);
    }
  };

  /**
   * Exchange authorization code for access token
   */
  const exchangeCodeForToken = async (
    code: string,
    config: AuthConfig
  ): Promise<string> => {
    const verifier = sessionStorage.getItem('pkce_verifier');
    if (!verifier) {
      throw new Error('PKCE verifier not found. Please try again.');
    }

    const tokenUrl = `${config.authority}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
      client_id: config.clientId,
      scope: config.scopes.join(' '),
      code: code,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
      code_verifier: verifier,
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Token exchange failed: ${errorData.error_description || response.statusText}`
      );
    }

    const tokenData = await response.json();
    
    // Clean up PKCE verifier
    sessionStorage.removeItem('pkce_verifier');
    
    return JSON.stringify(tokenData);
  };

  return (
    <div className="onedrive-auth">
      <div className="onedrive-auth-content">
        <div className="onedrive-icon">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <path d="M18.5 8C13.8056 8 10 11.8056 10 16.5C10 17.9722 10.3611 19.3611 11 20.5833C7.13889 21.1667 4 24.5 4 28.5C4 32.9167 7.58333 36.5 12 36.5H35C39.4167 36.5 43 32.9167 43 28.5C43 24.5 39.8611 21.1667 36 20.5833C36.6389 19.3611 37 17.9722 37 16.5C37 11.8056 33.1944 8 28.5 8C26.5 8 24.6389 8.63889 23.1667 9.72222C21.6944 8.63889 19.8333 8 18.5 8Z" fill="#0364B8"/>
          </svg>
        </div>
        
        <h3>Connect to OneDrive</h3>
        <p className="auth-description">
          Sign in with your Microsoft account to sync your Joplin notes with OneDrive.
        </p>

        {error && (
          <div className="auth-error">
            <strong>Error:</strong> {error}
          </div>
        )}

        <button
          onClick={startAuth}
          disabled={isAuthenticating || !clientId}
          className="auth-button"
        >
          {isAuthenticating ? (
            <>
              <span className="spinner"></span>
              Authenticating...
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 2C5.6 2 2 5.6 2 10s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 14c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6zm1-9H9v3H6v2h3v3h2v-3h3v-2h-3V7z"/>
              </svg>
              Sign in with Microsoft
            </>
          )}
        </button>

        {!clientId && (
          <div className="auth-warning">
            <strong>Configuration Required:</strong> Please provide a OneDrive Client ID
          </div>
        )}

        <div className="auth-info">
          <p className="info-text">
            🔒 Secure: Uses OAuth 2.0 with PKCE
          </p>
          <p className="info-text">
            🔐 Private: Your credentials never leave your browser
          </p>
        </div>
      </div>
    </div>
  );
}

// Helper functions

function generateRandomString(length: number): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset[randomValues[i] % charset.length];
  }
  return result;
}

async function sha256(plain: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hash = await crypto.subtle.digest('SHA-256', data);
  
  // Convert to base64url
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
