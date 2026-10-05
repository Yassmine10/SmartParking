import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NavController } from '@ionic/angular';
import { ParkingService } from '../../../core/services/parking.service';
import { Parking, Place } from '../../../models';
import { AlertController, ToastController } from '@ionic/angular';

type View = 'list' | 'form' | 'detail';

@Component({
  selector: 'app-admin-parkings',
  templateUrl: './parkings.page.html',
  styleUrls: ['./parkings.page.scss'],
  standalone: false
})
export class AdminParkingsPage implements OnInit {

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

  ionViewWillEnter() {
    this.loadParkings();
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
      latitude:     [p?.latitude    || '', Validators.required],
      longitude:    [p?.longitude   || '', Validators.required],
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
    this.isEditing = false;
    this.editingId = null;
    this.initForm();
    this.activeView = 'form';
    this.cdr.detectChanges();
  }

  openEdit(p: any) {
    this.isEditing = true;
    this.editingId = p.id;
    this.initForm(p);
    this.activeView = 'form';
    this.cdr.detectChanges();
  }

  openDetail(p: any) {
    this.selectedParking = p;
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
