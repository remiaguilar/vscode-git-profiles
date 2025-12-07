import * as vscode from 'vscode';
import { GitProfile } from './types';
import { ProfileStorage } from './profileStorage';

export class ProfileManager {
    constructor(
        private context: vscode.ExtensionContext,
        private storage: ProfileStorage
    ) {}

    async getProfiles(): Promise<GitProfile[]> {
        return this.storage.loadProfiles();
    }

    async saveProfile(profile: GitProfile): Promise<void> {
        const profiles = await this.getProfiles();
        const index = profiles.findIndex(p => p.id === profile.id);
        
        if (index >= 0) {
            profiles[index] = profile;
        } else {
            profiles.push(profile);
        }
        
        this.storage.saveProfiles(profiles);
    }

    async deleteProfile(profileId: string): Promise<void> {
        const profiles = await this.getProfiles();
        const filtered = profiles.filter(p => p.id !== profileId);
        this.storage.saveProfiles(filtered);
    }

    async activateProfile(profileId: string): Promise<void> {
        const profiles = await this.getProfiles();
        
        // Desactivar todos
        profiles.forEach(p => p.isActive = false);
        
        // Activar el seleccionado
        const profile = profiles.find(p => p.id === profileId);
        if (profile) {
            profile.isActive = true;
        }
        
        this.storage.saveProfiles(profiles);
    }

    async getActiveProfile(): Promise<GitProfile | undefined> {
        const profiles = await this.getProfiles();
        return profiles.find(p => p.isActive);
    }

    async createProfile(data: { name: string; username: string; email: string; token: string }): Promise<void> {
        const profiles = await this.getProfiles();
        
        const newProfile: GitProfile = {
            id: this.generateProfileId(),
            name: data.name,
            username: data.username,
            email: data.email,
            token: data.token,
            isActive: profiles.length === 0 // Primer perfil es activo por defecto
        };
        
        profiles.push(newProfile);
        await this.storage.saveProfiles(profiles);
    }

    async setActiveProfile(profileId: string): Promise<void> {
        await this.activateProfile(profileId);
    }

    generateProfileId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}
