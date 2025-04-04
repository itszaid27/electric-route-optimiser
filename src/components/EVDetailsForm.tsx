import React, { useState } from "react";

interface EVDetails {
  batteryPercentage: number;
  mileage: number;
}

interface EVDetailsFormProps {
  onSubmit: (details: EVDetails) => void;
}

export const EVDetailsForm: React.FC<EVDetailsFormProps> = ({ onSubmit }) => {
  const [batteryPercentage, setBatteryPercentage] = useState<number>(100);
  const [mileage, setMileage] = useState<number>(300); // Default mileage example

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ batteryPercentage, mileage });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-4">
      <h2 className="text-2xl font-bold text-gray-800">EV Details</h2>

      {/* Battery Percentage */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Battery Percentage (%)</label>
        <input
          type="number"
          min="0"
          max="100"
          value={batteryPercentage}
          onChange={(e) => setBatteryPercentage(Number(e.target.value))}
          className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
          required
        />
      </div>

      {/* Mileage */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Mileage (km per 100% charge)</label>
        <input
          type="number"
          min="1"
          value={mileage}
          onChange={(e) => setMileage(Number(e.target.value))}
          className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
          required
        />
      </div>

      <button
        type="submit"
        className="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-md"
      >
        Save EV Details
      </button>
    </form>
  );
};
