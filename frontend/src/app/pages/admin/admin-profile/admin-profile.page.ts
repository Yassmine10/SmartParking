import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { AuthService } from '../../../core/services/auth.service';
import { StatisticsService } from '../../../core/services/statistics.service';
import { UserProfile } from '../../../models';

@Component({
  selector: 'app-admin-profile',
  templateUrl: './admin-profile.page.html',
  styleUrls: ['./admin-profile.page.scss'],
  standalone: false
})
export class AdminProfilePage implements OnInit {
  user: UserProfile | null = null;
  isEditingProfile = false;
  isChangingPassword = false;

  profileForm!: FormGroup;
  passwordForm!: FormGroup;

  stats: any = null;
  isLoadingStats = false;

  constructor(
    private authService: AuthService,
    private statisticsService: StatisticsService,
    private fb: FormBuilder,
    private router: Router,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(u => {
      this.user = u;
      if (u) {
        this.initForms(u);
      }
    });

    this.authService.getProfile().subscribe();
    this.loadStats();
  }

  initForms(user: UserProfile) {
    this.profileForm = this.fb.group({
      firstName: [user.firstName, [Validators.required]],
      lastName: [user.lastName, [Validators.required]],
      phone: [user.phone, [Validators.required]]
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  loadStats() {
    this.isLoadingStats = true;
    this.statisticsService.getDashboardStats().subscribe({
      next: (data) => {
        this.stats = data;
        this.isLoadingStats = false;
      },
      error: () => {
        this.isLoadingStats = false;
      }
    });
  }

  toggleEditProfile() {
    this.isEditingProfile = !this.isEditingProfile;
    this.cdr.detectChanges();
  }

  toggleChangePassword() {
    this.isChangingPassword = !this.isChangingPassword;
    this.cdr.detectChanges();
  }

  async saveProfile() {
    if (this.profileForm.invalid) return;

    const loading = await this.loadingCtrl.create({ message: 'Mise à jour du profil...' });
    await loading.present();

    this.authService.updateProfile(this.profileForm.value).subscribe({
      next: async (updated) => {
        await loading.dismiss();
        this.user = updated;
        this.isEditingProfile = false;
        this.cdr.detectChanges();
        const toast = await this.toastCtrl.create({
          message: 'Profil mis à jour avec succès.',
          duration: 2500,
          color: 'success'
        });
        await toast.present();
      },
      error: async (err) => {
        await loading.dismiss();
        this.cdr.detectChanges();
        const toast = await this.toastCtrl.create({
          message: err.message || 'Erreur lors de la mise à jour.',
          duration: 3000,
          color: 'danger'
        });
        await toast.present();
      }
    });
  }

  async onAvatarFileChange(event: any) {
    const file = event.target?.files?.[0];
    if (!file) return;

    // Vérification de la taille (max 2 Mo)
    if (file.size > 2 * 1024 * 1024) {
      const toast = await this.toastCtrl.create({
        message: 'L\'image ne doit pas dépasser 2 Mo.',
        duration: 3000,
        color: 'warning'
      });
      await toast.present();
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      this.updateAvatar(base64);
    };
    reader.readAsDataURL(file);
  }

  async promptAvatarUrl() {
    const alert = await this.alertCtrl.create({
      header: 'Changer de photo de profil',
      message: 'Collez le lien URL direct d\'une image ou choisissez un avatar par défaut :',
      inputs: [
        {
          name: 'avatarUrl',
          type: 'url',
          placeholder: 'https://images.unsplash.com/...',
          value: this.user?.avatarUrl || ''
        }
      ],
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        {
          text: 'Avatar Homme',
          handler: () => {
            this.updateAvatar('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80');
          }
        },
        {
          text: 'Avatar Femme',
          handler: () => {
            this.updateAvatar('https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80');
          }
        },
        {
          text: 'Enregistrer URL',
          handler: (data) => {
            if (data.avatarUrl && data.avatarUrl.trim()) {
              this.updateAvatar(data.avatarUrl.trim());
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async updateAvatar(newUrl: string) {
    const loading = await this.loadingCtrl.create({ message: 'Mise à jour de la photo...' });
    await loading.present();

    this.authService.updateProfile({ ...this.profileForm?.value, avatarUrl: newUrl }).subscribe({
      next: async (updated) => {
        await loading.dismiss();
        if (this.user) {
          this.user.avatarUrl = newUrl;
        }
        this.cdr.detectChanges();
        const toast = await this.toastCtrl.create({
          message: 'Photo de profil mise à jour ✅',
          duration: 2500,
          color: 'success'
        });
        await toast.present();
      },
      error: async (err) => {
        await loading.dismiss();
        this.cdr.detectChanges();
        const toast = await this.toastCtrl.create({
          message: err.message || 'Erreur lors du changement de photo.',
          duration: 3000,
          color: 'danger'
        });
        await toast.present();
      }
    });
  }

  async savePassword() {
    if (this.passwordForm.invalid) return;

    const loading = await this.loadingCtrl.create({ message: 'Modification du mot de passe...' });
    await loading.present();

    this.authService.changePassword(this.passwordForm.value).subscribe({
      next: async () => {
        await loading.dismiss();
        this.isChangingPassword = false;
        this.passwordForm.reset();
        const toast = await this.toastCtrl.create({
          message: 'Mot de passe modifié avec succès.',
          duration: 2500,
          color: 'success'
        });
        await toast.present();
      },
      error: async (err) => {
        await loading.dismiss();
        const toast = await this.toastCtrl.create({
          message: err.message || 'Erreur lors de la modification.',
          duration: 3000,
          color: 'danger'
        });
        await toast.present();
      }
    });
  }

  goToDashboard() {
    this.router.navigate(['/admin/dashboard']);
  }

  goToParkings() {
    this.router.navigate(['/admin/parkings']);
  }

  goToUsers() {
    this.router.navigate(['/admin/users']);
  }

  goToReservations() {
    this.router.navigate(['/admin/reservations']);
  }

  async confirmLogout() {
    const alert = await this.alertCtrl.create({
      header: 'Déconnexion',
      message: 'Voulez-vous vraiment vous déconnecter de SmartParking ?',
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        {
          text: 'Se déconnecter',
          role: 'destructive',
          handler: () => {
            this.authService.logout();
            this.router.navigate(['/login'], { replaceUrl: true });
          }
        }
      ]
    });
    await alert.present();
  }
}
