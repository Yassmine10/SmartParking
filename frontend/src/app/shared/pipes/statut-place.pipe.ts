import { Pipe, PipeTransform } from '@angular/core';
import { StatutPlace } from '../../models';

/**
 * Pipe personnalisé — convertit le statut technique d'une place
 * en label lisible en français avec une icône.
 *
 * Utilisation dans le template : {{ place.statut | statutPlace }}
 * Exemple : 'libre' → '🟢 Libre'
 */
@Pipe({
  name: 'statutPlace',
  pure: true,
  standalone: false
})
export class StatutPlacePipe implements PipeTransform {

  transform(statut: StatutPlace | string | undefined | null): string {
    if (!statut) return 'Inconnu';

    const val = typeof statut === 'string' ? statut.toLowerCase() : statut;
    switch (val) {
      case 'libre':
      case StatutPlace.LIBRE:
        return '🟢 Libre';
      case 'occupee':
      case 'occupe':
      case StatutPlace.OCCUPEE:
        return '🔴 Occupée';
      case 'hors_service':
      case StatutPlace.HORS_SERVICE:
        return '🔧 Hors service';
      default:
        return String(statut);
    }
  }
}
