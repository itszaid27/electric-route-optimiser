import type { EVDetails, Location, RouteDetails, ChargingStation } from '../types';
import { findNearbyChargingStations } from './charging-stations';

const SAFETY_MARGIN = 0.9; // 90% of actual range to account for weather, traffic, etc.
const SEARCH_RADIUS_KM = 20;

export async function optimizeRoute(
  start: Location,
  end: Location,
  evDetails: EVDetails
): Promise<RouteDetails> {
  // Calculate actual range based on current battery percentage
  const actualRange = evDetails.range * (evDetails.batteryPercentage / 100) * SAFETY_MARGIN;
  
  // Get the total route distance (this would normally come from Google Maps API)
  const directDistance = calculateDistance(start, end);
  
  if (directDistance <= actualRange) {
    // No charging stops needed
    return {
      distance: directDistance,
      duration: estimateDuration(directDistance),
      chargingStops: [],
      totalCost: 0,
      path: [start, end],
    };
  }

  // Find charging stations along the route
  const stations = await findChargingStationsAlongRoute(start, end);
  
  // Calculate optimal charging stops
  const { stops, totalDistance, totalDuration, totalCost } = calculateOptimalStops(
    start,
    end,
    stations,
    evDetails
  );

  return {
    distance: totalDistance,
    duration: totalDuration,
    chargingStops: stops,
    totalCost,
    path: [start, ...stops.map(stop => stop.location), end],
  };
}

function calculateDistance(point1: Location, point2: Location): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(point2.lat - point1.lat);
  const dLon = toRad(point2.lng - point1.lng);
  const lat1 = toRad(point1.lat);
  const lat2 = toRad(point2.lat);

  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * Math.PI / 180;
}

function estimateDuration(distance: number): number {
  const avgSpeedKmh = 80;
  return (distance / avgSpeedKmh) * 60; // Duration in minutes
}

async function findChargingStationsAlongRoute(
  start: Location,
  end: Location
): Promise<ChargingStation[]> {
  // In a real application, we would use more sophisticated path finding
  // For now, we'll just search near the midpoint
  const midpoint: Location = {
    lat: (start.lat + end.lat) / 2,
    lng: (start.lng + end.lng) / 2,
    address: '',
  };

  return findNearbyChargingStations(midpoint, SEARCH_RADIUS_KM);
}

function calculateOptimalStops(
  start: Location,
  end: Location,
  stations: ChargingStation[],
  evDetails: EVDetails
): {
  stops: ChargingStation[];
  totalDistance: number;
  totalDuration: number;
  totalCost: number;
} {
  // This is a simplified version. In a real application, we would use
  // more sophisticated algorithms (e.g., dynamic programming) to find
  // the optimal combination of stops
  
  const sortedStations = stations.sort((a, b) => 
    calculateDistance(start, a.location) - calculateDistance(start, b.location)
  );

  const selectedStops = sortedStations.slice(0, 1); // For demo, just take the first station
  const totalDistance = calculateDistance(start, end);
  const chargingTime = 30; // Assumed 30 minutes per charging stop
  const totalDuration = estimateDuration(totalDistance) + (selectedStops.length * chargingTime);
  
  // Calculate charging cost
  const requiredCharge = evDetails.batteryCapacity * 0.8; // Assume we charge to 80%
  const totalCost = selectedStops.reduce((cost, station) => 
    cost + (requiredCharge * station.pricePerKwh), 0
  );

  return {
    stops: selectedStops,
    totalDistance,
    totalDuration,
    totalCost,
  };
}