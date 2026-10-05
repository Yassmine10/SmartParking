import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

// Composants partagés
import { ParkingCardComponent } from './components/parking-card/parking-card.component';
import { ModalReservationComponent } from './components/modal-reservation/modal-reservation.component';
import { AdminTabBarComponent } from './components/admin-tab-bar/admin-tab-bar.component';

// Pipes personnalisés
import { StatutPlacePipe } from './pipes/statut-place.pipe';

/**
 * Module partagé — contient les composants et pipes réutilisables
 * dans toute l'application.
 */
@NgModule({
  declarations: [
    ParkingCardComponent,      // Composant carte de parking (@Input/@Output)
    ModalReservationComponent, // Modal de réservation (Template-Driven Form)
    AdminTabBarComponent,      // Barre de navigation inférieure Admin
    StatutPlacePipe            // Pipe personnalisé : statut → label français
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule
  ],
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    ParkingCardComponent,
    ModalReservationComponent,
    AdminTabBarComponent,
    StatutPlacePipe
  ]
})
export class SharedModule {}
