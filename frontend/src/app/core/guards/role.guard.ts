import { Injectable } from '@angular/core';
import {
  CanActivate,
  CanMatch,
  Route,
  UrlSegment,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router
} from '@angular/router';
import { Observable, of, map } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Guard de contrôle de rôle — réserve l'espace /admin aux gestionnaires
 * (rôle 'manager').
 *
 * Répartition des rôles entre les deux gardes, volontairement différente
 * de celle de AuthGuard car le rôle exige une vérification plus forte :
 *
 *   canMatch    -> synchrone, avant le téléchargement du module. On se
 *                 contente de la copie du rôle stockée dans le
 *                 navigateur : c'est suffisant pour NE PAS télécharger
 *                 l'espace admin à quelqu'un qui n'en a pas besoin.
 *
 *   canActivate -> asynchrone, une fois la page affichée. C'est LE seul
 *                 contrôle fiable : la copie locale peut être modifiée à
 *                 la main ou être devenue périmée après un changement de
 *                 rôle. On interroge donc le serveur.
 *
 * Pourquoi cette différence ? canMatch est synchrone par contrat : il ne
 * peut pas attendre un appel réseau. On lui confie donc uniquement une
 * décision provisoire et bon marché.
 */
@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate, CanMatch {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  /**
   * Contrôle asynchrone et faisant autorité : on demande son rôle réel au
   * serveur avant d'accorder l'accès.
   */
  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return of(false);
    }

    return this.authService.verifierRoleServeur().pipe(
      map(estAdmin => {
        if (estAdmin) {
          return true;
        }
        console.warn('RoleGuard: rôle insuffisant, redirection vers /tabs/home');
        this.router.navigate(['/tabs/home']);
        return false;
      })
    );
  }

  /**
   * Contrôle rapide et local : suffisant pour éviter un téléchargement
   * inutile. Une éventuelle divergence sera corrigée par canActivate.
   */
  canMatch(route: Route, segments: UrlSegment[]): boolean {
    return this.verifierRoleLocal();
  }

  private verifierRoleLocal(): boolean {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return false;
    }

    if (this.authService.isManager()) {
      return true;
    }

    this.router.navigate(['/tabs/home']);
    return false;
  }
}
