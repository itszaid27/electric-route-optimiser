export interface EVDetails {
  batteryPercentage: number;
  batteryCapacity: number; // in kWh
  range: number; // in km
}

export interface Location {
  lat: number;
  lng: number;
  address: string;
}

export interface ChargingStation {
  id: string;
  location: Location;
  connectorTypes: string[];
  capacity: number; // in kW
  isAvailable: boolean;
  operationalStatus: 'operational' | 'maintenance' | 'offline';
  pricePerKwh: number;
}

export interface RouteDetails {
  distance: number;
  duration: number;
  chargingStops: ChargingStation[];
  totalCost: number;
  path: Location[];
}