import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LatLngTuple } from 'leaflet';
import type { Location, RouteDetails } from '../types';

const API_KEY = '417597c0-6a03-4fee-a95b-b0aae87b2cd9';

// Icons
const blueIcon = new L.Icon({ iconUrl: '../assets/blue_icon.png', iconSize: [30, 30], iconAnchor: [15, 30] });
const redIcon = new L.Icon({ iconUrl: '../assets/red_icon.png', iconSize: [30, 30], iconAnchor: [15, 30] });
const chargingIcon = new L.Icon({ iconUrl: '../assets/charging.png', iconSize: [14, 14], iconAnchor: [7, 14] });

interface Props {
  route: RouteDetails | null;
  start: Location | null;
  end: Location | null;
  evRangeKm: number;
}

const FitBounds = ({ bounds }: { bounds: LatLngTuple[] }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds.length) map.fitBounds(L.latLngBounds(bounds), { padding: [50, 50] });
  }, [bounds, map]);
  return null;
};

const calculateDistance = (loc1: Location, loc2: Location): number => {
  const R = 6371;
  const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
  const dLon = (loc2.lng - loc1.lng) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

export const RouteMap: React.FC<Props> = ({ start, end, evRangeKm }) => {
  const [chargingStations, setChargingStations] = useState<Location[]>([]);
  const [routePoints, setRoutePoints] = useState<LatLngTuple[]>([]);
  const [bounds, setBounds] = useState<LatLngTuple[]>([]);
  const [intermediateStation, setIntermediateStation] = useState<Location | null>(null);

  const fetchGraphHopperRoute = async (from: Location, to: Location): Promise<LatLngTuple[]> => {
    const url = `https://graphhopper.com/api/1/route?point=${from.lat},${from.lng}&point=${to.lat},${to.lng}&profile=car&locale=en&points_encoded=false&key=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.paths[0].points.coordinates.map(([lng, lat]: number[]) => [lat, lng]);
  };

  useEffect(() => {
    const fetchChargingStations = async () => {
      const query = `[out:json];node["amenity"="charging_station"](6.5,68.1,35.7,97.4);out body;`;
      try {
        const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
        const data = await res.json();
        setChargingStations(
          data.elements.map((s: any) => ({ lat: s.lat, lng: s.lon }))
        );
      } catch (err) {
        console.error('Charging station fetch failed:', err);
      }
    };
    fetchChargingStations();
  }, []);

  useEffect(() => {
    const buildRoute = async () => {
      if (!start || !end) return;

      const directDistance = calculateDistance(start, end);
      if (directDistance <= evRangeKm) {
        // Direct route
        const points = await fetchGraphHopperRoute(start, end);
        setRoutePoints(points);
        setBounds([...points, [start.lat, start.lng], [end.lat, end.lng]]);
        setIntermediateStation(null);
      } else {
        // Need to find intermediate charging station
        const reachableStations = chargingStations
          .map(station => ({
            ...station,
            dist: calculateDistance(start, station)
          }))
          .filter(station => station.dist <= evRangeKm)
          .sort((a, b) => a.dist - b.dist);

        if (reachableStations.length === 0) {
          console.warn("No reachable charging station within EV range.");
          setRoutePoints([]);
          setIntermediateStation(null);
          return;
        }

        const station = reachableStations[0];
        setIntermediateStation(station);

        // Route 1: start → station
        const toStation = await fetchGraphHopperRoute(start, station);
        // Route 2: station → end
        const toEnd = await fetchGraphHopperRoute(station, end);

        const fullRoute = [...toStation, ...toEnd];
        setRoutePoints(fullRoute);
        setBounds([...fullRoute, [start.lat, start.lng], [end.lat, end.lng]]);
      }
    };

    buildRoute();
  }, [start, end, chargingStations, evRangeKm]);

  const defaultPosition: LatLngTuple = useMemo(() => {
    if (start) return [start.lat, start.lng];
    return [20.5937, 78.9629];
  }, [start]);

  return (
    <MapContainer center={defaultPosition} zoom={5} style={{ height: '600px', width: '100%' }} scrollWheelZoom={true}>
      <TileLayer attribution='&copy; OpenStreetMap contributors' url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' />

      {start && <Marker position={[start.lat, start.lng]} icon={blueIcon} />}
      {end && <Marker position={[end.lat, end.lng]} icon={redIcon} />}
      {chargingStations.map((station, idx) => (
        <Marker key={idx} position={[station.lat, station.lng]} icon={chargingIcon} />
      ))}
      {intermediateStation && (
        <Marker position={[intermediateStation.lat, intermediateStation.lng]} icon={chargingIcon} />
      )}

      {routePoints.length > 0 && (
        <Polyline positions={routePoints} pathOptions={{ color: 'green', weight: 5 }} />
      )}

      <FitBounds bounds={bounds} />
    </MapContainer>
  );
};
