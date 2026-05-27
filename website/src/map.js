import L from 'leaflet';
import * as d3 from 'd3';

let map, svgLayer, g, gConnections, gStations, gRidership;
let stationElements = new Map();
let connectionElements = new Map();
let ridershipElements = new Map();
let showLabels = false;

/**
 * Initialize Leaflet map with dark tiles and D3 SVG overlay
 */
export function initMap() {
  map = L.map('map', {
    center: [28.6139, 77.1025],
    zoom: 11,
    zoomControl: true,
    attributionControl: true,
    minZoom: 9,
    maxZoom: 17,
  });

  L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://openstreetmap.org">OSM</a>',
    maxZoom: 19,
  }).addTo(map);

  svgLayer = L.svg({ interactive: true }).addTo(map);
  g = d3.select(svgLayer.getPane()).select('svg').select('g');

  gConnections = g.append('g').attr('class', 'layer-connections');
  gStations = g.append('g').attr('class', 'layer-stations');
  gRidership = g.append('g').attr('class', 'layer-ridership');

  d3.select(svgLayer.getPane()).select('svg').style('pointer-events', 'all');

  map.on('zoomend', () => {
    const zoom = map.getZoom();
    showLabels = zoom >= 13;
    d3.selectAll('.station-label')
      .classed('visible', showLabels);
  });

  return map;
}

/**
 * Project lat/lng to SVG pixel coordinates
 */
function projectPoint(lat, lng) {
  const point = map.latLngToLayerPoint([lat, lng]);
  return point;
}

/**
 * Render connections (metro lines) for a given year
 */
export function renderConnections(connections, year, animate = true) {
  const visible = connections.filter(c => c.opened <= year);

  for (const [key, el] of connectionElements) {
    const conn = visible.find(c => `${c.line}-${c.from.name}-${c.to.name}` === key);
    if (!conn) {
      el.remove();
      connectionElements.delete(key);
    }
  }

  for (const conn of visible) {
    const key = `${conn.line}-${conn.from.name}-${conn.to.name}`;
    
    if (!connectionElements.has(key)) {
      const line = gConnections.append('line')
        .attr('class', 'metro-line')
        .attr('stroke', conn.color)
        .attr('stroke-width', 3)
        .attr('stroke-opacity', 0.85);

      if (animate && conn.opened === year) {
        line.style('opacity', 0)
          .transition()
          .duration(600)
          .style('opacity', 1)
          .attr('class', 'metro-line visible');
      } else {
        line.classed('visible', true);
        line.style('opacity', 1);
      }

      connectionElements.set(key, line);
    }
  }

  updatePositions();
}

/**
 * Render station dots for a given year
 */
export function renderStations(stations, year, onStationClick, animate = true) {
  const visible = stations.filter(s => s.opened <= year);

  for (const [id, els] of stationElements) {
    const station = visible.find(s => s.id === id);
    if (!station) {
      els.dot.remove();
      els.glow.remove();
      if (els.label) els.label.remove();
      stationElements.delete(id);
    }
  }

  for (const station of visible) {
    if (!stationElements.has(station.id)) {
      const glow = gStations.append('circle')
        .attr('class', 'station-glow')
        .attr('r', 8)
        .attr('fill', 'none')
        .attr('stroke', station.color)
        .attr('stroke-width', 2)
        .attr('stroke-opacity', 0)
        .style('pointer-events', 'none');

      const dot = gStations.append('circle')
        .attr('class', 'station-dot')
        .attr('r', 0)
        .attr('fill', station.color)
        .attr('stroke', '#0a0e17')
        .attr('stroke-width', 1.5)
        .style('cursor', 'pointer')
        .on('click', () => onStationClick(station))
        .on('mouseenter', function () {
          d3.select(this).attr('r', 8);
          glow.attr('stroke-opacity', 0.4);
        })
        .on('mouseleave', function () {
          d3.select(this).attr('r', 5);
          glow.attr('stroke-opacity', 0);
        });

      const label = gStations.append('text')
        .attr('class', 'station-label')
        .classed('visible', showLabels)
        .attr('dx', 8)
        .attr('dy', 3)
        .text(station.name);

      if (animate && station.opened === year) {
        dot.transition()
          .duration(500)
          .ease(d3.easeElasticOut.amplitude(1).period(0.4))
          .attr('r', 5);
      } else {
        dot.attr('r', 5);
      }

      stationElements.set(station.id, { dot, glow, label, station });
    }
  }

  updatePositions();
}

let particleAnimationId = null;
let particles = [];
let heatmapElements = new Map();

/**
 * Render full ridership visualization: heatmap glow + flowing particles
 */
export function renderRidership(stations, year, ridershipData, connections, show) {
  stopParticles();
  for (const [, el] of ridershipElements) el.remove();
  ridershipElements.clear();
  for (const [, el] of heatmapElements) el.remove();
  heatmapElements.clear();

  if (!show) return;

  const yearData = ridershipData.find(r => r.year === year);
  if (!yearData || yearData.dailyAvg === 0) return;

  const visible = stations.filter(s => s.opened <= year);
  const visibleConns = connections.filter(c => c.opened <= year);
  const avgPerStation = yearData.dailyAvg / Math.max(visible.length, 1);

  let defs = g.select('defs');
  if (defs.empty()) defs = g.append('defs');
  defs.selectAll('.heatmap-gradient').remove();

  const maxRidership = avgPerStation * 3;
  for (const station of visible) {
    const isInterchange = visible.filter(s => s.name === station.name).length > 1;
    const mult = isInterchange ? 2.5 : 1.0;
    const stationRidership = avgPerStation * mult;
    const intensity = Math.min(stationRidership / maxRidership, 1);

    const heatColor = d3.interpolateYlOrRd(0.3 + intensity * 0.7);
    const glowR = 12 + intensity * 25;

    const gradientId = `heatmap-${station.id}`;
    const gradient = defs.append('radialGradient')
      .attr('class', 'heatmap-gradient')
      .attr('id', gradientId);
    gradient.append('stop').attr('offset', '0%').attr('stop-color', heatColor).attr('stop-opacity', 0.5 * intensity + 0.1);
    gradient.append('stop').attr('offset', '100%').attr('stop-color', heatColor).attr('stop-opacity', 0);

    const glow = gRidership.append('circle')
      .attr('class', 'station-heatmap-glow')
      .attr('r', glowR)
      .attr('fill', `url(#${gradientId})`);

    heatmapElements.set(station.id, glow);
  }

  const ridershipScale = yearData.dailyAvg / 8000000; // normalize to peak ridership
  particles = [];

  for (const conn of visibleConns) {
    const particleCount = Math.max(1, Math.round(1 + ridershipScale * 3));
    for (let i = 0; i < particleCount; i++) {
      const circle = gRidership.append('circle')
        .attr('class', 'flow-particle')
        .attr('r', 2)
        .attr('fill', conn.color)
        .attr('fill-opacity', 0.7);

      particles.push({
        el: circle,
        conn,
        t: Math.random(), 
        speed: (0.003 + ridershipScale * 0.005) * (0.7 + Math.random() * 0.6),
        direction: Math.random() > 0.5 ? 1 : -1,
      });
    }
  }

  updateRidershipPositions();

  startParticles();
}

function startParticles() {
  if (particleAnimationId) return;

  function animate() {
    for (const p of particles) {
      p.t += p.speed * p.direction;
      if (p.t > 1) { p.t = 0; }
      if (p.t < 0) { p.t = 1; }

      const fromPt = projectPoint(p.conn.from.lat, p.conn.from.lng);
      const toPt = projectPoint(p.conn.to.lat, p.conn.to.lng);
      const x = fromPt.x + (toPt.x - fromPt.x) * p.t;
      const y = fromPt.y + (toPt.y - fromPt.y) * p.t;
      p.el.attr('cx', x).attr('cy', y);
    }
    particleAnimationId = requestAnimationFrame(animate);
  }

  particleAnimationId = requestAnimationFrame(animate);
}

function stopParticles() {
  if (particleAnimationId) {
    cancelAnimationFrame(particleAnimationId);
    particleAnimationId = null;
  }
  for (const p of particles) p.el.remove();
  particles = [];
}

function updateRidershipPositions() {
  for (const [id, glow] of heatmapElements) {
    const els = stationElements.get(id);
    if (els) {
      const pt = projectPoint(els.station.lat, els.station.lng);
      glow.attr('cx', pt.x).attr('cy', pt.y);
    }
  }
}

/**
 * Update SVG element positions on map pan/zoom
 */
export function updatePositions() {
  for (const [, els] of stationElements) {
    const pt = projectPoint(els.station.lat, els.station.lng);
    els.dot.attr('cx', pt.x).attr('cy', pt.y);
    els.glow.attr('cx', pt.x).attr('cy', pt.y);
    if (els.label) {
      els.label.attr('x', pt.x).attr('y', pt.y);
    }
  }

  updateRidershipPositions();
}

/**
 * Render connections with stored coordinate data
 */
export function renderConnectionsWithData(connections, year, animate = true) {
  const visible = connections.filter(c => c.opened <= year);

  for (const [key, el] of connectionElements) {
    if (!visible.find(c => `${c.line}-${c.from.name}-${c.to.name}` === key)) {
      el.remove();
      connectionElements.delete(key);
    }
  }

  for (const conn of visible) {
    const key = `${conn.line}-${conn.from.name}-${conn.to.name}`;

    if (!connectionElements.has(key)) {
      const fromPt = projectPoint(conn.from.lat, conn.from.lng);
      const toPt = projectPoint(conn.to.lat, conn.to.lng);

      const line = gConnections.append('line')
        .attr('class', 'metro-line visible')
        .attr('x1', fromPt.x).attr('y1', fromPt.y)
        .attr('x2', toPt.x).attr('y2', toPt.y)
        .attr('stroke', conn.color)
        .attr('stroke-width', 3)
        .attr('stroke-opacity', 0.85);

      line._connData = conn;

      if (animate && conn.opened === year) {
        line.style('opacity', 0)
          .transition().duration(600)
          .style('opacity', 1);
      }

      connectionElements.set(key, line);
    }
  }

  for (const [, line] of connectionElements) {
    if (line._connData) {
      const fromPt = projectPoint(line._connData.from.lat, line._connData.from.lng);
      const toPt = projectPoint(line._connData.to.lat, line._connData.to.lng);
      line.attr('x1', fromPt.x).attr('y1', fromPt.y)
          .attr('x2', toPt.x).attr('y2', toPt.y);
    }
  }
}

/**
 * Clear everything and re-render for a new year
 */
export function clearAll() {
  for (const [, els] of stationElements) {
    els.dot.remove();
    els.glow.remove();
    if (els.label) els.label.remove();
  }
  stationElements.clear();

  for (const [, el] of connectionElements) {
    el.remove();
  }
  connectionElements.clear();

  for (const [, el] of ridershipElements) {
    el.remove();
  }
  ridershipElements.clear();

  stopParticles();
  for (const [, el] of heatmapElements) el.remove();
  heatmapElements.clear();
}

/**
 * Attach map move/zoom handler
 */
export function onMapMove(callback) {
  if (map) {
    map.on('moveend', callback);
    map.on('zoomend', callback);
  }
}

export function getMap() {
  return map;
}

/**
 * Calcule et applique le niveau de zoom minimum et les limites de navigation (panning)
 */
export function setDynamicMinZoom(stations) {
  if (!stations || stations.length === 0 || !map) return;

  let minLat = Infinity, maxLat = -Infinity;
  let minLng = Infinity, maxLng = -Infinity;

  for (const s of stations) {
    if (s.lat < minLat) minLat = s.lat;
    if (s.lat > maxLat) maxLat = s.lat;
    if (s.lng < minLng) minLng = s.lng;
    if (s.lng > maxLng) maxLng = s.lng;
  }

  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;
  const latSpan = maxLat - minLat;
  const lngSpan = maxLng - minLng;

  const expandedBounds = L.latLngBounds(
    [centerLat - latSpan, centerLng - lngSpan],
    [centerLat + latSpan, centerLng + lngSpan]
  );
  map.setMinZoom(map.getBoundsZoom(expandedBounds));

  const latMargin = 0.5;
  const lngMargin = 0.5; 

  const maxBounds = L.latLngBounds(
    [minLat - latMargin, minLng - lngMargin], // Sud-Ouest
    [maxLat + latMargin, maxLng + lngMargin]  // Nord-Est
  );

  map.setMaxBounds(maxBounds);

  map.options.maxBoundsViscosity = 1.0;
}