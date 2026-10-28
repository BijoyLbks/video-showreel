/**
 * Video Link Parser & Embed Generator
 * Supports:
 * - YouTube Video (watch, youtu.be, shorts, embed)
 * - YouTube Playlist (playlist?list=..., watch?v=...&list=...)
 * - Vimeo (standard, unlisted with hash, channels, player)
 * - Google Drive (shared link, view, open?id=...)
 */

export const VideoParser = {
  /**
   * Parse any supported video URL and extract metadata, embed URL, and default thumbnail.
   * @param {string} rawUrl
   * @returns {object|null} parsed object or error object
   */
  parse(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') {
      return { success: false, error: 'Empty or invalid URL provided.' };
    }

    const url = rawUrl.trim();

    // 1. Check for YouTube Playlist
    const ytPlaylistMatch = url.match(/[?&]list=([a-zA-Z0-9_-]+)/i);
    const isExplicitPlaylist = url.includes('/playlist') && ytPlaylistMatch;

    if (isExplicitPlaylist) {
      const playlistId = ytPlaylistMatch[1];
      return {
        success: true,
        sourceType: 'playlist',
        sourceName: 'YouTube Playlist',
        id: playlistId,
        embedUrl: `https://www.youtube.com/embed/videoseries?list=${playlistId}&autoplay=1`,
        thumbnailUrl: '', // user or fallback
        aspectRatio: '16:9',
        badgeColor: '#ef4444'
      };
    }

    // 2. Check for YouTube Single Video
    // Matches youtube.com/watch?v=, youtu.be/, youtube.com/embed/, youtube.com/shorts/
    const ytMatch = url.match(
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i
    );

    if (ytMatch) {
      const videoId = ytMatch[1];
      // If it also has a playlist list parameter, user might want playlist mode or single video with playlist
      const embedUrl = ytPlaylistMatch
        ? `https://www.youtube.com/embed/${videoId}?list=${ytPlaylistMatch[1]}&autoplay=1&rel=0`
        : `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;

      return {
        success: true,
        sourceType: ytPlaylistMatch ? 'playlist' : 'youtube',
        sourceName: ytPlaylistMatch ? 'YouTube Video in Playlist' : 'YouTube',
        id: videoId,
        embedUrl,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        thumbnailFallback: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        aspectRatio: url.includes('/shorts/') ? '9:16' : '16:9',
        badgeColor: '#ef4444'
      };
    }

    // 3. Check for Vimeo
    // Matches vimeo.com/123456789, player.vimeo.com/video/123456789, vimeo.com/123456789/abcdef (unlisted)
    const vimeoMatch = url.match(
      /(?:https?:\/\/)?(?:www\.)?(?:player\.)?vimeo\.com\/(?:video\/)?([0-9]+)(?:\/([a-zA-Z0-9]+))?/i
    );

    if (vimeoMatch) {
      const vimeoId = vimeoMatch[1];
      const unlistedHash = vimeoMatch[2];
      const embedUrl = unlistedHash
        ? `https://player.vimeo.com/video/${vimeoId}?h=${unlistedHash}&autoplay=1&title=0&byline=0&portrait=0`
        : `https://player.vimeo.com/video/${vimeoId}?autoplay=1&title=0&byline=0&portrait=0`;

      return {
        success: true,
        sourceType: 'vimeo',
        sourceName: 'Vimeo',
        id: vimeoId,
        unlistedHash: unlistedHash || null,
        embedUrl,
        thumbnailUrl: '', // Vimeo requires oEmbed lookup or custom input
        aspectRatio: '16:9',
        badgeColor: '#0ea5e9'
      };
    }

    // 4. Check for Google Drive
    // Matches drive.google.com/file/d/{id}/view, drive.google.com/open?id={id}
    const gDriveMatch = url.match(
      /(?:https?:\/\/)?drive\.google\.com\/(?:file\/d\/([a-zA-Z0-9_-]+)|open\?id=([a-zA-Z0-9_-]+))/i
    );

    if (gDriveMatch) {
      const driveId = gDriveMatch[1] || gDriveMatch[2];
      return {
        success: true,
        sourceType: 'gdrive',
        sourceName: 'Google Drive Stream',
        id: driveId,
        embedUrl: `https://drive.google.com/file/d/${driveId}/preview`,
        thumbnailUrl: '', // Drive doesn't allow direct thumbnail scraping without auth; fallback or custom
        aspectRatio: '16:9',
        badgeColor: '#3b82f6',
        note: 'Make sure your Google Drive file sharing is set to "Anyone with the link can view".'
      };
    }

    // Direct MP4 / Video file link
    if (url.match(/\.(mp4|webm|mov)(\?.*)?$/i)) {
      return {
        success: true,
        sourceType: 'direct',
        sourceName: 'Direct Video File',
        id: url,
        embedUrl: url,
        thumbnailUrl: '',
        aspectRatio: '16:9',
        badgeColor: '#10b981'
      };
    }

    return {
      success: false,
      error: 'Unrecognized URL. Please provide a valid YouTube, YouTube Playlist, Vimeo, or Google Drive link.'
    };
  },

  /**
   * Attempt to fetch oEmbed metadata for Vimeo if available
   */
  async fetchVimeoThumbnail(vimeoUrl) {
    try {
      const res = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(vimeoUrl)}`);
      if (res.ok) {
        const data = await res.json();
        return data.thumbnail_url || null;
      }
    } catch {
      // Ignore network errors on client
    }
    return null;
  }
};
