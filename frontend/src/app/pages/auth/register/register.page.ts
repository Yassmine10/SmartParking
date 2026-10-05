import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, LoadingController } from '@ionic/angular';
import { AuthService } from '../../../core/services/auth.service';

/**
 * Page d'inscription avec formulaire réactif.
 *
 * Aucun choix de rôle n'est proposé : le serveur attribue toujours le rôle
 * 'user' à l'inscription. La promotion en administrateur ('manager') est
 * réservée à un gestionnaire existant, via Admin → Utilisateurs.
 */
@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false
})
export class RegisterPage implements OnInit {
  registerForm!: FormGroup;
  afficherMotDePasse = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController
  ) {}

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email]],
      mot_de_passe: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  get nom() { return this.registerForm.get('nom'); }
  get email() { return this.registerForm.get('email'); }
  get mot_de_passe() { return this.registerForm.get('mot_de_passe'); }

  toggleMotDePasse(): void {
    this.afficherMotDePasse = !this.afficherMotDePasse;
  }

  async onRegister(): Promise<void> {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Création de votre compte...',
      spinner: 'crescent'
    });
    await loading.present();

    const { nom, email, mot_de_passe } = this.registerForm.value;

    this.authService.register({ nom, email, mot_de_passe }).subscribe({
      next: async (res) => {
        await loading.dismiss();

        if (res.succes) {
          // Le compte existe mais n'est pas encore actif : on envoie
          // l'utilisateur vérifier son adresse avant de pouvoir se connecter.
          // On ne le connecte pas ici, le serveur ne renvoie d'ailleurs
          // aucun jeton à ce stade.
          const alert = await this.alertCtrl.create({
            header: 'Compte créé',
            message: res.message || 'Un email de confirmation vous a été envoyé.',
            buttons: [
              {
                text: 'Continuer',
                handler: () => {
                  this.router.navigate(['/verify-email'], {
                    state: { email },
                    replaceUrl: true
                  });
                }
              }
            ]
          });
          await alert.present();
        }
      },
      error: async (err) => {
        await loading.dismiss();
        const alert = await this.alertCtrl.create({
          header: "Erreur d'inscription",
          message: err.error?.message || err.message || "Impossible de créer le compte.",
          buttons: ['OK']
        });
        await alert.present();
      }
    });
  }
}
