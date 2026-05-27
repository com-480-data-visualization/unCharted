let playInterval = null;
let isPlaying = false;
let speed = 1000;
let onYearChange = null;

const slider = () => document.getElementById('year-slider');
const playBtn = () => document.getElementById('play-btn');
const playIcon = () => document.getElementById('play-icon');
const pauseIcon = () => document.getElementById('pause-icon');
const yearDisplay = () => document.getElementById('current-year');
const progressBar = () => document.getElementById('timeline-progress');
const speedSelect = () => document.getElementById('speed-select');

/**
 * Initialize timeline controls
 * @param {Function} callback 
 */
export function initTimeline(callback) {
  onYearChange = callback;

  const sl = slider();
  const min = +sl.min;
  const max = +sl.max;

  sl.addEventListener('input', () => {
    const year = +sl.value;
    updateUI(year, min, max);
    if (onYearChange) onYearChange(year, false);
  });

  playBtn().addEventListener('click', togglePlay);


  speedSelect().addEventListener('change', (e) => {
    speed = +e.target.value;
    if (isPlaying) {
      stopPlay();
      startPlay();
    }
  });

  updateUI(+sl.value, min, max);
}

function updateUI(year, min, max) {
  yearDisplay().textContent = year;
  const pct = ((year - min) / (max - min)) * 100;
  progressBar().style.width = `${pct}%`;
}

function togglePlay() {
  if (isPlaying) {
    stopPlay();
  } else {
    startPlay();
  }
}

function startPlay() {
  isPlaying = true;
  playIcon().style.display = 'none';
  pauseIcon().style.display = 'block';
  playBtn().classList.add('active');

  const sl = slider();
  const max = +sl.max;

  playInterval = setInterval(() => {
    let year = +sl.value;
    if (year >= max) {
      year = +sl.min;
      sl.value = year;
      if (onYearChange) onYearChange(year, false);
      updateUI(year, +sl.min, max);
      return;
    }
    year++;
    sl.value = year;
    updateUI(year, +sl.min, max);
    if (onYearChange) onYearChange(year, true);
  }, speed);
}

export function stopPlay() {
  isPlaying = false;
  playIcon().style.display = 'block';
  pauseIcon().style.display = 'none';
  playBtn().classList.remove('active');
  if (playInterval) {
    clearInterval(playInterval);
    playInterval = null;
  }
}

/**
 * Set the year programmatically
 */
export function setYear(year) {
  const sl = slider();
  sl.value = year;
  updateUI(year, +sl.min, +sl.max);
}

/**
 * Get current year
 */
export function getCurrentYear() {
  return +slider().value;
}
