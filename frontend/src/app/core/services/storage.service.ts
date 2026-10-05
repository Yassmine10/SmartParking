import { Injectable } from '@angular/core';

// ====================================================================
// SERVICE DE STOCKAGE LOCAL (Storage Service)
// Gère le stockage sécurisé du Token JWT et de l'utilisateur
// ====================================================================

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly CLE_TOKEN = 'smartparking_token';
  private readonly CLE_USER = 'smartparking_user';

  // Enregistrer le token JWT
  setToken(token: string): void {
    localStorage.setItem(this.CLE_TOKEN, token);
  }

  // Récupérer le token JWT
  getToken(): string | null {
    return localStorage.getItem(this.CLE_TOKEN);
  }

  // Supprimer le token JWT
  removeToken(): void {
    localStorage.removeItem(this.CLE_TOKEN);
  }

  // Enregistrer l'utilisateur
  setUser(user: any): void {
    localStorage.setItem(this.CLE_USER, JSON.stringify(user));
  }

  // Récupérer l'utilisateur
  getUser<T>(): T | null {
    const data = localStorage.getItem(this.CLE_USER);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  // Vider tout le stockage (Déconnexion)
  clear(): void {
    localStorage.removeItem(this.CLE_TOKEN);
    localStorage.removeItem(this.CLE_USER);
  }
}
