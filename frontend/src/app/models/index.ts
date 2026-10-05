export * from './user.model';
export * from './parking.model';
export * from './reservation.model';
export * from './auth.model';

export interface DailyStats {
  date: string;
  count?: number;
  reservations?: number;
  revenue?: number;
  revenus?: number;
}

export interface DashboardStats {
  totalParkings?: number;
  totalSpaces?: number;
  occupiedSpaces?: number;
  availableSpaces?: number;
  occupancyRate?: number;
  totalRevenue?: number;
  totalReservations?: number;
  activeReservations?: number;
  todayReservations?: number;
  todayRevenue?: number;
  dailyStats?: DailyStats[];
  /** Occupation réelle par tranche horaire (issue des réservations). */
  occupancyByHour?: { heure: string; value: number }[];
}

export interface AdminDashboardStats extends DashboardStats {
  reservationsByDay?: any[];
  reservationsToday?: number;
  revenueToday?: number;
  revenueByDay?: any[];
  occupancyRatePercentage?: number;
  topParkings?: any[];
}

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  type?: string;
  data?: any;
}
