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
import { AuthService } from '../services/auth.service';

/**
 * Guard de protection d'accès — vérifie que l'utilisateur est connecté.
 *
 * Implémente CanActivate ET CanMatch, qui ne jouent pas le même rôle :
 *
 *   canMatch    -> synchrone, exécuté AVANT le chargement du module.
 *                 S'il renvoie false, le fichier JS de la page n'est même
 *                 pas téléchargé. C'est ce qui remplace l'ancien
 *                 canLoad, déprécié depuis Angular 14.
 *
 *   canActivate -> exécuté une fois la page affichée.
 *
 * Pourquoi conserver les deux ? canMatch seul suffit à empêcher
 * l'affichage, mais il ne remplace pas canActivate : le premier filtre
 * tôt, le second confirme au moment d'entrer réellement dans la page.
 *
 * Dans les deux cas, un accès refusé redirige vers /login.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate, CanMatch {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    return this.verifierConnexion();
  }

  canMatch(route: Route, segments: UrlSegment[]): boolean {
    return this.verifierConnexion();
  }

  /**
   * Contrôle commun aux deux gardes.
   * Note : on renvoie `false` et on demande explicitement la redirection,
   * car un canMatch qui renvoie false fait échouer la navigation sans
   * qu'aucune route ne corresponde plus — le navigateur resterait
   * coincé sur une page blanche.
   */
  private verifierConnexion(): boolean {
    if (this.authService.isAuthenticated()) {
      return true;
    }

    console.log('AuthGuard: non authentifié, redirection vers /login');
    this.router.navigate(['/login']);
    return false;
  }
}