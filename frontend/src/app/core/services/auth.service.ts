import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, tap, catchError, map } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { User, AuthResponse, LoginDto, RegisterDto } from '../../models';
import { StorageService } from './storage.service';

// ====================================================================
// SERVICE D'AUTHENTIFICATION (Auth Service)
// Notion du cours : Services Angular, BehaviorSubject (Observable), Injection
// ====================================================================

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;

  // BehaviorSubject pour émettre l'état réactif de l'utilisateur connecté
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private storage: StorageService,
    private router: Router
  ) {
    // Restaurer l'utilisateur depuis le localStorage au démarrage de l'app
    const savedUser = this.storage.getUser<User>();
    if (savedUser && this.storage.getToken()) {
      this.currentUserSubject.next(savedUser);
    }
  }

  // Valeur actuelle synchrone de l'utilisateur
  get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  // Vérifier si l'utilisateur est connecté
  isAuthenticated(): boolean {
    return !!this.storage.getToken() && !!this.currentUserValue;
  }

  // Vérifier si l'utilisateur a le rôle d'administrateur ('manager').
  // Cette valeur provient du serveur à la connexion : elle sert
  // d'indication rapide. L'autorisation réelle est vérifiée côté serveur
  // à chaque requête (voir RoleGuard -> verifierRoleServeur).
  isManager(): boolean {
    return this.currentUserValue?.role === 'manager';
  }

  /**
   * Demande au serveur l'état réel du compte et de son rôle.
   * Utilisé par le RoleGuard : le rôle stocké localement peut avoir été
   * modifié entre-temps (promotion ou rétrogradation par un administrateur).
   * Le serveur reste la seule source de vérité.
   */
  verifierRoleServeur(): Observable<boolean> {
    if (!this.storage.getToken()) {
      return of(false);
    }

    return this.http.get<any>(`${this.apiUrl}/profile`).pipe(
      tap(res => {
        if (res?.user) {
          const fusion: User = { ...this.currentUserValue, ...res.user } as User;
          this.storage.setUser(fusion);
          this.currentUserSubject.next(fusion);
        }
      }),
      map(res => res?.user?.role === 'manager'),
      catchError(() => of(false))
    );
  }

  // Inscription (POST /api/auth/register)
  // Le rôle n'est PAS envoyé : le serveur l'impose à 'user'.
  // La promotion en administrateur passe par un gestionnaire existant.
  //
  // Le serveur ne renvoie volontairement PAS de jeton de session : le compte
  // reste inactif tant que l'adresse email n'a pas été confirmée.
  register(dto: RegisterDto): Observable<AuthResponse> {
    const payload = {
      nom: dto.nom || `${dto.firstName || ''} ${dto.lastName || ''}`.trim() || 'Utilisateur',
      email: dto.email,
      mot_de_passe: dto.mot_de_passe || dto.password
    };

    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, payload);
  }

  /**
   * Confirme un compte à partir du jeton reçu dans le lien d'email.
   * En cas de succès le serveur délivre une session : l'utilisateur n'a pas
   * à ressaisir ses identifiants après avoir cliqué sur le lien.
   */
  verifyEmail(token: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/verify-email`, { token }).pipe(
      tap(res => this.enregistrerSession(res))
    );
  }

  /** Renvoie un email de vérification à un compte non encore activé. */
  resendVerification(email: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/resend-verification`, { email });
  }

  /**
   * Vérifie qu'un lien de réinitialisation est encore valable, SANS renvoyer
   * le mot de passe ni révéler si le compte existe.
   */
  checkResetToken(token: string): Observable<{ valide: boolean; message?: string }> {
    return this.http.get<{ valide: boolean; message?: string }>(
      `${this.apiUrl}/reset-password/${encodeURIComponent(token)}`
    );
  }

  /** Connexion (POST /api/auth/login) */
  login(dto: LoginDto): Observable<AuthResponse> {
    const payload = {
      email: dto.email,
      mot_de_passe: dto.mot_de_passe || dto.password
    };

    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, payload).pipe(
      tap(res => this.enregistrerSession(res))
    );
  }

  /**
   * Factorisation de ce qui doit se passer après une réponse contenant un
   * jeton de session : stockage, normalisation du profil, diffusion.
   * Partagée par la connexion et la vérification d'email pour éviter que les
   * deux chemins divergent sur la forme du profil enregistré.
   */
  private enregistrerSession(res: AuthResponse | null | undefined): void {
    if (!res?.succes || !res.token || !res.user) return;

    // AuthResponse.user est un Partial<User> parce que le serveur peut ne
    // renvoyer qu'une partie du profil selon le point d'entrée. On exige
    // les champs qui identifient réellement le compte : sans eux, on ne
    // peut pas construire un User valide, et il vaut mieux ne rien stocker
    // qu'enregistrer un profil à moitié vide qui cassera l'affichage.
    const { id, nom, email, role } = res.user;
    if (id == null || !nom || !email || !role) {
      console.error('Session reçue sans profil exploitable, stockage ignoré.', res.user);
      return;
    }

    const userNormalise: User = {
      ...res.user,
      id,
      nom,
      email,
      role,
      firstName: nom.split(' ')[0] || nom,
      lastName: nom.split(' ').slice(1).join(' '),
      avatarUrl: res.user.avatar_url || res.user.avatarUrl
    };
    this.storage.setToken(res.token);
    this.storage.setUser(userNormalise);
    this.currentUserSubject.next(userNormalise);
  }

  // Obtenir le profil de l'utilisateur
  getProfile(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/profile`).pipe(
      tap(res => {
        if (res && res.user) {
          const u: User = {
            ...res.user,
            firstName: res.user.nom?.split(' ')[0] || res.user.nom,
            lastName: res.user.nom?.split(' ').slice(1).join(' ') || '',
            avatarUrl: res.user.avatar_url || res.user.avatarUrl || this.currentUserValue?.avatarUrl
          };
          this.storage.setUser(u);
          this.currentUserSubject.next(u);
        }
      })
    );
  }

  // Mettre à jour le profil (PUT /api/auth/profile)
  updateProfile(data: any): Observable<any> {
    const nom = data.firstName && data.lastName 
      ? `${data.firstName} ${data.lastName}`.trim() 
      : (data.nom || this.currentUserValue?.nom || 'Utilisateur');
    
    const avatar_url = data.avatarUrl || data.avatar_url || this.currentUserValue?.avatarUrl;

    return this.http.put<any>(`${this.apiUrl}/profile`, { nom, phone: data.phone, avatar_url }).pipe(
      tap(res => {
        if (res && res.user) {
          const u: User = {
            ...this.currentUserValue,
            ...res.user,
            firstName: res.user.nom?.split(' ')[0] || res.user.nom,
            lastName: res.user.nom?.split(' ').slice(1).join(' ') || '',
            avatarUrl: res.user.avatar_url || avatar_url,
            phone: data.phone || this.currentUserValue?.phone
          };
          this.storage.setUser(u);
          this.currentUserSubject.next(u);
        }
      })
    );
  }

  // Changer le mot de passe (PUT /api/auth/change-password)
  changePassword(data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/change-password`, data);
  }

  /**
   * Demande un email de réinitialisation (POST /api/auth/forgot-password).
   * La réponse est volontairement identique que l'adresse existe ou non :
   * distinguer les deux permettrait d'énumérer les comptes enregistrés.
   */
  forgotPassword(email: string): Observable<{ succes: boolean; message: string }> {
    return this.http.post<{ succes: boolean; message: string }>(
      `${this.apiUrl}/forgot-password`,
      { email }
    );
  }

  /** Applique un nouveau mot de passe (POST /api/auth/reset-password). */
  resetPassword(token: string, nouveauMotDePasse: string): Observable<{ succes: boolean; message: string }> {
    return this.http.post<{ succes: boolean; message: string }>(`${this.apiUrl}/reset-password`, {
      token,
      nouveau_mot_de_passe: nouveauMotDePasse
    });
  }

  // Déconnexion
  logout(): void {
    this.storage.clear();
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }
}
