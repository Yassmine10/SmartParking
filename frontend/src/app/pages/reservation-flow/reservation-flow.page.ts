import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingController, ToastController } from '@ionic/angular';
import { ParkingService } from '../../core/services/parking.service';
import { ReservationService } from '../../core/services/reservation.service';
import { NotificationService } from '../../core/services/notification.service';
import { Parking, ParkingSpace } from '../../models';

@Component({
  selector: 'app-reservation-flow',
  templateUrl: './reservation-flow.page.html',
  styleUrls: ['./reservation-flow.page.scss'],
  standalone: false
})
export class ReservationFlowPage implements OnInit {
  parkingId!: number;
  parking: Parking | null = null;
  spaces: ParkingSpace[] = [];
  isLoading = true;

  currentStep = 1; // 1: Date & Time, 2: Select Space, 3: Summary & Pay

  // Step 1: Form values
  selectedDate: string = new Date().toISOString().substring(0, 10);
  selectedTime: string = '14:00';
  selectedDuration: number = 2;

  // Step 2: Selected Space
  selectedSpace: ParkingSpace | null = null;
  selectedFloor = 1;
  activeSpaceFilter = 'ALL'; // ALL, STANDARD, HANDICAPPED, ELECTRIC, VIP

  // Step 3: Payment
  selectedPaymentMethod: 'CREDIT_CARD' | 'PAYPAL' | 'WALLET' = 'CREDIT_CARD';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private parkingService: ParkingService,
    private reservationService: ReservationService,
    private notificationService: NotificationService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('parkingId');
    if (idParam) {
      this.parkingId = parseInt(idParam, 10);
      this.loadParkingAndSpaces();
    }
  }

  loadParkingAndSpaces() {
    this.isLoading = true;
    this.parkingService.getParkingById(this.parkingId).subscribe({
      next: (data) => {
        this.parking = data;
        this.spaces = data.spaces || [];
        this.isLoading = false;
      },
      error: async () => {
        this.isLoading = false;
        const toast = await this.toastCtrl.create({
          message: 'Erreur lors du chargement des informations du parking.',
          duration: 3000,
          color: 'danger'
        });
        await toast.present();
      }
    });
  }

  get filteredSpaces(): ParkingSpace[] {
    return this.spaces.filter(s => {
      const matchFloor = s.floor === this.selectedFloor;
      const matchType = this.activeSpaceFilter === 'ALL' || s.type === this.activeSpaceFilter;
      return matchFloor && matchType;
    });
  }

  get calculatedTotalPrice(): number {
    if (!this.parking) return 0;
    const price = this.parking.pricePerHour ?? this.parking.prix_heure ?? 0;
    return price * this.selectedDuration;
  }

  selectSpace(space: ParkingSpace) {
    if (space.status !== 'AVAILABLE' && space.statut !== 'libre') return;
    this.selectedSpace = space;
  }

  goToStep(step: number) {
    if (step === 2 && (!this.selectedDate || !this.selectedTime)) {
      return;
    }
    if (step === 3 && !this.selectedSpace) {
      return;
    }
    this.currentStep = step;
  }

  async confirmReservation() {
    if (!this.parking || !this.selectedSpace) return;

    const loading = await this.loadingCtrl.create({
      message: 'Confirmation et émission du QR Code...',
      spinner: 'crescent'
    });
    await loading.present();

    const startDateTime = new Date(`${this.selectedDate}T${this.selectedTime}:00Z`).toISOString();

    const payload: any = {
      id_place: this.selectedSpace.id,
      parkingId: this.parking.id,
      parkingSpaceId: this.selectedSpace.id,
      debut: startDateTime,
      startTime: startDateTime,
      duree_heures: this.selectedDuration,
      durationHours: this.selectedDuration,
      paymentMethod: this.selectedPaymentMethod
    };

    this.reservationService.createReservation(payload).subscribe({
      next: async (res: any) => {
        await loading.dismiss();
        const reservation = res.reservation || res;
        const endTime = reservation.endTime || reservation.fin;
        let reminderScheduled = false;
        if (endTime) {
          try {
            reminderScheduled = await this.notificationService.scheduleReminder(
              reservation.id,
              endTime,
              this.parking?.name || this.parking?.nom || 'parking'
            );
          } catch (error) {
            console.error('Réservation confirmée, mais le rappel local n’a pas pu être programmé :', error);
          }
        }
        const toast = await this.toastCtrl.create({
          message: reminderScheduled
            ? 'Réservation confirmée. Un rappel sera envoyé 15 minutes avant la fin.'
            : 'Réservation confirmée. Aucun rappel local n’a été programmé.',
          duration: 2500,
          color: reminderScheduled ? 'success' : 'warning',
          position: 'top'
        });
        await toast.present();
        const resId = reservation.id;
        this.router.navigate(['/reservation-details', resId], { replaceUrl: true });
      },
      error: async (err) => {
        await loading.dismiss();
        const toast = await this.toastCtrl.create({
          message: err.message || 'Échec de la réservation. Veuillez réessayer.',
          duration: 4000,
          color: 'danger',
          position: 'bottom'
        });
        await toast.present();
      }
    });
  }
}
