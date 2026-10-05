import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { StatisticsService } from '../../../core/services/statistics.service';
import { AuthService } from '../../../core/services/auth.service';
import { DashboardStats, DailyStats } from '../../../models';
import { AlertController, NavController } from '@ionic/angular';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: false
})
export class DashboardPage implements OnInit, AfterViewInit {

  @ViewChild('miniBarChart')    miniBarChartRef!: ElementRef;
  @ViewChild('occupancyChart')  occupancyChartRef!: ElementRef;
  @ViewChild('revenueChart')    revenueChartRef!: ElementRef;

  stats: DashboardStats = {
    totalParkings: 0, totalSpaces: 0,
    availableSpaces: 0, occupiedSpaces: 0,
    todayReservations: 0, todayRevenue: 0,
    occupancyRate: 0, dailyStats: []
  };

  isLoading = true;
  /** true si le chargement a échoué : on affiche un message, jamais de faux chiffres. */
  erreurChargement = false;
  currentUser: any = null;
  activePeriod: '7j' | '30j' | '3m' = '30j';

  /**
   * Tendance calculée à partir des données réelles (7 derniers jours) :
   * écart en % entre la période récente et la période précédente.
   * null si l'historique est insuffisant pour un calcul significatif.
   */
  trendOccupancy: number | null = null;
  trendRevenue: number | null = null;

  private miniChart:      any = null;
  private occupancyChart: any = null;
  private revenueChart:   any = null;

  constructor(
    private statisticsService: StatisticsService,
    private authService: AuthService,
    private navCtrl: NavController,
    private alertCtrl: AlertController,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.currentUserValue;
    this.loadStats();
  }

  ionViewWillEnter() {
    this.loadStats();
  }

  ngAfterViewInit() {}

  setPeriod(p: '7j' | '30j' | '3m') {
    this.activePeriod = p;
    this.loadStats();
  }

  loadStats() {
    this.isLoading = true;
    this.erreurChargement = false;
    this.statisticsService.getDashboardStats().subscribe({
      next: (data) => {
        this.stats = data;
        this.calculerTendances();
        this.isLoading = false;
        this.cdr.detectChanges();
        setTimeout(() => this.renderCharts(), 200);
      },
      error: (err) => {
        // Aucune donnée fictive de remplacement : l'administrateur doit
        // voir l'échec plutôt que des chiffres inventés présentés comme réels.
        console.error('Erreur de chargement des statistiques :', err);
        this.stats = {
          totalParkings: 0, totalSpaces: 0,
          availableSpaces: 0, occupiedSpaces: 0,
          todayReservations: 0, todayRevenue: 0,
          occupancyRate: 0, dailyStats: [], occupancyByHour: []
        };
        this.trendOccupancy = null;
        this.trendRevenue = null;
        this.erreurChargement = true;
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Compare les 3 derniers jours aux 3 précédents (réservations et revenus)
   * pour obtenir une tendance réellement calculée.
   */
  private calculerTendances() {
    const jours = this.stats.dailyStats || [];

    if (jours.length < 4) {
      this.trendOccupancy = null;
      this.trendRevenue = null;
      return;
    }

    const recent = jours.slice(-3);
    const precedent = jours.slice(-6, -3);

    const somme = (list: DailyStats[], cle: 'reservations' | 'revenue') =>
      list.reduce((acc, j) => acc + (Number(j[cle]) || 0), 0);

    this.trendOccupancy = this.ecartPct(somme(recent, 'reservations'), somme(precedent, 'reservations'));
    this.trendRevenue   = this.ecartPct(somme(recent, 'revenue'), somme(precedent, 'revenue'));
  }

  /** Écart en pourcentage, ou null si la base de comparaison est nulle. */
  private ecartPct(recent: number, precedent: number): number | null {
    if (precedent <= 0) return null;
    return Math.round(((recent - precedent) / precedent) * 1000) / 10;
  }

  renderCharts() {
    this.renderMiniBar();
    this.renderOccupancyBar();
    this.renderRevenueLine();
  }

  private renderMiniBar() {
    if (!this.miniBarChartRef?.nativeElement) return;
    if (this.miniChart) this.miniChart.destroy();

    // Mini bar chart dans la ligne "Réservations" — 7 barres
    const vals = (this.stats.dailyStats || []).map((d: DailyStats) => d.reservations);
    this.miniChart = new Chart(this.miniBarChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: (this.stats.dailyStats || []).map((d: DailyStats) => d.date),
        datasets: [{
          data: vals,
          backgroundColor: vals.map((v, i) =>
            i === vals.length - 1 ? '#16a34a' : 'rgba(134,239,172,0.6)'
          ),
          borderRadius: 4,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { display: false },
          y: { display: false, beginAtZero: true }
        }
      }
    });
  }

  private renderOccupancyBar() {
    if (!this.occupancyChartRef?.nativeElement) return;
    if (this.occupancyChart) this.occupancyChart.destroy();

    // Données réelles fournies par le backend (GET /api/stats/dashboard)
    const parHeure = this.stats.occupancyByHour || [];
    const labels   = parHeure.map(h => h.heure);
    const valeurs  = parHeure.map(h => h.value);

    this.occupancyChart = new Chart(this.occupancyChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data: valeurs,
          backgroundColor: valeurs.map((v, i) =>
            v === Math.max(...valeurs) && v > 0 ? '#16a34a' : 'rgba(134,239,172,0.5)'
          ),
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 10 }, color: '#94a3b8' }
          },
          y: { display: false, beginAtZero: true }
        }
      }
    });
  }

  private renderRevenueLine() {
    if (!this.revenueChartRef?.nativeElement) return;
    if (this.revenueChart) this.revenueChart.destroy();

    const labels   = (this.stats.dailyStats || []).map((d: DailyStats) => d.date);
    const revenues = (this.stats.dailyStats || []).map((d: DailyStats) => d.revenue);

    this.revenueChart = new Chart(this.revenueChartRef.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: revenues,
          borderColor: '#16a34a',
          backgroundColor: 'rgba(22,163,74,0.12)',
          fill: true,
          tension: 0.5,
          pointRadius: 0,
          borderWidth: 2.5
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 10 }, color: '#94a3b8' }
          },
          y: { display: false, beginAtZero: true }
        }
      }
    });
  }

  navigate(path: string)  { this.navCtrl.navigateForward(path); }
  goToProfile()           { this.navCtrl.navigateForward('/admin/profile'); }

  async confirmLogout() {
    const alert = await this.alertCtrl.create({
      header: 'Déconnexion',
      message: 'Voulez-vous vraiment vous déconnecter ?',
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        { text: 'Se déconnecter', role: 'destructive',
          handler: () => this.authService.logout() }
      ]
    });
    await alert.present();
  }

  doRefresh(event?: any) {
    this.loadStats();
    if (event?.target?.complete) setTimeout(() => event.target.complete(), 1500);
  }
}
