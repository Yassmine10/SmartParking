import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';

import { ReservationFlowPage } from './reservation-flow.page';

const routes: Routes = [
  {
    path: '',
    component: ReservationFlowPage
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes)
  ],
  declarations: [ReservationFlowPage]
})
export class ReservationFlowPageModule {}
