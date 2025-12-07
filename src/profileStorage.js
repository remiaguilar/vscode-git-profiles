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
exports.ProfileStorage = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class ProfileStorage {
    constructor(context) {
        this.context = context;
        this.profilesPath = null;
        this.profilesPath = this.context.globalState.get(ProfileStorage.STORAGE_KEY) || null;
    }
    /**
     * Verifica si hay un directorio configurado
     */
    hasDirectory() {
        return this.profilesPath !== null && fs.existsSync(this.profilesPath);
    }
    /**
     * Configura el directorio donde se guardarán los perfiles
     */
    async setDirectory(dirPath) {
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
    getDirectory() {
        return this.profilesPath;
    }
    /**
     * Carga los perfiles desde el archivo JSON
     */
    loadProfiles() {
        if (!this.hasDirectory()) {
            return [];
        }
        const filePath = path.join(this.profilesPath, ProfileStorage.FILE_NAME);
        if (!fs.existsSync(filePath)) {
            return [];
        }
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(content);
        }
        catch (error) {
            console.error('Error al cargar perfiles:', error);
            return [];
        }
    }
    /**
     * Guarda los perfiles en el archivo JSON
     */
    saveProfiles(profiles) {
        if (!this.hasDirectory()) {
            throw new Error('No hay directorio configurado');
        }
        const filePath = path.join(this.profilesPath, ProfileStorage.FILE_NAME);
        fs.writeFileSync(filePath, JSON.stringify(profiles, null, 2), 'utf-8');
    }
    /**
     * Migra perfiles desde globalState al archivo JSON
     */
    async migrateFromGlobalState() {
        const oldProfiles = this.context.globalState.get('gitProfiles.profiles', []);
        if (oldProfiles.length > 0) {
            this.saveProfiles(oldProfiles);
            // Limpiar globalState antiguo
            await this.context.globalState.update('gitProfiles.profiles', undefined);
            vscode.window.showInformationMessage(`Migrados ${oldProfiles.length} perfiles al nuevo almacenamiento`);
        }
    }
}
exports.ProfileStorage = ProfileStorage;
ProfileStorage.STORAGE_KEY = 'gitProfiles.profilesDirectory';
ProfileStorage.FILE_NAME = 'profiles.json';
//# sourceMappingURL=profileStorage.js.map