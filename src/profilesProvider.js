"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfilesProvider = exports.ProfileTreeItem = void 0;
const vscode = __importStar(require("vscode"));
class ProfileTreeItem extends vscode.TreeItem {
    constructor(label, collapsibleState, profile, isHeader) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.profile = profile;
        this.isHeader = isHeader;
        if (profile) {
            this.contextValue = profile.isActive ? 'profile-active' : 'profile-inactive';
            // Tooltip con info de Git y AWS
            let tooltip = `${profile.name}\n${profile.email}\nUsername: ${profile.username}`;
            if (profile.awsCredentials) {
                tooltip += `\n\nAWS:\n  Profile: ${profile.awsCredentials.profileName || profile.name}\n  Region: ${profile.awsCredentials.region || 'No configurada'}`;
            }
            this.tooltip = tooltip;
            // Description muestra estado y si tiene AWS
            let desc = profile.isActive ? '● Activo' : '';
            if (profile.awsCredentials) {
                desc += (desc ? ' | ' : '') + '☁️ AWS';
            }
            this.description = desc;
            if (profile.isActive) {
                this.iconPath = new vscode.ThemeIcon('account', new vscode.ThemeColor('charts.green'));
            }
            else {
                this.iconPath = new vscode.ThemeIcon('account');
            }
            // Click para activar
            if (!profile.isActive) {
                this.command = {
                    command: 'gitProfiles.activateProfile',
                    title: 'Activar Perfil',
                    arguments: [this]
                };
            }
        }
        else if (isHeader) {
            this.contextValue = 'header';
            this.iconPath = new vscode.ThemeIcon('organization');
        }
    }
}
exports.ProfileTreeItem = ProfileTreeItem;
class ProfilesProvider {
    constructor(profileManager) {
        this.profileManager = profileManager;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        if (!element) {
            // Root level
            const profiles = await this.profileManager.getProfiles();
            if (profiles.length === 0) {
                return [
                    new ProfileTreeItem('No hay perfiles configurados', vscode.TreeItemCollapsibleState.None)
                ];
            }
            // Ordenar: activo primero, luego alfabético
            profiles.sort((a, b) => {
                if (a.isActive)
                    return -1;
                if (b.isActive)
                    return 1;
                return a.name.localeCompare(b.name);
            });
            return profiles.map(profile => new ProfileTreeItem(profile.name, vscode.TreeItemCollapsibleState.None, profile));
        }
        return [];
    }
    async createProfile() {
        const name = await vscode.window.showInputBox({
            prompt: 'Nombre del perfil',
            placeHolder: 'Personal, Work, Cliente XYZ, etc.'
        });
        if (!name)
            return;
        const email = await vscode.window.showInputBox({
            prompt: 'Email',
            placeHolder: 'tu@email.com'
        });
        if (!email)
            return;
        const username = await vscode.window.showInputBox({
            prompt: 'Username de GitHub',
            placeHolder: 'tu-usuario'
        });
        if (!username)
            return;
        const sshHost = await vscode.window.showInputBox({
            prompt: 'SSH Host (para ~/.ssh/config)',
            placeHolder: `github.com-${name.toLowerCase().replace(/\s+/g, '-')}`,
            value: `github.com-${name.toLowerCase().replace(/\s+/g, '-')}`
        });
        if (!sshHost)
            return;
        const profile = {
            id: this.profileManager.generateProfileId(),
            name,
            email,
            username,
            sshHost,
            isActive: false
        };
        await this.profileManager.saveProfile(profile);
        vscode.window.showInformationMessage(`Perfil "${name}" creado exitosamente`);
        this.refresh();
    }
    async editProfile(item) {
        if (!item.profile)
            return;
        const profile = item.profile;
        const name = await vscode.window.showInputBox({
            prompt: 'Nombre del perfil',
            value: profile.name
        });
        if (name)
            profile.name = name;
        const email = await vscode.window.showInputBox({
            prompt: 'Email',
            value: profile.email
        });
        if (email)
            profile.email = email;
        const username = await vscode.window.showInputBox({
            prompt: 'Username de GitHub',
            value: profile.username
        });
        if (username)
            profile.username = username;
        await this.profileManager.saveProfile(profile);
        vscode.window.showInformationMessage(`Perfil "${profile.name}" actualizado`);
        this.refresh();
    }
    async deleteProfile(item) {
        if (!item.profile)
            return;
        const confirm = await vscode.window.showWarningMessage(`¿Eliminar perfil "${item.profile.name}"?`, 'Eliminar', 'Cancelar');
        if (confirm === 'Eliminar') {
            await this.profileManager.deleteProfile(item.profile.id);
            vscode.window.showInformationMessage(`Perfil "${item.profile.name}" eliminado`);
            this.refresh();
        }
    }
    async activateProfile(item) {
        if (!item.profile)
            return;
        await this.profileManager.activateProfile(item.profile.id);
        vscode.window.showInformationMessage(`Perfil "${item.profile.name}" activado`);
        this.refresh();
    }
}
exports.ProfilesProvider = ProfilesProvider;
//# sourceMappingURL=profilesProvider.js.map