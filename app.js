/**
 * KodaPlayGames Tactical Creator Hub
 * Built for GitHub Pages + Custom Domain (kodaplaygames.com)
 * - Shows custom Offline Tactical Screen + Countdown by default
 * - Automatically checks live Twitch status and switches to Live Player when streaming
 */

const CONFIG = {
  twitchChannel: 'kodaplaygames',
  // Paste your YouTube Channel ID (starts with 'UC...') once you upload your first episode
  youtubeChannelId: '',
  rssToJsonEndpoint: 'https://api.rss2json.com/v1/api.json?rss_url=',
  youtubeRssBase: 'https://www.youtube.com/feeds/videos.xml?channel_id=',
  twitchUptimeEndpoint: 'https://decapi.me/twitch/uptime/'
};

document.addEventListener('DOMContentLoaded', () => {
  initFooterYear();
  initTwitchAndLiveCheck();
  initScheduleAndCountdown();
  loadYouTubeFeed();
  initSocialTabs();
  initPWA();
});

/* 1. Dynamic Footer Year */
function initFooterYear() {
  const yearEl = document.getElementById('current-year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
}

/* 2. Configure Twitch Embeds + Auto-Switch Between Offline & Live Stream */
function initTwitchAndLiveCheck() {
  const playerIframe = document.getElementById('twitch-player-iframe');
  const chatIframe = document.getElementById('twitch-chat-iframe');
  const toggleModeBtn = document.getElementById('toggle-mode-btn');
  const switchToLiveBtn = document.getElementById('switch-to-live-btn');
  const modeBtnLabel = document.getElementById('mode-btn-label');
  const liveContainer = document.getElementById('live-player-container');
  const offlineContainer = document.getElementById('offline-screen-container');
  const streamStatePill = document.getElementById('stream-state-pill');
  const heroMissionText = document.getElementById('hero-mission-text');

  const toggleChatBtn = document.getElementById('toggle-chat-btn');
  const chatWrapper = document.getElementById('twitch-chat-wrapper');
  const twitchStage = document.getElementById('twitch-stage');
  const chatBtnLabel = document.getElementById('chat-btn-label');

  if (!playerIframe || !chatIframe) return;

  // Build parent domains dynamically (supports github.io, localhost, and kodaplaygames.com)
  const currentHost = window.location.hostname;
  const parents = new Set([
    'kodaplaygames.com',
    'www.kodaplaygames.com',
    'localhost',
    '127.0.0.1'
  ]);
  if (currentHost) {
    parents.add(currentHost);
  }

  const parentParams = Array.from(parents)
    .map((host) => `parent=${encodeURIComponent(host)}`)
    .join('&');

  const playerUrl = `https://player.twitch.tv/?channel=${CONFIG.twitchChannel}&${parentParams}&muted=true`;
  const chatUrl = `https://www.twitch.tv/embed/${CONFIG.twitchChannel}/chat?${parentParams}&darkpopout`;

  playerIframe.dataset.src = playerUrl;
  chatIframe.dataset.src = chatUrl;

  function setViewMode(showLive) {
    if (!liveContainer || !offlineContainer || !modeBtnLabel) return;

    if (showLive) {
      if (!playerIframe.src && playerIframe.dataset.src) {
        playerIframe.src = playerIframe.dataset.src;
      }
      offlineContainer.classList.add('hidden');
      liveContainer.classList.remove('hidden');
      modeBtnLabel.textContent = 'Show Offline Screen';
    } else {
      liveContainer.classList.add('hidden');
      offlineContainer.classList.remove('hidden');
      modeBtnLabel.textContent = 'Show Twitch Player';
    }
  }

  // Default to Offline Screen on initial load
  setViewMode(false);

  // Check if KodaPlayGames is currently LIVE on Twitch
  async function checkLiveStatus() {
    try {
      const response = await fetch(`${CONFIG.twitchUptimeEndpoint}${encodeURIComponent(CONFIG.twitchChannel)}`);
      if (!response.ok) return;

      const text = (await response.text()).trim().toLowerCase();
      const isOffline = text.includes('offline') || text.includes('not found') || text.includes('error');

      if (!isOffline && text.length > 0) {
        // Channel is LIVE! Automatically switch to Twitch Player & update status badges
        setViewMode(true);
        if (streamStatePill) {
          streamStatePill.textContent = 'LIVE NOW';
          streamStatePill.style.borderColor = '#ef4444';
          streamStatePill.style.color = '#ef4444';
        }
        if (heroMissionText) {
          heroMissionText.textContent = 'LIVE NOW // STREAMING ON TWITCH';
        }
      }
    } catch (_) {
      // If network check fails, stay cleanly on the Offline Screen
    }
  }

  checkLiveStatus();

  // Manual toggle buttons
  if (toggleModeBtn) {
    toggleModeBtn.addEventListener('click', () => {
      const isCurrentlyLive = !liveContainer.classList.contains('hidden');
      setViewMode(!isCurrentlyLive);
    });
  }

  if (switchToLiveBtn) {
    switchToLiveBtn.addEventListener('click', () => setViewMode(true));
  }

  // Toggleable Comms Chat
  if (toggleChatBtn && chatWrapper) {
    toggleChatBtn.addEventListener('click', () => {
      const isHidden = chatWrapper.classList.contains('hidden');
      if (isHidden) {
        if (!chatIframe.src && chatIframe.dataset.src) {
          chatIframe.src = chatIframe.dataset.src;
        }
        chatWrapper.classList.remove('hidden');
        twitchStage.classList.add('chat-open');
        toggleChatBtn.setAttribute('aria-expanded', 'true');
        chatBtnLabel.textContent = 'Close Comms Chat';
      } else {
        chatWrapper.classList.add('hidden');
        twitchStage.classList.remove('chat-open');
        toggleChatBtn.setAttribute('aria-expanded', 'false');
        chatBtnLabel.textContent = 'Open Comms Chat';
      }
    });
  }
}

/* 3. Mon & Thurs 10:00 AM UK Schedule Local Timezone Converter & Live Countdown */
function initScheduleAndCountdown() {
  const monLocalEl = document.getElementById('mon-local-time');
  const thuLocalEl = document.getElementById('thu-local-time');
  const tzBadgeEl = document.getElementById('local-timezone-badge');
  const scheduleCountdownEl = document.getElementById('schedule-countdown');
  const offlineCountdownEl = document.getElementById('next-stream-countdown');
  const nextStreamLabelEl = document.getElementById('next-stream-label');

  function getNextUkStreamDate(targetWeekday) {
    const now = new Date();
    const ukString = now.toLocaleString('en-US', { timeZone: 'Europe/London' });
    const ukNow = new Date(ukString);
    const offsetMs = now.getTime() - ukNow.getTime();

    const candidateUk = new Date(ukNow);
    candidateUk.setHours(10, 0, 0, 0);

    const currentDay = ukNow.getDay();
    let daysUntil = (targetWeekday - currentDay + 7) % 7;
    if (daysUntil === 0 && ukNow.getTime() >= candidateUk.getTime()) {
      daysUntil = 7;
    }
    candidateUk.setDate(ukNow.getDate() + daysUntil);

    return new Date(candidateUk.getTime() + offsetMs);
  }

  const nextMon = getNextUkStreamDate(1);
  const nextThu = getNextUkStreamDate(4);

  const timeFormatter = new Intl.DateTimeFormat([], {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });

  if (monLocalEl) {
    monLocalEl.textContent = `Your Time: ${timeFormatter.format(nextMon)}`;
  }
  if (thuLocalEl) {
    thuLocalEl.textContent = `Your Time: ${timeFormatter.format(nextThu)}`;
  }

  try {
    const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tzBadgeEl && userTz) {
      tzBadgeEl.textContent = `LOCAL TZ: ${userTz.replace('_', ' ')}`;
    }
  } catch (_) {
    // Keep default badge if timezone lookup unavailable
  }

  function updateCountdown() {
    const monDate = getNextUkStreamDate(1);
    const thuDate = getNextUkStreamDate(4);
    const isMonNext = monDate.getTime() <= thuDate.getTime();
    const nextDate = isMonNext ? monDate : thuDate;

    if (nextStreamLabelEl) {
      nextStreamLabelEl.textContent = isMonNext
        ? 'Next: Monday 10:00 AM UK'
        : 'Next: Thursday 10:00 AM UK';
    }

    const diffMs = Math.max(0, nextDate.getTime() - Date.now());
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
    const seconds = Math.floor((diffMs / 1000) % 60);

    const formatted = `${days}D ${String(hours).padStart(2, '0')}H ${String(minutes).padStart(2, '0')}M ${String(seconds).padStart(2, '0')}S`;

    if (scheduleCountdownEl) scheduleCountdownEl.textContent = formatted;
    if (offlineCountdownEl) offlineCountdownEl.textContent = formatted;
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);
}

/* 4. Fetch Latest YouTube Edited Episodes (15-30m) & Shorts via RSS (with Clean Standby State) */
async function loadYouTubeFeed() {
  const gridEl = document.getElementById('youtube-grid');
  const statusEl = document.getElementById('yt-feed-status');
  if (!gridEl) return;

  if (!CONFIG.youtubeChannelId || CONFIG.youtubeChannelId.trim() === '') {
    renderEmptyYouTubeState(gridEl);
    if (statusEl) statusEl.textContent = 'First Episode Incoming';
    return;
  }

  try {
    const feedUrl = encodeURIComponent(`${CONFIG.youtubeRssBase}${CONFIG.youtubeChannelId.trim()}`);
    const response = await fetch(`${CONFIG.rssToJsonEndpoint}${feedUrl}`);
    if (!response.ok) throw new Error('RSS fetch failed');

    const data = await response.json();
    if (data.status !== 'ok' || !Array.isArray(data.items) || data.items.length === 0) {
      throw new Error('No uploads published yet');
    }

    const videos = data.items.slice(0, 6).map((item) => {
      const isShort = item.link.includes('/shorts/') || item.title.toLowerCase().includes('#shorts');
      const videoId = item.guid ? item.guid.split(':').pop() : '';
      const thumb = videoId
        ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
        : item.thumbnail;

      return {
        id: videoId || item.link,
        title: item.title,
        thumbnail: thumb,
        url: item.link,
        published: formatRelativeDate(item.pubDate),
        durationTag: isShort ? 'SHORT' : 'EDITED EPISODE',
        isShort
      };
    });

    renderYouTubeCards(videos);
    if (statusEl) statusEl.textContent = 'Live Channel Sync';
  } catch (err) {
    console.info('YouTube channel awaiting first upload:', err.message);
    renderEmptyYouTubeState(gridEl);
    if (statusEl) statusEl.textContent = 'First Episode Incoming';
  }
}

function renderEmptyYouTubeState(gridEl) {
  gridEl.innerHTML = `
    <div class="empty-hud-state">
      <span class="hud-pill">YOUTUBE ARCHIVE // STANDBY</span>
      <h3>First 15–30 Minute Edited Episode In Production</h3>
      <p>Edited gameplay episodes and Shorts cut from the Monday &amp; Thursday 10:00 AM UK Twitch streams will automatically appear here as soon as they drop.</p>
      <a href="https://youtube.com/@kodaplaygames" target="_blank" rel="noopener noreferrer" class="btn btn-hud-primary btn-sm">Subscribe on YouTube</a>
    </div>
  `;
}

function renderYouTubeCards(videos) {
  const gridEl = document.getElementById('youtube-grid');
  if (!gridEl) return;

  gridEl.innerHTML = videos
    .map(
      (video) => `
      <a href="${escapeHtml(video.url)}" target="_blank" rel="noopener noreferrer" class="video-card">
        <div class="video-thumb-wrap">
          <img src="${escapeHtml(video.thumbnail)}" alt="${escapeHtml(video.title)}" class="video-thumb" loading="lazy" />
          <span class="video-badge ${video.isShort ? 'short-badge' : ''}">
            ${escapeHtml(video.durationTag)}
          </span>
        </div>
        <div class="video-body">
          <h3 class="video-title">${escapeHtml(video.title)}</h3>
          <span class="video-meta">KodaPlayGames &bull; ${escapeHtml(video.published)}</span>
        </div>
      </a>
    `
    )
    .join('');
}

/* 5. Social Intel Tabs (TikTok, Instagram, X) */
function initSocialTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');

      tabButtons.forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });

      tabPanels.forEach((panel) => {
        panel.classList.add('hidden');
        panel.classList.remove('active');
      });

      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      const activePanel = document.getElementById(targetId);
      if (activePanel) {
        activePanel.classList.remove('hidden');
        activePanel.classList.add('active');
      }
    });
  });
}

/* 6. Progressive Web App Registration & Home-Screen Install Prompt */
function initPWA() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('./sw.js')
        .catch((err) => console.warn('Service Worker registration skipped:', err));
    });
  }

  let deferredPrompt = null;
  const installBtn = document.getElementById('pwa-install-btn');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) {
      installBtn.classList.remove('hidden');
    }
  });

  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      installBtn.classList.add('hidden');
    });
  }

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    if (installBtn) installBtn.classList.add('hidden');
  });
}

/* Helpers */
function formatRelativeDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'Recent';
  const diffDays = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  const weeks = Math.floor(diffDays / 7);
  return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}