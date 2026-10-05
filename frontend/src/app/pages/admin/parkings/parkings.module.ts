import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { SharedModule } from '../../../shared/shared.module';
import { AdminParkingsPage } from './parkings.page';

const routes: Routes = [{ path: '', component: AdminParkingsPage }];

@NgModule({
  imports: [CommonModule, ReactiveFormsModule, FormsModule, IonicModule, SharedModule, RouterModule.forChild(routes)],
  declarations: [AdminParkingsPage]
})
export class AdminParkingsPageModule {}
