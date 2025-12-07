export interface GitProfile {
    id: string;
    name: string;
    email: string;
    username: string;
    token: string; // GitHub Personal Access Token
    isActive: boolean;
}
