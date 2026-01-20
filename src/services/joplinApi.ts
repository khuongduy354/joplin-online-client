import * as JoplinSync from "joplin-sync";
import type { Credentials } from "../components/CredentialForm";
import type { Item } from "joplin-sync";

const { StorageAPI } = JoplinSync;

export class JoplinApiService {
  private storage: typeof StorageAPI.prototype | null = null;
  private initialized = false;

  async connect(credentials: Credentials): Promise<void> {
    const { type } = credentials;

    if (type === "FileSystem") {
      this.storage = new StorageAPI("FileSystem", {
        filesystemOptions: {
          syncPath: credentials.filesystem?.syncPath || "",
        },
      });
    } else if (type === "WebDAV") {
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
  }

  async getItems(): Promise<Item[]> {
    if (!this.storage || !this.initialized) {
      throw new Error("Storage not initialized. Call connect() first.");
    }

    return await this.storage.getItems();
  }

  async getItem(id: string): Promise<Item | null> {
    if (!this.storage || !this.initialized) {
      throw new Error("Storage not initialized. Call connect() first.");
    }

    const items = await this.storage.getItems({
      ids: [id],
      unserializeAll: true,
    });
    return items.length > 0 ? items[0] : null;
  }

  async getNotes(): Promise<Item[]> {
    const items = await this.getItems();
    return items.filter((item) => item.type_ === 1);
  }

  async getFolders(): Promise<Item[]> {
    const items = await this.getItems();
    return items.filter((item) => item.type_ === 2);
  }

  async getTags(): Promise<Item[]> {
    const items = await this.getItems();
    return items.filter((item) => item.type_ === 5);
  }

  async getResources(): Promise<Item[]> {
    const items = await this.getItems();
    return items.filter((item) => item.type_ === 4);
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  disconnect(): void {
    this.storage = null;
    this.initialized = false;
  }
}

export const joplinApi = new JoplinApiService();
