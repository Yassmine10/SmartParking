import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { ReservationService } from '../../core/services/reservation.service';
import { Reservation } from '../../models';

@Component({
  selector: 'app-reservations',
  templateUrl: './reservations.page.html',
  styleUrls: ['./reservations.page.scss'],
  standalone: false
})
export class ReservationsPage implements OnInit {
  activeSegment: 'upcoming' | 'active' | 'history' = 'upcoming';
  allReservations: Reservation[] = [];
  isLoading = true;

  constructor(
    private reservationService: ReservationService,
    private router: Router,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.loadReservations();
  }

  ionViewWillEnter() {
    this.loadReservations();
  }

  loadReservations(event?: any) {
    this.isLoading = true;
    this.reservationService.getUserReservations().subscribe({
      next: (data) => {
        this.allReservations = data;
        this.isLoading = false;
        if (event) event.target.complete();
      },
      error: () => {
        this.isLoading = false;
        if (event) event.target.complete();
      }
    });
  }

  get upcomingList(): Reservation[] {
    return this.allReservations.filter(r => r.status === 'CONFIRMED' || r.statut === 'CONFIRMEE');
  }

  get activeList(): Reservation[] {
    return this.allReservations.filter(r => r.status === 'ACTIVE' || r.statut === 'ACTIVE');
  }

  get historyList(): Reservation[] {
    return this.allReservations.filter(r =>
      r.status === 'COMPLETED' || r.status === 'CANCELLED' ||
      r.statut === 'TERMINEE' || r.statut === 'ANNULEE'
    );
  }

  goToTicket(id: number) {
    this.router.navigate(['/reservation-details', id]);
  }

  /**
   * Confirmation d'annulation via AlertController (Notion du cours)
   */
  async confirmerAnnulation(reservationId: number): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Annuler la réservation',
      message: 'Voulez-vous vraiment annuler cette réservation ? Cette action est irréversible.',
      buttons: [
        {
          text: 'Non, garder',
          role: 'cancel'
        },
        {
          text: 'Oui, annuler',
          role: 'destructive',
          handler: () => {
            this.executerAnnulation(reservationId);
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Exécution de l'annulation auprès du backend
   */
  private async executerAnnulation(id: number): Promise<void> {
    const loading = await this.loadingCtrl.create({
      message: 'Annulation en cours...',
      spinner: 'crescent'
    });
    await loading.present();

    this.reservationService.annulerReservation(id).subscribe({
      next: async () => {
        await loading.dismiss();
        const toast = await this.toastCtrl.create({
          message: 'Réservation annulée avec succès.',
          duration: 3000,
          color: 'success',
          position: 'top'
        });
        await toast.present();
        this.loadReservations();
      },
      error: async (err) => {
        await loading.dismiss();
        const toast = await this.toastCtrl.create({
          message: err.error?.message || 'Erreur lors de l\'annulation.',
          duration: 3000,
          color: 'danger',
          position: 'bottom'
        });
        await toast.present();
      }
    });
  }
}
