/**
 * Fetch station image + extract from Wikipedia API
 * Uses MediaWiki pageimages + extracts endpoints (CC BY-SA, no API key)
 * Comprehensive Wikipedia mapping for Delhi Metro stations
 */

import * as d3 from 'd3';

export async function fetchStationInfo(station) {
  const wikiTitle = station.wikiLink 
    ? decodeURIComponent(station.wikiLink.split('/').pop()) 
    : `${station.name.replace(/ /g, '_')}_(Delhi_Metro)`;
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(wikiTitle)}&prop=pageimages|extracts&format=json&formatversion=2&pithumbsize=800&exintro=1&explaintext=1&redirects=1&origin=*`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const pages = data.query?.pages;
    if (!pages) return null;
    const page = Object.values(pages)[0];

    if (page && !page.missing) {
      return {
        wikiTitle: page.title,
        wikiUrl: station.wikiLink || `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`,
        extract: page.extract || "Pas de description.",
        image: page.thumbnail ? { url: page.thumbnail.source } : null
      };
    }
  } catch (e) {
    console.error("Erreur Wiki:", e);
  }
  return null;
}

const modal = () => document.getElementById('station-modal');
const backdrop = () => document.getElementById('modal-backdrop');
const closeBtn = () => document.getElementById('modal-close');
const imageContainer = () => document.getElementById('modal-image-container');
const stationNameEl = () => document.getElementById('modal-station-name');
const lineBadgesEl = () => document.getElementById('modal-line-badges');
const descriptionEl = () => document.getElementById('modal-description');
const statsGridEl = () => document.getElementById('modal-stats-grid');
const wikiLinkEl = () => document.getElementById('modal-wiki-link');
const attributionEl = () => document.getElementById('modal-attribution');

/**
 * Initialize modal event listeners
 */
export function initModal() {
  closeBtn().addEventListener('click', hideModal);
  backdrop().addEventListener('click', hideModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideModal();
  });
}

/**
 * Show the station detail modal with rich info
 */
export async function showStationModal(station, currentYear, allStations, ridershipData) {
  const m = modal();

  // On garde les badges simples (sans le nom de la branche) pour l'en-tête
  const linesServed = [];
  const seenLines = new Set();
  for (const s of allStations) {
    if (s.name === station.name && !seenLines.has(s.line)) {
      seenLines.add(s.line);
      linesServed.push({ name: s.line, color: s.color });
    }
  }

  lineBadgesEl().innerHTML = linesServed.map(l =>
    `<span class="modal-line-badge" style="background:${l.color};color:${getContrastColor(l.color)}">${l.name} Line</span>`
  ).join('');

  stationNameEl().textContent = station.name;

  descriptionEl().textContent = '';
  descriptionEl().style.display = 'none';

  const yearsOpen = currentYear - station.opened;
  let statusText;
  if (station.opened > currentYear) {
    statusText = `Opens in ${station.opened} (${station.opened - currentYear} years)`;
  } else if (station.opened === currentYear) {
    statusText = `Just opened in ${station.opened}!`;
  } else {
    statusText = `Opened ${station.opened} · ${yearsOpen} year${yearsOpen !== 1 ? 's' : ''} ago`;
  }

  const layoutIcons = { 'Elevated': '🏗️', 'Underground': '🚇', 'At-Grade': '🛤️' };
  const layoutIcon = layoutIcons[station.layout] || '🚉';

  const isInterchange = linesServed.length > 1;

  const rData = ridershipData.find(r => r.year === currentYear);
  let ridershipText = '—';
  if (rData && rData.dailyAvg > 0) {
    const uniqueStations = new Set(allStations.filter(s => s.opened <= currentYear).map(s => s.name)).size;
    const avgPerStation = rData.dailyAvg / Math.max(uniqueStations, 1);
    const mult = isInterchange ? 2.5 : 1.0;
    const est = Math.round(avgPerStation * mult);
    if (est >= 1000000) {
      ridershipText = `~${(est / 1000000).toFixed(1)}M/day`;
    } else if (est >= 1000) {
      ridershipText = `~${(est / 1000).toFixed(0)}K/day`;
    } else {
      ridershipText = `~${est}/day`;
    }
  }

  statsGridEl().innerHTML = `
    <div class="stat-card">
      <span class="stat-card-icon">📅</span>
      <span class="stat-card-value">${statusText}</span>
      <span class="stat-card-label">Status</span>
    </div>
    <div class="stat-card">
      <span class="stat-card-icon">${layoutIcon}</span>
      <span class="stat-card-value">${station.layout}</span>
      <span class="stat-card-label">Layout</span>
    </div>
    <div class="stat-card">
      <span class="stat-card-icon">${isInterchange ? '🔄' : '🚉'}</span>
      <span class="stat-card-value">${isInterchange ? 'Interchange' : linesServed[0].name + ' Line'}</span>
      <span class="stat-card-label">${linesServed.length} line${linesServed.length > 1 ? 's' : ''} served</span>
    </div>
    <div class="stat-card">
      <span class="stat-card-icon">👥</span>
      <span class="stat-card-value">${ridershipText}</span>
      <span class="stat-card-label">Est. Ridership (${currentYear})</span>
    </div>
  `;

  const chartContainer = d3.select('#modal-chart-container');
  chartContainer.selectAll('*').remove();

  // --- NOUVELLE LOGIQUE POUR GÉRER LES BRANCHES ---
  const branchesServed = [];
  const seenBranches = new Set();
  
  for (const s of allStations) {
    if (s.name === station.name) {
      const key = `${s.line}-${s.branch}`;
      if (!seenBranches.has(key)) {
        seenBranches.add(key);
        branchesServed.push({ 
          lineName: s.line, 
          branchName: s.branch, 
          color: s.color 
        });
      }
    }
  }

  branchesServed.forEach(branchObj => {
    const lineStations = allStations
      .filter(s => s.line === branchObj.lineName && s.branch === branchObj.branchName && s.opened <= currentYear)
      .sort((a, b) => a.distance - b.distance);

    if (lineStations.length > 0) {
      const startOffset = lineStations[0].distance; 
      const maxDist = lineStations[lineStations.length - 1].distance - startOffset || 1;

      let titleText = `Distance Profile - ${branchObj.lineName} Line`;
      if (branchObj.branchName && branchObj.branchName !== 'Main') {
         const cleanName = branchObj.branchName.replace(/_/g, ' '); 
         titleText += ` (${cleanName})`;
      }

      chartContainer.append('h4')
        .text(titleText)
        .attr('class', 'modal-chart-title')
        .style('color', branchObj.color);

      const width = 330;
      const height = 65;
      const margin = { top: 5, right: 0, bottom: 2, left: 0 };

      const svg = chartContainer.append('svg')
        .attr('width', '100%')
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('margin-bottom', '15px');

      const x = d3.scaleBand()
        .domain(lineStations.map(d => d.name))
        .range([margin.left, width - margin.right])
        .padding(0.15);

      const y = d3.scaleLinear()
        .domain([0, maxDist]) 
        .range([height - margin.bottom, margin.top]);

      let tooltip = d3.select('body').select('.chart-tooltip');
      if (tooltip.empty()) {
        tooltip = d3.select('body').append('div').attr('class', 'chart-tooltip');
      }

      svg.selectAll('rect')
        .data(lineStations)
        .enter()
        .append('rect')
        .attr('x', d => x(d.name))
        .attr('y', d => {
           const relativeDist = d.distance - startOffset;
           const h = height - margin.bottom - y(relativeDist);
           return h < 3 ? (height - margin.bottom - 3) : y(relativeDist);
        })
        .attr('width', x.bandwidth())
        .attr('height', d => {
           const relativeDist = d.distance - startOffset;
           return Math.max(3, height - margin.bottom - y(relativeDist));
        })
        .attr('rx', 2)
        .attr('fill', d => d.name === station.name ? branchObj.color : 'rgba(255, 255, 255, 0.1)')
        .style('cursor', 'crosshair')
        .style('transition', 'fill 0.3s ease')
        .on('mouseover', function(event, d) { 
          d3.select(this).attr('fill', branchObj.color); 
          
          const relativeDist = d.distance - startOffset;
          const toEnd = (maxDist - relativeDist).toFixed(2);
          
          let tooltipLine = branchObj.lineName;
          if (branchObj.branchName && branchObj.branchName !== 'Main') {
            tooltipLine += ` (${branchObj.branchName.replace(/_/g, ' ')})`;
          }
          
          tooltip.html(`<strong>${d.name} - ${tooltipLine}</strong><br/>📍 ${relativeDist.toFixed(2)} km from start<br/>🏁 ${toEnd} km to end`)
                 .classed('visible', true);
        })
        .on('mousemove', function(event) {
          const tooltipWidth = tooltip.node().offsetWidth;
          tooltip.style('left', (event.pageX - tooltipWidth - 15) + 'px')
                 .style('top', (event.pageY - 25) + 'px');
        })
        .on('mouseout', function(event, d) { 
          if(d.name !== station.name) d3.select(this).attr('fill', 'rgba(255, 255, 255, 0.1)'); 
          tooltip.classed('visible', false);
        });
    }
  });

  imageContainer().innerHTML = `
    <div class="modal-image-placeholder">
      <span>📷</span>
      <p>Loading image...</p>
    </div>
  `;
  wikiLinkEl().innerHTML = '';
  attributionEl().style.display = 'none';

  m.classList.remove('modal-hidden');

  document.body.classList.add('modal-active');

  const info = await fetchStationInfo(station);

  if (info) {
    if (info.image && info.image.url) {
      imageContainer().innerHTML = `<img src="${info.image.url}" alt="${station.name} metro station" loading="lazy" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22200%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22300%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 font-size=%2220%22%3EImage unavailable%3C/text%3E%3C/svg%3E'" />`;
      attributionEl().style.display = 'block';
    } else {
      imageContainer().innerHTML = `
        <div class="modal-image-placeholder">
          <span>📷</span>
          <p>Image from ${info.wikiTitle}</p>
        </div>
      `;
    }

    if (info.extract && info.extract.trim()) {
      const sentences = info.extract.split(/(?<=[.!?])\s+/);
      let truncated = sentences.slice(0, 3).join(' ');
      if (truncated.length > 500) {
        truncated = truncated.substring(0, 500) + '...';
      }
      descriptionEl().textContent = truncated;
      descriptionEl().style.display = 'block';
    } else {
      descriptionEl().style.display = 'none';
    }

    wikiLinkEl().innerHTML = `
      <a href="${info.wikiUrl}" target="_blank" rel="noopener" title="Source: ${info.wikiTitle}">
        📖 Read full article on Wikipedia →
      </a>
    `;
  } else {
    imageContainer().innerHTML = `
      <div class="modal-image-placeholder">
        <span>🚇</span>
        <p>Station information unavailable</p>
      </div>
    `;
    descriptionEl().style.display = 'none';
    wikiLinkEl().innerHTML = `<p style="color: #999; font-size: 0.9em;">No Wikipedia article found for this station</p>`;
  }
}

function hideModal() {
  modal().classList.add('modal-hidden');
  document.body.classList.remove('modal-active');
}

function getContrastColor(hexColor) {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000' : '#fff';
}