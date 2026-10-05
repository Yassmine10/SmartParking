import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { RoleGuard } from './core/guards/role.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  // ------------------------------------------------------------------
  // ROUTES PUBLIQUES
  // Accessibles sans être connecté : ce sont les pages d'arrivée quand on
  // n'est pas encore connecté, ou vers lesquelles on est renvoyé.
  // ------------------------------------------------------------------
  {
    path: 'login',
    loadChildren: () => import('./pages/auth/login/login.module').then(m => m.LoginPageModule)
  },
  {
    path: 'register',
    loadChildren: () => import('./pages/auth/register/register.module').then(m => m.RegisterPageModule)
  },
  {
    path: 'forgot-password',
    loadChildren: () => import('./pages/auth/forgot-password/forgot-password.module').then(m => m.ForgotPasswordPageModule)
  },
  {
    // Ces deux pages sont hors garde : on clique un lien reçu par email
    // alors qu'on n'est pas connecté, et c'est précisément ce lien qui
    // active le compte ou qui permet de changer de mot de passe.
    path: 'verify-email',
    loadChildren: () => import('./pages/auth/verify-email/verify-email.module').then(m => m.VerifyEmailPageModule)
  },
  {
    path: 'reset-password',
    loadChildren: () => import('./pages/auth/reset-password/reset-password.module').then(m => m.ResetPasswordPageModule)
  },
  // ------------------------------------------------------------------
  // ROUTES PROTÉGÉES
  //
  // Chaque route associe deux gardes, ce qui n'est pas redondant :
  //
  //   canMatch    -> SYNCHRONIQUE, joue avant le chargement du module.
  //                 Si l'utilisateur n'a pas le droit d'accéder, le fichier
  //                 JS de la page n'est même pas téléchargé. C'est ce
  //                 qui remplace l'ancien canLoad, déprécié depuis
  //                 Angular 14.
  //
  //   canActivate -> joue APRÈS, une fois la page affichée. Pour le rôle,
  //                 c'est le seul contrôle fiable : le rôle stocké dans
  //                 le navigateur n'est qu'une copie, il peut avoir été
  //                 modifié à la main. RoleGuard.canActivate interroge
  //                 donc le serveur (GET /api/auth/profile).
  // ------------------------------------------------------------------
  {
    path: 'tabs',
    canMatch: [AuthGuard],
    canActivate: [AuthGuard],
    loadChildren: () => import('./pages/tabs/tabs.module').then(m => m.TabsPageModule)
  },
  {
    path: 'parking-details/:id',
    canMatch: [AuthGuard],
    canActivate: [AuthGuard],
    loadChildren: () => import('./pages/parking-details/parking-details.module').then(m => m.ParkingDetailsPageModule)
  },
  {
    path: 'reservation-flow/:parkingId',
    canMatch: [AuthGuard],
    canActivate: [AuthGuard],
    loadChildren: () => import('./pages/reservation-flow/reservation-flow.module').then(m => m.ReservationFlowPageModule)
  },
  {
    path: 'reservation-details/:id',
    canMatch: [AuthGuard],
    canActivate: [AuthGuard],
    loadChildren: () => import('./pages/reservation-details/reservation-details.module').then(m => m.ReservationDetailsPageModule)
  },
  {
    path: 'search',
    canMatch: [AuthGuard],
    canActivate: [AuthGuard],
    loadChildren: () => import('./pages/search/search.module').then(m => m.SearchPageModule)
  },
  {
    // Espace du gestionnaire : AuthGuard vérifie la connexion,
    // RoleGuard vérifie que le rôle est bien 'manager'.
    path: 'admin',
    canMatch: [AuthGuard, RoleGuard],
    canActivate: [AuthGuard, RoleGuard],
    data: { role: 'manager' },
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadChildren: () => import('./pages/admin/dashboard/dashboard.module').then(m => m.DashboardPageModule)
      },
      {
        path: 'parkings',
        loadChildren: () => import('./pages/admin/parkings/parkings.module').then(m => m.AdminParkingsPageModule)
      },
      {
        path: 'reservations',
        loadChildren: () => import('./pages/admin/reservations/reservations.module').then(m => m.AdminReservationsPageModule)
      },
      {
        path: 'users',
        loadChildren: () => import('./pages/admin/users/users.module').then(m => m.AdminUsersPageModule)
      },
      {
        path: 'qr-scanner',
        loadChildren: () => import('./pages/admin/qr-scanner/qr-scanner.module').then(m => m.AdminQrScannerPageModule)
      },
      {
        path: 'admin-profile',
        loadChildren: () => import('./pages/admin/admin-profile/admin-profile.module').then(m => m.AdminProfilePageModule)
      },
      {
        path: 'profile',
        loadChildren: () => import('./pages/profile/profile.module').then(m => m.ProfilePageModule)
      }
    ]
  }
];

@NgModule({
  // Pas de préchargement global : les routes canMatch refusées ne doivent
  // pas télécharger leurs modules avant la vérification d'accès.
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
