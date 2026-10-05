import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-tab-bar',
  templateUrl: './admin-tab-bar.component.html',
  styleUrls: ['./admin-tab-bar.component.scss'],
  standalone: false
})
export class AdminTabBarComponent {
  @Input() activeTab: 'dashboard' | 'parkings' | 'reservations' | 'scanner' | 'profile' = 'dashboard';

  constructor(private router: Router) {}

  goTo(tab: 'dashboard' | 'parkings' | 'reservations' | 'scanner' | 'profile') {
    const routes: Record<string, string> = {
      dashboard: '/admin/dashboard',
      parkings: '/admin/parkings',
      reservations: '/admin/reservations',
      scanner: '/admin/qr-scanner',
      profile: '/admin/admin-profile'
    };
    if (routes[tab]) {
      this.router.navigate([routes[tab]]);
    }
  }
}
