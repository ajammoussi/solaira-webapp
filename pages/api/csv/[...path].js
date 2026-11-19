/**
 * API Route to serve CSV files from backend/data/csv_gen
 *
 * This allows the frontend to fetch CSV data based on user's panel configuration
 * Route: /api/csv/{filename}
 */

import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const { path: pathSegments } = req.query;

  if (!pathSegments || pathSegments.length === 0) {
    return res.status(400).json({ error: 'No file path provided' });
  }

  const filename = pathSegments.join('/');

  // Security: Only allow .csv files from csv_gen folder
  if (!filename.endsWith('.csv')) {
    return res.status(400).json({ error: 'Only CSV files are allowed' });
  }

  // Validate filename pattern to prevent path traversal
  const validPattern =
    /^(historical_energy_data|hourly_forecast|realtime_snapshots)_\d+_panels\.csv$/;
  if (!validPattern.test(filename)) {
    return res.status(400).json({ error: 'Invalid filename pattern' });
  }

  const csvPath = path.join(process.cwd(), 'backend', 'data', 'csv_gen', filename);

  try {
    // Check if file exists
    if (!fs.existsSync(csvPath)) {
      return res.status(404).json({
        error: `CSV file not found for this panel configuration. Available options: 2, 4, 8, 10, 12, 16 panels.`,
      });
    }

    const fileContent = fs.readFileSync(csvPath, 'utf-8');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.status(200).send(fileContent);
  } catch (error) {
    console.error('Error reading CSV file:', error);
    res.status(500).json({ error: 'Failed to read CSV file' });
  }
}
