import React from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LatLngTuple } from 'leaflet';
import type { Location, RouteDetails } from '../types';

// Custom blue marker for start
const blueIcon = new L.Icon({
  iconUrl: '../assets/blue-icon.png',
  iconSize: [30, 30],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

// Custom red marker for destination
const redIcon = new L.Icon({
  iconUrl: '../assets/red-icon.png',
  iconSize: [30, 30],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

interface Props {
  route: RouteDetails | null;
  start: Location | null;
  end: Location | null;
}

const FitBounds = ({ start, end }: { start: Location | null; end: Location | null }) => {
  const map = useMap();

  React.useEffect(() => {
    if (start && end) {
      const bounds = L.latLngBounds(
        L.latLng(start.lat, start.lng),
        L.latLng(end.lat, end.lng)
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [start, end, map]);

  return null;
};

export const RouteMap: React.FC<Props> = ({ route, start, end }) => {
  const defaultPosition: LatLngTuple = start
    ? [start.lat, start.lng]
    : [20.5937, 78.9629]; // India as fallback

  return (
    <MapContainer
      center={defaultPosition}
      zoom={6}
      style={{ height: '600px', width: '100%' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      />

      {/* Start Marker */}
      {start && (
        <Marker
          position={[start.lat, start.lng]}
          icon={blueIcon}
        />
      )}

      {/* End Marker */}
      {end && (
        <Marker
          position={[end.lat, end.lng]}
          icon={redIcon}
        />
      )}

      {/* Route Path */}
      {route && route.path.length > 0 && (
        <Polyline
          positions={route.path.map((point) => [point.lat, point.lng] as LatLngTuple)}
          pathOptions={{ color: 'green', weight: 5 }}
        />
      )}

      <FitBounds start={start} end={end} />
    </MapContainer>
  );
};
