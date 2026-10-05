import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { SharedModule } from '../../../shared/shared.module';
import { AdminProfilePage } from './admin-profile.page';

const routes: Routes = [{ path: '', component: AdminProfilePage }];

@NgModule({
  imports: [CommonModule, ReactiveFormsModule, FormsModule, IonicModule, SharedModule, RouterModule.forChild(routes)],
  declarations: [AdminProfilePage]
})
export class AdminProfilePageModule {}
