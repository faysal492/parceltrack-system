import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Parcel } from './entities/parcel.entity';

@Injectable()
export class RouteOptimizationService {
  private readonly apiKey: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY') || '';
  }

  async getRoute(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
  ): Promise<any> {
    try {
      const response = await axios.get(
        'https://maps.googleapis.com/maps/api/directions/json',
        {
          params: {
            origin: `${origin.lat},${origin.lng}`,
            destination: `${destination.lat},${destination.lng}`,
            key: this.apiKey,
          },
        },
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching route:', error);
      throw error;
    }
  }

  async getOptimizedRoute(parcels: Parcel[], agentLocation: { lat: number; lng: number }): Promise<any> {
    if (parcels.length === 0) {
      return { routes: [] };
    }

    const waypoints = parcels.map(
      (parcel) => `${parcel.deliveryLatitude},${parcel.deliveryLongitude}`,
    );

    try {
      const response = await axios.get(
        'https://maps.googleapis.com/maps/api/directions/json',
        {
          params: {
            origin: `${agentLocation.lat},${agentLocation.lng}`,
            destination: waypoints[waypoints.length - 1],
            waypoints: waypoints.slice(0, -1).join('|'),
            optimize: true,
            key: this.apiKey,
          },
        },
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching optimized route:', error);
      throw error;
    }
  }
}

