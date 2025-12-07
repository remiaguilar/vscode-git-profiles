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
exports.GitConfigManager = void 0;
const vscode = __importStar(require("vscode"));
const util_1 = require("util");
const child_process_1 = require("child_process");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class GitConfigManager {
    async configureRepository(repoPath, profile) {
        try {
            // Configurar user.name
            await execAsync(`git config user.name "${profile.name}"`, { cwd: repoPath });
            // Configurar user.email
            await execAsync(`git config user.email "${profile.email}"`, { cwd: repoPath });
            // Configurar según tipo de autenticación GitHub
            if (profile.githubAuth) {
                await this.configureGitHubAuth(repoPath, profile);
            }
            // Si tiene SSH host configurado, actualizar remote URL
            else if (profile.sshHost) {
                try {
                    // Obtener URL actual del remote origin
                    const { stdout: remoteUrl } = await execAsync('git config --get remote.origin.url', { cwd: repoPath });
                    if (remoteUrl.includes('github.com')) {
                        // Convertir HTTPS a SSH o actualizar SSH host
                        let newUrl;
                        if (remoteUrl.includes('https://')) {
                            // Convertir de HTTPS a SSH
                            const match = remoteUrl.match(/github\.com\/(.+)/);
                            if (match) {
                                newUrl = `git@${profile.sshHost}:${match[1].trim()}`;
                            }
                            else {
                                throw new Error('No se pudo parsear la URL');
                            }
                        }
                        else if (remoteUrl.includes('git@')) {
                            // Ya es SSH, solo cambiar el host
                            newUrl = remoteUrl.replace(/git@github\.com(-\w+)?:/, `git@${profile.sshHost}:`);
                        }
                        else {
                            throw new Error('Formato de URL no reconocido');
                        }
                        await execAsync(`git remote set-url origin "${newUrl}"`, { cwd: repoPath });
                        vscode.window.showInformationMessage(`Repositorio configurado con perfil "${profile.name}"\nRemote actualizado a: ${newUrl}`);
                    }
                    else {
                        vscode.window.showInformationMessage(`Repositorio configurado con perfil "${profile.name}"`);
                    }
                }
                catch (error) {
                    // No hay remote o error al actualizarlo, pero la config local está ok
                    vscode.window.showInformationMessage(`Configuración local actualizada con perfil "${profile.name}"`);
                }
            }
            else {
                vscode.window.showInformationMessage(`Repositorio configurado con perfil "${profile.name}"`);
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error al configurar repositorio: ${error.message}`);
            throw error;
        }
    }
    async getCurrentConfig(repoPath) {
        try {
            const { stdout: name } = await execAsync('git config user.name', { cwd: repoPath });
            const { stdout: email } = await execAsync('git config user.email', { cwd: repoPath });
            return {
                name: name.trim(),
                email: email.trim()
            };
        }
        catch {
            return {};
        }
    }
    async isGitRepository(path) {
        try {
            await execAsync('git rev-parse --git-dir', { cwd: path });
            return true;
        }
        catch {
            return false;
        }
    }
    async getRepositoryRoot(path) {
        try {
            const { stdout } = await execAsync('git rev-parse --show-toplevel', { cwd: path });
            return stdout.trim();
        }
        catch {
            return undefined;
        }
    }
    async configureCodeCommit(repoPath, profile) {
        try {
            if (!profile.awsCredentials) {
                throw new Error('El perfil no tiene credenciales AWS configuradas');
            }
            // Configurar user.name y user.email
            await execAsync(`git config user.name "${profile.name}"`, { cwd: repoPath });
            await execAsync(`git config user.email "${profile.email}"`, { cwd: repoPath });
            // Configurar credential helper para CodeCommit
            const region = profile.awsCredentials.region || 'us-east-1';
            // Configurar el credential helper específico para CodeCommit
            await execAsync(`git config credential.helper '!aws codecommit credential-helper $@'`, { cwd: repoPath });
            await execAsync(`git config credential.UseHttpPath true`, { cwd: repoPath });
            // Si hay perfil AWS específico, configurarlo
            if (profile.awsCredentials.profileName) {
                await execAsync(`git config credential.helper '!aws --profile ${profile.awsCredentials.profileName} codecommit credential-helper $@'`, { cwd: repoPath });
            }
            vscode.window.showInformationMessage(`CodeCommit configurado con perfil "${profile.name}"\nRegión: ${region}`);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error al configurar CodeCommit: ${error.message}`);
            throw error;
        }
    }
    async isCodeCommitRepo(repoPath) {
        try {
            const { stdout } = await execAsync('git config --get remote.origin.url', { cwd: repoPath });
            return stdout.includes('codecommit') || stdout.includes('git-codecommit');
        }
        catch {
            return false;
        }
    }
    async configureGitHubAuth(repoPath, profile) {
        if (!profile.githubAuth)
            return;
        try {
            const { stdout: remoteUrl } = await execAsync('git config --get remote.origin.url', { cwd: repoPath });
            if (profile.githubAuth.authType === 'token' && profile.githubAuth.token) {
                // Configurar credential helper para usar token
                let newUrl;
                if (remoteUrl.includes('git@github.com')) {
                    // Convertir SSH a HTTPS
                    const match = remoteUrl.match(/git@github\.com[:-](.+)/);
                    if (match) {
                        newUrl = `https://github.com/${match[1].trim()}`;
                    }
                    else {
                        throw new Error('No se pudo parsear la URL SSH');
                    }
                }
                else if (remoteUrl.includes('https://')) {
                    // Ya es HTTPS, mantener URL
                    newUrl = remoteUrl.trim();
                }
                else {
                    throw new Error('Formato de URL no reconocido');
                }
                // Configurar credential helper con token
                await execAsync(`git config credential.helper 'store --file=${repoPath}/.git/credentials'`, { cwd: repoPath });
                // Guardar credenciales con token
                const credContent = `https://${profile.username}:${profile.githubAuth.token}@github.com`;
                const credPath = `${repoPath}/.git/credentials`;
                const fs = require('fs');
                fs.writeFileSync(credPath, credContent + '\n', { mode: 0o600 });
                // Actualizar remote URL a HTTPS
                await execAsync(`git remote set-url origin "${newUrl}"`, { cwd: repoPath });
                vscode.window.showInformationMessage(`GitHub configurado con token para "${profile.name}"\nRemote: ${newUrl}`);
            }
            else if (profile.githubAuth.authType === 'ssh') {
                // Configurar SSH (ya implementado en la lógica anterior)
                if (profile.sshHost) {
                    let newUrl;
                    if (remoteUrl.includes('https://')) {
                        // Convertir HTTPS a SSH
                        const match = remoteUrl.match(/github\.com\/(.+)/);
                        if (match) {
                            newUrl = `git@${profile.sshHost}:${match[1].trim()}`;
                        }
                        else {
                            throw new Error('No se pudo parsear la URL HTTPS');
                        }
                    }
                    else {
                        // Ya es SSH, actualizar host
                        newUrl = remoteUrl.replace(/git@github\.com[:-]/, `git@${profile.sshHost}:`);
                    }
                    await execAsync(`git remote set-url origin "${newUrl}"`, { cwd: repoPath });
                    vscode.window.showInformationMessage(`GitHub configurado con SSH para "${profile.name}"\nRemote: ${newUrl}`);
                }
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error al configurar GitHub: ${error.message}`);
            throw error;
        }
    }
}
exports.GitConfigManager = GitConfigManager;
//# sourceMappingURL=gitConfigManager.js.map