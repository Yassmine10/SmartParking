import { Component, Input, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ModalController, AlertController, LoadingController, ToastController } from '@ionic/angular';
import { Parking, Place } from '../../../models';
import { ReservationService } from '../../../core/services/reservation.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-modal-reservation',
  templateUrl: './modal-reservation.component.html',
  styleUrls: ['./modal-reservation.component.scss'],
  standalone: false
})
export class ModalReservationComponent implements OnInit {

  @Input() parking!: Parking;
  @Input() place?: any; // place présélectionnée depuis parking-details

  reservationModel = {
    id_place: null as number | null,
    debut: new Date().toISOString(),
    duree_heures: 2
  };

  constructor(
    private modalCtrl: ModalController,
    private reservationService: ReservationService,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    if (this.place) {
      this.reservationModel.id_place = this.place.id;
    }
  }

  // ── Accesseurs pour l'affichage ───────────────────────────────

  get prixHeure(): number {
    return (this.parking as any)?.prix_heure ?? this.parking?.pricePerHour ?? 0;
  }

  get montantTotal(): number {
    return this.prixHeure * (this.reservationModel.duree_heures || 1);
  }

  get todayLabel(): string {
    const now = new Date();
    return now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
              .replace(/^\w/, c => c.toUpperCase());
  }

  get heureDebut(): string {
    return new Date(this.reservationModel.debut)
      .toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  getPlaceNumero(): string {
    return (this.place as any)?.numero || (this.place as any)?.number || '—';
  }

  getPlaceType(): string {
    return (this.place as any)?.type_place || (this.place as any)?.type || 'Standard';
  }

  // ── Stepper durée ─────────────────────────────────────────────

  incrementDuree() {
    if (this.reservationModel.duree_heures < 24) this.reservationModel.duree_heures++;
  }

  decrementDuree() {
    if (this.reservationModel.duree_heures > 1) this.reservationModel.duree_heures--;
  }

  // ── Actions ───────────────────────────────────────────────────

  annuler(): void {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  async confirmerReservation(form: NgForm): Promise<void> {
    if (!this.reservationModel.id_place) {
      const a = await this.alertCtrl.create({
        header: 'Aucune place sélectionnée',
        message: 'Veuillez sélectionner une place depuis la page du parking.',
        buttons: ['OK']
      });
      await a.present();
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Traitement…',
      spinner: 'crescent'
    });
    await loading.present();

    const dto = {
      id_place: this.reservationModel.id_place,
      debut: this.reservationModel.debut,
      duree_heures: Number(this.reservationModel.duree_heures)
    };

    this.reservationService.createReservation(dto).subscribe({
      next: async (res) => {
        await loading.dismiss();
        const reservation = res.reservation || res;
        // Notification rappel
        const endTime = reservation?.endTime || reservation?.fin;
        let reminderScheduled = false;
        if (endTime) {
          const parkingName = (this.parking as any)?.nom || this.parking?.name || 'parking';
          try {
            reminderScheduled = await this.notificationService.scheduleReminder(
              reservation.id,
              endTime,
              parkingName
            );
          } catch (error) {
            console.error('Réservation confirmée, mais le rappel local n’a pas pu être programmé :', error);
          }
        } else {
          console.error('Réservation confirmée sans date de fin; le rappel local n’a pas été programmé.');
        }
        if (!reminderScheduled) {
          const toast = await this.toastCtrl.create({
            message: 'Réservation confirmée, mais aucun rappel local n’a été programmé.',
            duration: 3500,
            color: 'warning',
            position: 'top'
          });
          await toast.present();
        }
        this.modalCtrl.dismiss(reservation, 'confirmed');
      },
      error: async (err) => {
        await loading.dismiss();
        const a = await this.alertCtrl.create({
          header: 'Erreur',
          message: err.error?.message || 'La place n\'est plus disponible.',
          buttons: ['OK']
        });
        await a.present();
      }
    });
  }
}
