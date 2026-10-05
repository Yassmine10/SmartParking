import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Parking } from '../../../models';

/**
 * Composant réutilisable : carte d'affichage d'un parking
 * Utilise @Input pour recevoir les données et @Output pour émettre des événements
 *
 * Utilisation :
 * <app-parking-card [parking]="parking" (voirDetails)="allerVersDetails($event)">
 * </app-parking-card>
 */
@Component({
  selector: 'app-parking-card',
  templateUrl: './parking-card.component.html',
  styleUrls: ['./parking-card.component.scss'],
  standalone: false  // Utilise le système NgModule (pas standalone)
})
export class ParkingCardComponent {

  // @Input : reçoit l'objet parking depuis le composant parent
  @Input() parking!: Parking;

  // @Input : optionnel — affiche la distance si fournie
  @Input() distance?: number;

  // @Input : affiche ou non le bouton "Voir détails" (par défaut true)
  @Input() afficherBouton: boolean = true;

  // @Output : émet l'événement quand l'utilisateur clique sur "Voir détails"
  @Output() voirDetails = new EventEmitter<Parking>();

  /**
   * Émet l'événement "voirDetails" avec l'objet parking
   * Le composant parent peut s'abonner : (voirDetails)="maFonction($event)"
   */
  onVoirDetails(): void {
    this.voirDetails.emit(this.parking);
  }

  get totalPlaces(): number {
    return this.parking?.places_totales || this.parking?.total_places || this.parking?.totalSpaces || 0;
  }

  get placesLibres(): number {
    return this.parking?.places_libres ?? this.parking?.availableSpaces ?? 0;
  }

  /**
   * Calcule le pourcentage de places libres pour la barre de progression
   */
  get pourcentageLibre(): number {
    const total = this.totalPlaces;
    if (!total || total === 0) return 0;
    return Math.round((this.placesLibres / total) * 100);
  }

  /**
   * Détermine la couleur selon la disponibilité
   */
  get couleurDisponibilite(): string {
    const pct = this.pourcentageLibre;
    if (pct > 50) return 'success';
    if (pct > 20) return 'warning';
    return 'danger';
  }

  /**
   * Formate la distance en texte lisible.
   * Le backend renvoie PostgreSQL les colonnes NUMERIC sous forme de
   * chaînes ("0.58") : sans conversion en nombre, toFixed() n'existe pas
   * et la carte distance affiche une erreur.
   */
  get distanceTexte(): string {
    const brut = this.distance ?? this.parking?.distance_km ?? this.parking?.distanceInKm;
    const dist = Number(brut);
    if (brut === undefined || brut === null || isNaN(dist)) return '';
    if (dist < 1) {
      return `${Math.round(dist * 1000)} m`;
    }
    return `${dist.toFixed(1)} km`;
  }
}
