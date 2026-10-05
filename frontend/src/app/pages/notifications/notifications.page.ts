import { Component, OnInit } from '@angular/core';
import { NotificationService } from '../../core/services/notification.service';
import { AppNotification } from '../../models';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
  standalone: false
})
export class NotificationsPage implements OnInit {
  notifications: AppNotification[] = [];
  isLoading = true;

  constructor(private notificationService: NotificationService) {}

  ngOnInit() {
    this.loadNotifications();
  }

  ionViewWillEnter() {
    this.loadNotifications();
  }

  loadNotifications(event?: any) {
    this.isLoading = true;
    this.notificationService.getNotifications().subscribe({
      next: (data) => {
        this.notifications = data;
        this.isLoading = false;
        if (event) event.target.complete();
      },
      error: () => {
        this.isLoading = false;
        if (event) event.target.complete();
      }
    });
  }

  markAsRead(notif: AppNotification) {
    if (notif.isRead) return;
    this.notificationService.markAsRead(notif.id).subscribe({
      next: () => {
        notif.isRead = true;
      }
    });
  }

  markAllAsRead() {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.forEach(n => n.isRead = true);
      }
    });
  }

  getIcon(type?: string): string {
    switch (type) {
      case 'RESERVATION_CONFIRMED': return 'checkmark-circle-outline';
      case 'RESERVATION_START': return 'alarm-outline';
      case 'RESERVATION_CANCELLED': return 'close-circle-outline';
      case 'RESERVATION_EXPIRING': return 'warning-outline';
      default: return 'notifications-outline';
    }
  }

  getColor(type?: string): string {
    switch (type) {
      case 'RESERVATION_CONFIRMED': return 'success';
      case 'RESERVATION_START': return 'primary';
      case 'RESERVATION_CANCELLED': return 'danger';
      case 'RESERVATION_EXPIRING': return 'warning';
      default: return 'medium';
    }
  }
}

