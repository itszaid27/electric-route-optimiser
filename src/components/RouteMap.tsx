import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LatLngTuple } from 'leaflet';
import type { Location, RouteDetails } from '../types';

const API_KEY = '417597c0-6a03-4fee-a95b-b0aae87b2cd9';

// Icons
const blueIcon = new L.Icon({
  iconUrl: '../assets/blue_icon.png',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

const redIcon = new L.Icon({
  iconUrl: '../assets/red_icon.png',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

const chargingIcon = new L.Icon({
  iconUrl: '../assets/charging.png',
  iconSize: [14, 14],
  iconAnchor: [7, 14],
});

const selectedChargingIcon = new L.Icon({
  iconUrl: '../assets/charging_selected.png',
  iconSize: [24, 24],
  iconAnchor: [12, 24],
});

interface ChargingStation extends Location {
  tags?: Record<string, string>;
}

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

const calculateDistance = (loc1: Location | LatLngTuple, loc2: Location | LatLngTuple): number => {
  const R = 6371;
  const [lat1, lon1] = Array.isArray(loc1) ? loc1 : [loc1.lat, loc1.lng];
  const [lat2, lon2] = Array.isArray(loc2) ? loc2 : [loc2.lat, loc2.lng];
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const isStationNearRoute = (station: Location, routePoints: LatLngTuple[], maxDistanceKm = 10): boolean => {
  return routePoints.some((point) => calculateDistance(station, point) <= maxDistanceKm);
};

export const RouteMap: React.FC<Props> = ({ start, end, evRangeKm }) => {
  const [chargingStations, setChargingStations] = useState<ChargingStation[]>([]);
  const [filteredStations, setFilteredStations] = useState<ChargingStation[]>([]);
  const [selectedChargingStations, setSelectedChargingStations] = useState<ChargingStation[]>([]);
  const [routePoints, setRoutePoints] = useState<LatLngTuple[]>([]);
  const [bounds, setBounds] = useState<LatLngTuple[]>([]);
  const [directions, setDirections] = useState<string[]>([]);
  const [showDirections, setShowDirections] = useState(true);

  const fetchGraphHopperRoute = async (from: Location, to: Location): Promise<{ points: LatLngTuple[], instructions: string[] }> => {
    const url = `https://graphhopper.com/api/1/route?point=${from.lat},${from.lng}&point=${to.lat},${to.lng}&profile=car&locale=en&points_encoded=false&instructions=true&key=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    const points = data.paths[0].points.coordinates.map(([lng, lat]: number[]) => [lat, lng]);
    const instructions = data.paths[0].instructions.map((instr: any) => `${instr.text} (${instr.distance.toFixed(0)}m)`);

    return { points, instructions };
  };

  useEffect(() => {
    const fetchChargingStations = async () => {
      const query = `[out:json];node["amenity"="charging_station"](6.5,68.1,35.7,97.4);out body;`;
      try {
        const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
        const data = await res.json();
        setChargingStations(
          data.elements.map((s: any) => ({
            lat: s.lat,
            lng: s.lon,
            tags: s.tags || {},
          }))
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
      let allRoute: LatLngTuple[] = [];
      let allInstructions: string[] = [];

      if (directDistance <= evRangeKm) {
        const { points, instructions } = await fetchGraphHopperRoute(start, end);
        allRoute = points;
        allInstructions = instructions;
        setFilteredStations(chargingStations.filter(st => isStationNearRoute(st, points)));
        setSelectedChargingStations([]);
      } else {
        let remainingRange = evRangeKm;
        let currentLocation = start;
        const maxStops = 3;
        const selectedStops: ChargingStation[] = [];
        let stopCount = 0;

        while (calculateDistance(currentLocation, end) > evRangeKm && stopCount < maxStops) {
          const reachableStations = chargingStations
            .filter(station => {
              const dist = calculateDistance(currentLocation, station);
              return dist <= remainingRange && isStationNearRoute(station, routePoints, 10);
            })
            .map(station => ({
              ...station,
              dist: calculateDistance(currentLocation, station),
              toEndDist: calculateDistance(station, end),
            }))
            .sort((a, b) => a.toEndDist - b.toEndDist);

          if (reachableStations.length === 0) break;

          const selectedStation = reachableStations[0];
          selectedStops.push(selectedStation);
          const { points, instructions } = await fetchGraphHopperRoute(currentLocation, selectedStation);
          allRoute = [...allRoute, ...points];
          allInstructions = [...allInstructions, ...instructions];
          currentLocation = selectedStation;
          stopCount++;
        }

        const { points, instructions } = await fetchGraphHopperRoute(currentLocation, end);
        allRoute = [...allRoute, ...points];
        allInstructions = [...allInstructions, ...instructions];

        setSelectedChargingStations(selectedStops);
        setFilteredStations(chargingStations.filter(st => isStationNearRoute(st, allRoute)));
      }

      setRoutePoints(allRoute);
      setBounds([...allRoute, [start.lat, start.lng], [end.lat, end.lng]]);
      setDirections(allInstructions);
    };

    buildRoute();
  }, [start, end, chargingStations, evRangeKm]);

  const allStationsToShow = useMemo(() => {
    const set = new Set(filteredStations.map(s => `${s.lat},${s.lng}`));
    selectedChargingStations.forEach(s => set.add(`${s.lat},${s.lng}`));
    return chargingStations.filter(s => set.has(`${s.lat},${s.lng}`));
  }, [chargingStations, filteredStations, selectedChargingStations]);

  const defaultPosition: LatLngTuple = useMemo(() => {
    if (start) return [start.lat, start.lng];
    return [20.5937, 78.9629]; // default: India center
  }, [start]);

  return (
    <>
      <MapContainer center={defaultPosition} zoom={5} style={{ height: '600px', width: '100%' }} scrollWheelZoom={true}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        />

        {start && (
          <Marker position={[start.lat, start.lng]} icon={blueIcon}>
            <Popup>Start Point</Popup>
          </Marker>
        )}
        {end && (
          <Marker position={[end.lat, end.lng]} icon={redIcon}>
            <Popup>End Point</Popup>
          </Marker>
        )}

        {allStationsToShow.map((station, idx) => {
          const isSelected = selectedChargingStations.some(
            (s) => calculateDistance(s, station) < 0.05
          );

          return (
            <Marker
              key={idx}
              position={[station.lat, station.lng]}
              icon={isSelected ? selectedChargingIcon : chargingIcon}
            >
              <Popup>
                <div>
                  <strong>{isSelected ? '✅ Selected Charging Station' : '⚡ Charging Station'}</strong>
                  <br />
                  <strong>Name:</strong> {station.tags?.name || 'N/A'}<br />
                  <strong>Street:</strong> {station.tags?.['addr:street'] || 'N/A'}<br />
                  <strong>Operator:</strong> {station.tags?.operator || 'N/A'}<br />
                  <strong>Sockets:</strong> {station.tags?.sockets || 'N/A'}<br />
                  <strong>Coordinates:</strong> {station.lat.toFixed(4)}, {station.lng.toFixed(4)}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {routePoints.length > 0 && (
          <Polyline positions={routePoints} pathOptions={{ color: 'green', weight: 5 }} />
        )}

        <FitBounds bounds={bounds} />
      </MapContainer>

      {/* Floating Direction Box */}
      {directions.length > 0 && (
        <div className="fixed top-4 right-4 bg-white border border-gray-300 shadow-md rounded-lg p-4 w-80 max-h-[70vh] overflow-y-auto z-[999]">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-semibold text-lg">Turn-by-Turn Directions</h2>
            <button
              onClick={() => setShowDirections(!showDirections)}
              className="text-sm text-blue-500 underline"
            >
              {showDirections ? 'Hide' : 'Show'}
            </button>
          </div>
          {showDirections && (
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
              {directions.map((dir, idx) => (
                <li key={idx}>{dir}</li>
              ))}
            </ol>
          )}
        </div>
      )}
    </>
  );
};
