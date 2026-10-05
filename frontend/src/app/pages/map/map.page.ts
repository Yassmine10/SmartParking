import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import { ParkingService } from '../../core/services/parking.service';
import { GeolocationService, UserCoordinates } from '../../core/services/geolocation.service';
import { Parking } from '../../models';

@Component({
  selector: 'app-map',
  templateUrl: './map.page.html',
  styleUrls: ['./map.page.scss'],
  standalone: false
})
export class MapPage implements AfterViewInit, OnDestroy {
  map!: L.Map;
  userCoords: UserCoordinates = { latitude: 36.8008, longitude: 10.1800 };
  parkings: Parking[] = [];
  selectedParking: Parking | null = null;
  userMarker?: L.CircleMarker;
  markersLayer = L.layerGroup();
  isLoading = true;

  constructor(
    private parkingService: ParkingService,
    private geoService: GeolocationService,
    private router: Router
  ) {}

  async ngAfterViewInit() {
    await this.initLocation();
    this.initMap();
    this.loadParkings();
  }

  ionViewWillEnter() {
    if (this.map) {
      setTimeout(() => {
        this.map.invalidateSize();
      }, 200);
      this.loadParkings();
    }
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }

  async initLocation() {
    try {
      this.userCoords = await this.geoService.getCurrentPosition();
    } catch (e) {
      console.warn('Using default coordinates for map');
    }
  }

  initMap() {
    this.map = L.map('parking-map', {
      zoomControl: false
    }).setView([this.userCoords.latitude, this.userCoords.longitude], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    this.markersLayer.addTo(this.map);

    // Add user marker
    this.addUserMarker();
  }

  addUserMarker() {
    if (this.userMarker) {
      this.map.removeLayer(this.userMarker);
    }

    this.userMarker = L.circleMarker([this.userCoords.latitude, this.userCoords.longitude], {
      radius: 9,
      fillColor: '#3b82f6',
      color: '#ffffff',
      weight: 3,
      opacity: 1,
      fillOpacity: 0.9
    }).addTo(this.map);

    this.userMarker.bindPopup('<b>Votre position actuelle</b>');
  }

  loadParkings() {
    this.isLoading = true;
    this.parkingService.getAllParkings({
      latitude: this.userCoords.latitude,
      longitude: this.userCoords.longitude
    }).subscribe({
      next: (data) => {
        this.parkings = data;
        this.renderMarkers();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  renderMarkers() {
    this.markersLayer.clearLayers();

    this.parkings.forEach(p => {
      const avail = p.availableSpaces ?? p.places_libres ?? 0;
      const isAvailable = avail > 0;
      const markerColor = isAvailable ? '#10b981' : '#ef4444';

      const customIcon = L.divIcon({
        className: 'custom-map-pin',
        html: `
          <div style="background-color: ${markerColor}; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); font-size: 12px;">
            ${isAvailable ? p.availableSpaces : '✕'}
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 19]
      });

      const marker = L.marker([p.latitude, p.longitude], { icon: customIcon });

      marker.on('click', () => {
        this.selectedParking = p;
        this.map.panTo([p.latitude, p.longitude]);
      });

      this.markersLayer.addLayer(marker);
    });
  }

  async recenterOnUser() {
    this.userCoords = await this.geoService.getCurrentPosition();
    this.addUserMarker();
    this.map.setView([this.userCoords.latitude, this.userCoords.longitude], 15);
  }

  closeBottomSheet() {
    this.selectedParking = null;
  }

  goToDetails(parkingId: number) {
    this.router.navigate(['/parking-details', parkingId]);
  }

  goToBooking(parkingId: number) {
    this.router.navigate(['/reservation-flow', parkingId]);
  }

  goToSearch() {
    this.router.navigate(['/search']);
  }
}

