import * as d3 from 'd3';

/** Delhi Metro line color mapping */
export const LINE_COLORS = {
  'Red': '#FF4040',
  'Yellow': '#FFDF00',
  'Blue': '#4169E1',
  'Green': '#20B2AA',
  'Violet': '#553592',
  'Orange': '#FF8C00',
  'Magenta': '#CC338B',
  'Pink': '#FC8EAC',
  'Grey': '#838996',
  'Aqua': '#00BFFF',
};

/**
 * Load and merge all datasets
 * @returns {Promise<{stations, connections, ridership, lines}>}
 */
export async function loadAllData() {
  const [stationsRaw, stopsRaw, ridershipRaw] = await Promise.all([
    d3.csv('data/delhi-metro-stations.csv'),
    d3.csv('data/line-stops.csv'),
    d3.csv('data/ridership-yearly.csv'),
  ]);

  // Parse stations
  const stations = stationsRaw.map(d => ({
    id: +d.ID,
    name: d['Station Name'].trim(),
    distance: +d.Distance,
    line: d.Line.trim(),
    opened: +d.Opened,
    layout: d.Layout.trim(),
    lat: +d.Latitude,
    lng: +d.Longitude,
    color: LINE_COLORS[d.Line.trim()] || '#888',
    wikiLink: d.WikiLink
  }));

  // Build connections from line stops (sequential pairs)
  const connections = [];
  const stopsByLine = d3.group(stopsRaw, d => d.Line.trim());

  for (const [line, stops] of stopsByLine) {
    // Sort by stop order
    const sorted = stops.sort((a, b) => +a.Stop_Order - +b.Stop_Order);

    for (let i = 0; i < sorted.length - 1; i++) {
      const fromName = sorted[i]['Station Name'].trim();
      const toName = sorted[i + 1]['Station Name'].trim();
      const from = stations.find(s => s.name === fromName && s.line === line)
                   || stations.find(s => s.name === fromName);
      const to = stations.find(s => s.name === toName && s.line === line)
                 || stations.find(s => s.name === toName);

      if (from && to) {
        connections.push({
          line,
          color: LINE_COLORS[line] || '#888',
          from: { name: fromName, lat: from.lat, lng: from.lng },
          to: { name: toName, lat: to.lat, lng: to.lng },
          opened: Math.max(from.opened, to.opened),
        });
      }
    }
  }

  // Parse ridership
  const ridership = ridershipRaw.map(d => ({
    year: +d.Year,
    totalPassengersMillion: +d.Total_Passengers_Million,
    stations: +d.Operational_Stations,
    lines: +d.Operational_Lines,
    networkKm: +d.Network_Length_KM,
    dailyAvg: +d.Daily_Avg_Ridership,
  }));

  // Extract unique lines present
  const lines = [...new Set(stations.map(s => s.line))].sort();

  console.log(`✅ Loaded: ${stations.length} stations, ${connections.length} connections, ${ridership.length} years, ${lines.length} lines`);

  return { stations, connections, ridership, lines };
}

/**
 * Get unique station names (some appear on multiple lines)
 */
export function getUniqueStations(stations, year) {
  const filtered = stations.filter(s => s.opened <= year);
  const seen = new Set();
  return filtered.filter(s => {
    if (seen.has(s.name)) return false;
    seen.add(s.name);
    return true;
  });
}

/**
 * Get the ridership record for a given year
 */
export function getRidershipForYear(ridership, year) {
  return ridership.find(r => r.year === year) || ridership[ridership.length - 1];
}

/**
 * Get active lines for a given year
 */
export function getActiveLinesForYear(stations, year) {
  const filtered = stations.filter(s => s.opened <= year);
  const lines = [...new Set(filtered.map(s => s.line))];
  const counts = {};
  for (const s of filtered) {
    counts[s.line] = (counts[s.line] || 0) + 1;
  }
  return lines.map(l => ({ name: l, color: LINE_COLORS[l], count: counts[l] }));
}

/**
 * Calcule les liaisons dynamiquement selon l'année en cours
 * Ignore les stations qui ne sont pas encore construites !
 */
export function getConnectionsForYear(stations, year) {
  const visibleStations = stations.filter(s => s.opened <= year);
  const connections = [];
  const byLine = d3.group(visibleStations, d => d.line);

  for (const [line, lineStations] of byLine) {    lineStations.sort((a, b) => a.distance - b.distance);
    
    for (let i = 0; i < lineStations.length - 1; i++) {
      const from = lineStations[i];
      const to = lineStations[i + 1];
      
      connections.push({
        line: line,
        color: from.color,
        from: { name: from.name, lat: from.lat, lng: from.lng },
        to: { name: to.name, lat: to.lat, lng: to.lng },
        opened: Math.max(from.opened, to.opened)
      });
    }
  }
  return connections;
}