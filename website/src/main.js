import { loadAllData, calculateNetworkLength, getActiveLinesForYear, getRidershipForYear, getConnectionsForYear } from './data-loader.js';
import { initMap, renderStations, renderConnectionsWithData, renderRidership, clearAll, onMapMove, setDynamicMinZoom } from './map.js';
import { initTimeline, getCurrentYear, setYear, stopPlay } from './timeline.js';
import { initModal, showStationModal } from './station-modal.js';

let data = null;
let showRidershipViz = false;

async function init() {
  try {
    data = await loadAllData();

    initMap();

    setDynamicMinZoom(data.stations);

    initTimeline(handleYearChange);

    initModal();

    onMapMove(() => {
      const year = getCurrentYear();
      const dynamicConnections = getConnectionsForYear(data.stations, year); 

      renderConnectionsWithData(dynamicConnections, year, false);
      renderStations(data.stations, year, handleStationClick, false);
      if (showRidershipViz) {
        renderRidership(data.stations, year, data.ridership, dynamicConnections, true);
      }
    });

    document.getElementById('toggle-ridership').addEventListener('click', (e) => {
      showRidershipViz = !showRidershipViz;
      e.currentTarget.classList.toggle('active', showRidershipViz);
      const year = getCurrentYear();
      const dynamicConnections = getConnectionsForYear(data.stations, year); 
      
      renderRidership(data.stations, year, data.ridership, dynamicConnections, showRidershipViz);
      updateRidershipPanel(year);
    });

    handleYearChange(2002, false);

    initSlideshow();

    setTimeout(() => {
      document.getElementById('loading-screen').classList.add('hidden');
    }, 800);

  } catch (err) {
    console.error('Failed to initialize:', err);
    document.querySelector('.loader-subtitle').textContent = 'Failed to load data. Please refresh.';
  }
}

function handleYearChange(year, animate) {
  if (!data) return;

  const dynamicConnections = getConnectionsForYear(data.stations, year);

  clearAll();
  renderConnectionsWithData(dynamicConnections, year, animate); 
  renderStations(data.stations, year, handleStationClick, animate);

  updateStats(year);
  updateLegend(year);

  if (showRidershipViz) {
    renderRidership(data.stations, year, data.ridership, dynamicConnections, true); 
    updateRidershipPanel(year);
  }
}

function handleStationClick(station) {
  const year = getCurrentYear();
  showStationModal(station, year, data.stations, data.ridership);
}

function updateStats(year) {
  const rData = getRidershipForYear(data.ridership, year);
  const activeLines = getActiveLinesForYear(data.stations, year);

  const uniqueNames = new Set(data.stations.filter(s => s.opened <= year).map(s => s.name));

  document.getElementById('station-count').textContent = uniqueNames.size;
  document.getElementById('line-count').textContent = activeLines.length;

  const daily = rData ? rData.dailyAvg : 0;
  if (daily >= 1000000) {
    document.getElementById('ridership-value').textContent = `${(daily / 1000000).toFixed(1)}M`;
  } else if (daily >= 1000) {
    document.getElementById('ridership-value').textContent = `${(daily / 1000).toFixed(0)}K`;
  } else {
    document.getElementById('ridership-value').textContent = daily;
  }

  const calculatedKm = calculateNetworkLength(data.stations, year);
  document.getElementById('network-km').textContent = calculatedKm > 0 ? `${calculatedKm.toFixed(1)} km` : '0';
}

function updateRidershipPanel(year) {
  const panel = document.getElementById('ridership-panel');
  if (!showRidershipViz) {
    panel.classList.add('hidden');
    return;
  }
  panel.classList.remove('hidden');

  const rData = getRidershipForYear(data.ridership, year);
  const prevData = data.ridership.find(r => r.year === year - 1);

  document.getElementById('panel-year').textContent = year;

  const daily = rData ? rData.dailyAvg : 0;
  if (daily >= 1000000) {
    document.getElementById('panel-daily').textContent = `${(daily / 1000000).toFixed(1)}M`;
  } else if (daily >= 1000) {
    document.getElementById('panel-daily').textContent = `${(daily / 1000).toFixed(0)}K`;
  } else {
    document.getElementById('panel-daily').textContent = daily || '—';
  }

  const yoyEl = document.getElementById('panel-yoy');
  if (prevData && prevData.dailyAvg > 0 && rData && rData.dailyAvg > 0) {
    const change = ((rData.dailyAvg - prevData.dailyAvg) / prevData.dailyAvg * 100).toFixed(0);
    const isPositive = change >= 0;
    yoyEl.textContent = `${isPositive ? '▲' : '▼'} ${Math.abs(change)}%`;
    yoyEl.className = `panel-stat-value ${isPositive ? 'positive' : 'negative'}`;
  } else {
    yoyEl.textContent = '—';
    yoyEl.className = 'panel-stat-value';
  }

  const km = rData ? rData.networkKm : 0;
  document.getElementById('panel-network-km').textContent = km > 0 ? `${km} km` : '—';
}

function updateLegend(year) {
  const activeLines = getActiveLinesForYear(data.stations, year);
  const container = document.getElementById('legend-items');

  const html = data.lines.map(lineName => {
    const active = activeLines.find(l => l.name === lineName);
    const color = active ? active.color : '#333';
    const count = active ? active.count : 0;
    const visibleClass = active ? 'visible' : '';

    return `
      <div class="legend-item ${visibleClass}">
        <span class="legend-dot" style="background: ${color}"></span>
        <span class="legend-name">${lineName} Line</span>
        <span class="legend-count">${count > 0 ? count : ''}</span>
      </div>
    `;
  }).join('');

  container.innerHTML = html;
}

init();

function initSlideshow() {
  const steps = document.querySelectorAll('.step');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const infoToggleBtn = document.getElementById('info-toggle-btn');
  const panelsWrapper = document.getElementById('panels-wrapper');
  const timeline = document.getElementById('timeline');
  const skipBtn = document.getElementById('skip-btn');
  let currentStep = 0;
  let fadeTimer;

  if (!panelsWrapper || steps.length === 0) return;

  function updateStep() {
    steps.forEach((step, index) => {
      step.classList.toggle('is-active', index === currentStep);
    });

    if (prevBtn) prevBtn.disabled = currentStep === 0;
    if (nextBtn) nextBtn.disabled = currentStep === steps.length - 1;

    const activeStep = steps[currentStep];
    const targetYear = +activeStep.getAttribute('data-year');
    
    stopPlay();

    if (showRidershipViz) {
        showRidershipViz = false;
        document.getElementById('toggle-ridership').classList.remove('active');
        const panel = document.getElementById('ridership-panel');
        if (panel) panel.classList.add('hidden');
    }

    handleYearChange(targetYear, true);
    
    setYear(targetYear);

    if (activeStep.classList.contains('final-step')) {
      timeline.classList.add('visible');
      if (skipBtn) skipBtn.classList.add('hidden-btn');
    } else {
      timeline.classList.remove('visible');
      if (skipBtn) skipBtn.classList.remove('hidden-btn');
    }

    panelsWrapper.classList.remove('hidden-drawer');
    clearTimeout(fadeTimer);

    fadeTimer = setTimeout(() => {
      panelsWrapper.classList.add('hidden-drawer');
    }, 25000);
  }

  if (infoToggleBtn) {
    infoToggleBtn.addEventListener('click', () => {
      if (panelsWrapper.classList.contains('hidden-drawer')) {
        panelsWrapper.classList.remove('hidden-drawer');
        clearTimeout(fadeTimer); 
      } else {
        panelsWrapper.classList.add('hidden-drawer');
      }
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentStep > 0) { currentStep--; updateStep(); }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (currentStep < steps.length - 1) { currentStep++; updateStep(); }
    });
  }

  if (skipBtn) {
    skipBtn.addEventListener('click', () => {
      currentStep = steps.length - 1; 
      updateStep();
    });
  }

  updateStep();
}