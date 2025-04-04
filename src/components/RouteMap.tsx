import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LatLngTuple } from 'leaflet';
import type { Location, RouteDetails } from '../types';

// Custom start marker (blue)
const blueIcon = new L.Icon({
  iconUrl: '../assets/blue_icon.png',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

// Custom end marker (red)
const redIcon = new L.Icon({
  iconUrl: '../assets/red_icon.png',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

// Custom charging station marker (green)
const chargingIcon = new L.Icon({
  iconUrl: '../assets/charging.png',
  iconSize: [10, 10],
  iconAnchor: [12, 25],
  popupAnchor: [0, -25],
});

interface Props {
  route: RouteDetails | null;
  start: Location | null;
  end: Location | null;
}

const FitBounds = ({ start, end, route }: { start: Location | null; end: Location | null; route: RouteDetails | null }) => {
  const map = useMap();

  useEffect(() => {
    if (start && end) {
      const bounds = L.latLngBounds([
        ...route?.path.map(point => [point.lat, point.lng] as LatLngTuple) || [],
        [start.lat, start.lng],
        [end.lat, end.lng]
      ]);

      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [start, end, route, map]);

  return null;
};

export const RouteMap: React.FC<Props> = ({ route, start, end }) => {
  const [chargingStations, setChargingStations] = useState<Location[]>([]);

  // Fetch charging stations from Overpass API for entire India
  useEffect(() => {
    const fetchChargingStations = async () => {
      const overpassQuery = `
        [out:json];
        node["amenity"="charging_station"](6.5,68.1,35.7,97.4);
        out body;
      `;
      const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;

      try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.elements) {
          const stations: Location[] = data.elements.map((station: any) => ({
            lat: station.lat,
            lng: station.lon
          }));

          setChargingStations(stations);
        }
      } catch (error) {
        console.error("Error fetching charging stations:", error);
      }
    };

    fetchChargingStations();
  }, []);

  // Determine default position
  const defaultPosition: LatLngTuple = useMemo(() => {
    if (start) return [start.lat, start.lng];
    if (route?.path.length) return [route.path[0].lat, route.path[0].lng];
    return [20.5937, 78.9629]; // India as fallback
  }, [start, route]);

  return (
    <MapContainer center={defaultPosition} zoom={5} style={{ height: '600px', width: '100%' }} scrollWheelZoom={true}>
      <TileLayer attribution='&copy; OpenStreetMap contributors' url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' />

      {/* Start Marker */}
      {start && <Marker position={[start.lat, start.lng]} icon={blueIcon} />}

      {/* End Marker */}
      {end && <Marker position={[end.lat, end.lng]} icon={redIcon} />}

      {/* Charging Stations */}
      {chargingStations.map((station, index) => (
        <Marker key={index} position={[station.lat, station.lng]} icon={chargingIcon} />
      ))}

      {/* Route Path */}
      {route && route.path.length > 0 && (
        <Polyline positions={route.path.map(point => [point.lat, point.lng] as LatLngTuple)} pathOptions={{ color: 'green', weight: 5 }} />
      )}

      <FitBounds start={start} end={end} route={route} />
    </MapContainer>
  );
};
