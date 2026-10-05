import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ParkingService } from '../../core/services/parking.service';
import { GeolocationService, UserCoordinates } from '../../core/services/geolocation.service';
import { Parking, ParkingSearchFilter } from '../../models';

@Component({
  selector: 'app-search',
  templateUrl: './search.page.html',
  styleUrls: ['./search.page.scss'],
  standalone: false
})
export class SearchPage implements OnInit {
  query = '';
  maxDistanceKm = 10;
  maxPrice = 5.0;
  onlyAvailable = false;
  parkingType = 'ALL'; // ALL, COVERED, OUTDOOR
  spaceType = 'ALL';

  parkings: Parking[] = [];
  isLoading = false;
  userCoords?: UserCoordinates;
  showFilters = false;

  constructor(
    private parkingService: ParkingService,
    private geoService: GeolocationService,
    private router: Router
  ) {}

  async ngOnInit() {
    this.userCoords = await this.geoService.getCurrentPosition();
    this.search();
  }

  search() {
    this.isLoading = true;

    const filter: ParkingSearchFilter = {
      query: this.query,
      latitude: this.userCoords?.latitude,
      longitude: this.userCoords?.longitude,
      maxDistanceKm: this.maxDistanceKm,
      maxPrice: this.maxPrice,
      onlyAvailable: this.onlyAvailable ? true : undefined
    };

    if (this.parkingType === 'COVERED') {
      filter.isCovered = true;
    } else if (this.parkingType === 'OUTDOOR') {
      filter.isCovered = false;
    }

    this.parkingService.getAllParkings(filter).subscribe({
      next: (data: any) => {
        this.parkings = data.items || data.parkings || data;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  toggleFilters() {
    this.showFilters = !this.showFilters;
  }

  resetFilters() {
    this.query = '';
    this.maxDistanceKm = 10;
    this.maxPrice = 5.0;
    this.onlyAvailable = false;
    this.parkingType = 'ALL';
    this.search();
  }

  goToDetails(id: number) {
    this.router.navigate(['/parking-details', id]);
  }

  goToBooking(id: number) {
    this.router.navigate(['/reservation-flow', id]);
  }
}

