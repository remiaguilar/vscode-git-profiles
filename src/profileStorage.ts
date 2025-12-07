import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { GitProfile } from './types';

export class ProfileStorage {
    private static readonly STORAGE_KEY = 'gitProfiles.profilesDirectory';
    private static readonly FILE_NAME = 'profiles.json';
    private profilesPath: string | null = null;

    constructor(private context: vscode.ExtensionContext) {
        this.profilesPath = this.context.globalState.get<string>(ProfileStorage.STORAGE_KEY) || null;
    }

    /**
     * Verifica si hay un directorio configurado
     */
    hasDirectory(): boolean {
        return this.profilesPath !== null && fs.existsSync(this.profilesPath);
    }

    /**
     * Configura el directorio donde se guardarán los perfiles
     */
    async setDirectory(dirPath: string): Promise<void> {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }

        this.profilesPath = dirPath;
        await this.context.globalState.update(ProfileStorage.STORAGE_KEY, dirPath);

        // Migrar datos existentes si hay
        await this.migrateFromGlobalState();
    }

    /**
     * Obtiene el directorio actual
     */
    getDirectory(): string | null {
        return this.profilesPath;
    }

    /**
     * Carga los perfiles desde el archivo JSON
     */
    loadProfiles(): GitProfile[] {
        if (!this.hasDirectory()) {
            return [];
        }

        const filePath = path.join(this.profilesPath!, ProfileStorage.FILE_NAME);

        if (!fs.existsSync(filePath)) {
            return [];
        }

        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(content);
        } catch (error) {
            console.error('Error al cargar perfiles:', error);
            return [];
        }
    }

    /**
     * Guarda los perfiles en el archivo JSON
     */
    saveProfiles(profiles: GitProfile[]): void {
        if (!this.hasDirectory()) {
            throw new Error('No hay directorio configurado');
        }

        const filePath = path.join(this.profilesPath!, ProfileStorage.FILE_NAME);
        fs.writeFileSync(filePath, JSON.stringify(profiles, null, 2), 'utf-8');
    }

    /**
     * Migra perfiles desde globalState al archivo JSON
     */
    private async migrateFromGlobalState(): Promise<void> {
        const oldProfiles = this.context.globalState.get<GitProfile[]>('gitProfiles.profiles', []);
        
        if (oldProfiles.length > 0) {
            this.saveProfiles(oldProfiles);
            // Limpiar globalState antiguo
            await this.context.globalState.update('gitProfiles.profiles', undefined);
            vscode.window.showInformationMessage(`Migrados ${oldProfiles.length} perfiles al nuevo almacenamiento`);
        }
    }
}
