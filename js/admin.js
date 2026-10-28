/**
 * Admin Dashboard Controller
 * Full CRUD, Video Link Auto-Parser, Live Embed Preview & D1 Sync
 */
import { StorageAdapter } from './storage.js';
import { VideoParser } from './parser.js';

let projects = [];
let currentParsedData = null;

// Auth Elements
const authModal = document.getElementById('authModal');
const authForm = document.getElementById('authForm');
const pinInput = document.getElementById('pinInput');
const authError = document.getElementById('authError');
const dashboardContent = document.getElementById('dashboardContent');
const backendBadge = document.getElementById('backendBadge');
const btnLogout = document.getElementById('btnLogout');

// Project Modal & Form Elements
const projectModal = document.getElementById('projectModal');
const projectForm = document.getElementById('projectForm');
const modalFormTitle = document.getElementById('modalFormTitle');
const closeProjectModalBtn = document.getElementById('closeProjectModalBtn');
const cancelProjectBtn = document.getElementById('cancelProjectBtn');
const btnAddNew = document.getElementById('btnAddNew');

// Inputs
const fieldProjectId = document.getElementById('fieldProjectId');
const fieldSourceUrl = document.getElementById('fieldSourceUrl');
const fieldTitle = document.getElementById('fieldTitle');
const fieldClient = document.getElementById('fieldClient');
const fieldCategory = document.getElementById('fieldCategory');
const fieldYear = document.getElementById('fieldYear');
const fieldDuration = document.getElementById('fieldDuration');
const fieldRole = document.getElementById('fieldRole');
const fieldAspectRatio = document.getElementById('fieldAspectRatio');
const fieldThumbnailUrl = document.getElementById('fieldThumbnailUrl');
const fieldDescription = document.getElementById('fieldDescription');
const fieldFeatured = document.getElementById('fieldFeatured');

// Feedback & Preview
const parserFeedback = document.getElementById('parserFeedback');
const livePreviewContainer = document.getElementById('livePreviewContainer');
const previewIframe = document.getElementById('previewIframe');
const previewSourceBadge = document.getElementById('previewSourceBadge');

// List & Actions
const adminProjectList = document.getElementById('adminProjectList');
const btnExport = document.getElementById('btnExport');
const importFileInput = document.getElementById('importFileInput');
const btnSettings = document.getElementById('btnSettings');

// Settings Elements
const settingsModal = document.getElementById('settingsModal');
const closeSettingsModalBtn = document.getElementById('closeSettingsModalBtn');
const settingsForm = document.getElementById('settingsForm');
const newPinInput = document.getElementById('newPinInput');
const btnResetDefaults = document.getElementById('btnResetDefaults');

/**
 * Initialize
 */
async function init() {
  setupAuth();
  setupFormAutoParser();
  setupEventListeners();
}

/**
 * Handle PIN Authentication
 */
function setupAuth() {
  const existingToken = StorageAdapter.getAuthToken();
  if (existingToken) {
    unlockDashboard();
  }

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pin = pinInput.value.trim();
    authError.style.display = 'none';

    // Try Cloudflare Auth endpoint
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });

      if (res.ok) {
        const data = await res.json();
        StorageAdapter.setAuthToken(data.token || pin);
        unlockDashboard();
        return;
      }
    } catch {
      // Offline / LocalStorage mode
    }

    // Local PIN check
    const localPin = StorageAdapter.getSavedPin();
    if (pin === localPin) {
      StorageAdapter.setAuthToken(`local-token-${pin}`);
      unlockDashboard();
    } else {
      authError.style.display = 'block';
    }
  });

  btnLogout.addEventListener('click', () => {
    StorageAdapter.clearAuthToken();
    window.location.reload();
  });
}

async function unlockDashboard() {
  authModal.classList.remove('open');
  dashboardContent.style.display = 'block';

  // Detect mode
  const mode = await StorageAdapter.detectBackend();
  if (mode === 'cloudflare_d1') {
    backendBadge.className = 'admin-status-badge status-d1';
    backendBadge.innerHTML = '<span>●</span> Live Cloudflare D1 Database Active';
  } else {
    backendBadge.className = 'admin-status-badge status-local';
    backendBadge.innerHTML = '<span>●</span> Local Storage Mode (Ready for Cloudflare Pages)';
  }

  await loadAndRenderProjects();
}

/**
 * Load and display projects list
 */
async function loadAndRenderProjects() {
  projects = await StorageAdapter.getProjects();

  if (projects.length === 0) {
    adminProjectList.innerHTML = `
      <div style="text-align: center; padding: 3rem; background: var(--bg-surface); border-radius: var(--radius-md); border: 1px dashed var(--border-subtle);">
        <p style="color: var(--text-secondary); margin-bottom: 1rem;">No videos in your portfolio yet.</p>
        <button class="btn-primary" onclick="document.getElementById('btnAddNew').click()">Add Your First Video</button>
      </div>
    `;
    return;
  }

  adminProjectList.innerHTML = projects.map((p, index) => {
    const isFirst = index === 0;
    const isLast = index === projects.length - 1;
    const thumb = p.thumbnailUrl || 'https://images.unsplash.com/photo-1518173946687-a4c8a383392e?auto=format&fit=crop&w=400&q=80';

    return `
      <div class="admin-project-item" data-id="${p.id}">
        <img class="admin-item-thumb" src="${thumb}" alt="${p.title}" onerror="this.src='https://images.unsplash.com/photo-1518173946687-a4c8a383392e?auto=format&fit=crop&w=400&q=80'">

        <div class="admin-item-info">
          <div class="admin-item-title">
            <span>${p.title}</span>
            ${p.featured ? `<span style="background: rgba(245, 158, 11, 0.2); color: var(--accent-gold); font-size: 0.7rem; padding: 0.2rem 0.6rem; border-radius: 9999px; border: 1px solid rgba(245, 158, 11, 0.4);">★ MAIN SHOWREEL</span>` : ''}
            <span class="card-source-badge badge-${p.sourceType || 'youtube'}" style="position: static; font-size: 0.65rem;">
              ${p.sourceType ? p.sourceType.toUpperCase() : 'VIDEO'}
            </span>
          </div>

          <div class="admin-item-sub">
            <strong>${p.category || 'Work'}</strong> • ${p.client || 'Self-Produced'} • ${p.year || ''} • ${p.duration || ''}
          </div>

          <div class="admin-item-url" title="${p.sourceUrl}">
            ${p.sourceUrl}
          </div>
        </div>

        <div class="admin-item-actions">
          <!-- Reorder Buttons -->
          <button class="btn-secondary btn-move-up" data-id="${p.id}" ${isFirst ? 'disabled style="opacity: 0.3;"' : ''} title="Move Up">▲</button>
          <button class="btn-secondary btn-move-down" data-id="${p.id}" ${isLast ? 'disabled style="opacity: 0.3;"' : ''} title="Move Down">▼</button>

          <!-- Make Featured Showreel -->
          ${!p.featured ? `<button class="btn-secondary btn-feature" data-id="${p.id}" title="Set as Main Hero Showreel">★ Star</button>` : ''}

          <!-- Edit -->
          <button class="btn-secondary btn-edit" data-id="${p.id}">Edit</button>

          <!-- Delete -->
          <button class="btn-danger btn-delete" data-id="${p.id}">Delete</button>
        </div>
      </div>
    `;
  }).join('');

  attachListListeners();
}

/**
 * Event listeners for project list items
 */
function attachListListeners() {
  // Move Up
  document.querySelectorAll('.btn-move-up').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const index = projects.findIndex(p => p.id === id);
      if (index > 0) {
        const order = projects.map(p => p.id);
        const temp = order[index - 1];
        order[index - 1] = order[index];
        order[index] = temp;
        await StorageAdapter.reorderProjects(order);
        await loadAndRenderProjects();
      }
    };
  });

  // Move Down
  document.querySelectorAll('.btn-move-down').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const index = projects.findIndex(p => p.id === id);
      if (index < projects.length - 1) {
        const order = projects.map(p => p.id);
        const temp = order[index + 1];
        order[index + 1] = order[index];
        order[index] = temp;
        await StorageAdapter.reorderProjects(order);
        await loadAndRenderProjects();
      }
    };
  });

  // Set Featured
  document.querySelectorAll('.btn-feature').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      await StorageAdapter.setFeatured(id);
      await loadAndRenderProjects();
    };
  });

  // Edit
  document.querySelectorAll('.btn-edit').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      const proj = projects.find(p => p.id === id);
      if (proj) openEditModal(proj);
    };
  });

  // Delete
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const proj = projects.find(p => p.id === id);
      if (confirm(`Are you sure you want to delete "${proj.title}"?`)) {
        await StorageAdapter.deleteProject(id);
        await loadAndRenderProjects();
      }
    };
  });
}

/**
 * Real-time Video URL Parser and Embed Previewer
 */
function setupFormAutoParser() {
  let debounceTimer;

  fieldSourceUrl.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const rawUrl = fieldSourceUrl.value.trim();
      if (!rawUrl) {
        parserFeedback.innerHTML = '';
        livePreviewContainer.style.display = 'none';
        previewIframe.src = '';
        currentParsedData = null;
        return;
      }

      const parsed = VideoParser.parse(rawUrl);
      if (!parsed.success) {
        parserFeedback.innerHTML = `<span style="color: #f87171;">⚠️ ${parsed.error}</span>`;
        livePreviewContainer.style.display = 'none';
        previewIframe.src = '';
        currentParsedData = null;
        return;
      }

      currentParsedData = parsed;
      parserFeedback.innerHTML = `✓ Detected: <strong>${parsed.sourceName}</strong>`;

      if (parsed.note) {
        parserFeedback.innerHTML += `<br><span style="color: var(--text-secondary); font-size: 0.75rem;">ℹ️ ${parsed.note}</span>`;
      }

      // Auto-populate thumbnail if user hasn't filled one
      if (parsed.thumbnailUrl && !fieldThumbnailUrl.value) {
        fieldThumbnailUrl.value = parsed.thumbnailUrl;
      }

      // If Vimeo, try fetching oEmbed thumbnail
      if (parsed.sourceType === 'vimeo' && !fieldThumbnailUrl.value) {
        const vimeoThumb = await VideoParser.fetchVimeoThumbnail(rawUrl);
        if (vimeoThumb) {
          fieldThumbnailUrl.value = vimeoThumb;
        }
      }

      // Update Live Preview Iframe
      previewIframe.src = parsed.embedUrl;
      previewSourceBadge.className = `card-source-badge badge-${parsed.sourceType}`;
      previewSourceBadge.textContent = parsed.sourceName;
      livePreviewContainer.style.display = 'block';
    }, 300);
  });
}

/**
 * Open Modal to Add New Video
 */
function openAddModal() {
  modalFormTitle.textContent = 'Add New Video';
  projectForm.reset();
  fieldProjectId.value = '';
  parserFeedback.innerHTML = '';
  livePreviewContainer.style.display = 'none';
  previewIframe.src = '';
  currentParsedData = null;

  projectModal.classList.add('open');
}

/**
 * Open Modal to Edit Existing Video
 */
function openEditModal(p) {
  modalFormTitle.textContent = 'Edit Video';
  fieldProjectId.value = p.id;
  fieldSourceUrl.value = p.sourceUrl || '';
  fieldTitle.value = p.title || '';
  fieldClient.value = p.client || '';
  fieldCategory.value = p.category || 'Commercials';
  fieldYear.value = p.year || '';
  fieldDuration.value = p.duration || '';
  fieldRole.value = p.role || '';
  fieldAspectRatio.value = p.aspectRatio || '16:9';
  fieldThumbnailUrl.value = p.thumbnailUrl || '';
  fieldDescription.value = p.description || '';
  fieldFeatured.checked = Boolean(p.featured);

  // Trigger parser preview for current URL
  const parsed = VideoParser.parse(p.sourceUrl);
  if (parsed.success) {
    currentParsedData = parsed;
    parserFeedback.innerHTML = `✓ Detected: <strong>${parsed.sourceName}</strong>`;
    previewIframe.src = p.embedUrl || parsed.embedUrl;
    previewSourceBadge.className = `card-source-badge badge-${parsed.sourceType}`;
    previewSourceBadge.textContent = parsed.sourceName;
    livePreviewContainer.style.display = 'block';
  }

  projectModal.classList.add('open');
}

function closeProjectModal() {
  projectModal.classList.remove('open');
  previewIframe.src = '';
}

/**
 * Save Project on Form Submit
 */
projectForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const sourceUrl = fieldSourceUrl.value.trim();
  const parsed = VideoParser.parse(sourceUrl);

  if (!parsed.success) {
    alert(parsed.error);
    return;
  }

  const embedUrl = parsed.embedUrl;
  const sourceType = parsed.sourceType;
  const thumbnailUrl = fieldThumbnailUrl.value.trim() || parsed.thumbnailUrl || 'https://images.unsplash.com/photo-1518173946687-a4c8a383392e?auto=format&fit=crop&w=1200&q=80';

  const projectPayload = {
    id: fieldProjectId.value || undefined,
    title: fieldTitle.value.trim(),
    client: fieldClient.value.trim(),
    category: fieldCategory.value,
    year: fieldYear.value.trim() || new Date().getFullYear().toString(),
    duration: fieldDuration.value.trim(),
    role: fieldRole.value.trim(),
    aspectRatio: fieldAspectRatio.value,
    sourceUrl,
    embedUrl,
    sourceType,
    thumbnailUrl,
    description: fieldDescription.value.trim(),
    featured: fieldFeatured.checked,
    order: fieldProjectId.value ? undefined : projects.length + 1
  };

  const result = await StorageAdapter.saveProject(projectPayload);
  if (result.success) {
    closeProjectModal();
    await loadAndRenderProjects();
  } else {
    alert('Failed to save project.');
  }
});

/**
 * Setup Global UI Event Listeners
 */
function setupEventListeners() {
  btnAddNew.addEventListener('click', openAddModal);
  closeProjectModalBtn.addEventListener('click', closeProjectModal);
  cancelProjectBtn.addEventListener('click', closeProjectModal);

  // Export JSON
  btnExport.addEventListener('click', async () => {
    await StorageAdapter.exportJSON();
  });

  // Import JSON
  importFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const res = await StorageAdapter.importJSON(event.target.result);
      if (res.success) {
        alert(`Successfully imported ${res.count} projects!`);
        await loadAndRenderProjects();
      } else {
        alert(`Import failed: ${res.error}`);
      }
      importFileInput.value = '';
    };
    reader.readAsText(file);
  });

  // Settings Modal (Change PIN)
  btnSettings.addEventListener('click', () => {
    newPinInput.value = '';
    settingsModal.classList.add('open');
  });

  closeSettingsModalBtn.addEventListener('click', () => {
    settingsModal.classList.remove('open');
  });

  settingsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const newPin = newPinInput.value.trim();
    if (newPin.length >= 4) {
      StorageAdapter.setSavedPin(newPin);
      alert('Admin PIN updated successfully!');
      settingsModal.classList.remove('open');
    } else {
      alert('PIN should be at least 4 characters.');
    }
  });

  // Reset to Demo Data
  btnResetDefaults.addEventListener('click', async () => {
    if (confirm('This will replace all your current projects with the demo showreels. Are you sure?')) {
      await StorageAdapter.resetToDefaults();
      alert('Portfolio reset to demo showreels!');
      settingsModal.classList.remove('open');
      await loadAndRenderProjects();
    }
  });
}

// Boot
window.addEventListener('DOMContentLoaded', init);
