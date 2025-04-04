import React, { useEffect, useState, useCallback } from "react";
import { Car } from "lucide-react";
import { EVDetailsForm } from "./components/EVDetailsForm";
import { LocationSearch } from "./components/LocationSearch";
import { RouteMap } from "./components/RouteMap";
import type { EVDetails, Location, RouteDetails } from "./types";

function App() {
  const [evDetails, setEVDetails] = useState<EVDetails | null>(null);
  const [startLocation, setStartLocation] = useState<Location | null>(null);
  const [endLocation, setEndLocation] = useState<Location | null>(null);
  const [route, setRoute] = useState<RouteDetails | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(false);
  const [batteryStatus, setBatteryStatus] = useState<string>("");
  const [chargingStations, setChargingStations] = useState<Location[]>([]);
  const [shouldReroute, setShouldReroute] = useState(false);
  const [selectedChargingStation, setSelectedChargingStation] = useState<Location | null>(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);
        setStartLocation({ lat: latitude, lng: longitude });
      },
      () => console.error("Could not get user location")
    );
  }, []);

  useEffect(() => {
    setRoute(null);
    setBatteryStatus("");
    setChargingStations([]);
    setShouldReroute(false);
    setSelectedChargingStation(null);
  }, [startLocation, endLocation]);

  const fetchChargingStations = async () => {
    if (!startLocation || !endLocation) return;

    const query = `
      [out:json];
      node["amenity"="charging_station"](around:50000,${(startLocation.lat + endLocation.lat) / 2},${(startLocation.lng + endLocation.lng) / 2});
      out;
    `;

    try {
      const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (data.elements) {
        const stations = data.elements.map((station: any) => ({
          lat: station.lat,
          lng: station.lon,
        }));
        setChargingStations(stations);
      }
    } catch (error) {
      console.error("Error fetching charging stations:", error);
    }
  };

  const calculateRoute = useCallback(async () => {
    if (!startLocation || !endLocation) return;

    const apiKey = "417597c0-6a03-4fee-a95b-b0aae87b2cd9";
    let points = [
      `${startLocation.lat},${startLocation.lng}`,
      `${endLocation.lat},${endLocation.lng}`,
    ];

    setLoading(true);

    try {
      if (shouldReroute && chargingStations.length > 0) {
        const nearestStation = chargingStations.reduce((prev, curr) => {
          const prevDist = Math.hypot(prev.lat - startLocation.lat, prev.lng - startLocation.lng);
          const currDist = Math.hypot(curr.lat - startLocation.lat, curr.lng - startLocation.lng);
          return currDist < prevDist ? curr : prev;
        });

        setSelectedChargingStation(nearestStation);

        points = [
          `${startLocation.lat},${startLocation.lng}`,
          `${nearestStation.lat},${nearestStation.lng}`,
          `${endLocation.lat},${endLocation.lng}`,
        ];
      }

      const url = `https://graphhopper.com/api/1/route?${points
        .map((p) => `point=${p}`)
        .join("&")}&profile=car&locale=en&calc_points=true&points_encoded=false&key=${apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.paths && data.paths.length > 0) {
        const totalDistance = data.paths[0].distance / 1000;
        const totalDuration = Math.round(data.paths[0].time / 60000);
        const pathCoordinates = data.paths[0].points.coordinates.map(
          ([lng, lat]: [number, number]) => ({ lat, lng })
        );

        const newRoute: RouteDetails = {
          distance: totalDistance,
          duration: totalDuration,
          chargingStops: [],
          totalCost: 0,
          path: pathCoordinates,
        };

        setRoute(newRoute);

        if (!shouldReroute) {
          const batteryOk = checkBatteryAndUpdateStatus(totalDistance);
          if (!batteryOk) {
            await fetchChargingStations();
            setShouldReroute(true);
          }
        } else {
          setBatteryStatus("✅ Rerouted through charging station.");
        }
      } else {
        console.error("No route found.");
      }
    } catch (error) {
      console.error("Error fetching route:", error);
    } finally {
      setLoading(false);
    }
  }, [startLocation, endLocation, evDetails, shouldReroute, chargingStations]);

  const checkBatteryAndUpdateStatus = (distance: number): boolean => {
    if (!evDetails) {
      setBatteryStatus("⚠️ Please enter EV details first.");
      return false;
    }

    const { batteryPercentage, mileage } = evDetails;
    if (!batteryPercentage || !mileage || mileage <= 0) {
      setBatteryStatus("⚠️ Invalid battery percentage or mileage.");
      return false;
    }

    const maxTravelDistance = (batteryPercentage / 100) * mileage;
    if (maxTravelDistance >= distance) {
      const remainingBattery = batteryPercentage - (distance / mileage) * 100;
      setBatteryStatus(`✅ Trip possible! Battery left: ${remainingBattery.toFixed(2)}%`);
      return true;
    } else {
      const extraChargeNeeded = ((distance / mileage) * 100) - batteryPercentage;
      setBatteryStatus(`⚠️ Not enough battery! Need extra ${extraChargeNeeded.toFixed(2)}% charge. Rerouting...`);
      return false;
    }
  };

  const handleSearch = () => {
    if (startLocation && endLocation) {
      calculateRoute();
    } else {
      alert("Please select both start and destination locations.");
    }
  };

  const formatDuration = (minutes: number): string => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs > 0 ? `${hrs} hr${hrs > 1 ? "s" : ""} ` : ""}${mins} min${mins !== 1 ? "s" : ""}`;
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
              <LocationSearch label="Start Location" onLocationSelect={setStartLocation} />
              <LocationSearch label="Destination" onLocationSelect={setEndLocation} />
              <button
                onClick={handleSearch}
                className={`w-full py-2 px-4 rounded-md text-white ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"}`}
                disabled={loading}
              >
                {loading ? "Calculating..." : "Calculate"}
              </button>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            {route && (
              <div className="bg-white p-4 rounded-lg shadow-md text-center text-lg font-semibold text-gray-700 space-y-2">
                <p>📏 Total Distance: {route.distance.toFixed(2)} km</p>
                <p>⏱️ ETA: {formatDuration(route.duration)}</p>
                <p>{batteryStatus}</p>
                {selectedChargingStation && (
                  <p>
                    🛑 Charging at: {selectedChargingStation.lat.toFixed(4)}, {selectedChargingStation.lng.toFixed(4)}
                  </p>
                )}
                {evDetails && evDetails.mileage > 0 && (
                  <>
                    <p>🔋 Battery Required: {(route.distance / evDetails.mileage * 100).toFixed(2)}%</p>
                    {evDetails.batteryPercentage < (route.distance / evDetails.mileage * 100) && (
                      <p>⚡ Recharge Stops Needed: {Math.ceil(((route.distance / evDetails.mileage * 100) - evDetails.batteryPercentage) / 100)}</p>
                    )}
                  </>
                )}
              </div>
            )}

            <RouteMap
              route={route}
              start={startLocation}
              end={endLocation}
              chargingStations={chargingStations}
              evRangeKm={
                evDetails?.batteryPercentage && evDetails?.mileage
                  ? (evDetails.batteryPercentage / 100) * evDetails.mileage
                  : undefined
              }
              selectedChargingStation={selectedChargingStation}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
