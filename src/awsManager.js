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
exports.AWSCredentialsManager = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class AWSCredentialsManager {
    constructor() {
        const homeDir = process.env.HOME || process.env.USERPROFILE || '';
        this.awsDir = path.join(homeDir, '.aws');
        this.credentialsPath = path.join(this.awsDir, 'credentials');
        this.configPath = path.join(this.awsDir, 'config');
        // Crear directorio .aws si no existe
        if (!fs.existsSync(this.awsDir)) {
            fs.mkdirSync(this.awsDir, { mode: 0o700 });
        }
    }
    async saveCredentials(profileName, credentials) {
        try {
            // Actualizar archivo credentials
            await this.updateCredentialsFile(profileName, credentials);
            // Actualizar archivo config si hay región
            if (credentials.region) {
                await this.updateConfigFile(profileName, credentials.region);
            }
            vscode.window.showInformationMessage(`Credenciales AWS guardadas para perfil: ${profileName}`);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error al guardar credenciales AWS: ${error.message}`);
            throw error;
        }
    }
    async updateCredentialsFile(profileName, credentials) {
        let content = '';
        // Leer archivo existente si existe
        if (fs.existsSync(this.credentialsPath)) {
            content = fs.readFileSync(this.credentialsPath, 'utf-8');
        }
        // Preparar el bloque de credenciales
        const profileSection = profileName === 'default' ? '[default]' : `[${profileName}]`;
        const credentialsBlock = [
            profileSection,
            `aws_access_key_id = ${credentials.accessKeyId}`,
            `aws_secret_access_key = ${credentials.secretAccessKey}`,
            credentials.sessionToken ? `aws_session_token = ${credentials.sessionToken}` : null
        ].filter(Boolean).join('\n');
        // Verificar si el perfil ya existe
        const profileRegex = new RegExp(`\\[${profileName}\\][\\s\\S]*?(?=\\n\\[|$)`, 'g');
        if (profileRegex.test(content)) {
            // Reemplazar perfil existente
            content = content.replace(profileRegex, credentialsBlock);
        }
        else {
            // Agregar nuevo perfil
            content = content.trim() + (content ? '\n\n' : '') + credentialsBlock + '\n';
        }
        // Guardar con permisos restrictivos
        fs.writeFileSync(this.credentialsPath, content, { mode: 0o600 });
    }
    async updateConfigFile(profileName, region) {
        let content = '';
        // Leer archivo existente si existe
        if (fs.existsSync(this.configPath)) {
            content = fs.readFileSync(this.configPath, 'utf-8');
        }
        // Preparar el bloque de config
        const configSection = profileName === 'default'
            ? '[default]'
            : `[profile ${profileName}]`;
        const configBlock = [
            configSection,
            `region = ${region}`,
            'output = json'
        ].join('\n');
        // Verificar si el perfil ya existe
        const sectionName = profileName === 'default' ? 'default' : `profile ${profileName}`;
        const profileRegex = new RegExp(`\\[${sectionName}\\][\\s\\S]*?(?=\\n\\[|$)`, 'g');
        if (profileRegex.test(content)) {
            // Reemplazar perfil existente
            content = content.replace(profileRegex, configBlock);
        }
        else {
            // Agregar nuevo perfil
            content = content.trim() + (content ? '\n\n' : '') + configBlock + '\n';
        }
        fs.writeFileSync(this.configPath, content, { mode: 0o600 });
    }
    async removeCredentials(profileName) {
        try {
            // Remover de credentials
            if (fs.existsSync(this.credentialsPath)) {
                let content = fs.readFileSync(this.credentialsPath, 'utf-8');
                const profileRegex = new RegExp(`\\[${profileName}\\][\\s\\S]*?(?=\\n\\[|$)`, 'g');
                content = content.replace(profileRegex, '').trim();
                fs.writeFileSync(this.credentialsPath, content + '\n', { mode: 0o600 });
            }
            // Remover de config
            if (fs.existsSync(this.configPath)) {
                let content = fs.readFileSync(this.configPath, 'utf-8');
                const sectionName = profileName === 'default' ? 'default' : `profile ${profileName}`;
                const profileRegex = new RegExp(`\\[${sectionName}\\][\\s\\S]*?(?=\\n\\[|$)`, 'g');
                content = content.replace(profileRegex, '').trim();
                fs.writeFileSync(this.configPath, content + '\n', { mode: 0o600 });
            }
            vscode.window.showInformationMessage(`Credenciales AWS eliminadas: ${profileName}`);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error al eliminar credenciales: ${error.message}`);
        }
    }
    getCredentialsPath() {
        return this.credentialsPath;
    }
    getConfigPath() {
        return this.configPath;
    }
    async listProfiles() {
        const profiles = [];
        try {
            if (fs.existsSync(this.credentialsPath)) {
                const content = fs.readFileSync(this.credentialsPath, 'utf-8');
                const matches = content.matchAll(/\[([^\]]+)\]/g);
                for (const match of matches) {
                    profiles.push(match[1]);
                }
            }
        }
        catch (error) {
            console.error('Error al listar perfiles AWS:', error);
        }
        return profiles;
    }
    async testConnection(credentials) {
        // Esto requeriría AWS SDK, por ahora solo validamos que los campos existan
        if (!credentials.accessKeyId || !credentials.secretAccessKey) {
            return false;
        }
        // Validación básica de formato
        const keyIdPattern = /^[A-Z0-9]{20}$/;
        return keyIdPattern.test(credentials.accessKeyId);
    }
}
exports.AWSCredentialsManager = AWSCredentialsManager;
//# sourceMappingURL=awsManager.js.map