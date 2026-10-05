import { Injectable } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';

export interface UserCoordinates {
  latitude: number;
  longitude: number;
}

@Injectable({
  providedIn: 'root'
})
export class GeolocationService {
  // Default coordinates: Tunis Centre (Avenue Habib Bourguiba)
  private defaultCoords: UserCoordinates = {
    latitude: 36.8008,
    longitude: 10.1800
  };

  async getCurrentPosition(): Promise<UserCoordinates> {
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };
    } catch (err) {
      console.warn('Capacitor Geolocation failed, trying browser navigator or fallback:', err);
      return new Promise<UserCoordinates>((resolve) => {
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              resolve({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude
              });
            },
            () => resolve(this.defaultCoords),
            { timeout: 5000 }
          );
        } else {
          resolve(this.defaultCoords);
        }
      });
    }
  }
}
