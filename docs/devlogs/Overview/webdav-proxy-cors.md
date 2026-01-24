# WebDAV Proxy Configuration - CORS Workaround

## The Problem

When running a web application that connects to a WebDAV server, we encounter CORS (Cross-Origin Resource Sharing) issues:

# Browser Security
- Browser runs on http://localhost:5173 (Vite dev server)
- WebDAV server runs on http://localhost:6065
- Different ports = different origins
- Browser blocks cross-origin requests by default

# WebDAV-Specific Challenges
- WebDAV uses special HTTP methods: PROPFIND, MKCOL, COPY, MOVE, DELETE, LOCK, UNLOCK
- Standard CORS preflight may not handle these methods
- WebDAV servers may not be configured for CORS (designed for desktop clients)
- XML responses contain href paths that reference server root

## The Solution: Vite Proxy

We use Vite's dev server proxy to forward requests to the WebDAV server, making them same-origin from the browser's perspective.

# Architecture
```
Browser (localhost:5173)
  → Makes request to /webdav-proxy-6065/locks/
  → Vite proxy intercepts
  → Rewrites to http://localhost:6065/locks/
  → Forwards to WebDAV server
  → Receives XML response
  → Rewrites hrefs in XML from /locks/ to /webdav-proxy-6065/locks/
  → Returns to browser (same origin, no CORS)
```

# Implementation Details

## 1. Path Conversion (Client-Side)
[CredentialForm.tsx](CredentialForm.tsx#L56-L71)
- User enters: http://localhost:6065/
- Automatically converts to: /webdav-proxy-6065/
- Supports multiple ports: 6065, 8080, 80

## 2. Proxy Configuration (Vite)
[vite.config.ts](vite.config.ts#L58-L125)

Key features:
- `selfHandleResponse: true` - We manually handle responses
- `changeOrigin: true` - Changes origin header for WebDAV server
- `rewrite` - Strips proxy prefix before forwarding to server
- Method preservation - Maintains WebDAV HTTP methods

## 3. Response Rewriting

The critical part - rewriting XML responses:

```typescript
// WebDAV server returns:
<D:href>/locks/</D:href>

// Proxy rewrites to:
<D:href>/webdav-proxy-6065/locks/</D:href>
```

Why this is necessary:
- joplin-sync library compares hrefs from XML with baseUrl
- baseUrl is /webdav-proxy-6065/
- If hrefs are just /locks/, comparison fails
- Error: "href /locks/ not in baseUrl /webdav-proxy-6065"

## 4. Content-Length Fix

Critical issue discovered:
- Original response has content-length based on original body size
- After rewriting (adding /webdav-proxy-6065/), body is larger
- Old content-length causes truncated XML
- XML parser fails on incomplete XML

Solution:
```typescript
const headers = { ...proxyRes.headers };
delete headers['content-length'];
headers['content-length'] = Buffer.byteLength(rewrittenBody).toString();
```

## Limitations

# Development Only
- This proxy only works in development (Vite dev server)
- Production builds won't have this proxy
- Need different solution for production (backend proxy or CORS-enabled WebDAV)

# Port-Specific Configuration
- Must add proxy config for each port used
- Currently supports: 6065, 8080, 80
- Adding new ports requires vite.config.ts update

# Localhost Only
- Proxy only helps with localhost WebDAV servers
- External WebDAV servers still need CORS configured
- No way to proxy external servers through Vite (security limitation)

# Performance
- All responses go through Node.js proxy
- XML parsing and rewriting adds latency
- Not suitable for large files or high-traffic scenarios

# XML-Only Rewriting
- Only rewrites XML responses (detected by content-type)
- Binary files, JSON, etc. are piped through unchanged
- If WebDAV returns unexpected content-type, rewriting won't work

## Production Considerations

For production deployment, consider:

1. **Backend Proxy**
   - Add Express/Fastify server
   - Proxy WebDAV requests server-side
   - Deploy as full-stack app

2. **CORS-Enabled WebDAV**
   - Configure WebDAV server to allow CORS
   - Set Access-Control-Allow-Origin headers
   - Enable WebDAV methods in Access-Control-Allow-Methods

3. **Desktop App**
   - Use Electron or Tauri
   - No CORS restrictions in desktop context
   - Can connect directly to WebDAV

4. **Browser Extension**
   - Chrome/Firefox extension with host permissions
   - Can bypass CORS for specific domains
   - More complex deployment

## Testing

# Local WebDAV Server
```bash
# Using Docker
docker run -d -p 6065:80 \
  -e USERNAME=joplin \
  -e PASSWORD=1 \
  bytemark/webdav

# Test connection
curl -X PROPFIND http://localhost:6065/ \
  -u joplin:1 \
  -H "Depth: 1"
```

# Verify Proxy
1. Open browser dev tools → Network tab
2. Connect to WebDAV
3. All requests should go to localhost:5173/webdav-proxy-6065/...
4. Check response bodies - hrefs should include proxy prefix

## Alternative Approaches Considered

# CORS Chrome Extension
- Temporarily disable CORS for development
- Bad practice, doesn't work for users
- Security risk

# Direct Connection
- Would require WebDAV server CORS config
- Not possible with many WebDAV implementations
- Users would need to configure their servers


## Conclusion

The Vite proxy solution is the best approach for development:
- No user configuration required
- Works with any WebDAV server
- Transparent to end users
- Minimal code changes

However, it's development-only. Production needs proper CORS or backend proxy.
