import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';

import { ReservationDetailsPage } from './reservation-details.page';

const routes: Routes = [
  {
    path: '',
    component: ReservationDetailsPage
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes)
  ],
  declarations: [ReservationDetailsPage]
})
export class ReservationDetailsPageModule {}
