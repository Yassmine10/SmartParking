import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { SharedModule } from '../../../shared/shared.module';
import { DashboardPage } from './dashboard.page';

const routes: Routes = [{ path: '', component: DashboardPage }];

@NgModule({
  imports: [CommonModule, IonicModule, SharedModule, RouterModule.forChild(routes)],
  declarations: [DashboardPage],
  providers: []
})
export class DashboardPageModule {}
