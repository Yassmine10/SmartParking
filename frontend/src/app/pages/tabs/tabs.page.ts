import { Component, OnInit } from '@angular/core';
import { NotificationService } from '../../core/services/notification.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
  standalone: false
})
export class TabsPage implements OnInit {
  unreadCount$!: Observable<number>;

  constructor(private notificationService: NotificationService) {}

  ngOnInit() {
    this.unreadCount$ = this.notificationService.unreadCount$;
    // Fetch notifications initially to populate unread count
    this.notificationService.getNotifications().subscribe();
  }
}

