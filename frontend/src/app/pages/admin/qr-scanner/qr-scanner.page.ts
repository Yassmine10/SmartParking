import { Component, OnInit, OnDestroy } from '@angular/core';
import { ReservationService } from '../../../core/services/reservation.service';
import { ToastController } from '@ionic/angular';
import { Reservation } from '../../../models';

declare const Html5Qrcode: any;

@Component({
  selector: 'app-admin-qr-scanner',
  templateUrl: './qr-scanner.page.html',
  styleUrls: ['./qr-scanner.page.scss'],
  standalone: false
})
export class AdminQrScannerPage implements OnInit, OnDestroy {
  scannedReservation: Reservation | null = null;
  scanError = '';
  isScanning = false;
  isLoading = false;
  html5QrCode: any;

  constructor(
    private reservationService: ReservationService,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {}

  ngOnDestroy() { this.stopScanner(); }

  startScanner() {
    this.scannedReservation = null;
    this.scanError = '';
    this.isScanning = true;

    setTimeout(() => {
      this.html5QrCode = new Html5Qrcode('qr-reader');
      this.html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText: string) => {
          this.onQrScanned(decodedText);
        },
        (errorMessage: string) => {}
      ).catch((err: any) => {
        this.scanError = 'Impossible d\'accéder à la caméra: ' + err;
        this.isScanning = false;
      });
    }, 300);
  }

  stopScanner() {
    if (this.html5QrCode) {
      this.html5QrCode.stop().then(() => {
        this.html5QrCode.clear();
        this.isScanning = false;
      }).catch(() => { this.isScanning = false; });
    }
  }

  onQrScanned(qrData: string) {
    this.stopScanner();
    this.isLoading = true;
    this.reservationService.getReservationByQr(qrData).subscribe({
      next: (reservation: any) => {
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
      next: (updated: any) => {
        this.scannedReservation = updated;
        this.showToast('✅ Entrée validée — Réservation ACTIVE', 'success');
      },
      error: () => this.showToast('Erreur lors du check-in', 'danger')
    });
  }

  checkOut() {
    if (!this.scannedReservation) return;
    this.reservationService.checkOut(this.scannedReservation.id).subscribe({
      next: (updated: any) => {
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

  getStatusColor(status?: string) {
    if (!status) return 'medium';
    const map: any = { CONFIRMED: 'primary', ACTIVE: 'success', COMPLETED: 'medium', CANCELLED: 'danger' };
    return map[status] || 'medium';
  }

  async showToast(msg: string, color: string) {
    const t = await this.toastCtrl.create({ message: msg, duration: 3000, color, position: 'top' });
    t.present();
  }
}
