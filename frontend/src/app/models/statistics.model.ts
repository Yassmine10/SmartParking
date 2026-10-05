export interface DailyStats {
  date: string;
  reservations: number;
  revenue: number;
}

export interface DashboardStats {
  totalParkings: number;
  totalSpaces: number;
  availableSpaces: number;
  occupiedSpaces: number;
  todayReservations: number;
  todayRevenue: number;
  occupancyRate: number;
  dailyStats: DailyStats[];
}

// Legacy alias kept for backward compatibility
export interface AdminDashboardStats {
  totalParkings: number;
  totalSpaces: number;
  availableSpaces: number;
  occupiedSpaces: number;
  reservationsToday: number;
  revenueToday: number;
  totalRevenue: number;
  occupancyRatePercentage: number;
  mostUsedParking?: {
    parkingId: number;
    name: string;
    totalReservations: number;
    totalRevenue: number;
  };
  reservationsByDay: { date: string; value: number }[];
  revenueByDay: { date: string; value: number }[];
  spaceTypeDistribution: { type: string; count: number }[];
  parkingsOccupancy: {
    parkingId: number;
    parkingName: string;
    totalSpaces: number;
    occupiedSpaces: number;
    occupancyRate: number;
  }[];
}
