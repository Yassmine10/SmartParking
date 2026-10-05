import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, LoadingController } from '@ionic/angular';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

/**
 * Page de connexion — utilise un formulaire RÉACTIF (reactive form)
 * comme demandé dans les notions du cours
 */
@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage implements OnInit {

  // Formulaire réactif avec validation
  loginForm!: FormGroup;

  // Contrôle l'affichage du mot de passe
  afficherMotDePasse = false;

  /**
   * Les identifiants de démonstration ne doivent jamais être visibles en
   * production : les afficher constituerait une divulgation d'identifiants
   * sur un écran accessible à toute personne ouvrant l'application.
   */
  readonly afficherComptesTest = !environment.production;

  constructor(
    private fb: FormBuilder,           // FormBuilder pour créer le formulaire réactif
    private authService: AuthService,  // Service d'authentification
    private router: Router,            // Navigation
    private alertCtrl: AlertController,   // Alertes Ionic
    private loadingCtrl: LoadingController // Indicateur de chargement
  ) {}

  ngOnInit(): void {
    // Initialisation du formulaire réactif avec validators
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      mot_de_passe: ['', [Validators.required, Validators.minLength(6)]]
    });

    // Si déjà connecté, rediriger
    if (this.authService.isAuthenticated()) {
      this.redirigerSelonRole();
    }
  }

  // Accesseurs pratiques pour les champs du formulaire
  get email() { return this.loginForm.get('email'); }
  get mot_de_passe() { return this.loginForm.get('mot_de_passe'); }

  /**
   * Soumission du formulaire de connexion
   */
  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) return;

    // Afficher l'indicateur de chargement
    const loading = await this.loadingCtrl.create({
      message: 'Connexion en cours...',
      spinner: 'crescent'
    });
    await loading.present();

    const { email, mot_de_passe } = this.loginForm.value;

    // Appel au service d'authentification (Observable)
    this.authService.login({ email, mot_de_passe }).subscribe({
      next: async (reponse) => {
        await loading.dismiss();
        if (reponse.succes) {
          this.redirigerSelonRole();
        }
      },
      error: async (erreur) => {
        await loading.dismiss();

        // Compte existant mais adresse email jamais confirmée : ce n'est pas
        // une erreur de saisie, proposer le renvoi du lien de vérification.
        if (erreur.error?.code === 'EMAIL_NON_VERIFIE') {
          await this.proposerVerification(erreur.error.email || email);
          return;
        }

        const alert = await this.alertCtrl.create({
          header: 'Erreur de connexion',
          message: erreur.error?.message || 'Email ou mot de passe incorrect.',
          buttons: ['OK']
        });
        await alert.present();
      },
      complete: () => {
        console.log('Connexion terminée');
      }
    });
  }

  /**
   * Affiche le renvoi de l'email de vérification pour un compte non activé.
   * Le message reste volontairement neutre : le serveur répond de la même
   * façon pour une adresse inconnue, révéler la différence permettrait
   * d'énumérer les comptes inscrits.
   */
  private async proposerVerification(email: string): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Adresse email non confirmée',
      message: `Votre compte ${email} n'est pas encore activé. Souhaitez-vous recevoir un nouveau lien de confirmation ?`,
      buttons: [
        {
          text: 'Plus tard',
          role: 'cancel'
        },
        {
          text: 'Renvoyer',
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

  /**
   * Redirige selon le rôle de l'utilisateur connecté
   */
  private redirigerSelonRole(): void {
    if (this.authService.isManager()) {
      this.router.navigate(['/admin/dashboard'], { replaceUrl: true });
    } else {
      this.router.navigate(['/tabs/home'], { replaceUrl: true });
    }
  }

  /**
   * Bascule l'affichage du mot de passe
   */
  toggleMotDePasse(): void {
    this.afficherMotDePasse = !this.afficherMotDePasse;
  }
}
