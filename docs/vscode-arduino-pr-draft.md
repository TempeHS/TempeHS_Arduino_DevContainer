# Fix: Blank Library/Board Manager in Codespaces & Remote Environments

## Problem
The Library Manager and Board Manager UIs appear blank when running in VS Code Codespaces or Remote SSH environments.

## Root Cause
The extension currently spins up a local Express.js HTTP server (e.g., `http://localhost:PORT`) to serve the Webview content and handle API requests.
1.  **Network Isolation:** In remote environments, the Webview running in the client's browser cannot reach `localhost` on the remote host without manual port forwarding.
2.  **Mixed Content Blocking:** Even with port forwarding, Codespaces runs over HTTPS. The browser blocks the Webview from making insecure `fetch()` requests to the local HTTP server (`http://localhost...`), causing the React app to fail silently.

## Proposed Solution
Refactor the Webview implementation to remove the dependency on the local Express server and use the native VS Code Webview API, which is designed to handle remote contexts securely.

### 1. Remove Local Server Dependency
Deprecate `LocalWebServer` for serving Webview content.

### 2. Use `asWebviewUri` for Assets
Load JavaScript and CSS bundles directly from the disk using the Webview URI scheme. This ensures assets load correctly in both local and remote environments.

**Before:**
```html
<script src="http://localhost:PORT/bundle.js"></script>
```

**After:**
```typescript
const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'out', 'views', 'bundle.js'));
return `... <script src="${scriptUri}"></script> ...`;
```

### 3. Replace HTTP Fetch with Message Passing
Replace `window.fetch` calls in the React frontend with `vscode.postMessage()`. Handle these messages in the extension backend using `webview.onDidReceiveMessage`.

**Frontend (React):**
```typescript
// Old
// fetch('/api/installlibrary', { method: 'POST', body: ... });

// New
vscode.postMessage({ 
    command: 'installLibrary', 
    payload: { name: 'LibraryName' } 
});
```

**Backend (Extension):**
```typescript
panel.webview.onDidReceiveMessage(async (message) => {
    switch (message.command) {
        case 'installLibrary':
            await libraryManager.install(message.payload.name);
            panel.webview.postMessage({ command: 'installComplete' });
            break;
    }
});
```

## Benefits
*   **Fixes Codespaces Support:** Eliminates Mixed Content errors and port forwarding requirements.
*   **Improved Security:** Removes an unauthenticated local HTTP server.
*   **Better Performance:** Removes the overhead of an Express server process.
