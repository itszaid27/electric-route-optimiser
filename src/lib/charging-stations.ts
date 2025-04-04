import { supabase } from './supabase';
import type { ChargingStation, Location } from '../types';

export async function findNearbyChargingStations(
  location: Location,
  radiusKm: number
): Promise<ChargingStation[]> {
  const { data, error } = await supabase
    .rpc('nearby_charging_stations', {
      latitude: location.lat,
      longitude: location.lng,
      radius_km: radiusKm,
    });

  if (error) throw error;
  return data;
}

export async function getChargingStationDetails(id: string): Promise<ChargingStation> {
  const { data, error } = await supabase
    .from('charging_stations')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}