import React, { useState, useEffect, useRef } from "react";
import type { Location } from "../types";

interface LocationSearchProps {
  label: string;
  onLocationSelect: (location: Location) => void;
}

const GEOAPIFY_API_KEY = "7b5fc55f85e441de844b662152bbe144";

export const LocationSearch: React.FC<LocationSearchProps> = ({
  label,
  onLocationSelect,
}) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mode, setMode] = useState<"none" | "manual" | "current">("none");
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch suggestions from Geoapify
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (query.length < 3) {
        setSuggestions([]);
        return;
      }

      try {
        const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(
          query
        )}&limit=5&apiKey=${GEOAPIFY_API_KEY}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.features) {
          setSuggestions(data.features);
        }
      } catch (err) {
        console.error("Geoapify autocomplete error:", err);
      }
    };

    const timeout = setTimeout(() => {
      if (showSuggestions && mode === "manual") fetchSuggestions();
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, showSuggestions, mode]);

  const handleSelect = (place: any) => {
    setQuery(place.properties.formatted);
    setSuggestions([]);
    setShowSuggestions(false);
    onLocationSelect({
      lat: place.geometry.coordinates[1],
      lng: place.geometry.coordinates[0],
    });
  };

  const handleSearchClick = () => {
    setSuggestions([]);
    setShowSuggestions(false);
    if (suggestions.length > 0) {
      handleSelect(suggestions[0]);
    }
  };

  const handleFocus = () => {
    if (query.length >= 3 && mode === "manual") {
      setShowSuggestions(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setShowSuggestions(false);
      if (suggestions.length > 0) {
        handleSelect(suggestions[0]);
      }
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setQuery("Current Location");
        setMode("current");
        onLocationSelect({ lat: latitude, lng: longitude });
      },
      (error) => {
        alert("Unable to retrieve your location.");
        console.error(error);
      }
    );
  };

  const handleManualSearch = () => {
    setMode("manual");
    setQuery("");
    setSuggestions([]);
    setShowSuggestions(true);
    setTimeout(() => inputRef.current?.focus(), 0); // slight delay to allow rendering
  };
  
  return (
    <div className="relative">
      <label className="block text-gray-700 font-semibold mb-1">{label}</label>

      {mode === "none" ? (
        <div className="flex flex-col gap-2">
          <button
            onClick={handleUseCurrentLocation}
            className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
          >
            Use Current Location
          </button>
          <button
            onClick={handleManualSearch}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          >
             Search Manually
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
  type="text"
  ref={inputRef}
  value={query}
  onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
  onFocus={() => {
    setShowSuggestions(true);
    handleFocus();
  }}
  onKeyDown={handleKeyDown}
  autoComplete="off"
  autoFocus
  className="w-full border border-gray-300 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
  placeholder={`Enter ${label.toLowerCase()}...`}
  disabled={mode === "current"}
/>
          {mode === "manual" && (
            <button
              onClick={handleSearchClick}
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
            >
              Search
            </button>
          )}
        </div>
      )}

      {mode === "manual" && showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-10 bg-white border border-gray-300 rounded-md w-full mt-1 max-h-48 overflow-y-auto shadow">
          {suggestions.map((place: any) => (
            <li
              key={place.properties.place_id}
              onClick={() => handleSelect(place)}
              className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
            >
              {place.properties.formatted}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
