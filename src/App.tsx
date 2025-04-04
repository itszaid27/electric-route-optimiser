import React, { useEffect, useState } from 'react';
import { Car } from 'lucide-react';
import { EVDetailsForm } from './components/EVDetailsForm';
import { LocationSearch } from './components/LocationSearch';
import { RouteMap } from './components/RouteMap';
import type { EVDetails, Location, RouteDetails } from './types';

function App() {
  const [evDetails, setEVDetails] = useState<EVDetails | null>(null);
  const [startLocation, setStartLocation] = useState<Location | null>(null);
  const [endLocation, setEndLocation] = useState<Location | null>(null);
  const [route, setRoute] = useState<RouteDetails | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);
        setStartLocation({ lat: latitude, lng: longitude });
      },
      () => {
        console.error('Could not get user location');
      }
    );
  }, []);

  const calculateRoute = React.useCallback(async () => {
    if (!startLocation || !endLocation) return;

    const apiKey = "417597c0-6a03-4fee-a95b-b0aae87b2cd9";
    const url = `https://graphhopper.com/api/1/route?point=${startLocation.lat},${startLocation.lng}&point=${endLocation.lat},${endLocation.lng}&profile=car&locale=en&calc_points=true&points_encoded=false&key=${apiKey}`;

    try {
      setLoading(true);
      const response = await fetch(url);
      const data = await response.json();

      if (data.paths && data.paths.length > 0) {
        const pathCoordinates = data.paths[0].points.coordinates.map(
          ([lng, lat]: [number, number]) => ({ lat, lng })
        );

        setRoute({
          distance: data.paths[0].distance / 1000,
          duration: Math.round(data.paths[0].time / 60000),
          chargingStops: [], // to be calculated later
          totalCost: 0, // to be calculated later
          path: pathCoordinates,
        });
      } else {
        console.error("No route found.");
      }
    } catch (error) {
      console.error("Error fetching route from GraphHopper:", error);
    } finally {
      setLoading(false);
    }
  }, [startLocation, endLocation]);

  const handleSearch = () => {
    if (startLocation && endLocation) {
      console.log("Searching route from:", startLocation, "to:", endLocation);
      calculateRoute();
    } else {
      alert("Please select both start and destination locations.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-4">
            <Car className="h-8 w-8 text-blue-500" />
            <h1 className="text-2xl font-bold text-gray-900">
              Electric Route Optimizer
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-8">
            <EVDetailsForm onSubmit={setEVDetails} />

            <div className="bg-white p-6 rounded-lg shadow-md space-y-6">
              <h2 className="text-2xl font-bold text-gray-800">Route</h2>
              <LocationSearch
                label="Start Location"
                onLocationSelect={setStartLocation}
              />
              <LocationSearch
                label="Destination"
                onLocationSelect={setEndLocation}
              />
              <button
                onClick={handleSearch}
                className={`w-full py-2 px-4 rounded-md text-white ${
                  loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"
                }`}
                disabled={loading}
              >
                {loading ? "Calculating..." : "Search"}
              </button>
            </div>
          </div>

          <div className="lg:col-span-2">
            <RouteMap route={route} start={startLocation} end={endLocation} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
