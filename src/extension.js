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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const profileManager_1 = require("./profileManager");
const profilesProvider_1 = require("./profilesProvider");
const sshManager_1 = require("./sshManager");
const gitConfigManager_1 = require("./gitConfigManager");
const awsManager_1 = require("./awsManager");
const profileStorage_1 = require("./profileStorage");
function activate(context) {
    console.log('Git Profiles extension activada');
    const profileStorage = new profileStorage_1.ProfileStorage(context);
    const profileManager = new profileManager_1.ProfileManager(context, profileStorage);
    const profilesProvider = new profilesProvider_1.ProfilesProvider(profileManager);
    const sshManager = new sshManager_1.SSHManager();
    const gitConfigManager = new gitConfigManager_1.GitConfigManager();
    const awsManager = new awsManager_1.AWSCredentialsManager();
    // Registrar TreeView
    const treeView = vscode.window.createTreeView('gitProfilesView', {
        treeDataProvider: profilesProvider,
        showCollapseAll: false
    });
    // Comando: Seleccionar directorio de perfiles
    context.subscriptions.push(vscode.commands.registerCommand('gitProfiles.selectDirectory', async () => {
        const folderUri = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Seleccionar Directorio de Perfiles'
        });
        if (folderUri && folderUri[0]) {
            await profileStorage.setDirectory(folderUri[0].fsPath);
            profilesProvider.refresh();
            vscode.window.showInformationMessage(`Directorio de perfiles: ${folderUri[0].fsPath}`);
        }
    }));
    // Comando: Refrescar
    context.subscriptions.push(vscode.commands.registerCommand('gitProfiles.refresh', () => {
        profilesProvider.refresh();
    }));
    // Comando: Crear perfil
    context.subscriptions.push(vscode.commands.registerCommand('gitProfiles.createProfile', async () => {
        await profilesProvider.createProfile();
    }));
    // Comando: Editar perfil
    context.subscriptions.push(vscode.commands.registerCommand('gitProfiles.editProfile', async (item) => {
        await profilesProvider.editProfile(item);
    }));
    // Comando: Eliminar perfil
    context.subscriptions.push(vscode.commands.registerCommand('gitProfiles.deleteProfile', async (item) => {
        await profilesProvider.deleteProfile(item);
    }));
    // Comando: Activar perfil
    context.subscriptions.push(vscode.commands.registerCommand('gitProfiles.activateProfile', async (item) => {
        await profilesProvider.activateProfile(item);
    }));
    // Comando: Generar SSH Key
    context.subscriptions.push(vscode.commands.registerCommand('gitProfiles.generateSSHKey', async (item) => {
        if (!item?.profile)
            return;
        const profile = item.profile;
        try {
            const keyInfo = await sshManager.generateSSHKey(profile.name, profile.email);
            // Actualizar perfil con la ruta de la clave
            profile.sshKeyPath = keyInfo.privateKeyPath;
            await profileManager.saveProfile(profile);
            // Actualizar SSH config
            if (profile.sshHost) {
                await sshManager.updateSSHConfig(profile.name, profile.sshHost, keyInfo.privateKeyPath);
            }
            // Preguntar si quiere copiar la clave pública
            const copy = await vscode.window.showInformationMessage('SSH Key generada. ¿Copiar clave pública al portapapeles?', 'Sí', 'No');
            if (copy === 'Sí') {
                const publicKey = await sshManager.getPublicKey(keyInfo.publicKeyPath);
                await vscode.env.clipboard.writeText(publicKey);
                vscode.window.showInformationMessage('Clave pública copiada. Agrégala en GitHub → Settings → SSH Keys');
            }
            profilesProvider.refresh();
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error: ${error.message}`);
        }
    }));
    // Comando: Copiar clave pública
    context.subscriptions.push(vscode.commands.registerCommand('gitProfiles.copyPublicKey', async (item) => {
        if (!item?.profile?.sshKeyPath) {
            vscode.window.showWarningMessage('Este perfil no tiene una SSH key configurada');
            return;
        }
        try {
            const publicKeyPath = `${item.profile.sshKeyPath}.pub`;
            const publicKey = await sshManager.getPublicKey(publicKeyPath);
            await vscode.env.clipboard.writeText(publicKey);
            vscode.window.showInformationMessage('Clave pública copiada al portapapeles');
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error: ${error.message}`);
        }
    }));
    // Comando: Configurar GitHub
    context.subscriptions.push(vscode.commands.registerCommand('gitProfiles.configureGitHub', async (item) => {
        if (!item?.profile)
            return;
        const profile = item.profile;
        // Seleccionar tipo de autenticación
        const authType = await vscode.window.showQuickPick([
            { label: '🔑 SSH Key', value: 'ssh' },
            { label: '🎫 Personal Access Token (HTTPS)', value: 'token' }
        ], {
            placeHolder: 'Selecciona el método de autenticación para GitHub'
        });
        if (!authType)
            return;
        if (authType.value === 'token') {
            const token = await vscode.window.showInputBox({
                prompt: 'GitHub Personal Access Token',
                placeHolder: 'ghp_xxxxxxxxxxxxxxxxxxxx',
                password: true,
                value: profile.githubAuth?.token
            });
            if (!token)
                return;
            profile.githubAuth = {
                authType: 'token',
                token
            };
            await profileManager.saveProfile(profile);
            vscode.window.showInformationMessage(`GitHub Token configurado para "${profile.name}"`);
        }
        else {
            // SSH - ya existe la funcionalidad
            profile.githubAuth = {
                authType: 'ssh'
            };
            await profileManager.saveProfile(profile);
            if (!profile.sshKeyPath) {
                const generateKey = await vscode.window.showInformationMessage('No hay SSH key configurada. ¿Generar una?', 'Sí', 'No');
                if (generateKey === 'Sí') {
                    await vscode.commands.executeCommand('gitProfiles.generateSSHKey', item);
                }
            }
            else {
                vscode.window.showInformationMessage(`GitHub SSH configurado para "${profile.name}"`);
            }
        }
        profilesProvider.refresh();
    }));
    // Comando: Configurar repositorio actual
    context.subscriptions.push(vscode.commands.registerCommand('gitProfiles.configureRepo', async () => {
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
        const selected = await vscode.window.showQuickPick(profiles.map(p => ({
            label: p.name,
            description: p.email,
            detail: p.isActive ? '● Activo' : '',
            profile: p
        })), {
            placeHolder: 'Selecciona un perfil para este repositorio'
        });
        if (selected) {
            await gitConfigManager.configureRepository(repoPath, selected.profile);
        }
    }));
    // Comando: Configurar CodeCommit
    context.subscriptions.push(vscode.commands.registerCommand('gitProfiles.configureCodeCommit', async () => {
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
        // Verificar si es repo de CodeCommit
        const isCodeCommit = await gitConfigManager.isCodeCommitRepo(repoPath);
        if (!isCodeCommit) {
            const proceed = await vscode.window.showWarningMessage('Este repositorio no parece ser de CodeCommit. ¿Continuar de todos modos?', 'Continuar', 'Cancelar');
            if (proceed !== 'Continuar')
                return;
        }
        // Obtener perfiles con AWS configurado
        const profiles = await profileManager.getProfiles();
        const awsProfiles = profiles.filter(p => p.awsCredentials);
        if (awsProfiles.length === 0) {
            vscode.window.showWarningMessage('No hay perfiles con credenciales AWS. Configura AWS primero.');
            return;
        }
        // Mostrar selector de perfiles
        const selected = await vscode.window.showQuickPick(awsProfiles.map(p => ({
            label: p.name,
            description: `${p.email} | AWS: ${p.awsCredentials?.region}`,
            detail: p.isActive ? '● Activo' : '',
            profile: p
        })), {
            placeHolder: 'Selecciona un perfil para CodeCommit'
        });
        if (selected) {
            await gitConfigManager.configureCodeCommit(repoPath, selected.profile);
        }
    }));
    // Comando: Abrir SSH Config
    context.subscriptions.push(vscode.commands.registerCommand('gitProfiles.openSSHConfig', async () => {
        const configPath = sshManager.getSSHConfigPath();
        const uri = vscode.Uri.file(configPath);
        try {
            const doc = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(doc);
        }
        catch {
            vscode.window.showWarningMessage('No existe el archivo SSH config. Se creará al generar una SSH key.');
        }
    }));
    // Comando: Configurar AWS
    context.subscriptions.push(vscode.commands.registerCommand('gitProfiles.configureAWS', async (item) => {
        if (!item?.profile)
            return;
        const profile = item.profile;
        const accessKeyId = await vscode.window.showInputBox({
            prompt: 'AWS Access Key ID',
            placeHolder: 'AKIAIOSFODNN7EXAMPLE',
            password: false,
            value: profile.awsCredentials?.accessKeyId
        });
        if (!accessKeyId)
            return;
        const secretAccessKey = await vscode.window.showInputBox({
            prompt: 'AWS Secret Access Key',
            placeHolder: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
            password: true,
            value: profile.awsCredentials?.secretAccessKey
        });
        if (!secretAccessKey)
            return;
        const sessionToken = await vscode.window.showInputBox({
            prompt: 'AWS Session Token (opcional, para MFA)',
            placeHolder: 'Dejar vacío si no usas MFA',
            password: true,
            value: profile.awsCredentials?.sessionToken
        });
        const region = await vscode.window.showInputBox({
            prompt: 'AWS Region',
            placeHolder: 'us-east-1, us-west-2, eu-west-1, etc.',
            value: profile.awsCredentials?.region || 'us-east-1'
        });
        if (!region)
            return;
        const awsProfileName = await vscode.window.showInputBox({
            prompt: 'Nombre del perfil AWS (opcional)',
            placeHolder: profile.name.toLowerCase().replace(/\s+/g, '-'),
            value: profile.awsCredentials?.profileName || profile.name.toLowerCase().replace(/\s+/g, '-')
        });
        // Actualizar perfil
        profile.awsCredentials = {
            accessKeyId,
            secretAccessKey,
            sessionToken: sessionToken || undefined,
            region,
            profileName: awsProfileName || profile.name.toLowerCase().replace(/\s+/g, '-')
        };
        await profileManager.saveProfile(profile);
        // Guardar en ~/.aws/credentials y ~/.aws/config
        await awsManager.saveCredentials(profile.awsCredentials.profileName, profile.awsCredentials);
        vscode.window.showInformationMessage(`Credenciales AWS configuradas para "${profile.name}"`);
        profilesProvider.refresh();
    }));
    // Comando: Actualizar AWS Session Token
    context.subscriptions.push(vscode.commands.registerCommand('gitProfiles.updateAWSToken', async (item) => {
        if (!item?.profile?.awsCredentials) {
            vscode.window.showWarningMessage('Este perfil no tiene credenciales AWS configuradas');
            return;
        }
        const profile = item.profile;
        const sessionToken = await vscode.window.showInputBox({
            prompt: 'Nuevo AWS Session Token',
            placeHolder: 'Pega el nuevo token aquí',
            password: true,
            value: profile.awsCredentials.sessionToken
        });
        if (!sessionToken)
            return;
        // Actualizar solo el token
        profile.awsCredentials.sessionToken = sessionToken;
        await profileManager.saveProfile(profile);
        // Actualizar en ~/.aws/credentials
        await awsManager.saveCredentials(profile.awsCredentials.profileName, profile.awsCredentials);
        vscode.window.showInformationMessage(`Token actualizado para "${profile.name}"`);
        profilesProvider.refresh();
    }));
    // Comando: Remover AWS
    context.subscriptions.push(vscode.commands.registerCommand('gitProfiles.removeAWS', async (item) => {
        if (!item?.profile?.awsCredentials)
            return;
        const confirm = await vscode.window.showWarningMessage(`¿Eliminar credenciales AWS de "${item.profile.name}"?`, 'Eliminar', 'Cancelar');
        if (confirm === 'Eliminar') {
            await awsManager.removeCredentials(item.profile.awsCredentials.profileName);
            item.profile.awsCredentials = undefined;
            await profileManager.saveProfile(item.profile);
            vscode.window.showInformationMessage('Credenciales AWS eliminadas');
            profilesProvider.refresh();
        }
    }));
    // Comando: Abrir AWS Credentials
    context.subscriptions.push(vscode.commands.registerCommand('gitProfiles.openAWSCredentials', async () => {
        const credPath = awsManager.getCredentialsPath();
        const uri = vscode.Uri.file(credPath);
        try {
            const doc = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(doc);
        }
        catch {
            vscode.window.showWarningMessage('No existe el archivo AWS credentials. Se creará al configurar credenciales.');
        }
    }));
    context.subscriptions.push(treeView);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map