import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MenuController } from '@ionic/angular';
import { AuthService } from './core/services/auth.service';
import { NotificationService } from './core/services/notification.service';
import { User } from './models';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  currentUser: User | null = null;

  constructor(
    public authService: AuthService,
    private router: Router,
    private menuCtrl: MenuController,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    // S'abonne aux changements d'état d'authentification
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
    // Demande la permission de notifications locales (silencieux sur navigateur web)
    this.notificationService.requestPermissions().catch(err =>
      console.warn('Notification permission skipped (web):', err)
    );
  }

  /**
   * Déconnexion et fermeture du menu
   */
  async logout(): Promise<void> {
    await this.menuCtrl.close();
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  /**
   * Navigation avec fermeture automatique du menu
   */
  async navigateTo(path: string): Promise<void> {
    await this.menuCtrl.close();
    this.router.navigate([path]);
  }
}
