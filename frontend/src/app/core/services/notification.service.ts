import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AppNotification } from '../../models';
import { LocalNotifications } from '@capacitor/local-notifications';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly apiUrl = `${environment.apiUrl}/notifications`;
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Récupère les notifications de l'utilisateur.
   * Le backend renvoie { succes, notifications: [...] } : on déballe la réponse
   * et on mappe les champs SQL (titre/lue/date_creation) vers le modèle front (title/isRead/createdAt).
   */
  getNotifications(): Observable<AppNotification[]> {
    return this.http.get<{ succes: boolean; notifications: any[] }>(this.apiUrl).pipe(
      map(res => (res.notifications || []).map(n => ({
        id: n.id,
        title: n.titre,
        message: n.message,
        type: n.type,
        createdAt: n.date_creation,
        isRead: n.lue,
      }))),
      tap(notifs => {
        const unread = notifs.filter(n => !n.isRead).length;
        this.unreadCountSubject.next(unread);
      })
    );
  }

  markAsRead(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/read`, {}).pipe(
      tap(() => {
        const count = Math.max(0, this.unreadCountSubject.value - 1);
        this.unreadCountSubject.next(count);
      })
    );
  }

  markAllAsRead(): Observable<any> {
    return this.http.put(`${this.apiUrl}/read-all`, {}).pipe(
      tap(() => {
        this.unreadCountSubject.next(0);
      })
    );
  }

  // ─── Capacitor Local Notifications ─────────────────────────────────────────

  /**
   * Demande la permission d'envoyer des notifications locales (mobile / web)
   */
  async requestPermissions(): Promise<void> {
    try {
      const check = await LocalNotifications.checkPermissions();
      if (check.display === 'granted') {
        return;
      }
      if (check.display === 'denied') {
        console.info('ℹ️ Notifications désactivées dans les paramètres du navigateur (normal sur PC/Web).');
        return;
      }
      const result = await LocalNotifications.requestPermissions();
      console.log('Notification permission:', result.display);
    } catch {
      // Ignorer silencieusement sur les environnements web où l'API n'est pas disponible
    }
  }

  /**
   * Programme un rappel 15 minutes avant la fin d'une réservation
   */
  async scheduleReminder(reservationId: number, endTime: string, parkingName: string): Promise<void> {
    const end = new Date(endTime);
    const reminderTime = new Date(end.getTime() - 15 * 60 * 1000);
    if (reminderTime <= new Date()) return; // heure déjà passée
    await LocalNotifications.schedule({
      notifications: [{
        id: reservationId,
        title: '⏰ Rappel SmartParking',
        body: `Votre stationnement à ${parkingName} se termine dans 15 minutes.`,
        schedule: { at: reminderTime },
        sound: undefined,
        attachments: undefined,
        actionTypeId: '',
        extra: { reservationId }
      }]
    });
  }

  /**
   * Annule un rappel de réservation planifié
   */
  async cancelReminder(reservationId: number): Promise<void> {
    await LocalNotifications.cancel({ notifications: [{ id: reservationId }] });
  }
}
