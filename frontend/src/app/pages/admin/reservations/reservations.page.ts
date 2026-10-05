import { Component, OnInit } from '@angular/core';
import { ReservationService } from '../../../core/services/reservation.service';
import { Reservation } from '../../../models';
import { AlertController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-admin-reservations',
  templateUrl: './reservations.page.html',
  styleUrls: ['./reservations.page.scss'],
  standalone: false
})
export class AdminReservationsPage implements OnInit {
  allReservations: Reservation[] = [];
  filtered: Reservation[] = [];
  isLoading = true;
  searchTerm = '';
  statusFilter = 'ALL';
  statusOptions = ['ALL', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED'];

  constructor(
    private reservationService: ReservationService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() { this.loadReservations(); }

  loadReservations() {
    this.isLoading = true;
    this.reservationService.getReservationsByManager().subscribe({
      next: (data: any) => { this.allReservations = data; this.applyFilter(); this.isLoading = false; },
      error: () => { this.isLoading = false; }
    });
  }

  applyFilter() {
    let res = [...this.allReservations];
    if (this.statusFilter !== 'ALL') {
      res = res.filter(r => r.status === (this.statusFilter as any));
    }
    if (this.searchTerm.trim()) {
      const q = this.searchTerm.toLowerCase();
      res = res.filter(r =>
        r.parkingName?.toLowerCase().includes(q) ||
        r.spaceNumber?.toLowerCase().includes(q) ||
        r.userName?.toLowerCase().includes(q) ||
        r.qrCodeData?.toLowerCase().includes(q)
      );
    }
    this.filtered = res;
  }

  onSearch(event: any) { this.searchTerm = event.detail.value; this.applyFilter(); }
  onStatusFilter(val: string) { this.statusFilter = val; this.applyFilter(); }

  getStatusColor(status?: string) {
    if (!status) return 'medium';
    const map: any = { CONFIRMED: 'primary', ACTIVE: 'success', COMPLETED: 'medium', CANCELLED: 'danger' };
    return map[status] || 'medium';
  }

  getStatusLabel(status?: string) {
    if (!status) return 'Inconnu';
    const map: any = { CONFIRMED: 'Confirmée', ACTIVE: 'Active', COMPLETED: 'Terminée', CANCELLED: 'Annulée' };
    return map[status] || status;
  }

  async confirmReservation(r: Reservation) {
    const alert = await this.alertCtrl.create({
      header: 'Confirmer la réservation',
      message: `Confirmer la réservation #${r.id} ?`,
      buttons: [
        { text: 'Non', role: 'cancel' },
        {
          text: 'Oui', handler: () => {
            this.reservationService.checkIn(r.id).subscribe({
              next: () => { this.showToast('Réservation confirmée', 'success'); this.loadReservations(); },
              error: () => this.showToast('Erreur de confirmation', 'danger')
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async cancelReservation(r: Reservation) {
    const alert = await this.alertCtrl.create({
      header: 'Annuler la réservation',
      message: `Annuler la réservation #${r.id} ?`,
      buttons: [
        { text: 'Non', role: 'cancel' },
        {
          text: 'Oui, annuler', role: 'destructive',
          handler: () => {
            this.reservationService.cancelReservation(r.id).subscribe({
              next: () => { this.showToast('Réservation annulée', 'warning'); this.loadReservations(); },
              error: () => this.showToast('Erreur', 'danger')
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

  doRefresh(event: any) { this.loadReservations(); setTimeout(() => event.target.complete(), 1000); }
}
