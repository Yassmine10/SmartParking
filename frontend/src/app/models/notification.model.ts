export interface AppNotification {
  id: number;
  title: string;
  message: string;
  type: 'RESERVATION_START' | 'RESERVATION_CONFIRMED' | 'RESERVATION_CANCELLED' | 'RESERVATION_EXPIRING' | 'INFO';
  isRead: boolean;
  createdAt: string;
}
