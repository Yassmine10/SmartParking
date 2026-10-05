import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NavController } from '@ionic/angular';
import { ParkingService } from '../../../core/services/parking.service';
import { Parking, Place } from '../../../models';
import { AlertController, ToastController } from '@ionic/angular';
import * as L from 'leaflet';

type View = 'list' | 'form' | 'detail';

@Component({
  selector: 'app-admin-parkings',
  templateUrl: './parkings.page.html',
  styleUrls: ['./parkings.page.scss'],
  standalone: false
})
export class AdminParkingsPage implements OnInit, OnDestroy {

  // ── Vues ──────────────────────────────────────────────────────────
  activeView: View = 'list';

  // ── Liste ─────────────────────────────────────────────────────────
  parkings: Parking[] = [];
  isLoading = false;

  // ── Formulaire ────────────────────────────────────────────────────
  isEditing = false;
  editingId: number | null = null;
  form!: FormGroup;
  isSaving = false;

  // ── Détail ────────────────────────────────────────────────────────
  selectedParking: any = null;
  places: Place[] = [];
  isLoadingPlaces = false;
  newPlaceNumber = '';
  newPlaceType = 'STANDARD';
  isSavingPlace = false;

  private locationMap: L.Map | null = null;
  private locationMarker: L.CircleMarker | null = null;

  constructor(
    private parkingService: ParkingService,
    private fb: FormBuilder,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private navCtrl: NavController,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.initForm();
    this.loadParkings();
  }

  addPlace(): void {
    const numero = this.newPlaceNumber.trim();
    if (!this.selectedParking || !numero || this.isSavingPlace) return;

    this.isSavingPlace = true;
    this.parkingService.createPlace(this.selectedParking.id, numero, this.newPlaceType).subscribe({
      next: () => {
        this.isSavingPlace = false;
        this.newPlaceNumber = '';
        this.newPlaceType = 'STANDARD';
        this.showToast('Place ajoutée', 'success');
        this.loadPlaces(this.selectedParking.id);
        this.loadParkings();
      },
      error: err => {
        this.isSavingPlace = false;
        console.error('Erreur lors de l’ajout de la place :', err);
        this.showToast(err.error?.message || 'Erreur lors de l’ajout de la place', 'danger');
      }
    });
  }

  async confirmDeletePlace(place: Place): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Supprimer la place',
      message: `Supprimer la place ${this.getPlaceNumero(place)} ? Une place ayant un historique de réservation ne peut pas être supprimée.`,
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        {
          text: 'Supprimer',
          role: 'destructive',
          handler: () => this.deletePlace(place.id)
        }
      ]
    });
    await alert.present();
  }

  private deletePlace(placeId: number): void {
    this.parkingService.deletePlace(placeId).subscribe({
      next: () => {
        this.showToast('Place supprimée', 'warning');
        if (this.selectedParking) this.loadPlaces(this.selectedParking.id);
        this.loadParkings();
      },
      error: err => {
        console.error('Erreur lors de la suppression de la place :', err);
        this.showToast(err.error?.message || 'Erreur lors de la suppression de la place', 'danger');
      }
    });
  }

  ionViewWillEnter() {
    this.loadParkings();
  }

  ngOnDestroy(): void {
    this.destroyLocationMap();
  }

  // ── Chargement ────────────────────────────────────────────────────

  loadParkings() {
    this.isLoading = true;
    this.cdr.detectChanges();
    this.parkingService.getParkings().subscribe({
      next: (res: any) => {
        let raw: any[] = [];
        if (Array.isArray(res))                raw = res;
        else if (Array.isArray(res?.parkings)) raw = res.parkings;
        else if (Array.isArray(res?.items))    raw = res.items;
        this.parkings = raw.map((p: any) => this.normalize(p));
        if (this.selectedParking) {
          this.selectedParking = this.parkings.find(p => p.id === this.selectedParking.id) || this.selectedParking;
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('loadParkings error:', err);
        this.isLoading = false;
        this.showToast('Erreur de chargement des parkings', 'danger');
        this.cdr.detectChanges();
      }
    });
  }

  private initializeLocationMap(): void {
    const element = document.getElementById('parking-location-map');
    if (!element) return;

    const rawLatitude = this.form.get('latitude')?.value;
    const rawLongitude = this.form.get('longitude')?.value;
    const latitude = Number(rawLatitude);
    const longitude = Number(rawLongitude);
    const hasCoordinates =
      rawLatitude !== '' &&
      rawLatitude !== null &&
      rawLatitude !== undefined &&
      rawLongitude !== '' &&
      rawLongitude !== null &&
      rawLongitude !== undefined &&
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180;
    const center: L.LatLngExpression = hasCoordinates ? [latitude, longitude] : [36.8065, 10.1815];

    this.locationMap = L.map(element, { scrollWheelZoom: false }).setView(center, hasCoordinates ? 15 : 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.locationMap);

    if (hasCoordinates) this.updateLocationMarker(latitude, longitude);
    this.locationMap.on('click', event => {
      const lat = Number(event.latlng.lat.toFixed(7));
      const lng = Number(event.latlng.lng.toFixed(7));
      this.form.patchValue({ latitude: lat, longitude: lng });
      this.updateLocationMarker(lat, lng);
    });
    requestAnimationFrame(() => this.locationMap?.invalidateSize());
  }

  updateLocationFromFields(): void {
    const rawLatitude = this.form.get('latitude')?.value;
    const rawLongitude = this.form.get('longitude')?.value;
    if (rawLatitude === '' || rawLatitude == null || rawLongitude === '' || rawLongitude == null) return;
    const latitude = Number(rawLatitude);
    const longitude = Number(rawLongitude);
    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return;
    }
    this.updateLocationMarker(latitude, longitude);
    this.locationMap?.setView([latitude, longitude], this.locationMap.getZoom());
  }

  private updateLocationMarker(latitude: number, longitude: number): void {
    if (!this.locationMap) return;
    const coordinates: L.LatLngExpression = [latitude, longitude];
    if (this.locationMarker) {
      this.locationMarker.setLatLng(coordinates);
      return;
    }
    this.locationMarker = L.circleMarker(coordinates, {
      radius: 9,
      color: '#ffffff',
      weight: 3,
      fillColor: '#10b981',
      fillOpacity: 1
    }).addTo(this.locationMap);
  }

  private destroyLocationMap(): void {
    this.locationMap?.off();
    this.locationMap?.remove();
    this.locationMap = null;
    this.locationMarker = null;
  }

  loadPlaces(parkingId: number) {
    this.isLoadingPlaces = true;
    this.cdr.detectChanges();
    this.parkingService.getPlacesByParking(parkingId).subscribe({
      next: (res: any) => {
        this.places = res.places || res || [];
        this.isLoadingPlaces = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoadingPlaces = false;
        this.showToast('Erreur de chargement des places', 'danger');
        this.cdr.detectChanges();
      }
    });
  }

  // ── Formulaire ────────────────────────────────────────────────────

  initForm(p?: any) {
    this.form = this.fb.group({
      name:         [p?.name        || p?.nom            || '', Validators.required],
      address:      [p?.address     || p?.adresse        || '', Validators.required],
      description:  [p?.description || ''],
      latitude:     [p?.latitude ?? '', [Validators.required, Validators.min(-90), Validators.max(90)]],
      longitude:    [p?.longitude ?? '', [Validators.required, Validators.min(-180), Validators.max(180)]],
      pricePerHour: [p?.pricePerHour ?? p?.prix_heure    ?? '', [Validators.required, Validators.min(0)]],
      totalSpaces:  [p?.totalSpaces  || p?.places_totales || '', [Validators.required, Validators.min(1)]],
      openingTime:  [p?.openingTime  || '06:00', Validators.required],
      closingTime:  [p?.closingTime  || '23:00', Validators.required],
      imageUrl:     [p?.imageUrl     || p?.image_url     || ''],
      isCovered:    [p?.isCovered    ?? false]
    });
  }

  // ── Navigation entre vues ─────────────────────────────────────────

  showList() {
    this.destroyLocationMap();
    this.activeView = 'list';
    this.selectedParking = null;
    this.isEditing = false;
    this.editingId = null;
    this.cdr.detectChanges();
  }

  goToDashboard() {
    this.navCtrl.navigateForward('/admin/dashboard');
  }

  openAdd() {
    this.destroyLocationMap();
    this.isEditing = false;
    this.editingId = null;
    this.initForm();
    this.activeView = 'form';
    this.cdr.detectChanges();
    setTimeout(() => this.initializeLocationMap(), 100);
  }

  openEdit(p: any) {
    this.destroyLocationMap();
    this.isEditing = true;
    this.editingId = p.id;
    this.initForm(p);
    this.activeView = 'form';
    this.cdr.detectChanges();
    setTimeout(() => this.initializeLocationMap(), 100);
  }

  openDetail(p: any) {
    this.destroyLocationMap();
    this.selectedParking = p;
    this.newPlaceNumber = '';
    this.newPlaceType = 'STANDARD';
    this.activeView = 'detail';
    this.loadPlaces(p.id);
    this.cdr.detectChanges();
  }

  // ── CRUD ──────────────────────────────────────────────────────────

  save() {
    if (this.form.invalid) return;
    this.isSaving = true;
    this.cdr.detectChanges();
    const data = this.form.value;

    if (this.isEditing && this.editingId) {
      this.parkingService.updateParking(this.editingId, data).subscribe({
        next: () => {
          this.isSaving = false;
          this.destroyLocationMap();
          this.showToast('Parking mis à jour ✅', 'success');
          this.activeView = 'list';
          this.isEditing = false;
          this.editingId = null;
          this.loadParkings();
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          this.isSaving = false;
          console.error('Update error:', err);
          this.showToast('Erreur lors de la mise à jour', 'danger');
          this.cdr.detectChanges();
        }
      });
    } else {
      this.parkingService.createParking(data).subscribe({
        next: () => {
          this.isSaving = false;
          this.destroyLocationMap();
          this.showToast('Parking créé ✅', 'success');
          this.activeView = 'list';
          this.form.reset();
          this.loadParkings();
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          this.isSaving = false;
          console.error('Create error:', err);
          this.showToast('Erreur lors de la création', 'danger');
          this.cdr.detectChanges();
        }
      });
    }
  }

  async confirmDelete(p: any) {
    const alert = await this.alertCtrl.create({
      header: 'Supprimer le parking',
      message: `Supprimer "${p.name || p.nom}" ? Cette action est irréversible.`,
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        {
          text: 'Supprimer',
          role: 'destructive',
          handler: () => {
            // Suppression immédiate dans la liste locale (sans attendre le refresh)
            this.parkings = this.parkings.filter(x => x.id !== p.id);
            const wasDetail = this.activeView === 'detail' && this.selectedParking?.id === p.id;
            this.selectedParking = null;
            if (wasDetail) {
              this.activeView = 'list';
            }
            this.cdr.detectChanges();
            this.parkingService.deleteParking(p.id).subscribe({
              next: () => {
                this.showToast('Parking supprimé', 'warning');
                this.cdr.detectChanges();
              },
              error: () => {
                this.showToast('Erreur de suppression', 'danger');
                this.loadParkings();
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  changeStatutPlace(placeId: number, statut: string) {
    const place = this.places.find(pl => pl.id === placeId);
    if (place) (place as any).statut = statut;

    this.parkingService.updatePlaceStatus(placeId, statut).subscribe({
      next: () => this.showToast('Statut mis à jour', 'success'),
      error: () => {
        this.showToast('Erreur de mise à jour', 'danger');
        if (this.selectedParking) this.loadPlaces(this.selectedParking.id);
      }
    });
  }

  // ── Utilitaires ───────────────────────────────────────────────────

  normalize(p: any): any {
    return {
      ...p,
      name:            p.name            || p.nom            || '',
      address:         p.address         || p.adresse        || '',
      pricePerHour:    p.pricePerHour    ?? p.prix_heure     ?? 0,
      availableSpaces: p.availableSpaces ?? p.places_libres  ?? 0,
      totalSpaces:     p.totalSpaces     || p.places_totales || 0,
      imageUrl:        p.imageUrl        || p.image_url      || '',
      // Sans ce mapping, le formulaire d'édition se remplissait avec des
      // champs vides alors que l'information existait en base.
      description:     p.description        || '',
      openingTime:     p.openingTime        || p.heure_ouverture || '',
      closingTime:     p.closingTime        || p.heure_fermeture || '',
      isCovered:       p.isCovered          ?? p.couvert        ?? false
    };
  }

  getStatutColor(statut: string): string {
    const map: Record<string, string> = {
      libre: 'success', AVAILABLE: 'success',
      occupee: 'danger', OCCUPIED: 'danger',
      hors_service: 'medium', OUT_OF_SERVICE: 'medium'
    };
    return map[statut] || 'medium';
  }

  getStatutLabel(statut: string): string {
    const map: Record<string, string> = {
      libre: 'Libre',    AVAILABLE: 'Libre',
      occupee: 'Occupée', OCCUPIED: 'Occupée',
      hors_service: 'H.S.', OUT_OF_SERVICE: 'H.S.'
    };
    return map[statut] || statut;
  }

  getPlaceStatut(place: any): string { return place.statut    || place.status || ''; }
  getPlaceNumero(place: any): string { return place.numero    || place.number || ''; }
  getPlaceType(place: any): string   { return place.type_place || place.type  || 'Standard'; }

  async showToast(msg: string, color: string) {
    const t = await this.toastCtrl.create({ message: msg, duration: 2000, color, position: 'top' });
    t.present();
  }

  doRefresh(event: any) {
    this.loadParkings();
    setTimeout(() => event.target.complete(), 1000);
  }
}
