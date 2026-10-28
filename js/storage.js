/**
 * Storage & Data Adapter
 * Automatically switches between:
 * 1. Cloudflare Pages Functions API (/api/projects) backed by Cloudflare D1
 * 2. LocalStorage (with data/default-projects.json initial seed) for instant local development
 */

const LOCAL_STORAGE_KEY = 'aura_portfolio_projects_v1';
const AUTH_TOKEN_KEY = 'aura_admin_token';
const ADMIN_PIN_KEY = 'aura_admin_pin';

export const StorageAdapter = {
  activeMode: 'detecting', // 'cloudflare_d1' | 'local_storage'

  /**
   * Determine whether Cloudflare Pages D1 backend is available
   */
  async detectBackend() {
    try {
      const res = await fetch('/api/projects', { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) || (data && Array.isArray(data.projects))) {
          this.activeMode = 'cloudflare_d1';
          return 'cloudflare_d1';
        }
      }
    } catch {
      // Backend not running (e.g. static local dev or static preview)
    }
    this.activeMode = 'local_storage';
    return 'local_storage';
  },

  /**
   * Fetch all portfolio projects
   */
  async getProjects() {
    if (this.activeMode === 'detecting') {
      await this.detectBackend();
    }

    if (this.activeMode === 'cloudflare_d1') {
      try {
        const res = await fetch('/api/projects');
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : (data.projects || []);
          return this.sortProjects(list);
        }
      } catch (err) {
        console.warn('Failed to load from Cloudflare D1 API, falling back to local storage:', err);
      }
    }

    // Local Storage fallback
    let localData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!localData) {
      // Fetch initial seed from default-projects.json
      try {
        const seedRes = await fetch('./data/default-projects.json');
        if (seedRes.ok) {
          const seedProjects = await seedRes.json();
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(seedProjects));
          return this.sortProjects(seedProjects);
        }
      } catch (err) {
        console.warn('Could not load seed JSON:', err);
      }
      return [];
    }

    try {
      const parsed = JSON.parse(localData);
      return this.sortProjects(parsed);
    } catch {
      return [];
    }
  },

  /**
   * Save a single project (Create or Update)
   */
  async saveProject(project) {
    if (!project.id) {
      project.id = 'proj-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    }
    if (!project.createdAt) {
      project.createdAt = new Date().toISOString();
    }
    project.updatedAt = new Date().toISOString();

    if (this.activeMode === 'cloudflare_d1') {
      try {
        const token = this.getAuthToken();
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(project)
        });
        if (res.ok) {
          return { success: true, project };
        }
      } catch (err) {
        console.warn('Cloudflare save failed, saving locally:', err);
      }
    }

    // Local storage save
    const current = await this.getProjects();
    const existingIndex = current.findIndex(p => p.id === project.id);
    if (existingIndex >= 0) {
      current[existingIndex] = { ...current[existingIndex], ...project };
    } else {
      current.push(project);
    }

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(current));
    return { success: true, project };
  },

  /**
   * Delete a project by ID
   */
  async deleteProject(id) {
    if (this.activeMode === 'cloudflare_d1') {
      try {
        const token = this.getAuthToken();
        const res = await fetch(`/api/projects?id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) return { success: true };
      } catch (err) {
        console.warn('Cloudflare delete failed, deleting locally:', err);
      }
    }

    const current = await this.getProjects();
    const filtered = current.filter(p => p.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
    return { success: true };
  },

  /**
   * Set a project as the main featured hero showreel
   */
  async setFeatured(id) {
    const list = await this.getProjects();
    for (const p of list) {
      p.featured = (p.id === id);
      await this.saveProject(p);
    }
    return { success: true };
  },

  /**
   * Reorder projects
   */
  async reorderProjects(orderedIds) {
    const list = await this.getProjects();
    const map = new Map(list.map(p => [p.id, p]));
    const updated = [];

    orderedIds.forEach((id, index) => {
      const item = map.get(id);
      if (item) {
        item.order = index + 1;
        updated.push(item);
      }
    });

    if (this.activeMode === 'cloudflare_d1') {
      try {
        const token = this.getAuthToken();
        await fetch('/api/projects/reorder', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ order: orderedIds })
        });
      } catch (err) {
        console.warn('Reorder API sync failed, updated locally:', err);
      }
    }

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  },

  /**
   * Reset data to default seed
   */
  async resetToDefaults() {
    try {
      const res = await fetch('./data/default-projects.json');
      if (res.ok) {
        const seed = await res.json();
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(seed));
        return seed;
      }
    } catch (err) {
      console.error(err);
    }
    return [];
  },

  /**
   * Export all data as JSON file for download
   */
  async exportJSON() {
    const list = await this.getProjects();
    const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio-showreel-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Import data from JSON
   */
  async importJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed)) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed));
        return { success: true, count: parsed.length };
      }
      return { success: false, error: 'JSON file must contain an array of projects.' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  /**
   * Sort projects by order, featured first, then year
   */
  sortProjects(projects) {
    return [...projects].sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      const orderA = typeof a.order === 'number' ? a.order : 999;
      const orderB = typeof b.order === 'number' ? b.order : 999;
      return orderA - orderB;
    });
  },

  // Auth Helpers
  getAuthToken() {
    return sessionStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem(AUTH_TOKEN_KEY) || '';
  },

  setAuthToken(token) {
    sessionStorage.setItem(AUTH_TOKEN_KEY, token);
  },

  clearAuthToken() {
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
  },

  getSavedPin() {
    return localStorage.getItem(ADMIN_PIN_KEY) || 'admin123';
  },

  setSavedPin(newPin) {
    localStorage.setItem(ADMIN_PIN_KEY, newPin);
  }
};
