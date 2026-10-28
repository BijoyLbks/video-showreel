# AURA CINEMA — Video Production Showreel & Portfolio

A high-performance, cinematic video production portfolio website built specifically for directors, cinematographers, and video production houses. Hosted on **Cloudflare Pages** with an integrated **Admin Dashboard** supporting **YouTube**, **Vimeo**, **YouTube Playlists**, and **Google Drive** video streams.

---

## 🌟 Key Features

- **Cinematic Dark Aesthetic**: Obsidian black layout (`#08080a`), ambient gold lighting, glassmorphism, responsive video cards, and smooth micro-interactions.
- **Spotlight Hero Showreel**: Full-bleed hero banner showcasing your primary showreel with high-res poster and instant cinema player.
- **Video Source Auto-Detection**:
  - **YouTube Single Videos**: Auto-extracts video ID, HD poster thumbnail (`maxresdefault.jpg`), and custom embeds.
  - **YouTube Playlists**: Supports `playlist?list=...` series embeds with autoplay.
  - **Vimeo**: Supports standard and unlisted Vimeo URLs with clean player chrome.
  - **Google Drive**: Converts public Google Drive share URLs into seamless streaming preview embeds.
- **Cinema Lightbox Modal**: Fluid 16:9 responsive theater player with keyboard navigation (Esc to close) and metadata display.
- **Category Filter Tabs**: Instant filtering by *All, Showreel, Commercials, Music Videos, Narrative, Documentaries, Playlists*.
- **Admin Dashboard (`/admin.html`)**:
  - Protected with customizable PIN/password authentication.
  - Real-time video URL parser with live embed preview before publishing.
  - Change project sequence (Move Up / Down).
  - One-click "Star as Main Showreel" (pins directly to the homepage hero).
  - Export and Import JSON backups anytime.
- **Zero-Dependency Architecture**:
  - Runs locally with pure Python (`python3 serve.py`) without needing Node.js or npm installed.
  - Works out of the box with `localStorage` fallback and seamlessly upgrades to **Cloudflare D1** serverless database on Cloudflare Pages.

---

## 🚀 Quick Start (Local Preview)

You can preview and test your portfolio immediately on your Mac:

```bash
# 1. Navigate to the project directory
cd "/Users/bijoy/Desktop/WEBSITE LOCAL"

# 2. Start the local server
python3 serve.py
```

Then open your browser:
- **Main Portfolio**: [http://localhost:3000](http://localhost:3000)
- **Admin Dashboard**: [http://localhost:3000/admin.html](http://localhost:3000/admin.html)
  - **Default PIN**: `admin123`

---

## ☁️ Deploying to Cloudflare Pages (Step-by-Step)

### Option 1: Cloudflare Dashboard (Recommended, 2 Minutes)

1. **Push your code to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of video showreel portfolio"
   git branch -M main
   # Add your remote repo and push:
   # git remote add origin https://github.com/your-username/your-repo.git
   # git push -u origin main
   ```

2. **Connect to Cloudflare Pages**:
   - Log into your [Cloudflare Dashboard](https://dash.cloudflare.com/).
   - In the left sidebar, navigate to **Compute (Workers) > Workers & Pages**.
   - Click **Create application** > **Pages** tab > **Connect to Git**.
   - Select your GitHub repository.

3. **Configure Build Settings**:
   - **Framework preset**: `None`
   - **Build command**: *(leave completely empty)*
   - **Build output directory**: `.` *(single dot, meaning root directory)*
   - Click **Save and Deploy**.

Cloudflare will deploy your portfolio in under 30 seconds!

---

### Connecting Cloudflare D1 Database (Optional, for Live Multi-Device Sync)

Cloudflare D1 is Cloudflare's free serverless SQL database. When connected, any edits you make in the Admin panel are saved to Cloudflare's edge database and updated globally.

1. **Create D1 Database**:
   - In the Cloudflare dashboard sidebar, go to **Storage & Databases > D1**.
   - Click **Create database**, name it `video-portfolio-db`.

2. **Run the Database Schema**:
   - Click on your newly created database > **Console** tab.
   - Open the [`schema.sql`](file:///Users/bijoy/Desktop/WEBSITE%20LOCAL/schema.sql) file in this project, copy its contents, paste them into the D1 console, and click **Execute**.

3. **Bind D1 to your Pages project**:
   - Go to **Workers & Pages > your portfolio project > Settings > Functions**.
   - Under **D1 database bindings**, click **Add binding**:
     - **Variable name**: `DB`
     - **D1 database**: Select `video-portfolio-db`
   - Under **Environment variables**, click **Add variable**:
     - **Variable name**: `ADMIN_PIN`
     - **Value**: Your desired secret admin PIN (e.g., `myStudioPin2026`)
   - Click **Save**.

4. **Redeploy**:
   - Trigger a redeploy in **Deployments** > **Retry deployment**.
   - Your admin dashboard will now show: **`● Live Cloudflare D1 Database Active`**!

---

## 🎬 How Video Links Work

| Source Type | Example Link Format | What Happens |
| :--- | :--- | :--- |
| **YouTube Video** | `https://www.youtube.com/watch?v=ScMzIvxBSi4` or `https://youtu.be/...` | Automatically extracts video ID, grabs HD poster (`maxresdefault.jpg`), and configures clean autoplay embed. |
| **YouTube Playlist** | `https://www.youtube.com/playlist?list=PL4fGSI1p...` | Extracts playlist ID, embeds player with playlist controls so viewers can binge your series. |
| **Vimeo** | `https://vimeo.com/76979871` or unlisted `https://vimeo.com/123/abc` | Extracts video ID & unlisted privacy hash; disables extraneous Vimeo UI overlays. |
| **Google Drive** | `https://drive.google.com/file/d/1BxiMVs.../view?usp=sharing` | Converts to direct video stream preview (`/preview`). *Note: Set file permission in Google Drive to "Anyone with the link can view".* |

---

## 🛠️ Customizing Your Brand

- **Site Title, Contact Info & Bio**: Edit [`js/config.js`](file:///Users/bijoy/Desktop/WEBSITE%20LOCAL/js/config.js).
- **Default Seed Projects**: Edit [`data/default-projects.json`](file:///Users/bijoy/Desktop/WEBSITE%20LOCAL/data/default-projects.json).
- **Styling & Colors**: Edit [`css/style.css`](file:///Users/bijoy/Desktop/WEBSITE%20LOCAL/css/style.css).

---

## 🔒 Security Best Practices

- Change your default admin PIN from `admin123` to a secure pass-code using the **Settings** button in the Admin dashboard or via Cloudflare Environment Variable `ADMIN_PIN`.
- Use the **Export Backup** button in the admin panel whenever making substantial updates to keep an offline `.json` backup of your portfolio.
