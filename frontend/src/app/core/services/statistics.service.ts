import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AdminDashboardStats, DashboardStats } from '../../models';

@Injectable({
  providedIn: 'root'
})
export class StatisticsService {
  private readonly apiUrl = `${environment.apiUrl}/stats`;

  constructor(private http: HttpClient) {}

  getAdminStats(): Observable<AdminDashboardStats> {
    return this.http.get<AdminDashboardStats>(`${this.apiUrl}/dashboard`);
  }

  /** Returns stats shaped exactly as the admin dashboard component expects */
  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<AdminDashboardStats>(`${this.apiUrl}/dashboard`).pipe(
      map(raw => ({
        totalParkings: raw.totalParkings,
        totalSpaces: raw.totalSpaces,
        availableSpaces: raw.availableSpaces,
        occupiedSpaces: raw.occupiedSpaces,
        todayReservations: raw.reservationsToday,
        todayRevenue: raw.revenueToday,
        occupancyRate: (raw as any).occupancyRatePercentage ?? raw.occupancyRate ?? 0,
        dailyStats: (raw.reservationsByDay || []).map((r: any, i: number) => ({
          date: r.date,
          reservations: r.value,
          revenue: (raw as any).revenueByDay?.[i]?.value ?? 0
        })),
        occupancyByHour: (raw as any).occupancyByHour ?? []
      }))
    );
  }
}
