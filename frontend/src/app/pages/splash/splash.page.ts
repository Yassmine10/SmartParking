import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { StorageService } from '../../core/services/storage.service';

@Component({
  selector: 'app-splash',
  templateUrl: './splash.page.html',
  styleUrls: ['./splash.page.scss'],
  standalone: false
})
export class SplashPage implements OnInit {

  constructor(
    private router: Router,
    private storage: StorageService
  ) {}

  ngOnInit() {}

  start() {
    // Si déjà connecté → aller directement aux tabs
    const token = this.storage.getToken();
    if (token) {
      this.router.navigate(['/tabs/home'], { replaceUrl: true });
    } else {
      this.router.navigate(['/login'], { replaceUrl: true });
    }
  }
}
