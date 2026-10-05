import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Parking, Place, StatutPlace, CreateParkingDto, ParkingSearchFilter } from '../../models';

// Interface pour la réponse de la liste des parkings
interface ParkingsResponse {
  succes: boolean;
  parkings: Parking[];
}

// Interface pour la réponse d'un seul parking
interface ParkingResponse {
  succes: boolean;
  parking: Parking;
}

// Interface pour la réponse des places
interface PlacesResponse {
  succes: boolean;
  places: Place[];
}

@Injectable({
  providedIn: 'root'
})
export class ParkingService {

  // URL de base de l'API backend
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Récupère la liste des parkings, avec filtrage géographique optionnel
   * @param lat Latitude de l'utilisateur
   * @param lng Longitude de l'utilisateur
   * @param rayon Rayon de recherche en km
   */
  getParkings(lat?: number, lng?: number, rayon?: number): Observable<ParkingsResponse> {
    let params = new HttpParams();
    if (lat !== undefined) params = params.set('lat', lat.toString());
    if (lng !== undefined) params = params.set('lng', lng.toString());
    if (rayon !== undefined) params = params.set('rayon', rayon.toString());

    return this.http.get<ParkingsResponse>(`${this.apiUrl}/parkings`, { params });
  }

  /**
   * Alias getAllParkings pour compatibilité avec les pages de recherche
   */
  getAllParkings(filter?: ParkingSearchFilter | any): Observable<any> {
    const lat = filter?.latitude;
    const lng = filter?.longitude;
    const rayon = filter?.radiusKm;

    return this.getParkings(lat, lng, rayon).pipe(
      map(res => {
        // Normalise les objets pour les composants qui attendent name, address, etc.
        const parkings = (res.parkings || []).map(p => this.normalizeParking(p));
        return {
          ...res,
          items: parkings,
          parkings: parkings
        };
      })
    );
  }

  /**
   * Normalise la réponse du serveur vers les noms attendus par les
   * composants (name, address, pricePerHour...) tout en conservant les
   * colonnes d'origine, qui restent la référence.
   */
  private normalizeParking(p: any): any {
    return {
      ...p,
      name: p.nom || p.name,
      address: p.adresse || p.address,
      pricePerHour: p.prix_heure || p.pricePerHour,
      openingTime: p.heure_ouverture || p.openingTime,
      closingTime: p.heure_fermeture || p.closingTime,
      isCovered: p.couvert ?? p.isCovered ?? false,
      availableSpaces: p.places_libres ?? p.availableSpaces ?? 0,
      totalSpaces: p.places_totales || p.total_places || p.totalSpaces || 0,
      distanceInKm: p.distance_km ?? p.distanceInKm
    };
  }

  /**
   * Récupère les détails d'un parking par son ID (avec support optionnel coordonnées)
   */
  getParkingById(id: number, lat?: number, lng?: number): Observable<any> {
    let params = new HttpParams();
    if (lat !== undefined) params = params.set('lat', lat.toString());
    if (lng !== undefined) params = params.set('lng', lng.toString());

    return this.http.get<any>(`${this.apiUrl}/parkings/${id}`, { params }).pipe(
      map(res => {
        const p = res.parking || res;
        return {
          ...this.normalizeParking(p),
          spaces: p.places || p.spaces || []
        };
      })
    );
  }

  /**
   * Alias getParking pour compatibilité
   */
  getParking(id: number): Observable<any> {
    return this.getParkingById(id).pipe(
      map(res => {
        const p = res.parking;
        if (!p) return res;
        return this.normalizeParking(p);
      })
    );
  }

  /**
   * Mappe les champs camelCase (frontend) vers snake_case (backend)
   */
  private toBackendPayload(data: any): any {
    const nom       = String(data.name     || data.nom     || '').trim();
    const adresse   = String(data.address  || data.adresse || '').trim();
    const latitude  = parseFloat(data.latitude)  || 0;
    const longitude = parseFloat(data.longitude) || 0;
    const prix_heure   = parseFloat(data.pricePerHour ?? data.prix_heure) || 0;
    const nombre_places = parseInt(data.totalSpaces   ?? data.nombre_places) || 10;
    const image_url = data.imageUrl || data.image_url || '';

    // Ces champs figuraient dans le formulaire mais n'étaient pas transmis :
    // le serveur les ignorait et l'utilisateur perdait sa saisie à l'enregistrement.
    const description = String(data.description || '').trim() || null;
    const heure_ouverture = data.openingTime || data.heure_ouverture || null;
    const heure_fermeture = data.closingTime || data.heure_fermeture || null;
    const couvert = Boolean(data.isCovered ?? data.couvert ?? false);

    return {
      nom, adresse, latitude, longitude, prix_heure, nombre_places, image_url,
      description, heure_ouverture, heure_fermeture, couvert
    };
  }

  /**
   * Crée un nouveau parking (réservé aux gestionnaires)
   */
  createParking(data: CreateParkingDto): Observable<ParkingResponse> {
    return this.http.post<ParkingResponse>(`${this.apiUrl}/parkings`, this.toBackendPayload(data));
  }

  /**
   * Met à jour un parking existant (réservé aux gestionnaires)
   */
  updateParking(id: number, data: Partial<CreateParkingDto>): Observable<ParkingResponse> {
    return this.http.put<ParkingResponse>(`${this.apiUrl}/parkings/${id}`, this.toBackendPayload(data));
  }

  /**
   * Supprime un parking (réservé aux gestionnaires)
   */
  deleteParking(id: number): Observable<{ succes: boolean; message: string }> {
    return this.http.delete<{ succes: boolean; message: string }>(`${this.apiUrl}/parkings/${id}`);
  }

  /**
   * Récupère les places d'un parking
   */
  getPlacesByParking(parkingId: number): Observable<PlacesResponse> {
    return this.http.get<PlacesResponse>(`${this.apiUrl}/places/parking/${parkingId}`);
  }

  /**
   * Met à jour le statut d'une place (gestionnaire)
   */
  updatePlaceStatus(placeId: number, statut: string): Observable<{ succes: boolean; place: Place }> {
    return this.http.patch<{ succes: boolean; place: Place }>(
      `${this.apiUrl}/places/${placeId}`,
      { statut }
    );
  }

  /**
   * Récupère les parkings du gestionnaire connecté
   */
  getMesParkings(): Observable<ParkingsResponse> {
    return this.http.get<ParkingsResponse>(`${this.apiUrl}/parkings/mes-parkings`);
  }
}
