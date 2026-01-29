import { useState } from "react";
import "./CredentialForm.css";

export type StorageType =
  | "FileSystem"
  | "WebDAV"
  | "OneDrive"
  | "JoplinServer"
  | "GoogleDrive";

export interface Credentials {
  type: StorageType;
  filesystem?: {
    syncPath: string;
  };
  webdav?: {
    username: string;
    password: string;
    path: string;
    ignoreTlsErrors?: boolean;
  };
  onedrive?: {
    clientId?: string;
    clientSecret?: string;
    authToken?: string;
    isPublic?: boolean;
    redirectUri?: string;
    basePath?: string; // Custom sync folder path
  };

  joplinserver?: {
    username: string;
    password: string;
    path: string;
    userContentPath: string;
  };
  googledrive?: {
    clientId?: string;
    clientSecret?: string;
    authToken?: string;
    isPublic?: boolean;
  };
}

interface Props {
  onSubmit: (credentials: Credentials) => void;
}

export default function CredentialForm({ onSubmit }: Props) {
  const [storageType, setStorageType] = useState<StorageType>("FileSystem");

  const [fileSystemPath, setFileSystemPath] = useState("");

  const [webdavUsername, setWebdavUsername] = useState("joplin");
  const [webdavPassword, setWebdavPassword] = useState("1");
  const [webdavPath, setWebdavPath] = useState("http://localhost:6065/");
  const [webdavIgnoreTls, setWebdavIgnoreTls] = useState(false);

  // Convert localhost URLs to proxy path to avoid CORS
  const getProxiedWebdavPath = (path: string): string => {
    try {
      // If already a proxy path, return it
      if (path.startsWith("/webdav-proxy")) {
        return path;
      }

      // Check if it's a localhost URL
      if (path.includes("localhost") || path.includes("127.0.0.1")) {
        const url = new URL(path);
        const port = url.port || (url.protocol === "https:" ? "443" : "80");
        // Use proxy with port suffix to support multiple ports
        let proxyPath = `/webdav-proxy-${port}${url.pathname}`;
        // Ensure it ends with /
        if (!proxyPath.endsWith("/")) {
          proxyPath += "/";
        }
        return proxyPath;
      }
      return path;
    } catch (e) {
      console.error("Error converting path:", e, "Original path:", path);
      // If it's already a relative path or invalid URL, return as-is
      return path;
    }
  };

  const [oneDriveClientId, setOneDriveClientId] = useState("");
  const [oneDriveAuthToken, setOneDriveAuthToken] = useState("");
  const [oneDriveSyncFolder, setOneDriveSyncFolder] = useState("Joplin"); // Default to Joplin app folder

  const [joplinServerUsername, setJoplinServerUsername] = useState("");
  const [joplinServerPassword, setJoplinServerPassword] = useState("");
  const [joplinServerPath, setJoplinServerPath] = useState("");
  const [joplinServerUserContentPath, setJoplinServerUserContentPath] =
    useState("");

  const [googleDriveClientId, setGoogleDriveClientId] = useState("");
  const [googleDriveClientSecret, setGoogleDriveClientSecret] = useState("");
  const [googleDriveAuthToken, setGoogleDriveAuthToken] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const credentials: Credentials = { type: storageType };

    if (storageType === "FileSystem") {
      credentials.filesystem = { syncPath: fileSystemPath };
    } else if (storageType === "WebDAV") {
      const proxiedPath = getProxiedWebdavPath(webdavPath);
      console.log("Original path:", webdavPath);
      console.log("Proxied path:", proxiedPath);
      credentials.webdav = {
        username: webdavUsername,
        password: webdavPassword,
        path: proxiedPath,
        ignoreTlsErrors: webdavIgnoreTls,
      };
    } else if (storageType === "OneDrive") {
      // Use just the origin as redirect URI (not including /oauth-callback.html)
      // This should match what's registered in Azure Portal
      const redirectUri = window.location.origin;
      
      credentials.onedrive = {
        clientId: oneDriveClientId,
        authToken: oneDriveAuthToken || undefined,
        isPublic: true,
        redirectUri,
        // Store the folder name - will be used to construct the full path
        // Format: /drives/{driveId}/root:/Apps/{syncFolder}
        // The syncFolder is stored here and will be used after we get driveId
        basePath: oneDriveSyncFolder ? `Apps/${oneDriveSyncFolder}` : undefined,
      };
    } else if (storageType === "JoplinServer") {
      credentials.joplinserver = {
        username: joplinServerUsername,
        password: joplinServerPassword,
        path: joplinServerPath,
        userContentPath: joplinServerUserContentPath,
      };
    } else if (storageType === "GoogleDrive") {
      credentials.googledrive = {
        clientId: googleDriveClientId,
        clientSecret: googleDriveClientSecret,
        authToken: googleDriveAuthToken,
        isPublic: true,
      };
    }

    onSubmit(credentials);
  };

  return (
    <div className="credential-form-container">
      <h2 className="credential-form-title">Connect to Joplin Storage</h2>

      <form onSubmit={handleSubmit} className="credential-form">
        <div className="form-group">
          <label className="form-label">Storage Type</label>
          <select
            value={storageType}
            onChange={(e) => setStorageType(e.target.value as StorageType)}
            className="form-select"
          >
            <option value="FileSystem">File System</option>
            <option value="WebDAV">WebDAV</option>
            <option value="OneDrive">OneDrive</option>
            <option value="JoplinServer">
              Joplin Server (Not working yet)
            </option>
            <option value="GoogleDrive">
              Google Drive (OAuth - Not working yet)
            </option>
          </select>
        </div>

        {storageType === "FileSystem" && (
          <div className="form-group">
            <label className="form-label">File Path</label>
            <input
              type="text"
              value={fileSystemPath}
              onChange={(e) => setFileSystemPath(e.target.value)}
              placeholder="/path/to/joplin/sync/folder"
              className="form-input"
              required
            />
            <small className="form-hint">
              Enter the absolute path to your Joplin sync folder
            </small>
          </div>
        )}

        {storageType === "WebDAV" && (
          <>
            <div className="form-group">
              <label className="form-label">WebDAV URL</label>
              <input
                type="text"
                value={webdavPath}
                onChange={(e) => setWebdavPath(e.target.value)}
                placeholder="http://localhost:6065/"
                className="form-input"
                required
              />
              <small className="form-hint">
                Enter your WebDAV server URL. Localhost URLs will automatically
                use CORS proxy.
                <br />
                Examples: http://localhost:6065/, https://myserver.com/webdav/
              </small>
            </div>

            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                type="text"
                value={webdavUsername}
                onChange={(e) => setWebdavUsername(e.target.value)}
                placeholder="username"
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                value={webdavPassword}
                onChange={(e) => setWebdavPassword(e.target.value)}
                placeholder="password"
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-checkbox-group">
                <input
                  type="checkbox"
                  checked={webdavIgnoreTls}
                  onChange={(e) => setWebdavIgnoreTls(e.target.checked)}
                  className="form-checkbox"
                />
                <span className="form-checkbox-label">Ignore TLS Errors</span>
              </label>
            </div>
          </>
        )}

        {storageType === "OneDrive" && (
          <>
            <div className="form-info-box">
              <h4>🔐 OneDrive Authentication</h4>
              <p>
                To connect to OneDrive, you need to register an app in the Azure Portal.
                See the <strong>OneDrive Setup Guide</strong> in the documentation for detailed instructions.
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">
                Client ID <span className="required">*</span>
              </label>
              <input
                type="text"
                value={oneDriveClientId}
                onChange={(e) => setOneDriveClientId(e.target.value)}
                placeholder="e.g., 12345678-1234-1234-1234-123456789abc"
                className="form-input"
                required
              />
              <small className="form-hint">
                Your Azure App Registration Client ID (found in Azure Portal)
              </small>
            </div>

            <div className="form-group">
              <label className="form-label">Auth Token (Optional)</label>
              <textarea
                value={oneDriveAuthToken}
                onChange={(e) => setOneDriveAuthToken(e.target.value)}
                placeholder='{"access_token":"...","refresh_token":"...","token_type":"Bearer",...}'
                className="form-input form-textarea"
                rows={3}
              />
              <small className="form-hint">
                If you have a saved token from a previous session, paste it here.
                Otherwise, leave empty and the OAuth flow will start automatically.
              </small>
            </div>

            <div className="form-group">
              <label className="form-label">Sync Folder</label>
              <input
                type="text"
                value={oneDriveSyncFolder}
                onChange={(e) => setOneDriveSyncFolder(e.target.value)}
                placeholder="Joplin"
                className="form-input"
              />
              <small className="form-hint">
                The folder in your OneDrive where notes are stored.
                Default is "Joplin" (same as desktop app). Use "Apps/Joplin" if needed.
              </small>
            </div>

            <div className="form-group">
              <label className="form-checkbox-group">
                <input
                  type="checkbox"
                  checked={true}
                  disabled
                  className="form-checkbox"
                />
                <span className="form-checkbox-label">
                  Public Client (SPA mode)
                </span>
              </label>
              <small className="form-hint">
                Web apps use public client mode for security (no client secret needed)
              </small>
            </div>
          </>
        )}

        {storageType === "JoplinServer" && (
          <>
            <div className="form-group">
              <label className="form-label">Server URL</label>
              <input
                type="text"
                value={joplinServerPath}
                onChange={(e) => setJoplinServerPath(e.target.value)}
                placeholder="http://localhost:22300"
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                type="text"
                value={joplinServerUsername}
                onChange={(e) => setJoplinServerUsername(e.target.value)}
                placeholder="username"
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                value={joplinServerPassword}
                onChange={(e) => setJoplinServerPassword(e.target.value)}
                placeholder="password"
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">User Content Path</label>
              <input
                type="text"
                value={joplinServerUserContentPath}
                onChange={(e) => setJoplinServerUserContentPath(e.target.value)}
                placeholder="/path/to/user/content"
                className="form-input"
                required
              />
            </div>
          </>
        )}

        {storageType === "GoogleDrive" && (
          <>
            <div className="form-group">
              <label className="form-label">Client ID</label>
              <input
                type="text"
                value={googleDriveClientId}
                onChange={(e) => setGoogleDriveClientId(e.target.value)}
                placeholder="Google Drive Client ID"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Client Secret</label>
              <input
                type="password"
                value={googleDriveClientSecret}
                onChange={(e) => setGoogleDriveClientSecret(e.target.value)}
                placeholder="Client Secret"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Auth Token (if you have one)</label>
              <input
                type="text"
                value={googleDriveAuthToken}
                onChange={(e) => setGoogleDriveAuthToken(e.target.value)}
                placeholder="Optional auth token"
                className="form-input"
              />
            </div>
          </>
        )}

        <button type="submit" className="submit-btn">
          Connect
        </button>
      </form>
    </div>
  );
}
