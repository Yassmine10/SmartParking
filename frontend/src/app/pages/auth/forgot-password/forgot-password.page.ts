import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController, ToastController } from '@ionic/angular';
import { AuthService } from '../../../core/services/auth.service';

/**
 * Demande de réinitialisation.
 *
 * Cette page ne fait QUE déclencher l'envoi d'un email. Le changement de mot
 * passe se fait depuis le lien reçu, sur la page « reset-password » : ce
 * lien transporte un jeton secret à usage unique, ce qu'aucun code saisi
 * dans un formulaire ne pouvait garantir.
 */
@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  standalone: false
})
export class ForgotPasswordPage implements OnInit {
  forgotForm!: FormGroup;
  emailEnvoye = false;
  adresseEnvoyee = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit(): void {
    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  get email() { return this.forgotForm.get('email'); }

  async onSubmit(): Promise<void> {
    if (this.forgotForm.invalid) {
      this.forgotForm.markAllAsTouched();
      return;
    }

    const loading = await this.loadingCtrl.create({ message: 'Envoi en cours...' });
    await loading.present();

    const adresse = this.forgotForm.value.email;

    this.authService.forgotPassword(adresse).subscribe({
      next: async () => {
        await loading.dismiss();
        this.adresseEnvoyee = adresse;
        this.emailEnvoye = true;
      },
      error: async (erreur) => {
        await loading.dismiss();
        const toast = await this.toastCtrl.create({
          message: erreur.error?.message || 'Erreur lors de la demande de réinitialisation.',
          duration: 3000,
          color: 'danger'
        });
        await toast.present();
      }
    });
  }

  /** Permet de corriger une adresse mal saisie sans quitter la page. */
  recommencer(): void {
    this.emailEnvoye = false;
    this.adresseEnvoyee = '';
    this.forgotForm.reset();
  }

  allerConnexion(): void {
    this.router.navigate(['/login'], { replaceUrl: true });
  }
}