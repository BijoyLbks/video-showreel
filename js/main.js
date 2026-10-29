/**
 * Main Portfolio & Showreel Viewer Controller
 */
import { StorageAdapter } from './storage.js';
import { AppConfig } from './config.js';

let allProjects = [];
let activeCategory = 'All';

// DOM Elements
const heroReelContainer = document.getElementById('heroReelContainer');
const heroPoster = document.getElementById('heroPoster');
const heroTitle = document.getElementById('heroTitle');
const heroClient = document.getElementById('heroClient');
const heroRole = document.getElementById('heroRole');
const heroDuration = document.getElementById('heroDuration');

const filterTabsContainer = document.getElementById('filterTabs');
const videoGrid = document.getElementById('videoGrid');

// Modal Elements
const cinemaModal = document.getElementById('cinemaModal');
const modalIframe = document.getElementById('modalIframe');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const modalTitle = document.getElementById('modalTitle');
const modalClient = document.getElementById('modalClient');
const modalCategory = document.getElementById('modalCategory');
const modalYear = document.getElementById('modalYear');
const modalDesc = document.getElementById('modalDesc');

let heroProject = null;

// Initialize
async function init() {
  renderCategoryTabs();
  await loadProjects();
  setupEventListeners();
}

/**
 * Render category filter buttons
 */
function renderCategoryTabs() {
  filterTabsContainer.innerHTML = AppConfig.categories.map(cat => `
    <button class="filter-btn ${cat === activeCategory ? 'active' : ''}" data-category="${cat}">
      ${cat}
    </button>
  `).join('');

  filterTabsContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    const cat = btn.dataset.category;
    setActiveCategory(cat);
  });
}

function setActiveCategory(cat) {
  activeCategory = cat;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.category === cat);
  });
  renderGrid();
}

/**
 * Load projects from StorageAdapter
 */
async function loadProjects() {
  allProjects = await StorageAdapter.getProjects();
  
  // Find featured hero showreel (or fallback to first item)
  heroProject = allProjects.find(p => p.featured) || allProjects[0];
  updateHeroSection(heroProject);

  renderGrid();
}

/**
 * Update the hero showreel display
 */
function updateHeroSection(project) {
  if (!project) return;
  heroPoster.src = project.thumbnailUrl || 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1600&q=80';
  heroTitle.textContent = project.title;
  heroClient.textContent = project.client || 'Featured Film';
  heroRole.textContent = project.role || 'Cinematography';
  heroDuration.textContent = project.duration || '02:00';

  heroReelContainer.onclick = () => openModal(project);
}

/**
 * Render the video grid based on active filter
 */
function renderGrid() {
  const filtered = activeCategory === 'All'
    ? allProjects
    : allProjects.filter(p => p.category.toLowerCase() === activeCategory.toLowerCase());

  if (filtered.length === 0) {
    videoGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
        <p style="font-size: 1.1rem;">No projects found in this category.</p>
      </div>
    `;
    return;
  }

  videoGrid.innerHTML = filtered.map(p => createCardHTML(p)).join('');

  // Attach card click handlers
  document.querySelectorAll('.video-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      const proj = allProjects.find(item => item.id === id);
      if (proj) openModal(proj);
    });
  });
}

/**
 * Generate video card HTML
 */
function createCardHTML(p) {
  const isVertical = p.aspectRatio === '9:16';
  const badgeClass = `badge-${p.sourceType || 'youtube'}`;
  const badgeLabel = getBadgeLabel(p.sourceType);
  const fallbackThumb = p.thumbnailUrl || 'https://images.unsplash.com/photo-1518173946687-a4c8a383392e?auto=format&fit=crop&w=1000&q=80';

  return `
    <div class="video-card" data-id="${p.id}">
      <div class="card-media-wrapper ${isVertical ? 'ratio-9-16' : ''}">
        <img class="card-poster" src="${fallbackThumb}" alt="${p.title}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1518173946687-a4c8a383392e?auto=format&fit=crop&w=1000&q=80'">
        
        <span class="card-source-badge ${badgeClass}">
          ${badgeLabel}
        </span>

        ${p.duration ? `<span class="card-duration-badge">${p.duration}</span>` : ''}

        <div class="card-play-hover">
          <div class="card-play-btn">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          </div>
        </div>
      </div>

      <div class="card-content">
        <div class="card-meta-row">
          <span>${p.category || 'Work'}</span>
          <span>${p.year || ''}</span>
        </div>
        <h3 class="card-title">${p.title}</h3>
        <p class="card-client">${p.client || ''}</p>
        ${p.description ? `<p class="card-description">${p.description}</p>` : ''}
      </div>
    </div>
  `;
}

function getBadgeLabel(sourceType) {
  switch (sourceType) {
    case 'youtube': return 'YouTube';
    case 'vimeo': return 'Vimeo';
    case 'playlist': return 'Playlist';
    case 'gdrive': return 'Google Drive';
    default: return 'Video';
  }
}

/**
 * Open Cinema Lightbox
 */
function openModal(project) {
  modalTitle.textContent = project.title;
  modalClient.textContent = project.client ? `${project.client} • ${project.role || 'Cinematography'}` : (project.role || '');
  modalCategory.textContent = project.category || 'Video';
  modalYear.textContent = project.year || '';
  modalDesc.textContent = project.description || 'Full production showreel piece.';

  // Set embed URL with autoplay
  let embedUrl = project.embedUrl || project.sourceUrl;
  modalIframe.src = embedUrl;

  cinemaModal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

/**
 * Close Cinema Lightbox
 */
function closeModal() {
  cinemaModal.classList.remove('open');
  modalIframe.src = '';
  document.body.style.overflow = '';
}

function setupEventListeners() {
  modalCloseBtn.addEventListener('click', closeModal);

  // Close on backdrop click
  cinemaModal.addEventListener('click', (e) => {
    if (e.target === cinemaModal) closeModal();
  });

  // Close on Escape key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && cinemaModal.classList.contains('open')) {
      closeModal();
    }
  });
}

// Boot
window.addEventListener('DOMContentLoaded', () => {
  init();

  // Authentic 24fps Film/VHS Timecode counter
  const clockEl = document.getElementById('vhsClock');
  if (clockEl) {
    let frame = 0;
    setInterval(() => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      const f = String(frame % 24).padStart(2, '0');
      clockEl.textContent = `${h}:${m}:${s}:${f}`;
      frame++;
    }, 1000 / 24);
  }
});
