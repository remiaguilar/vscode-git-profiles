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
exports.SSHManager = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const util_1 = require("util");
const child_process_1 = require("child_process");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class SSHManager {
    constructor() {
        const homeDir = process.env.HOME || process.env.USERPROFILE || '';
        this.sshDir = path.join(homeDir, '.ssh');
        // Crear directorio .ssh si no existe
        if (!fs.existsSync(this.sshDir)) {
            fs.mkdirSync(this.sshDir, { mode: 0o700 });
        }
    }
    async generateSSHKey(profileName, email) {
        try {
            const keyName = `id_ed25519_${profileName.toLowerCase().replace(/\s+/g, '_')}`;
            const privateKeyPath = path.join(this.sshDir, keyName);
            const publicKeyPath = `${privateKeyPath}.pub`;
            // Verificar si ya existe
            if (fs.existsSync(privateKeyPath)) {
                const overwrite = await vscode.window.showWarningMessage(`Ya existe una clave SSH para ${profileName}. ¿Sobrescribir?`, 'Sí', 'No');
                if (overwrite !== 'Sí') {
                    throw new Error('Operación cancelada');
                }
            }
            // Generar clave SSH
            const command = `ssh-keygen -t ed25519 -C "${email}" -f "${privateKeyPath}" -N ""`;
            await execAsync(command);
            // Agregar al ssh-agent
            await this.addToSSHAgent(privateKeyPath);
            // Obtener fingerprint
            const { stdout } = await execAsync(`ssh-keygen -lf "${publicKeyPath}"`);
            const fingerprint = stdout.trim();
            vscode.window.showInformationMessage(`SSH Key generada exitosamente para ${profileName}`);
            return {
                privateKeyPath,
                publicKeyPath,
                fingerprint
            };
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error al generar SSH key: ${error.message}`);
            throw error;
        }
    }
    async addToSSHAgent(privateKeyPath) {
        try {
            // Iniciar ssh-agent si no está corriendo
            try {
                await execAsync('ssh-add -l');
            }
            catch {
                // ssh-agent no está corriendo, intentar iniciarlo
                if (process.platform === 'darwin') {
                    await execAsync('eval "$(ssh-agent -s)"');
                }
            }
            // Agregar clave
            await execAsync(`ssh-add "${privateKeyPath}"`);
        }
        catch (error) {
            console.warn('No se pudo agregar al ssh-agent:', error.message);
        }
    }
    async getPublicKey(publicKeyPath) {
        if (!fs.existsSync(publicKeyPath)) {
            throw new Error('La clave pública no existe');
        }
        return fs.readFileSync(publicKeyPath, 'utf-8').trim();
    }
    async updateSSHConfig(profileName, sshHost, privateKeyPath) {
        const sshConfigPath = path.join(this.sshDir, 'config');
        const configEntry = `\n# ${profileName}\nHost ${sshHost}\n    HostName github.com\n    User git\n    IdentityFile ${privateKeyPath}\n`;
        try {
            let content = '';
            if (fs.existsSync(sshConfigPath)) {
                content = fs.readFileSync(sshConfigPath, 'utf-8');
                // Verificar si ya existe configuración para este host
                const hostRegex = new RegExp(`Host ${sshHost}[\\s\\S]*?(?=\\nHost |$)`, 'g');
                if (hostRegex.test(content)) {
                    // Reemplazar configuración existente
                    content = content.replace(hostRegex, configEntry.trim());
                }
                else {
                    // Agregar al final
                    content += configEntry;
                }
            }
            else {
                content = configEntry.trim();
            }
            fs.writeFileSync(sshConfigPath, content, { mode: 0o600 });
            vscode.window.showInformationMessage(`SSH Config actualizado para ${profileName}`);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error al actualizar SSH config: ${error.message}`);
            throw error;
        }
    }
    getSSHConfigPath() {
        return path.join(this.sshDir, 'config');
    }
    async listSSHKeys() {
        const files = fs.readdirSync(this.sshDir);
        return files.filter(f => f.startsWith('id_') && !f.endsWith('.pub'));
    }
}
exports.SSHManager = SSHManager;
//# sourceMappingURL=sshManager.js.map