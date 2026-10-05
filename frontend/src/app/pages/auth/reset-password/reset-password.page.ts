import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, LoadingController } from '@ionic/angular';
import { AuthService } from '../../../core/services/auth.service';

/**
 * Page de choix d'un nouveau mot de passe, atteinte en cliquant sur le lien
 * reçu par email. Le jeton voyage dans l'URL et n'est utilisé qu'ici.
 */
@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.page.html',
  styleUrls: ['reset-password.page.scss'],
  standalone: false
})
export class ResetPasswordPage implements OnInit {
  resetForm!: FormGroup;
  afficherMotDePasse = false;

  etat: 'verification' | 'pret' | 'succes' | 'erreur' = 'verification';
  messageErreur = '';

  private jeton: string | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController
  ) {}

  async ngOnInit(): Promise<void> {
    this.resetForm = this.fb.group({
      nouveau_mot_de_passe: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
      confirmation: ['', [Validators.required]]
    }, { validators: this.motsDePasseIdentiques.bind(this) });

    this.jeton = this.route.snapshot.queryParamMap.get('token');

    if (!this.jeton) {
      // Lien ouvert sans jeton : impossible de savoir quoi changer.
      this.etat = 'erreur';
      this.messageErreur = 'Ce lien est incomplet. Demandez-en un nouveau depuis « Mot de passe oublié ».';
      return;
    }

    // Le lien peut avoir expiré ou déjà été utilisé : on le signale tout de
    // suite plutôt que de laisser l'utilisateur remplir un formulaire pour
    // le découvrir au moment de valider.
    const loading = await this.loadingCtrl.create({ message: 'Vérification du lien...' });
    await loading.present();

    this.authService.checkResetToken(this.jeton).subscribe({
      next: async () => {
        await loading.dismiss();
        this.etat = 'pret';
      },
      error: async (erreur) => {
        await loading.dismiss();
        this.etat = 'erreur';
        this.messageErreur = erreur.error?.message || 'Ce lien n\'est plus valide.';
      }
    });
  }

  /** Les deux saisies doivent correspondre, sinon le mot de passe serait
   *  difficile à retrouver et l'utilisateur perdrait l'accès au compte. */
  private motsDePasseIdentiques(group: FormGroup): { mismatch: true } | null {
    const mdp = group.get('nouveau_mot_de_passe')?.value;
    const confirmation = group.get('confirmation')?.value;
    return mdp && confirmation && mdp !== confirmation ? { mismatch: true } : null;
  }

  get nouveauMotDePasse() { return this.resetForm.get('nouveau_mot_de_passe'); }
  get confirmation() { return this.resetForm.get('confirmation'); }

  toggleMotDePasse(): void {
    this.afficherMotDePasse = !this.afficherMotDePasse;
  }

  async onSubmit(): Promise<void> {
    if (this.resetForm.invalid || !this.jeton) {
      this.resetForm.markAllAsTouched();
      return;
    }

    const loading = await this.loadingCtrl.create({ message: 'Mise à jour...' });
    await loading.present();

    const { nouveau_mot_de_passe } = this.resetForm.value;

    this.authService.resetPassword(this.jeton, nouveau_mot_de_passe).subscribe({
      next: async () => {
        await loading.dismiss();
        this.etat = 'succes';

        const alert = await this.alertCtrl.create({
          header: 'Mot de passe mis à jour',
          message: 'Vous pouvez vous connecter avec votre nouveau mot de passe.',
          buttons: [{
            text: 'Se connecter',
            handler: () => this.router.navigate(['/login'], { replaceUrl: true })
          }]
        });
        await alert.present();
      },
      error: async (erreur) => {
        await loading.dismiss();
        this.etat = 'erreur';
        this.messageErreur = erreur.error?.message || 'Impossible de réinitialiser le mot de passe.';
      }
    });
  }

  redemander(): void {
    this.router.navigate(['/forgot-password'], { replaceUrl: true });
  }

  allerConnexion(): void {
    this.router.navigate(['/login'], { replaceUrl: true });
  }
}