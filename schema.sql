-- Cloudflare D1 Schema for Video Portfolio Showreel
-- Run in Cloudflare dashboard or via Wrangler:
-- npx wrangler d1 execute video-portfolio-db --file=./schema.sql

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  client TEXT,
  category TEXT NOT NULL DEFAULT 'Commercials',
  year TEXT,
  sourceType TEXT NOT NULL,       -- 'youtube' | 'vimeo' | 'playlist' | 'gdrive'
  sourceUrl TEXT NOT NULL,
  embedUrl TEXT NOT NULL,
  thumbnailUrl TEXT,
  aspectRatio TEXT DEFAULT '16:9', -- '16:9' | '9:16' | '2.39:1'
  featured INTEGER DEFAULT 0,     -- 1 = featured showreel, 0 = regular
  duration TEXT,
  role TEXT,
  description TEXT,
  order_index INTEGER DEFAULT 999,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial data
INSERT OR IGNORE INTO projects (id, title, client, category, year, sourceType, sourceUrl, embedUrl, thumbnailUrl, aspectRatio, featured, duration, role, description, order_index)
VALUES 
('reel-hero', 'Cinematic Showreel 2026', 'Studio Showcase', 'Showreel', '2026', 'youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0', 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1600&q=80', '16:9', 1, '02:15', 'Director & DP', 'Selected commercial, narrative, and documentary cinematography highlights.', 1),
('proj-1', 'Echoes of Silence', 'Nordic Sound Records', 'Music Videos', '2025', 'vimeo', 'https://vimeo.com/76979871', 'https://player.vimeo.com/video/76979871?autoplay=1&title=0&byline=0&portrait=0', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80', '16:9', 0, '03:45', 'Director & Editor', 'Atmospheric music video shot on location in Iceland.', 2),
('proj-2', 'Velocity: Apex 01', 'Porsche Motorsport / Spec', 'Commercials', '2025', 'youtube', 'https://www.youtube.com/watch?v=ScMzIvxBSi4', 'https://www.youtube.com/embed/ScMzIvxBSi4?autoplay=1&rel=0', 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80', '16:9', 0, '01:00', 'Director of Photography', 'High-speed tracking commercial for electric hypercar concept.', 3),
('proj-3', 'Highland Horizons', 'National Geographic Explorations', 'Documentaries', '2024', 'gdrive', 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view', 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/preview', 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80', '16:9', 0, '08:20', 'Cinematographer & Colorist', 'Direct preview stream via Google Drive.', 4),
('proj-4', 'Brand Anthology 2025 Series', 'Luminary Studio', 'Playlists', '2025', 'playlist', 'https://www.youtube.com/playlist?list=PL4fGSI1pDJn6jXS_PEoN7GllB-Vv7B7vN', 'https://www.youtube.com/embed/videoseries?list=PL4fGSI1pDJn6jXS_PEoN7GllB-Vv7B7vN&autoplay=1', 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&q=80', '16:9', 0, 'Multi-Part', 'Series Director', 'A curated YouTube Playlist containing 5 episodic short-form brand films.', 5);
