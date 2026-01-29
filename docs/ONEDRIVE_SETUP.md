# OneDrive Setup for Joplin Web Viewer

This guide walks you through setting up OneDrive authentication for the Joplin Online Web Viewer.

## Quick Start

### 1. Register Your Azure Application

1. Go to the [Azure App Registration Portal](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)
2. Click **"New registration"**
3. Fill in:
   - **Name**: "Joplin Web Viewer" (or your choice)
   - **Account types**: "Accounts in any organizational directory and personal Microsoft accounts"
   - **Redirect URI**:
     - Type: **Single-page application (SPA)**
     - URI: `http://localhost:5173` (or your deployment URL)

4. Click **Register**

### 2. Configure Permissions

1. In your app page, go to **"API permissions"**
2. Click **"Add a permission"** → **"Microsoft Graph"** → **"Delegated permissions"**
3. Add:
   - `Files.ReadWrite` (read and write user files)
   - `offline_access` (maintain access to data)
4. Click **"Add permissions"**

### 3. Get Your Client ID

1. Go to **"Overview"**
2. Copy the **"Application (client) ID"**
3. Save this - you'll need it in the web viewer

## Using OneDrive in the Web Viewer

### First-Time Setup

1. Start the web viewer:
   ```bash
   npm run dev
   ```

2. Select **"OneDrive"** as the storage type

3. Paste your **Client ID** (from step 3 above)

4. Leave **Auth Token** empty for first-time setup

5. Click **Connect**

6. You'll be redirected to Microsoft's login page:
   - Sign in with your Microsoft account
   - Grant permissions when prompted
   - You'll be redirected back to the web viewer

7. The connection will complete automatically!

### Returning Users

If you've connected before and have a saved token:

1. Select **"OneDrive"**
2. Paste your **Client ID**
3. Paste your saved **Auth Token** from previous session
4. Click **Connect**

Your auth token is automatically saved in browser localStorage, so you usually don't need to paste it manually.

## Understanding the OAuth Flow

The web viewer uses **OAuth 2.0 Authorization Code flow with PKCE** for security:

```
┌─────────┐                                           ┌──────────┐
│   You   │                                           │Microsoft │
└────┬────┘                                           └────┬─────┘
     │                                                      │
     │  1. Click "Connect"                                 │
     ├──────────────────────────────────────────────────►  │
     │                                                      │
     │  2. Redirect to Microsoft login                     │
     │  ◄───────────────────────────────────────────────── │
     │                                                      │
     │  3. Sign in & grant permissions                     │
     ├──────────────────────────────────────────────────►  │
     │                                                      │
     │  4. Redirect back with auth code                    │
     │  ◄───────────────────────────────────────────────── │
     │                                                      │
     │  5. Exchange code for access token                  │
     ├──────────────────────────────────────────────────►  │
     │                                                      │
     │  6. Return access token                             │
     │  ◄───────────────────────────────────────────────── │
     │                                                      │
     │  7. Access OneDrive files                           │
     └──────────────────────────────────────────────────►  
```

## Token Management

### Where Tokens are Stored

Tokens are stored in your browser's **localStorage** under the key `onedrive_token`.

### Token Expiration

- Access tokens expire after **1 hour**
- The library automatically refreshes them using the refresh token
- Refresh tokens are valid for **90 days** (for personal accounts)
- You'll need to re-authenticate after 90 days

### Manual Token Management

To get your current token (for backup or debugging):

```javascript
// In browser console
const token = localStorage.getItem('onedrive_token');
console.log(token);
```

To manually set a token:

```javascript
const myToken = '{"access_token":"...","refresh_token":"..."}';
localStorage.setItem('onedrive_token', myToken);
```

## Deployment Considerations

### Production Deployment

When deploying to production, update your Azure app:

1. Go to Azure Portal → Your app → **Authentication**
2. Add your production URL as a redirect URI
3. Example: `https://joplin-viewer.example.com`

### Environment Variables

For development, you can set defaults in `.env`:

```bash
VITE_ONEDRIVE_CLIENT_ID=your_client_id_here
```

Then reference it in your code:

```typescript
const defaultClientId = import.meta.env.VITE_ONEDRIVE_CLIENT_ID;
```

## Security Best Practices

### ✅ DO:
- Use HTTPS in production
- Keep your Client ID public (it's safe)
- Store tokens securely in localStorage
- Set proper token expiration handling
- Use PKCE for public clients (already implemented)

### ❌ DON'T:
- **Never** use Client Secret in frontend code
- **Never** commit tokens to version control  
- **Never** share tokens publicly
- **Never** disable PKCE

## Troubleshooting

### "Invalid client" Error
**Cause**: Client ID is incorrect or app not registered properly  
**Fix**: Double-check your Client ID in Azure Portal

### "Redirect URI mismatch" Error
**Cause**: The redirect URI doesn't match what's registered in Azure  
**Fix**: Ensure Azure app has `http://localhost:5173` (or your URL) as SPA redirect URI

### "Access Denied" Error
**Cause**: Missing API permissions  
**Fix**: Add `Files.ReadWrite` and `offline_access` permissions in Azure Portal

### "Token Expired" Error (after initial login)
**Cause**: Refresh token is missing or expired  
**Fix**: Re-authenticate by clearing localStorage and connecting again

### Can't See Files
**Cause**: Wrong permissions or accessing wrong folder  
**Fix**: Ensure you have `Files.ReadWrite` (NOT just Files.Read)

## Advanced: Custom OAuth Handler

For custom OAuth flows, you can implement your own handler:

```typescript
import { StorageAPI } from 'joplin-sync';

// Custom OAuth handler
async function myOAuthHandler(authUrl: string): Promise<string> {
  // Show auth URL to user
  window.open(authUrl, '_blank');
  
  // Wait for user to paste the code
  const code = prompt('Paste authorization code:');
  return code;
}

// Use it
const storage = new StorageAPI('OneDrive', {
  oneDriveOptions: {
    clientId: 'your-client-id',
    oauthFlowHandler: myOAuthHandler,
  },
});
```

## API References

- [Microsoft Graph API](https://docs.microsoft.com/en-us/graph/overview)
- [OneDrive REST API](https://docs.microsoft.com/en-us/onedrive/developer/rest-api/)
- [OAuth 2.0 with PKCE](https://oauth.net/2/pkce/)
- [Azure App Registration](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)

## Support

If you encounter issues:

1. Check the [troubleshooting section](#troubleshooting) above
2. Review browser console for detailed error messages
3. Verify your Azure app configuration
4. Check the [joplin-sync-lib documentation](../joplin-sync-lib/docs/ONEDRIVE_SETUP.md)

## Example Flow

Here's a complete example of connecting to OneDrive:

```typescript
import { joplinApi } from './services/joplinApi';

// User provides these in the form
const credentials = {
  type: 'OneDrive',
  onedrive: {
    clientId: '12345678-1234-1234-1234-123456789abc',
    authToken: undefined, // Will trigger OAuth flow
    isPublic: true,
  },
};

// Connect
await joplinApi.connect(credentials);

// Fetch items
const items = await joplinApi.getItems();
console.log('Items:', items);
```

That's it! You're now ready to use OneDrive with the Joplin Web Viewer. 🎉
