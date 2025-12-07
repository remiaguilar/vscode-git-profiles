"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileManager = void 0;
class ProfileManager {
    constructor(context, storage) {
        this.context = context;
        this.storage = storage;
    }
    async getProfiles() {
        return this.storage.loadProfiles();
    }
    async saveProfile(profile) {
        const profiles = await this.getProfiles();
        const index = profiles.findIndex(p => p.id === profile.id);
        if (index >= 0) {
            profiles[index] = profile;
        }
        else {
            profiles.push(profile);
        }
        this.storage.saveProfiles(profiles);
    }
    async deleteProfile(profileId) {
        const profiles = await this.getProfiles();
        const filtered = profiles.filter(p => p.id !== profileId);
        this.storage.saveProfiles(filtered);
    }
    async activateProfile(profileId) {
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
    async getActiveProfile() {
        const profiles = await this.getProfiles();
        return profiles.find(p => p.isActive);
    }
    generateProfileId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}
exports.ProfileManager = ProfileManager;
//# sourceMappingURL=profileManager.js.map