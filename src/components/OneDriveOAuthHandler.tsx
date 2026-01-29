import { useState, useEffect } from "react";
import "./OneDriveOAuthHandler.css";

interface OneDriveOAuthHandlerProps {
  authUrl: string;
  onAuthCode: (code: string) => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

export default function OneDriveOAuthHandler({
  authUrl,
  onAuthCode,
  onError,
  onCancel,
}: OneDriveOAuthHandlerProps) {
  const [status, setStatus] = useState<"waiting" | "listening" | "error">("waiting");
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState("");

  useEffect(() => {
    // Set up a message listener for the OAuth callback
    const handleMessage = (event: MessageEvent) => {
      // Validate the origin for security (adjust as needed)
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data?.type === "ONEDRIVE_AUTH_CODE") {
        const code = event.data.code;
        if (code) {
          setStatus("listening");
          onAuthCode(code);
        } else if (event.data.error) {
          setStatus("error");
          onError(event.data.error);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onAuthCode, onError]);

  const handleOpenAuth = () => {
    try {
      // Redirect to auth URL in the same window
      // Microsoft will redirect back to http://localhost:5173 with the code parameter
      // The main App component will detect and handle the code
      window.location.href = authUrl;
    } catch (error) {
      setStatus("error");
      onError(`Failed to redirect to authorization: ${error}`);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) {
      onError("Please enter the authorization code");
      return;
    }
    onAuthCode(manualCode.trim());
  };

  return (
    <div className="oauth-handler-overlay">
      <div className="oauth-handler-modal">
        <h2>🔐 OneDrive Authorization Required</h2>

        {!manualMode ? (
          <>
            <p className="oauth-description">
              You'll be redirected to Microsoft to sign in and authorize access to your OneDrive account.
              After authorization, you'll be redirected back here automatically.
            </p>

             {status === "waiting" && (
              <div className="oauth-actions">
                <button onClick={handleOpenAuth} className="oauth-btn oauth-btn-primary">
                  Continue to Microsoft Login
                </button>
                <button onClick={onCancel} className="oauth-btn oauth-btn-secondary">
                  Cancel
                </button>
              </div>
            )}

            {status === "listening" && (
              <div className="oauth-status">
                <div className="oauth-spinner"></div>
                <p>Waiting for authorization...</p>
                <p className="oauth-hint">
                  Complete the authorization in the popup window, then return here.
                </p>
                <button onClick={() => setManualMode(true)} className="oauth-link-btn">
                  Enter code manually
                </button>
              </div>
            )}

            {status === "error" && (
              <div className="oauth-error">
                <p>❌ An error occurred. Please try again.</p>
                <div className="oauth-actions">
                  <button onClick={handleOpenAuth} className="oauth-btn oauth-btn-primary">
                    Retry
                  </button>
                  <button onClick={() => setManualMode(true)} className="oauth-btn oauth-btn-secondary">
                    Enter code manually
                  </button>
                  <button onClick={onCancel} className="oauth-btn oauth-btn-secondary">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="oauth-manual-mode">
            <p className="oauth-description">
              If the popup didn't work, you can manually complete the authorization:
            </p>
            <ol className="oauth-instructions">
              <li>
                <a href={authUrl} target="_blank" rel="noopener noreferrer" className="oauth-link">
                  Click here to open the authorization page
                </a>
              </li>
              <li>Sign in with your Microsoft account and authorize the application</li>
              <li>After authorization, you'll be redirected to a page with a code</li>
              <li>Copy the code from the URL (it's the 'code' parameter)</li>
              <li>Paste it below and submit</li>
            </ol>

            <form onSubmit={handleManualSubmit} className="oauth-manual-form">
              <label htmlFor="auth-code" className="oauth-label">
                Authorization Code:
              </label>
              <textarea
                id="auth-code"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Paste the authorization code here..."
                className="oauth-textarea"
                rows={3}
                required
              />
              <div className="oauth-actions">
                <button type="submit" className="oauth-btn oauth-btn-primary">
                  Submit Code
                </button>
                <button
                  type="button"
                  onClick={() => setManualMode(false)}
                  className="oauth-btn oauth-btn-secondary"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  className="oauth-btn oauth-btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
