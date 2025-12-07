import * as vscode from 'vscode';
import { GitProfile } from './types';
import { ProfileManager } from './profileManager';

export class ProfileTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly profile?: GitProfile,
        public readonly isHeader?: boolean
    ) {
        super(label, collapsibleState);

        if (profile) {
            this.contextValue = profile.isActive ? 'profile-active' : 'profile-inactive';
            
            // Tooltip con info del perfil
            const maskedToken = profile.token ? profile.token.substring(0, 7) + '...' + profile.token.substring(profile.token.length - 4) : 'No configurado';
            let tooltip = `${profile.name}\n${profile.email}\nUsername: ${profile.username}\n\nGitHub Token: ${maskedToken}`;
            this.tooltip = tooltip;
            
            // Description muestra estado
            let desc = profile.isActive ? '● Activo' : '';
            desc += (desc ? ' | ' : '') + '🎫 Token';
            this.description = desc;
            
            if (profile.isActive) {
                this.iconPath = new vscode.ThemeIcon('account', new vscode.ThemeColor('charts.green'));
            } else {
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
        } else if (isHeader) {
            this.contextValue = 'header';
            this.iconPath = new vscode.ThemeIcon('organization');
        }
    }
}

export class ProfilesProvider implements vscode.TreeDataProvider<ProfileTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ProfileTreeItem | undefined | null | void> = 
        new vscode.EventEmitter<ProfileTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ProfileTreeItem | undefined | null | void> = 
        this._onDidChangeTreeData.event;

    constructor(private profileManager: ProfileManager) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ProfileTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: ProfileTreeItem): Promise<ProfileTreeItem[]> {
        if (!element) {
            // Root level
            const profiles = await this.profileManager.getProfiles();
            
            if (profiles.length === 0) {
                return [
                    new ProfileTreeItem(
                        'No hay perfiles configurados',
                        vscode.TreeItemCollapsibleState.None
                    )
                ];
            }

            // Ordenar: activo primero, luego alfabético
            profiles.sort((a, b) => {
                if (a.isActive) return -1;
                if (b.isActive) return 1;
                return a.name.localeCompare(b.name);
            });

            return profiles.map(profile =>
                new ProfileTreeItem(
                    profile.name,
                    vscode.TreeItemCollapsibleState.None,
                    profile
                )
            );
        }
        return [];
    }



    async editProfile(item: ProfileTreeItem): Promise<void> {
        if (!item.profile) return;

        const profile = item.profile;
        
        const name = await vscode.window.showInputBox({
            prompt: 'Nombre del perfil',
            value: profile.name
        });
        if (name) profile.name = name;

        const email = await vscode.window.showInputBox({
            prompt: 'Email',
            value: profile.email
        });
        if (email) profile.email = email;

        const username = await vscode.window.showInputBox({
            prompt: 'Username de GitHub',
            value: profile.username
        });
        if (username) profile.username = username;

        // Mostrar menú para configuración avanzada
        const advancedOptions = await vscode.window.showQuickPick(
            [
                { label: '✅ Guardar cambios', value: 'save' },
                { label: '🔐 Configurar GitHub Auth', value: 'github' },
                { label: '❌ Cancelar', value: 'cancel' }
            ],
            {
                placeHolder: '¿Deseas configurar algo más?'
            }
        );

        if (!advancedOptions || advancedOptions.value === 'cancel') {
            return;
        }

        if (advancedOptions.value === 'github') {
            // Configurar GitHub Auth
            await vscode.commands.executeCommand('gitProfiles.configureGitHub', item);
            return; // configureGitHub ya guarda el perfil
        }

        await this.profileManager.saveProfile(profile);
        vscode.window.showInformationMessage(`Perfil "${profile.name}" actualizado`);
        this.refresh();
    }

    async deleteProfile(item: ProfileTreeItem): Promise<void> {
        if (!item.profile) return;

        const confirm = await vscode.window.showWarningMessage(
            `¿Eliminar perfil "${item.profile.name}"?`,
            'Eliminar', 'Cancelar'
        );

        if (confirm === 'Eliminar') {
            await this.profileManager.deleteProfile(item.profile.id);
            vscode.window.showInformationMessage(`Perfil "${item.profile.name}" eliminado`);
            this.refresh();
        }
    }

    async activateProfile(item: ProfileTreeItem): Promise<void> {
        if (!item.profile) return;

        await this.profileManager.activateProfile(item.profile.id);
        vscode.window.showInformationMessage(`Perfil "${item.profile.name}" activado`);
        this.refresh();
    }
}
