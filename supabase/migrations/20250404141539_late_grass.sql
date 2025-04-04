/*
  # Create charging stations table and functions

  1. New Tables
    - `charging_stations`
      - `id` (uuid, primary key)
      - `location` (point, indexed)
      - `address` (text)
      - `connector_types` (text array)
      - `capacity` (integer)
      - `is_available` (boolean)
      - `operational_status` (enum)
      - `price_per_kwh` (decimal)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Functions
    - `nearby_charging_stations`: Finds charging stations within a specified radius
    
  3. Security
    - Enable RLS on `charging_stations` table
    - Add policy for public read access
*/

-- Create enum for operational status
CREATE TYPE operational_status AS ENUM ('operational', 'maintenance', 'offline');

-- Create charging stations table
CREATE TABLE IF NOT EXISTS charging_stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location point NOT NULL,
  address text NOT NULL,
  connector_types text[] NOT NULL,
  capacity integer NOT NULL,
  is_available boolean NOT NULL DEFAULT true,
  operational_status operational_status NOT NULL DEFAULT 'operational',
  price_per_kwh decimal NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for location-based queries
CREATE INDEX IF NOT EXISTS idx_charging_stations_location ON charging_stations USING gist(location);

-- Function to find nearby charging stations
CREATE OR REPLACE FUNCTION nearby_charging_stations(
  latitude double precision,
  longitude double precision,
  radius_km double precision
)
RETURNS SETOF charging_stations
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM charging_stations
  WHERE 
    point(longitude, latitude) <@> location <= radius_km
    AND is_available = true
    AND operational_status = 'operational'
  ORDER BY point(longitude, latitude) <@> location;
$$;

-- Enable RLS
ALTER TABLE charging_stations ENABLE ROW LEVEL SECURITY;

-- Add policy for public read access
CREATE POLICY "Charging stations are viewable by everyone"
  ON charging_stations
  FOR SELECT
  TO public
  USING (true);

-- Add some sample charging stations
INSERT INTO charging_stations 
  (location, address, connector_types, capacity, price_per_kwh)
VALUES
  (point(40.7128, -74.0060), '123 Broadway, New York, NY', ARRAY['CCS', 'CHAdeMO'], 150, 0.35),
  (point(40.7589, -73.9851), '456 Fifth Ave, New York, NY', ARRAY['CCS', 'Tesla'], 250, 0.40),
  (point(40.7549, -73.9840), '789 Madison Ave, New York, NY', ARRAY['CCS', 'CHAdeMO', 'Tesla'], 350, 0.45);