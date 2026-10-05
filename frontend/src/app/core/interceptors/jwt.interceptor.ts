import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { StorageService } from '../services/storage.service';
import { environment } from '../../../environments/environment';

/**
 * Intercepteur HTTP JWT
 * Ajoute automatiquement le token JWT dans le header Authorization
 * pour toutes les requêtes vers notre API backend.
 */
@Injectable()
export class JwtInterceptor implements HttpInterceptor {

  constructor(private storageService: StorageService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Récupère le token depuis le localStorage
    const token = this.storageService.getToken();

    // Vérifie que la requête est bien vers notre API (pas vers d'autres services)
    const estVersNotrApi = request.url.startsWith(environment.apiUrl);

    if (token && estVersNotrApi) {
      // Clone la requête et ajoute le header Authorization
      const requeteAvecToken = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
      return next.handle(requeteAvecToken);
    }

    // Sinon, passe la requête sans modification
    return next.handle(request);
  }
}
