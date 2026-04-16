import L from 'leaflet';
import * as d3 from 'd3';

const LINE_COLORS = {
  Red: '#FF4040', Yellow: '#FFDF00', Blue: '#4169E1', Green: '#20B2AA',
  Violet: '#553592', Orange: '#FF8C00', Magenta: '#CC338B', Pink: '#FC8EAC',
  Grey: '#838996', Aqua: '#00BFFF',
};

let data, map, gConn, gStn;
let stnEls = new Map(), connEls = new Map(), showLabels = false;
let playing = false, playInterval = null;

/* ---- Data ---- */

async function loadData() {
  const [raw, stops] = await Promise.all([
    d3.csv('data/delhi-metro-stations.csv'),
    d3.csv('data/line-stops.csv'),
  ]);
  const stations = raw.map(d => ({
    id: +d.ID, name: d['Station Name'].trim(), line: d.Line.trim(),
    opened: +d.Opened, layout: d.Layout.trim(),
    lat: +d.Latitude, lng: +d.Longitude,
    color: LINE_COLORS[d.Line.trim()] || '#888',
  }));
  const connections = [];
  for (const [line, lineStops] of d3.group(stops, d => d.Line.trim())) {
    const sorted = lineStops.sort((a, b) => +a.Stop_Order - +b.Stop_Order);
    for (let i = 0; i < sorted.length - 1; i++) {
      const fn = sorted[i]['Station Name'].trim(), tn = sorted[i + 1]['Station Name'].trim();
      const from = stations.find(s => s.name === fn && s.line === line) || stations.find(s => s.name === fn);
      const to = stations.find(s => s.name === tn && s.line === line) || stations.find(s => s.name === tn);
      if (from && to) connections.push({
        line, color: LINE_COLORS[line] || '#888',
        from: { name: fn, lat: from.lat, lng: from.lng },
        to: { name: tn, lat: to.lat, lng: to.lng },
        opened: Math.max(from.opened, to.opened),
      });
    }
  }
  return { stations, connections, lines: [...new Set(stations.map(s => s.line))].sort() };
}

/* ---- Map ---- */

function pt(lat, lng) { return map.latLngToLayerPoint([lat, lng]); }

function initMap() {
  map = L.map('map', { center: [28.6139, 77.1025], zoom: 11, minZoom: 9, maxZoom: 17 });
  L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://stadiamaps.com/">Stadia</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://openstreetmap.org">OSM</a>',
    maxZoom: 19,
  }).addTo(map);

  const svgLayer = L.svg({ interactive: true }).addTo(map);
  const g = d3.select(svgLayer.getPane()).select('svg').select('g');
  d3.select(svgLayer.getPane()).select('svg').style('pointer-events', 'all');
  gConn = g.append('g');
  gStn = g.append('g');

  const refresh = () => {
    showLabels = map.getZoom() >= 13;
    d3.selectAll('.station-label').classed('visible', showLabels);
    renderConnections(+document.getElementById('year-slider').value, false);
    renderStations(+document.getElementById('year-slider').value, false);
  };
  map.on('moveend', refresh);
  map.on('zoomend', refresh);
}

function renderStations(year, animate) {
  const visible = data.stations.filter(s => s.opened <= year);
  for (const [id] of stnEls) {
    if (!visible.find(s => s.id === id)) {
      const e = stnEls.get(id); e.dot.remove(); e.glow.remove(); e.label.remove();
      stnEls.delete(id);
    }
  }
  for (const s of visible) {
    if (stnEls.has(s.id)) continue;
    const glow = gStn.append('circle').attr('r', 8).attr('fill', 'none')
      .attr('stroke', s.color).attr('stroke-width', 2).attr('stroke-opacity', 0).style('pointer-events', 'none');
    const dot = gStn.append('circle').attr('r', 0).attr('fill', s.color)
      .attr('stroke', '#0a0e17').attr('stroke-width', 1.5).style('cursor', 'pointer')
      .on('click', () => showModal(s))
      .on('mouseenter', function () { d3.select(this).attr('r', 8); glow.attr('stroke-opacity', 0.4); })
      .on('mouseleave', function () { d3.select(this).attr('r', 5); glow.attr('stroke-opacity', 0); });
    const label = gStn.append('text').attr('class', 'station-label')
      .classed('visible', showLabels).attr('dx', 8).attr('dy', 3).text(s.name);
    if (animate && s.opened === year)
      dot.transition().duration(500).ease(d3.easeElasticOut.amplitude(1).period(0.4)).attr('r', 5);
    else dot.attr('r', 5);
    stnEls.set(s.id, { dot, glow, label, s });
  }
  for (const [, e] of stnEls) {
    const p = pt(e.s.lat, e.s.lng);
    e.dot.attr('cx', p.x).attr('cy', p.y);
    e.glow.attr('cx', p.x).attr('cy', p.y);
    e.label.attr('x', p.x).attr('y', p.y);
  }
}

function renderConnections(year, animate) {
  const visible = data.connections.filter(c => c.opened <= year);
  const key = c => `${c.line}-${c.from.name}-${c.to.name}`;
  for (const [k] of connEls) {
    if (!visible.find(c => key(c) === k)) { connEls.get(k).remove(); connEls.delete(k); }
  }
  for (const c of visible) {
    const k = key(c);
    if (!connEls.has(k)) {
      const f = pt(c.from.lat, c.from.lng), t = pt(c.to.lat, c.to.lng);
      const line = gConn.append('line').attr('x1', f.x).attr('y1', f.y).attr('x2', t.x).attr('y2', t.y)
        .attr('stroke', c.color).attr('stroke-width', 3).attr('stroke-opacity', 0.85).attr('stroke-linecap', 'round');
      line._d = c;
      if (animate && c.opened === year) line.style('opacity', 0).transition().duration(600).style('opacity', 1);
      connEls.set(k, line);
    }
  }
  for (const [, l] of connEls) {
    if (!l._d) continue;
    const f = pt(l._d.from.lat, l._d.from.lng), t = pt(l._d.to.lat, l._d.to.lng);
    l.attr('x1', f.x).attr('y1', f.y).attr('x2', t.x).attr('y2', t.y);
  }
}

function clearAll() {
  for (const [, e] of stnEls) { e.dot.remove(); e.glow.remove(); e.label.remove(); }
  stnEls.clear();
  for (const [, e] of connEls) e.remove();
  connEls.clear();
}

/* ---- Timeline ---- */

function initTimeline() {
  const sl = document.getElementById('year-slider');
  sl.addEventListener('input', () => goToYear(+sl.value, false));
  document.getElementById('play-btn').addEventListener('click', () => {
    playing = !playing;
    document.getElementById('play-icon').style.display = playing ? 'none' : 'block';
    document.getElementById('pause-icon').style.display = playing ? 'block' : 'none';
    document.getElementById('play-btn').classList.toggle('active', playing);
    if (playing) {
      playInterval = setInterval(() => {
        let y = +sl.value;
        if (y >= +sl.max) { sl.value = sl.min; goToYear(+sl.min, false); return; }
        sl.value = ++y; goToYear(y, true);
      }, 1000);
    } else { clearInterval(playInterval); playInterval = null; }
  });
}

function goToYear(year, animate) {
  const sl = document.getElementById('year-slider');
  document.getElementById('current-year').textContent = year;
  document.getElementById('timeline-progress').style.width = `${((year - +sl.min) / (+sl.max - +sl.min)) * 100}%`;
  if (!data) return;
  clearAll();
  renderConnections(year, animate);
  renderStations(year, animate);
  // Update stat placeholders that we can derive
  const active = data.stations.filter(s => s.opened <= year);
  document.getElementById('stat-stations').textContent = new Set(active.map(s => s.name)).size || '—';
  document.getElementById('stat-lines').textContent = new Set(active.map(s => s.line)).size || '—';
  // Legend
  document.getElementById('legend-items').innerHTML = data.lines.map(name => {
    const count = active.filter(s => s.line === name).length;
    return `<div class="legend-item${count ? ' visible' : ''}">
      <span class="legend-dot" style="background:${count ? LINE_COLORS[name] : '#333'}"></span>
      <span class="legend-name">${name} Line</span>
      <span class="legend-count">${count || ''}</span></div>`;
  }).join('');
}

/* ---- Modal (placeholder) ---- */

function showModal(station) {
  const lines = [...new Set(data.stations.filter(s => s.name === station.name).map(s => s.line))];
  document.getElementById('modal-name').textContent = station.name;
  document.getElementById('modal-badges').innerHTML = lines.map(l => {
    const c = LINE_COLORS[l], rgb = [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
    const fg = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255 > 0.5 ? '#000' : '#fff';
    return `<span class="modal-badge" style="background:${c};color:${fg}">${l} Line</span>`;
  }).join('');
  document.getElementById('modal-info').textContent = `${station.layout} · Opened ${station.opened}`;
  document.getElementById('station-modal').classList.remove('hidden');
}

function hideModal() { document.getElementById('station-modal').classList.add('hidden'); }

/* ---- Init ---- */

(async function () {
  try {
    data = await loadData();
    initMap();
    initTimeline();
    document.getElementById('modal-close').addEventListener('click', hideModal);
    document.getElementById('modal-backdrop').addEventListener('click', hideModal);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') hideModal(); });
    goToYear(2002, false);
    setTimeout(() => document.getElementById('loading-screen').classList.add('loaded'), 600);
  } catch (err) {
    console.error(err);
    document.querySelector('.loader-subtitle').textContent = 'Failed to load. Please refresh.';
  }
})();
