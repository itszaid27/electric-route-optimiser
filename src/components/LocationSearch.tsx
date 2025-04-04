import React, { useState, useEffect, useRef } from "react";
import type { Location } from "../types";

interface LocationSearchProps {
  label: string;
  onLocationSelect: (location: Location) => void;
}

const GEOAPIFY_API_KEY = "7b5fc55f85e441de844b662152bbe144"; // ← Replace with your key

export const LocationSearch: React.FC<LocationSearchProps> = ({
  label,
  onLocationSelect,
}) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
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
      if (showSuggestions) fetchSuggestions();
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, showSuggestions]);

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
      handleSelect(suggestions[0]); // auto-select first suggestion
    }
  };

  const handleFocus = () => {
    if (query.length >= 3) {
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

  return (
    <div className="relative">
      <label className="block text-gray-700 font-semibold mb-1">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          className="w-full border border-gray-300 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={`Enter ${label.toLowerCase()}...`}
        />
        <button
          onClick={handleSearchClick}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
        >
          Search
        </button>
      </div>

      {showSuggestions && suggestions.length > 0 && (
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
