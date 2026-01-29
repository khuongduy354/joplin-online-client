import * as JoplinSync from "joplin-sync";
import type { Credentials } from "../components/CredentialForm";
import type { Item } from "joplin-sync";

const { StorageAPI, Logger, LogLevel } = JoplinSync as any;

// Disable verbose logging, only allow errors
if (Logger && LogLevel) {
  console.log("Setting JoplinSync log level to ERROR");
  Logger.setLevel(LogLevel.Error);
}

export class JoplinApiService {
  private storage: typeof StorageAPI.prototype | null = null;
  private initialized = false;
  private oauthFlowHandler: ((authUrl: string) => Promise<string>) | null = null;

  /**
   * Set a custom OAuth flow handler for services like OneDrive and Google Drive
   * @param handler Function that takes an auth URL and returns a Promise with the auth code
   */
  setOAuthFlowHandler(handler: (authUrl: string) => Promise<string>): void {
    this.oauthFlowHandler = handler;
  }

  async connect(credentials: Credentials): Promise<void> {
    try {
      const { type } = credentials;

      if (type === "FileSystem") {
        this.storage = new StorageAPI("FileSystem", {
          filesystemOptions: {
            syncPath: credentials.filesystem?.syncPath || "",
          },
        });
      } else if (type === "WebDAV") {
        console.log("Connecting with WebDAV credentials:", credentials.webdav);
        this.storage = new StorageAPI("WebDAV", {
          webDAVOptions: {
            username: credentials.webdav?.username || "",
            password: credentials.webdav?.password || "",
            path: credentials.webdav?.path || "",
            ignoreTlsErrors: credentials.webdav?.ignoreTlsErrors || false,
          },
        });
      } else if (type === "OneDrive") {
        this.storage = new StorageAPI("OneDrive", {
          oneDriveOptions: {
            clientId: credentials.onedrive?.clientId,
            clientSecret: credentials.onedrive?.clientSecret,
            authToken: credentials.onedrive?.authToken,
            isPublic: credentials.onedrive?.isPublic ?? true,
            oauthFlowHandler: this.oauthFlowHandler ?? undefined,
            redirectUri: credentials.onedrive?.redirectUri,
            basePath: credentials.onedrive?.basePath,
          },
        });

      } else if (type === "JoplinServer") {
        this.storage = new StorageAPI("JoplinServer", {
          joplinServerOptions: {
            username: credentials.joplinserver?.username || "",
            password: credentials.joplinserver?.password || "",
            path: credentials.joplinserver?.path || "",
            userContentPath: credentials.joplinserver?.userContentPath || "",
          },
        });
      } else if (type === "GoogleDrive") {
        this.storage = new StorageAPI("GoogleDrive", {
          googleDriveOptions: {
            clientId: credentials.googledrive?.clientId,
            clientSecret: credentials.googledrive?.clientSecret,
            authToken: credentials.googledrive?.authToken,
            isPublic: credentials.googledrive?.isPublic ?? true,
          },
        });
      } else {
        throw new Error(`Unsupported storage type: ${type}`);
      }

      await this.storage.init();
      this.initialized = true;
    } catch (error) {
      console.error("[JoplinApi.connect] Failed to connect:", error);
      this.storage = null;
      this.initialized = false;
      throw new Error(
        `Failed to connect to ${credentials.type}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Listen for auth token refresh events (OneDrive/GoogleDrive)
   * @param callback Function to call when auth is refreshed
   */
  onAuthRefresh(callback: (authToken: string) => void): void {
    if (this.storage) {
      this.storage.onAuthRefresh(callback);
    }
  }

  /**
   * List all items (metadata only, no content)
   * This is fast and efficient for checking what exists
   */
  async listItems(): Promise<any[]> {
    try {
      if (!this.storage || !this.initialized) {
        throw new Error("Storage not initialized. Call connect() first.");
      }

      console.log("[JoplinApi.listItems] Fetching item list (metadata)");
      const items = await this.storage.getItems({
        unserializeAll: false,
      });
      
      return items;
    } catch (error) {
      console.error("[JoplinApi.listItems] Error:", error);
      throw new Error(
        `Failed to list items: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Fetch full item content for specific IDs or all items
   * @param ids Optional list of IDs to fetch. If not provided, fetches ALL items (careful with large libraries!)
   */
  async getItems(ids?: string[]): Promise<Item[]> {
    try {
      if (!this.storage || !this.initialized) {
        throw new Error("Storage not initialized. Call connect() first.");
      }

      console.log(`[JoplinApi.getItems] Fetching items (ids: ${ids?.length || 'ALL'})`);
      
      const items = await this.storage.getItems({
        unserializeAll: true,
        ids: ids,
      });
      
      // Filter out null items (items that failed to unserialize)
      return items.filter((item: Item | null): item is Item => item !== null);
    } catch (error) {
      console.error("[JoplinApi.getItems] Error:", error);
      throw new Error(
        `Failed to get items: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async getItem(id: string): Promise<Item | null> {
    try {
      if (!this.storage || !this.initialized) {
        throw new Error("Storage not initialized. Call connect() first.");
      }

      const items = await this.storage.getItems({
        ids: [id],
        unserializeAll: true,
      });
      
      // Return first valid item (not null)
      const validItems = items.filter((item: Item | null): item is Item => item !== null);
      return validItems.length > 0 ? validItems[0] : null;
    } catch (error) {
      console.error(`[JoplinApi.getItem] Error getting item ${id}:`, error);
      // Return null instead of throwing, as this is a "find" operation
      return null;
    }
  }

  async getNotes(): Promise<Item[]> {
    try {
      const items = await this.getItems();
      return items.filter((item) => item.type_ === 1);
    } catch (error) {
      console.error("[JoplinApi.getNotes] Error:", error);
      return []; // Return empty array on error
    }
  }

  async getFolders(): Promise<Item[]> {
    try {
      const items = await this.getItems();
      return items.filter((item) => item.type_ === 2);
    } catch (error) {
      console.error("[JoplinApi.getFolders] Error:", error);
      return []; // Return empty array on error
    }
  }

  async getTags(): Promise<Item[]> {
    try {
      const items = await this.getItems();
      return items.filter((item) => item.type_ === 5);
    } catch (error) {
      console.error("[JoplinApi.getTags] Error:", error);
      return []; // Return empty array on error
    }
  }

  async getResources(): Promise<Item[]> {
    try {
      const items = await this.getItems();
      return items.filter((item) => item.type_ === 4);
    } catch (error) {
      console.error("[JoplinApi.getResources] Error:", error);
      return []; // Return empty array on error
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  disconnect(): void {
    try {
      this.storage = null;
      this.initialized = false;
    } catch (error) {
      console.error("[JoplinApi.disconnect] Error:", error);
    }
  }
}

export const joplinApi = new JoplinApiService();
