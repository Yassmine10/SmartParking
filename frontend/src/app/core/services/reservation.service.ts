import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Reservation, CreateReservationDto, StatsParking } from '../../models';

// Interface pour la réponse liste de réservations
interface ReservationsResponse {
  succes: boolean;
  reservations: Reservation[];
}

// Interface pour la réponse d'une réservation unique
interface ReservationResponse {
  succes: boolean;
  reservation: Reservation;
  message?: string;
}

// Interface pour la réponse des statistiques
interface StatsResponse {
  succes: boolean;
  stats: StatsParking;
}

@Injectable({
  providedIn: 'root'
})
export class ReservationService {

  // URL de base de l'API backend
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Crée une nouvelle réservation (avec vérification de disponibilité côté serveur)
   */
  createReservation(data: CreateReservationDto): Observable<ReservationResponse> {
    const payload = {
      id_place: data.id_place || data.placeId,
      debut: data.debut || data.startTime,
      duree_heures: data.duree_heures || data.durationHours || 1
    };
    return this.http.post<ReservationResponse>(`${this.apiUrl}/reservations`, payload);
  }

  /**
   * Récupère les réservations de l'utilisateur connecté
   */
  getMesReservations(): Observable<ReservationsResponse> {
    return this.http.get<ReservationsResponse>(`${this.apiUrl}/reservations/me`).pipe(
      map(res => {
        const reservations = (res.reservations || []).map(r => this.normaliserReservation(r));
        return {
          ...res,
          reservations
        };
      })
    );
  }

  /**
   * Alias de compatibilité pour getUserReservations
   */
  getUserReservations(): Observable<Reservation[]> {
    return this.getMesReservations().pipe(
      map(res => res.reservations || [])
    );
  }

  /**
   * Récupère les réservations pour les parkings du gestionnaire connecté
   */
  getReservationsByManager(): Observable<Reservation[]> {
    return this.http.get<ReservationsResponse>(`${this.apiUrl}/reservations/manager`).pipe(
      map(res => (res.reservations || []).map(r => this.normaliserReservation(r)))
    );
  }

  /**
   * Récupère toutes les réservations pour l'administration
   */
  getAdminReservations(): Observable<Reservation[]> {
    return this.getMesReservations().pipe(
      map(res => res.reservations || [])
    );
  }

  /**
   * Récupère une réservation par son identifiant
   */
  getReservationById(id: number): Observable<Reservation> {
    return this.http.get<{ succes: boolean; reservation: Reservation }>(`${this.apiUrl}/reservations/${id}`).pipe(
      map(res => this.normaliserReservation(res.reservation))
    );
  }

  /**
   * Récupère les réservations d'un parking (gestionnaire)
   */
  getReservationsByParking(parkingId: number): Observable<ReservationsResponse> {
    return this.http.get<ReservationsResponse>(`${this.apiUrl}/reservations/parking/${parkingId}`);
  }

  /**
   * Annule une réservation par son ID
   */
  annulerReservation(id: number): Observable<ReservationResponse> {
    return this.http.put<ReservationResponse>(
      `${this.apiUrl}/reservations/${id}/annuler`,
      {}
    );
  }

  /**
   * Alias cancelReservation pour compatibilité
   */
  cancelReservation(id: number): Observable<any> {
    return this.annulerReservation(id);
  }

  /**
   * Récupère une réservation par son QR code
   */
  getReservationByQr(qrData: string): Observable<Reservation> {
    return this.http.get<{ succes: boolean; reservation: Reservation }>(`${this.apiUrl}/reservations/qr/${encodeURIComponent(qrData)}`).pipe(
      map(res => this.normaliserReservation(res.reservation || res))
    );
  }

  /**
   * Enregistre l'arrivée d'un véhicule (Check-in)
   */
  checkIn(reservationId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/reservations/${reservationId}/checkin`, {}).pipe(
      map(res => this.normaliserReservation(res.reservation || res))
    );
  }

  /**
   * Enregistre le départ d'un véhicule (Check-out)
   */
  checkOut(reservationId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/reservations/${reservationId}/checkout`, {}).pipe(
      map(res => this.normaliserReservation(res.reservation || res))
    );
  }

  /**
   * Récupère les statistiques d'occupation d'un parking (gestionnaire)
   */
  getStatsParking(parkingId: number): Observable<StatsResponse> {
    return this.http.get<StatsResponse>(`${this.apiUrl}/stats/parking/${parkingId}`);
  }

  /**
   * Normalise un objet Reservation pour assurer le double mapping français/anglais
   */
  private normaliserReservation(r: any): Reservation {
    if (!r) return r;
    return {
      ...r,
      reservationNumber: r.reservationNumber || `RES-${r.id}`,
      parkingName: r.parkingName || r.nom_parking,
      parkingAddress: r.parkingAddress || r.adresse_parking,
      spaceNumber: r.spaceNumber || r.numero_place,
      startTime: r.startTime || r.debut,
      endTime: r.endTime || r.fin,
      totalPrice: r.totalPrice ?? r.montant_total,
      status: r.status || (r.statut === 'CONFIRMEE' ? 'CONFIRMED' : r.statut === 'ANNULEE' ? 'CANCELLED' : r.statut),
      statut: r.statut || (r.status === 'CONFIRMED' ? 'CONFIRMEE' : r.status === 'CANCELLED' ? 'ANNULEE' : r.status),
      qrCode: r.qrCode || r.code_qr
    };
  }
}
