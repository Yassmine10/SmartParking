import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import * as QRCode from 'qrcode';
import { ReservationService } from '../../core/services/reservation.service';
import { NotificationService } from '../../core/services/notification.service';
import { Reservation } from '../../models';

@Component({
  selector: 'app-reservation-details',
  templateUrl: './reservation-details.page.html',
  styleUrls: ['./reservation-details.page.scss'],
  standalone: false
})
export class ReservationDetailsPage implements OnInit {
  reservationId!: number;
  reservation: Reservation | null = null;
  qrCodeUrl = '';
  isLoading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private reservationService: ReservationService,
    private notificationService: NotificationService,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.reservationId = parseInt(idParam, 10);
      this.loadReservation();
    }
  }

  loadReservation() {
    this.isLoading = true;
    this.reservationService.getReservationById(this.reservationId).subscribe({
      next: async (res) => {
        this.reservation = res;
        this.isLoading = false;
        await this.generateQrCode(
          res.qrCode || res.code_qr || res.qrCodeData || res.reservationNumber || `RES-${res.id}`
        );
      },
      error: async (err) => {
        this.isLoading = false;
        const toast = await this.toastCtrl.create({
          message: 'Impossible de charger la réservation.',
          duration: 3000,
          color: 'danger'
        });
        await toast.present();
      }
    });
  }

  async generateQrCode(text: string) {
    try {
      this.qrCodeUrl = await QRCode.toDataURL(text, {
        width: 280,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      });
    } catch (err) {
      console.error('Error generating QR Code:', err);
    }
  }

  async confirmCancel() {
    const alert = await this.alertCtrl.create({
      header: 'Annuler la réservation',
      message: 'Êtes-vous sûr de vouloir annuler cette réservation ? Le montant payé vous sera remboursé.',
      buttons: [
        {
          text: 'Non, garder',
          role: 'cancel'
        },
        {
          text: 'Oui, annuler',
          role: 'destructive',
          handler: () => {
            this.cancelReservation();
          }
        }
      ]
    });
    await alert.present();
  }

  async cancelReservation() {
    const loading = await this.loadingCtrl.create({ message: 'Annulation en cours...' });
    await loading.present();

    this.reservationService.cancelReservation(this.reservationId).subscribe({
      next: async (res) => {
        await loading.dismiss();
        this.reservation = res;
        let reminderCleanupFailed = false;
        try {
          await this.notificationService.cancelReminder(this.reservationId);
        } catch (error) {
          reminderCleanupFailed = true;
          console.error('Réservation annulée, mais le rappel local n’a pas pu être annulé :', error);
        }
        const toast = await this.toastCtrl.create({
          message: reminderCleanupFailed
            ? 'Réservation annulée, mais le rappel local doit être supprimé manuellement.'
            : 'Réservation annulée avec succès.',
          duration: 3000,
          color: 'warning'
        });
        await toast.present();
      },
      error: async (err) => {
        await loading.dismiss();
        const toast = await this.toastCtrl.create({
          message: err.message || 'Erreur lors de l\'annulation.',
          duration: 3000,
          color: 'danger'
        });
        await toast.present();
      }
    });
  }

  get canCancel(): boolean {
    return this.reservation?.status === 'CONFIRMED';
  }
}
