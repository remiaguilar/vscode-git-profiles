import * as vscode from 'vscode';
import { ProfileManager } from './profileManager';
import { ProfilesProvider } from './profilesProvider';
import { GitConfigManager } from './gitConfigManager';
import { ProfileStorage } from './profileStorage';

export function activate(context: vscode.ExtensionContext) {
    console.log('Git Profiles extension activada');

    const profileStorage = new ProfileStorage(context);
    const profileManager = new ProfileManager(context, profileStorage);
    const profilesProvider = new ProfilesProvider(profileManager);
    const gitConfigManager = new GitConfigManager();

    // Registrar TreeView
    const treeView = vscode.window.createTreeView('gitProfilesView', {
        treeDataProvider: profilesProvider,
        showCollapseAll: false
    });

    // Comando: Refrescar
    context.subscriptions.push(
        vscode.commands.registerCommand('gitProfiles.refresh', () => {
            profilesProvider.refresh();
        })
    );

    // Comando: Crear perfil
    context.subscriptions.push(
        vscode.commands.registerCommand('gitProfiles.createProfile', async () => {
            const name = await vscode.window.showInputBox({
                prompt: 'Nombre del perfil',
                placeHolder: 'Personal, Trabajo, etc.'
            });
            if (!name) return;

            const username = await vscode.window.showInputBox({
                prompt: 'Usuario de GitHub',
                placeHolder: 'tu-usuario'
            });
            if (!username) return;

            const email = await vscode.window.showInputBox({
                prompt: 'Email',
                placeHolder: 'tu@email.com'
            });
            if (!email) return;

            const token = await vscode.window.showInputBox({
                prompt: 'GitHub Personal Access Token',
                placeHolder: 'ghp_xxxxxxxxxxxxxxxxxxxx',
                password: true
            });
            if (!token) return;

            await profileManager.createProfile({ name, username, email, token });
            profilesProvider.refresh();
            vscode.window.showInformationMessage(`Perfil "${name}" creado`);
        })
    );

    // Comando: Editar perfil
    context.subscriptions.push(
        vscode.commands.registerCommand('gitProfiles.editProfile', async (item) => {
            if (!item?.profile) return;

            const profile = item.profile;
            
            const name = await vscode.window.showInputBox({
                prompt: 'Nombre del perfil',
                value: profile.name
            });
            if (!name) return;

            const username = await vscode.window.showInputBox({
                prompt: 'Usuario de GitHub',
                value: profile.username
            });
            if (!username) return;

            const email = await vscode.window.showInputBox({
                prompt: 'Email',
                value: profile.email
            });
            if (!email) return;

            const token = await vscode.window.showInputBox({
                prompt: 'GitHub Personal Access Token',
                value: profile.token,
                password: true
            });
            if (!token) return;

            profile.name = name;
            profile.username = username;
            profile.email = email;
            profile.token = token;

            await profileManager.saveProfile(profile);
            profilesProvider.refresh();
            vscode.window.showInformationMessage(`Perfil "${name}" actualizado`);
        })
    );

    // Comando: Eliminar perfil
    context.subscriptions.push(
        vscode.commands.registerCommand('gitProfiles.deleteProfile', async (item) => {
            if (!item?.profile) return;

            const confirm = await vscode.window.showWarningMessage(
                `¿Eliminar perfil "${item.profile.name}"?`,
                'Eliminar', 'Cancelar'
            );

            if (confirm === 'Eliminar') {
                await profileManager.deleteProfile(item.profile.id);
                profilesProvider.refresh();
                vscode.window.showInformationMessage(`Perfil eliminado`);
            }
        })
    );

    // Comando: Activar perfil
    context.subscriptions.push(
        vscode.commands.registerCommand('gitProfiles.activateProfile', async (item) => {
            if (!item?.profile) return;

            await profileManager.setActiveProfile(item.profile.id);
            profilesProvider.refresh();
            vscode.window.showInformationMessage(`Perfil "${item.profile.name}" activado`);
        })
    );

    // Comando: Configurar repositorio actual
    context.subscriptions.push(
        vscode.commands.registerCommand('gitProfiles.configureRepo', async () => {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                vscode.window.showWarningMessage('No hay carpeta abierta');
                return;
            }

            const repoPath = workspaceFolders[0].uri.fsPath;
            
            // Verificar que es un repositorio git
            if (!await gitConfigManager.isGitRepository(repoPath)) {
                vscode.window.showWarningMessage('La carpeta actual no es un repositorio git');
                return;
            }

            // Obtener perfiles
            const profiles = await profileManager.getProfiles();
            if (profiles.length === 0) {
                vscode.window.showWarningMessage('No hay perfiles configurados. Crea uno primero.');
                return;
            }

            // Mostrar selector de perfiles
            const selected = await vscode.window.showQuickPick(
                profiles.map(p => ({
                    label: p.name,
                    description: p.email,
                    detail: p.isActive ? '● Activo' : '',
                    profile: p
                })),
                {
                    placeHolder: 'Selecciona un perfil para este repositorio'
                }
            );

            if (selected) {
                await gitConfigManager.configureRepository(repoPath, selected.profile);
            }
        })
    );

    context.subscriptions.push(treeView);
}

export function deactivate() {}
