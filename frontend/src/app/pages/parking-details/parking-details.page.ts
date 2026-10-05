import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { ModalController } from '@ionic/angular';
import { ParkingService } from '../../core/services/parking.service';
import { GeolocationService } from '../../core/services/geolocation.service';
import { Parking } from '../../models';
import { ModalReservationComponent } from '../../shared/components/modal-reservation/modal-reservation.component';

@Component({
  selector: 'app-parking-details',
  templateUrl: './parking-details.page.html',
  styleUrls: ['./parking-details.page.scss'],
  standalone: false
})
export class ParkingDetailsPage implements OnInit {

  parkingId!: number;
  parking: Parking | null = null;
  isLoading = true;

  // Places
  spaces: any[] = [];
  selectedSpace: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private parkingService: ParkingService,
    private geoService: GeolocationService,
    private modalCtrl: ModalController
  ) {}

  async ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.parkingId = parseInt(idParam, 10);
      const coords = await this.geoService.getCurrentPosition().catch(() => ({ latitude: undefined, longitude: undefined }));
      this.loadParking(coords?.latitude, coords?.longitude);
    }
  }

  loadParking(lat?: number, lng?: number) {
    this.isLoading = true;
    this.parkingService.getParkingById(this.parkingId, lat, lng).subscribe({
      next: (data: any) => {
        this.parking = data;
        // Récupérer les places depuis la réponse (champ places ou spaces)
        this.spaces = data.places || data.spaces || [];
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  // ── Sélection d'une place ──────────────────────────────────────

  selectSpace(s: any) {
    if (this.getSpaceStatut(s) !== 'libre') return;
    this.selectedSpace = this.selectedSpace?.id === s.id ? null : s;
  }

  // ── Accesseurs sécurisés (snake_case ou camelCase) ────────────

  getSpaceStatut(s: any): string  { return s.statut || s.status || ''; }
  getSpaceNumero(s: any): string  { return s.numero || s.number || ''; }
  getSpaceType(s: any): string    { return s.type_place || s.type || 'Standard'; }

  // ── Navigation ────────────────────────────────────────────────

  goBack() { this.location.back(); }

  // ── Réservation ───────────────────────────────────────────────

  async openReservationModal(): Promise<void> {
    if (!this.parking || !this.selectedSpace) return;

    const modal = await this.modalCtrl.create({
      component: ModalReservationComponent,
      componentProps: {
        parking: this.parking,
        place: this.selectedSpace
      }
    });
    await modal.present();
    const { role } = await modal.onWillDismiss();
    if (role === 'confirmed') {
      this.router.navigate(['/tabs/reservations']);
    }
  }
}
