import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
import { Capacitor } from '@capacitor/core';
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
  async requestPermissions(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      console.info('Les rappels locaux sont disponibles uniquement dans l’application native.');
      return false;
    }

    const check = await LocalNotifications.checkPermissions();
    if (check.display === 'granted') return true;
    if (check.display === 'denied') {
      console.warn('Permission de notifications refusée. Activez-la dans les paramètres Android.');
      return false;
    }

    const result = await LocalNotifications.requestPermissions();
    if (result.display !== 'granted') {
      console.warn('Permission de notifications locales non accordée.');
    }
    if (
      Capacitor.getPlatform() === 'android' &&
      (await LocalNotifications.checkExactNotificationSetting()).exact_alarm !== 'granted'
    ) {
      console.warn('Les rappels Android peuvent être retardés tant que les alarmes exactes sont désactivées.');
    }
    return result.display === 'granted';
  }

  /**
   * Programme un rappel 15 minutes avant la fin d'une réservation
   */
  async scheduleReminder(reservationId: number, endTime: string, parkingName: string): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;

    const end = new Date(endTime);
    const reminderTime = new Date(end.getTime() - 15 * 60 * 1000);
    if (Number.isNaN(end.getTime())) {
      throw new Error('La date de fin de réservation est invalide.');
    }
    if (reminderTime <= new Date()) return false;

    const permission = await LocalNotifications.checkPermissions();
    if (permission.display !== 'granted') {
      console.warn('Rappel non programmé : permission de notification non accordée.');
      return false;
    }
    if (
      Capacitor.getPlatform() === 'android' &&
      (await LocalNotifications.checkExactNotificationSetting()).exact_alarm !== 'granted'
    ) {
      console.warn('Android peut retarder ce rappel car les alarmes exactes sont désactivées.');
    }

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
    return true;
  }

  /**
   * Annule un rappel de réservation planifié
   */
  async cancelReminder(reservationId: number): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    await LocalNotifications.cancel({ notifications: [{ id: reservationId }] });
  }
}
