// Contrats d'authentification.
//
// AuthResponse et les DTO d'inscription/connexion vivent dans user.model.ts,
// seul fichier réexporté par models/index.ts : les définir aussi ici les
// rendait inaccessibles et créait deux types homonymes divergents.

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  role?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  /** Jeton reçu dans le lien d'email, à usage unique et limité dans le temps. */
  token: string;
  nouveau_mot_de_passe: string;
}
