import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ReservationsPage } from './reservations.page';
import { SharedModule } from '../../shared/shared.module';

const routes: Routes = [
  {
    path: '',
    component: ReservationsPage
  }
];

@NgModule({
  imports: [
    SharedModule,
    RouterModule.forChild(routes)
  ],
  declarations: [ReservationsPage]
})
export class ReservationsPageModule {}
