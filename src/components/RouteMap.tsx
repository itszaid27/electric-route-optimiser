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
    requiredStops: number;
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

export const RouteMap: React.FC<Props> = ({ start, end, evRangeKm, requiredStops }) => {
    const [chargingStations, setChargingStations] = useState<ChargingStation[]>([]);
    const [filteredStations, setFilteredStations] = useState<ChargingStation[]>([]);
    const [selectedChargingStations, setSelectedChargingStations] = useState<ChargingStation[]>([]);
    const [routePoints, setRoutePoints] = useState<LatLngTuple[]>([]);
    const [bounds, setBounds] = useState<LatLngTuple[]>([]);
    const [directions, setDirections] = useState<string[]>([]);
    const [showDirections, setShowDirections] = useState<boolean>(true);

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
            let fullRoute: LatLngTuple[] = [];
            let fullInstructions: string[] = [];
        
            if (directDistance <= evRangeKm) {
                // ✅ Direct route
                const { points, instructions } = await fetchGraphHopperRoute(start, end);
                fullRoute = points;
                fullInstructions = instructions;
                setSelectedChargingStations([]);
                setFilteredStations([]);
            } else {
                let currentLocation = start;
                const maxStops = 3;
        
                const selectedStops: ChargingStation[] = [];
                const segments: { from: Location; to: Location }[] = [];
        
                let remainingRange = calculateDistance(start, end);
                let stopCount = 0;
        
                while (remainingRange > evRangeKm && stopCount < maxStops) {
                    const nearbyStations = chargingStations
                        .filter(station => calculateDistance(currentLocation, station) <= evRangeKm)
                        .sort((a, b) => calculateDistance(a, end) - calculateDistance(b, end));
        
                    const nextStop = nearbyStations.find(station =>
                        !selectedStops.some(s => s.lat === station.lat && s.lng === station.lng)
                    );
        
                    if (!nextStop) break;
        
                    selectedStops.push(nextStop);
                    segments.push({ from: currentLocation, to: nextStop });
                    currentLocation = nextStop;
                    remainingRange = calculateDistance(currentLocation, end);
                    stopCount++;
                }
        
                // Final leg to destination
                segments.push({ from: currentLocation, to: end });
        
                // Fetch routes segment-wise
                for (const seg of segments) {
                    const { points, instructions } = await fetchGraphHopperRoute(seg.from, seg.to);
                    // Avoid duplicating last point of previous segment
                    if (fullRoute.length > 0) {
                        points.shift(); // remove duplicate start point
                    }
                    fullRoute = [...fullRoute, ...points];
                    fullInstructions = [...fullInstructions, ...instructions];
                }
        
                setSelectedChargingStations(selectedStops);
                setFilteredStations(
                    chargingStations.filter(st => isStationNearRoute(st, fullRoute))
                );
            }
        
            setRoutePoints(fullRoute);
            setBounds([...fullRoute, [start.lat, start.lng], [end.lat, end.lng]]);
            setDirections(fullInstructions);
        };

        buildRoute();
    }, [start, end, chargingStations, evRangeKm, requiredStops]);

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
            <MapContainer center={defaultPosition} zoom={6} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <FitBounds bounds={bounds} />
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
                                {isSelected ? '✅ Selected Charging Station' : '⚡ Charging Station'}
                                <br />
                                Name: {station.tags?.name || 'N/A'}
                                <br />
                                Street: {station.tags?.['addr:street'] || 'N/A'}
                                <br />
                                Operator: {station.tags?.operator || 'N/A'}
                                <br />
                                Sockets: {station.tags?.sockets || 'N/A'}
                                <br />
                                Coordinates: {station.lat.toFixed(4)}, {station.lng.toFixed(4)}
                            </Popup>
                        </Marker>
                    );
                })}
                {routePoints.length > 0 && (
                    <Polyline positions={routePoints} color="blue" weight={3} />
                )}
            </MapContainer>

            {directions.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold mb-2">Turn-by-Turn Directions</h3>
                    <button onClick={() => setShowDirections(!showDirections)}
                        className="text-sm text-blue-500 underline">
                        {showDirections ? 'Hide' : 'Show'}
                    </button>
                    {showDirections && (
                        <ul className="list-decimal pl-5">
                            {directions.map((dir, idx) => (
                                <li key={idx} className="mb-1">{dir}</li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </>
    );
};
