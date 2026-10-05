// Modèle Utilisateur
//
// Les seuls rôles émis par le backend sont 'user' et 'manager'.
// Les anciennes valeurs 'USER' / 'ADMIN' n'existent pas côté API : les
// conserver masquait des erreurs (une comparaison avec 'ADMIN' ne
// correspondait jamais, donc un gestionnaire était traité comme un
// utilisateur simple).
export type Role = 'user' | 'manager';

export interface User {
  id: number;
  nom: string;
  email: string;
  role: Role;
  date_creation?: string;
  // Compatibilité profil UI
  firstName?: string;
  lastName?: string;
  phone?: string;
  phoneNumber?: string;
  profileImageUrl?: string;
  avatarUrl?: string;
  avatar_url?: string;
}

export interface UserProfile extends User {
  totalReservations?: number;
  activeReservations?: number;
  completedReservations?: number;
  createdAt?: string;
}

/**
 * Réponse des points d'entrée d'authentification.
 *
 * `token` et `user` sont facultatifs : à l'inscription le compte n'est pas
 * encore activé, le serveur ne renvoie donc aucune session. Rendre ces
 * champs obligatoires forcerait le code appelant à traiter `undefined`.
 */
export interface AuthResponse {
  succes: boolean;
  message: string;
  token?: string;
  email_verifie?: boolean;
  user?: Partial<User>;
}

export interface LoginDto {
  email: string;
  mot_de_passe?: string;
  password?: string;
}

export interface RegisterDto {
  nom: string;
  email: string;
  mot_de_passe?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}
