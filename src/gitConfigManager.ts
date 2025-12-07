import * as vscode from 'vscode';
import { promisify } from 'util';
import { exec } from 'child_process';
import { GitProfile } from './types';

const execAsync = promisify(exec);

export class GitConfigManager {
    async configureRepository(repoPath: string, profile: GitProfile): Promise<void> {
        try {
            // Configurar user.name
            await execAsync(`git config user.name "${profile.name}"`, { cwd: repoPath });
            
            // Configurar user.email
            await execAsync(`git config user.email "${profile.email}"`, { cwd: repoPath });

            // Configurar credential helper con token GitHub
            if (profile.token) {
                // Convertir remote a HTTPS si no lo es
                try {
                    const { stdout: remoteUrl } = await execAsync('git config --get remote.origin.url', { cwd: repoPath });
                    
                    if (remoteUrl.includes('github.com') && remoteUrl.includes('git@')) {
                        // Convertir de SSH a HTTPS
                        const match = remoteUrl.match(/github\.com[:\/](.+)\.git/);
                        if (match) {
                            const newUrl = `https://github.com/${match[1]}.git`;
                            await execAsync(`git remote set-url origin "${newUrl}"`, { cwd: repoPath });
                        }
                    }
                } catch (error) {
                    // No hay remote, continuamos
                }

                // Configurar credential helper con el token
                const credHelper = `!f() { echo "username=${profile.username}"; echo "password=${profile.token}"; }; f`;
                await execAsync(`git config credential.helper "${credHelper}"`, { cwd: repoPath });
                
                vscode.window.showInformationMessage(
                    `✅ Repositorio configurado con perfil "${profile.name}"`
                );
            } else {
                vscode.window.showInformationMessage(
                    `Repositorio configurado con perfil "${profile.name}" (sin token)`
                );
            }
        } catch (error: any) {
            vscode.window.showErrorMessage(`Error al configurar repositorio: ${error.message}`);
            throw error;
        }
    }

    async getCurrentConfig(repoPath: string): Promise<{ name?: string; email?: string }> {
        try {
            const { stdout: name } = await execAsync('git config user.name', { cwd: repoPath });
            const { stdout: email } = await execAsync('git config user.email', { cwd: repoPath });
            
            return {
                name: name.trim(),
                email: email.trim()
            };
        } catch {
            return {};
        }
    }

    async isGitRepository(path: string): Promise<boolean> {
        try {
            await execAsync('git rev-parse --git-dir', { cwd: path });
            return true;
        } catch {
            return false;
        }
    }

    async getRepositoryRoot(path: string): Promise<string | undefined> {
        try {
            const { stdout } = await execAsync('git rev-parse --show-toplevel', { cwd: path });
            return stdout.trim();
        } catch {
            return undefined;
        }
    }
}
