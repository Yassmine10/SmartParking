import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { StorageService } from '../../../core/services/storage.service';
import { environment } from '../../../../environments/environment';
import { AlertController, ToastController } from '@ionic/angular';

interface AdminUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  createdAt: string;
  totalReservations?: number;
  isActive: boolean;
  /** Adresse email confirmée ? Un compte non vérifié ne peut pas se connecter. */
  emailVerifie: boolean;
}

@Component({
  selector: 'app-admin-users',
  templateUrl: './users.page.html',
  styleUrls: ['./users.page.scss'],
  standalone: false
})
export class AdminUsersPage implements OnInit {
  users: AdminUser[] = [];
  filtered: AdminUser[] = [];
  isLoading = true;
  searchTerm = '';

  /** Filtre supplémentaire : n'afficher que les comptes non vérifiés. */
  showUnverifiedOnly = false;

  constructor(
    private http: HttpClient,
    private storageService: StorageService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() { this.loadUsers(); }

  async loadUsers() {
    this.isLoading = true;
    const token = await this.storageService.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    // Le backend renvoie { succes, users: [{ id, nom, email, role, date_creation, ... }] }
    this.http.get<{ succes: boolean; users: any[] }>(`${environment.apiUrl}/users`, { headers }).subscribe({
      next: (res) => {
        this.users = (res.users || []).map(u => {
          // Le backend stocke un nom unique : on le découpe en prénom / nom
          const parts = String(u.nom || '').trim().split(/\s+/);
          const firstName = parts.length > 1 ? parts.slice(0, -1).join(' ') : (parts[0] || '');
          const lastName = parts.length > 1 ? parts[parts.length - 1] : '';
          return {
            id: u.id,
            firstName,
            lastName,
            email: u.email,
            role: u.role,
            createdAt: u.date_creation,
            totalReservations: u.total_reservations,
            isActive: true,
            emailVerifie: Boolean(u.email_verifie),
          } as AdminUser;
        });
        this.applyFilter();
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  applyFilter() {
    const q = this.searchTerm.trim().toLowerCase();
    let resultat = [...this.users];

    if (q) {
      resultat = resultat.filter(u =>
        (u.firstName || '').toLowerCase().includes(q) ||
        (u.lastName || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
      );
    }

    // Filtre supplémentaire : uniquement les comptes dont l'email n'a pas
    // encore été confirmé. Ces comptes ne peuvent pas se connecter, l'admin
    // doit donc pouvoir les repérer et leur renvoyer un lien.
    if (this.showUnverifiedOnly) {
      resultat = resultat.filter(u => !u.emailVerifie);
    }

    this.filtered = resultat;
  }

  toggleUnverifiedOnly() {
    this.showUnverifiedOnly = !this.showUnverifiedOnly;
    this.applyFilter();
  }

  get nbNonVerifies(): number {
    return this.users.filter(u => !u.emailVerifie).length;
  }

  onSearch(event: any) { this.searchTerm = event.detail.value; this.applyFilter(); }

  async confirmDelete(user: AdminUser) {
    const alert = await this.alertCtrl.create({
      header: 'Supprimer l\'utilisateur',
      message: `Supprimer ${user.firstName} ${user.lastName} ?`,
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        {
          text: 'Supprimer', role: 'destructive',
          handler: async () => {
            const token = await this.storageService.getToken();
            const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
            this.http.delete(`${environment.apiUrl}/users/${user.id}`, { headers }).subscribe({
              next: () => { this.showToast('Utilisateur supprimé', 'warning'); this.loadUsers(); },
              error: () => this.showToast('Erreur de suppression', 'danger')
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async showToast(msg: string, color: string) {
    const t = await this.toastCtrl.create({ message: msg, duration: 2000, color, position: 'top' });
    t.present();
  }

  doRefresh(event: any) { this.loadUsers(); setTimeout(() => event.target.complete(), 1000); }
}
