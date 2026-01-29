import { useState, useEffect } from "react";
import "./App.css";
import CredentialForm, { type Credentials } from "./components/CredentialForm";
import ItemList from "./components/ItemList";
import OneDriveOAuthHandler from "./components/OneDriveOAuthHandler";
import { joplinApi } from "./services/joplinApi";
import { ProfileManager, type Profile } from "./services/profileManager";
import { OneDriveOAuthService } from "./services/oneDriveOAuth";
import type { Item } from "joplin-sync";


function App() {
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  
  // OAuth flow state
  const [oauthAuthUrl, setOauthAuthUrl] = useState<string | null>(null);
  const [oauthResolveCallback, setOauthResolveCallback] = useState<
    ((code: string) => void) | null
  >(null);
  const [oauthRejectCallback, setOauthRejectCallback] = useState<
    ((error: Error) => void) | null
  >(null);


  // Set up OAuth flow handler for joplinApi
  // Note: For OneDrive, we handle token exchange in the browser first,
  // so this handler should not be called. Keeping it for other potential OAuth services.
  const oauthFlowHandler = (authUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      setOauthAuthUrl(authUrl);
      // Wrap in a function so React doesn't call it immediately
      setOauthResolveCallback(() => (code: string) => resolve(code));
      setOauthRejectCallback(() => (error: Error) => reject(error));
    });
  };

  // Register the OAuth handler with joplinApi
  joplinApi.setOAuthFlowHandler(oauthFlowHandler);

  // Check for OAuth callback in URL on mount (when redirected back from Microsoft)
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const error = params.get('error');
      const errorDescription = params.get('error_description');

      if (error) {
        console.error('OAuth error:', error, errorDescription);
        setError(errorDescription || error);
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
        // Clear pending OAuth
        sessionStorage.removeItem('pending_oauth_credentials');
      } else if (code) {
        // Check if we've already processed this code (prevent double execution in StrictMode)
        const processedCode = sessionStorage.getItem('processed_oauth_code');
        if (processedCode === code) {
          console.log('OAuth code already processed, skipping...');
          return;
        }

        console.log('OAuth code received from URL:', code);
        
        // Mark this code as being processed
        sessionStorage.setItem('processed_oauth_code', code);
        
        // Check if there are pending OAuth credentials
        const pendingCredsJson = sessionStorage.getItem('pending_oauth_credentials');
        if (pendingCredsJson) {
          try {
            const pendingCreds = JSON.parse(pendingCredsJson);
            console.log('Found pending OAuth credentials, completing connection...');
            
            // Clear the pending state
            sessionStorage.removeItem('pending_oauth_credentials');
            
            // Clean up URL first
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Set loading state
            setLoading(true);
            
            // For OneDrive, exchange the code for token in the browser with PKCE
            if (pendingCreds.type === 'OneDrive' && pendingCreds.onedrive) {
              console.log('Exchanging OAuth code for access token with PKCE...');
              
              // Retrieve code_verifier from sessionStorage
              const codeVerifier = sessionStorage.getItem('oauth_code_verifier');
              if (!codeVerifier) {
                throw new Error('PKCE code_verifier not found. Please try logging in again.');
              }
              
              const oauthService = new OneDriveOAuthService(
                pendingCreds.onedrive.clientId || '',
                pendingCreds.onedrive.redirectUri || window.location.origin
              );
              
              // Exchange code for token with PKCE code_verifier
              const tokenData = await oauthService.exchangeCodeForToken(code, codeVerifier);
              console.log('Access token obtained successfully');
              
              // Clear PKCE and processed code markers on success
              sessionStorage.removeItem('oauth_code_verifier');
              sessionStorage.removeItem('processed_oauth_code');
              
              // Update credentials with the auth token
              pendingCreds.onedrive.authToken = JSON.stringify(tokenData);
              
              // Save profile IMMEDIATELY after getting token (even if sync fails later)
              const profile = ProfileManager.createProfile(pendingCreds);
              ProfileManager.saveProfile(profile);
              ProfileManager.setActiveProfile(profile.id);
              setCurrentProfile(profile);
              console.log('Profile saved with auth token:', profile.name);
              
              // Now try to connect with the token (may fail if folder doesn't exist)
              try {
                await handleConnect(pendingCreds);
              } catch (connectErr) {
                // Connection failed but token is saved - show error but stay logged in
                console.warn('Connection failed but profile is saved:', connectErr);
                setError(connectErr instanceof Error 
                  ? `Connected to OneDrive but sync failed: ${connectErr.message}. You may need to configure the sync folder.`
                  : 'Sync failed but you are logged in');
                setConnected(true); // Mark as connected since we have a valid token
                setLoading(false);
              }
            } else {
              // For other OAuth services, handle similarly or fall back to default
              await handleConnect(pendingCreds);
            }
          } catch (err) {
            console.error('Failed to complete OAuth flow:', err);
            setError(err instanceof Error ? err.message : 'Failed to complete OAuth');
            sessionStorage.removeItem('pending_oauth_credentials');
            sessionStorage.removeItem('oauth_code');
            sessionStorage.removeItem('processed_oauth_code');
            sessionStorage.removeItem('oauth_code_verifier');
            window.history.replaceState({}, document.title, window.location.pathname);
            setLoading(false);
          }
        } else {
          // Code received but no pending credentials - might be from manual flow
          console.warn('OAuth code received but no pending credentials found');
          if (oauthResolveCallback) {
            oauthResolveCallback(code);
          }
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    };

    handleOAuthCallback();
  }, []); // Only run on mount

  // Auto-reconnect on mount if there's an active profile
  useEffect(() => {
    const loadActiveProfile = async () => {
      const activeProfile = ProfileManager.getActiveProfile();
      if (activeProfile && !connected) {
        console.log("Auto-reconnecting to saved profile:", activeProfile.name);
        setCurrentProfile(activeProfile);
        setLoading(true);
        try {
          await joplinApi.connect(activeProfile.credentials);
          const fetchedItems = await joplinApi.getItems();
          setItems(fetchedItems);
          setConnected(true);
          console.log("Auto-reconnected successfully");
        } catch (err) {
          console.error("Auto-reconnect failed:", err);
          // Don't show error for auto-reconnect, just clear the profile
          ProfileManager.clearActiveProfile();
          setCurrentProfile(null);
        } finally {
          setLoading(false);
        }
      }
    };
    loadActiveProfile();
  }, []); // Only run on mount

  // Listen for auth token updates (OneDrive/GoogleDrive)
  useEffect(() => {
    if (connected && currentProfile) {
      joplinApi.onAuthRefresh((newToken: string) => {
        console.log("Auth token refreshed, updating profile");
        if (currentProfile.type === "OneDrive") {
          ProfileManager.updateOneDriveToken(currentProfile.id, newToken);
        }
      });
    }
  }, [connected, currentProfile]);


  const handleOAuthCode = (code: string) => {
    if (oauthResolveCallback) {
      oauthResolveCallback(code);
    }
    // Reset OAuth state
    setOauthAuthUrl(null);
    setOauthResolveCallback(null);
    setOauthRejectCallback(null);
  };

  const handleOAuthError = (errorMsg: string) => {
    if (oauthRejectCallback) {
      oauthRejectCallback(new Error(errorMsg));
    }
    // Reset OAuth state
    setOauthAuthUrl(null);
    setOauthResolveCallback(null);
    setOauthRejectCallback(null);
  };

  const handleOAuthCancel = () => {
    if (oauthRejectCallback) {
      oauthRejectCallback(new Error("OAuth flow cancelled by user"));
    }
    // Reset OAuth state
    setOauthAuthUrl(null);
    setOauthResolveCallback(null);
    setOauthRejectCallback(null);
  };

  const handleConnect = async (credentials: Credentials) => {
    setLoading(true);
    setError(null);

    try {
      // For OneDrive: If no authToken, initiate OAuth flow directly in browser
      // This ensures we use /consumers endpoint for BOTH authorization AND token exchange
      if (credentials.type === 'OneDrive' && credentials.onedrive) {
        if (!credentials.onedrive.authToken) {
          console.log('OneDrive: No auth token, initiating browser-based OAuth...');
          
          // Save credentials to sessionStorage before redirecting
          sessionStorage.setItem('pending_oauth_credentials', JSON.stringify(credentials));
          
          // Create OAuth service and get auth URL with PKCE
          const oauthService = new OneDriveOAuthService(
            credentials.onedrive.clientId || '',
            credentials.onedrive.redirectUri || window.location.origin
          );
          
          const { authUrl, codeVerifier } = await oauthService.getAuthUrlWithPKCE();
          
          // Store code_verifier in sessionStorage for token exchange
          sessionStorage.setItem('oauth_code_verifier', codeVerifier);
          
          console.log('Redirecting to Microsoft OAuth (consumers endpoint with PKCE):', authUrl);
          
          // Redirect to Microsoft - the page will reload and handleOAuthCallback will process the code
          window.location.href = authUrl;
          return; // Stop here - redirect will happen
        }
      }
      
      // For other OAuth flows (GoogleDrive), save credentials to sessionStorage
      if (credentials.type === 'GoogleDrive') {
        sessionStorage.setItem('pending_oauth_credentials', JSON.stringify(credentials));
      }
      
      await joplinApi.connect(credentials);
      const fetchedItems = await joplinApi.getItems();
      setItems(fetchedItems);
      setConnected(true);
      
      // Save profile to localStorage
      const profile = ProfileManager.createProfile(credentials);
      ProfileManager.saveProfile(profile);
      ProfileManager.setActiveProfile(profile.id);
      setCurrentProfile(profile);
      
      // Clear pending OAuth if it exists
      sessionStorage.removeItem('pending_oauth_credentials');
      
      console.log("Connected successfully. Profile saved:", profile.name);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to connect";
      setError(errorMessage);
      console.error("Connection error:", err);
      // Don't clear pending OAuth on error - user might retry
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!joplinApi.isInitialized()) return;

    setLoading(true);
    setError(null);

    try {
      const fetchedItems = await joplinApi.getItems();
      setItems(fetchedItems);
      console.log("Refreshed items:", fetchedItems);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to refresh";
      setError(errorMessage);
      console.error("Refresh error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    joplinApi.disconnect();
    ProfileManager.clearActiveProfile();
    setCurrentProfile(null);
    setConnected(false);
    setItems([]);
    setError(null);
    console.log("Logged out successfully");
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Joplin Online Viewer</h1>
        {connected && currentProfile && (
          <div className="header-info">
            <span className="profile-badge">
              {currentProfile.type}
            </span>
            <button onClick={handleDisconnect} className="disconnect-btn">
              Logout
            </button>
          </div>
        )}
      </header>

      <main className="app-main">
        {!connected ? (
          <CredentialForm onSubmit={handleConnect} />
        ) : (
          <ItemList
            items={items}
            loading={loading}
            error={error}
            onRefresh={handleRefresh}
          />
        )}
      </main>

      {/* OAuth Flow Handler */}
      {oauthAuthUrl && (
        <OneDriveOAuthHandler
          authUrl={oauthAuthUrl}
          onAuthCode={handleOAuthCode}
          onError={handleOAuthError}
          onCancel={handleOAuthCancel}
        />
      )}
    </div>
  );
}
export default App;
