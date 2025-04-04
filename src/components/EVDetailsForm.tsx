import React from 'react';
import { Battery, Gauge, Zap } from 'lucide-react';
import type { EVDetails } from '../types';

interface Props {
  onSubmit: (details: EVDetails) => void;
}

export function EVDetailsForm({ onSubmit }: Props) {
  const [details, setDetails] = React.useState<EVDetails>({
    batteryPercentage: 100,
    batteryCapacity: 75,
    range: 400,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(details);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Vehicle Details</h2>
      
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <Battery className="text-blue-500" />
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">
              Current Battery (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={details.batteryPercentage}
              onChange={(e) => setDetails(prev => ({
                ...prev,
                batteryPercentage: Number(e.target.value)
              }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <Zap className="text-blue-500" />
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">
              Battery Capacity (kWh)
            </label>
            <input
              type="number"
              min="0"
              value={details.batteryCapacity}
              onChange={(e) => setDetails(prev => ({
                ...prev,
                batteryCapacity: Number(e.target.value)
              }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <Gauge className="text-blue-500" />
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">
              Maximum Range (km)
            </label>
            <input
              type="number"
              min="0"
              value={details.range}
              onChange={(e) => setDetails(prev => ({
                ...prev,
                range: Number(e.target.value)
              }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
      >
        Update Route
      </button>
    </form>
  );
}