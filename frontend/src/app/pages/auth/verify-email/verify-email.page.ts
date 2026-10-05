import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, LoadingController } from '@ionic/angular';
import { AuthService } from '../../../core/services/auth.service';

/**
 * Page atteinte après l'inscription, ou après avoir cliqué sur le lien
 * reçu par email.
 *
 * Deux situations :
 *  - aucun jeton dans l'URL  -> on explique qu'il faut consulter sa boîte
 *    mail, avec un bouton pour renvoyer l'email ;
 *  - un jeton dans l'URL    -> on confirme le compte et on ouvre la session.
 */
@Component({
  selector: 'app-verify-email',
  templateUrl: './verify-email.page.html',
  styleUrls: ['./verify-email.page.scss'],
  standalone: false
})
export class VerifyEmailPage implements OnInit {
  email = '';

  etat: 'verification' | 'attente' | 'succes' | 'erreur' = 'attente';
  messageErreur = '';
  renvoiPossible = true;

  private jeton: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController
  ) {}

  async ngOnInit(): Promise<void> {
    this.jeton = this.route.snapshot.queryParamMap.get('token');

    // L'inscription redirige ici en passant l'adresse en état de navigation.
    const etatNavigation = history.state as { email?: string } | null;
    this.email = this.route.snapshot.queryParamMap.get('email')
      || etatNavigation?.email
      || '';

    if (this.jeton) {
      await this.confirmer();
    }
  }

  /** Envoie le jeton au serveur et ouvre la session en cas de succès. */
  private async confirmer(): Promise<void> {
    this.etat = 'verification';

    const loading = await this.loadingCtrl.create({ message: 'Confirmation...' });
    await loading.present();

    this.authService.verifyEmail(this.jeton!).subscribe({
      next: async () => {
        await loading.dismiss();
        this.etat = 'succes';

        const alert = await this.alertCtrl.create({
          header: 'Adresse confirmée',
          message: 'Votre compte est actif. Vous pouvez maintenant réserver une place de parking.',
          buttons: [{
            text: 'Continuer',
            handler: () => this.router.navigate(['/tabs/home'], { replaceUrl: true })
          }]
        });
        await alert.present();
      },
      error: async (erreur) => {
        await loading.dismiss();
        this.etat = 'erreur';
        this.messageErreur = erreur.error?.message || 'Ce lien de vérification n\'est plus valide.';

        // Un lien expiré ou déjà utilisé impose de repasser par l'email :
        // rendre le bouton de renvoi indispensable.
        this.renvoiPossible = true;
      }
    });
  }

  /** Renvoie l'email de vérification à l'adresse saisie. */
  async renvoyer(): Promise<void> {
    if (!this.email) {
      const alert = await this.alertCtrl.create({
        header: 'Adresse inconnue',
        message: 'Indiquez l\'adresse email utilisée lors de l\'inscription pour recevoir un nouveau lien.',
        inputs: [{ name: 'email', type: 'email', placeholder: 'vous@exemple.com' }],
        buttons: [
          { text: 'Annuler', role: 'cancel' },
          {
            text: 'Envoyer',
            handler: (donnees: { email: string }) => {
              this.email = donnees.email;
              this.appelerRenvoi(donnees.email);
            }
          }
        ]
      });
      await alert.present();
      return;
    }

    this.appelerRenvoi(this.email);
  }

  private async appelerRenvoi(email: string): Promise<void> {
    const loading = await this.loadingCtrl.create({ message: 'Envoi en cours...' });
    await loading.present();

    this.authService.resendVerification(email).subscribe({
      next: async () => {
        await loading.dismiss();
        // Le serveur répond toujours 200, y compris pour une adresse
        // inconnue : on ne peut donc pas afficher « c'est parti » comme
        // une certitude. Le message reste volontairement neutre.
        const alert = await this.alertCtrl.create({
          header: 'Email envoyé',
          message: `Si un compte non vérifié existe pour ${email}, un nouveau lien vient d\'être envoyé.`,
          buttons: ['OK']
        });
        await alert.present();
      },
      error: async (erreur) => {
        await loading.dismiss();
        const alert = await this.alertCtrl.create({
          header: 'Envoi impossible',
          message: erreur.error?.message || 'Réessayez dans quelques instants.',
          buttons: ['OK']
        });
        await alert.present();
      }
    });
  }

  allerConnexion(): void {
    this.router.navigate(['/login'], { replaceUrl: true });
  }
}