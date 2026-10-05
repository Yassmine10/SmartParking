import { Component } from '@angular/core';
import { ReservationService } from '../../../core/services/reservation.service';
import { ToastController } from '@ionic/angular';
import { Reservation } from '../../../models';
import {
  CapacitorBarcodeScanner,
  CapacitorBarcodeScannerCameraDirection,
  CapacitorBarcodeScannerTypeHint
} from '@capacitor/barcode-scanner';

@Component({
  selector: 'app-admin-qr-scanner',
  templateUrl: './qr-scanner.page.html',
  styleUrls: ['./qr-scanner.page.scss'],
  standalone: false
})
export class AdminQrScannerPage {
  scannedReservation: Reservation | null = null;
  scanError = '';
  isScanning = false;
  isLoading = false;

  constructor(
    private reservationService: ReservationService,
    private toastCtrl: ToastController
  ) {}

  async startScanner(): Promise<void> {
    this.scannedReservation = null;
    this.scanError = '';
    this.isScanning = true;

    try {
      const result = await CapacitorBarcodeScanner.scanBarcode({
        hint: CapacitorBarcodeScannerTypeHint.QR_CODE,
        cameraDirection: CapacitorBarcodeScannerCameraDirection.BACK,
        scanInstructions: 'Placez le QR code dans le cadre',
        scanText: 'Scanner'
      });
      const qrData = result.ScanResult?.trim();
      if (qrData) {
        this.onQrScanned(qrData);
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.scanError = `Impossible d'accéder à la caméra ou de lire le QR code : ${detail}`;
    } finally {
      this.isScanning = false;
    }
  }

  onQrScanned(qrData: string) {
    this.isLoading = true;
    this.reservationService.getReservationByQr(qrData).subscribe({
      next: (reservation: Reservation) => {
        this.scannedReservation = reservation;
        this.isLoading = false;
      },
      error: () => {
        this.scanError = 'QR Code invalide ou réservation introuvable.';
        this.isLoading = false;
      }
    });
  }

  checkIn() {
    if (!this.scannedReservation) return;
    this.reservationService.checkIn(this.scannedReservation.id).subscribe({
      next: (updated: Reservation) => {
        this.scannedReservation = updated;
        this.showToast('✅ Entrée validée — Réservation ACTIVE', 'success');
      },
      error: () => this.showToast('Erreur lors du check-in', 'danger')
    });
  }

  checkOut() {
    if (!this.scannedReservation) return;
    this.reservationService.checkOut(this.scannedReservation.id).subscribe({
      next: (updated: Reservation) => {
        this.scannedReservation = updated;
        this.showToast('🏁 Sortie validée — Réservation TERMINÉE', 'success');
      },
      error: () => this.showToast('Erreur lors du check-out', 'danger')
    });
  }

  reset() {
    this.scannedReservation = null;
    this.scanError = '';
  }

  getStatusColor(status?: string): string {
    if (!status) return 'medium';
    const map: Record<string, string> = { CONFIRMED: 'primary', ACTIVE: 'success', COMPLETED: 'medium', CANCELLED: 'danger' };
    return map[status] || 'medium';
  }

  async showToast(msg: string, color: string) {
    const t = await this.toastCtrl.create({ message: msg, duration: 3000, color, position: 'top' });
    t.present();
  }
}
