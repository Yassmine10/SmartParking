import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { SharedModule } from '../../../shared/shared.module';
import { AdminQrScannerPage } from './qr-scanner.page';

const routes: Routes = [{ path: '', component: AdminQrScannerPage }];

@NgModule({
  imports: [CommonModule, IonicModule, SharedModule, RouterModule.forChild(routes)],
  declarations: [AdminQrScannerPage]
})
export class AdminQrScannerPageModule {}
