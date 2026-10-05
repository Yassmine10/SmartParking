import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { AuthService } from '../../core/services/auth.service';
import { ParkingService } from '../../core/services/parking.service';
import { GeolocationService, UserCoordinates } from '../../core/services/geolocation.service';
import { Parking, ParkingSearchFilter, UserProfile } from '../../models';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit {
  currentUser: UserProfile | null = null;
  parkings: Parking[] = [];
  isLoading = true;
  isLocating = false;
  currentCoords?: UserCoordinates;
  searchQuery = '';
  activeFilter = 'all'; // all, available, covered, cheap

  constructor(
    private authService: AuthService,
    private parkingService: ParkingService,
    private geoService: GeolocationService,
    private router: Router,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(u => {
      this.currentUser = u;
    });

    this.loadCurrentLocationAndParkings();
  }

  async loadCurrentLocationAndParkings() {
    this.isLoading = true;
    try {
      this.currentCoords = await this.geoService.getCurrentPosition();
    } catch {
      // Fallback already handled inside GeolocationService
    }
    this.fetchParkings();
  }

  fetchParkings(event?: any) {
    this.isLoading = true;

    const filter: ParkingSearchFilter = {
      query: this.searchQuery,
      latitude: this.currentCoords?.latitude,
      longitude: this.currentCoords?.longitude
    };

    if (this.activeFilter === 'available') {
      filter.onlyAvailable = true;
    } else if (this.activeFilter === 'covered') {
      filter.isCovered = true;
    } else if (this.activeFilter === 'cheap') {
      filter.maxPrice = 2.5;
    }

    this.parkingService.getAllParkings(filter).subscribe({
      next: (data) => {
        this.parkings = data;
        this.isLoading = false;
        if (event) event.target.complete();
      },
      error: async (err) => {
        this.isLoading = false;
        if (event) event.target.complete();
        const toast = await this.toastCtrl.create({
          message: 'Erreur lors du chargement des parkings.',
          duration: 2500,
          color: 'danger'
        });
        await toast.present();
      }
    });
  }

  async useMyLocation() {
    this.isLocating = true;
    try {
      this.currentCoords = await this.geoService.getCurrentPosition();
      const toast = await this.toastCtrl.create({
        message: 'Position GPS actualisée avec succès !',
        duration: 2000,
        color: 'success',
        position: 'top'
      });
      await toast.present();
      this.fetchParkings();
    } catch (err) {
      const toast = await this.toastCtrl.create({
        message: 'Impossible de récupérer la position GPS.',
        duration: 2500,
        color: 'warning'
      });
      await toast.present();
    } finally {
      this.isLocating = false;
    }
  }

  onSearchChange(event: any) {
    this.searchQuery = event.detail.value || '';
    this.fetchParkings();
  }

  setFilter(filter: string) {
    this.activeFilter = filter;
    this.fetchParkings();
  }

  goToDetails(parkingId: number) {
    this.router.navigate(['/parking-details', parkingId]);
  }

  goToBooking(parkingId: number) {
    this.router.navigate(['/reservation-flow', parkingId]);
  }
}

