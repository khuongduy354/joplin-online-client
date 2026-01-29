import type { Credentials } from "../components/CredentialForm";

const STORAGE_KEY_PREFIX = "joplin_profile_";
const ACTIVE_PROFILE_KEY = "joplin_active_profile";

export interface Profile {
  id: string;
  name: string;
  type: Credentials["type"];
  credentials: Credentials;
  lastUsed: number;
  createdAt: number;
}

export class ProfileManager {
  /**
   * Save a profile to localStorage
   */
  static saveProfile(profile: Profile): void {
    const key = `${STORAGE_KEY_PREFIX}${profile.id}`;
    localStorage.setItem(key, JSON.stringify(profile));
  }

  /**
   * Get a profile by ID
   */
  static getProfile(profileId: string): Profile | null {
    const key = `${STORAGE_KEY_PREFIX}${profileId}`;
    const data = localStorage.getItem(key);
    if (!data) return null;
    
    try {
      return JSON.parse(data) as Profile;
    } catch (error) {
      console.error("Failed to parse profile:", error);
      return null;
    }
  }

  /**
   * Get all saved profiles
   */
  static getAllProfiles(): Profile[] {
    const profiles: Profile[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            profiles.push(JSON.parse(data) as Profile);
          } catch (error) {
            console.error("Failed to parse profile:", error);
          }
        }
      }
    }
    
    // Sort by last used (most recent first)
    return profiles.sort((a, b) => b.lastUsed - a.lastUsed);
  }

  /**
   * Delete a profile
   */
  static deleteProfile(profileId: string): void {
    const key = `${STORAGE_KEY_PREFIX}${profileId}`;
    localStorage.removeItem(key);
    
    // If this was the active profile, clear it
    const activeProfileId = this.getActiveProfileId();
    if (activeProfileId === profileId) {
      this.clearActiveProfile();
    }
  }

  /**
   * Set the active profile
   */
  static setActiveProfile(profileId: string): void {
    localStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
    
    // Update last used timestamp
    const profile = this.getProfile(profileId);
    if (profile) {
      profile.lastUsed = Date.now();
      this.saveProfile(profile);
    }
  }

  /**
   * Get the active profile ID
   */
  static getActiveProfileId(): string | null {
    return localStorage.getItem(ACTIVE_PROFILE_KEY);
  }

  /**
   * Get the active profile
   */
  static getActiveProfile(): Profile | null {
    const profileId = this.getActiveProfileId();
    if (!profileId) return null;
    return this.getProfile(profileId);
  }

  /**
   * Clear the active profile (logout)
   */
  static clearActiveProfile(): void {
    localStorage.removeItem(ACTIVE_PROFILE_KEY);
  }

  /**
   * Create a new profile from credentials
   */
  static createProfile(credentials: Credentials, name?: string): Profile {
    const id = `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const profileName = name || `${credentials.type} - ${new Date().toLocaleDateString()}`;
    
    return {
      id,
      name: profileName,
      type: credentials.type,
      credentials,
      lastUsed: Date.now(),
      createdAt: Date.now(),
    };
  }

  /**
   * Update profile credentials (e.g., when auth token is refreshed)
   */
  static updateProfileCredentials(profileId: string, credentials: Credentials): void {
    const profile = this.getProfile(profileId);
    if (profile) {
      profile.credentials = credentials;
      profile.lastUsed = Date.now();
      this.saveProfile(profile);
    }
  }

  /**
   * Update OneDrive auth token for a profile
   */
  static updateOneDriveToken(profileId: string, authToken: string): void {
    const profile = this.getProfile(profileId);
    if (profile && profile.credentials.onedrive) {
      profile.credentials.onedrive.authToken = authToken;
      profile.lastUsed = Date.now();
      this.saveProfile(profile);
    }
  }
}
