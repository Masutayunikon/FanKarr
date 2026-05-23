/**
 * FanKarr Jellyfin Plugin
 * ========================
 * Injecte une section "Découvrir sur FanKaï" dans la page de recherche Jellyfin.
 */

(async function FanKarr() {
    'use strict';

    const FANKAI_LOGO = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNTAgMTUwIj48c3R5bGU+LmNscy0ye2ZpbGw6Y3VycmVudENvbG9yfTwvc3R5bGU+PGc+PHBhdGggY2xhc3M9ImNscy0yIiBkPSJtMTEzLjg1LDEyLjhjLTEuOTQsMy41Ny0zLjgsNy4wOS01Ljc2LDEwLjU1LTMuNiw2LjM1LTcuMzEsMTIuNjUtMTAuOSwxOS4wMS0xLjY5LDMtMy4yMiw2LjA4LTQuNDQsOS40OSwzLjI1LTIuNDYsNi40NC01LjAzLDkuNzgtNy4zNiwyLjkyLTIuMDQsNS45NS0zLjk2LDkuMDctNS42Nyw4LjU5LTQuNzIsMTkuMjktMS43OCwyNC40LDYuNTQuNDIuNjgsMS4zLDEuMTYsMS41MiwxLjg3LjI2LjgzLjA1LDIuNjIsMCwyLjYyLTMuOTQuMTMtMy40NSw1Ljc5LTcuNTksNS44OS0zLjQ2LjA4LTYuOSwxLjI1LTEwLjM3LDEuMzctNi43OC4yNS0xMy40OC42NC0xOS4zMiw0LjU3LTEuOTEsMS4yOS0zLjUsMy4wNS00Ljk3LDQuMzYuMjEuODYuMTksMS4xMy4zLDEuMiw0LjQyLDIuNyw4Ljc5LDUuNDksMTMuMzEsOCwyLjExLDEuMTcsMy42NiwzLjc3LDIuODIsNi42My0xLjE4LDMuOTctMi42NCw3Ljg2LTQuMDQsMTEuNzYtLjQ4LDEuMzMtMS4xMSwyLjYxLTEuODgsNC40MSw1Ljg3LDIuMTQsMTEuNjMsNC4yNiwxNy40MSw2LjM1LDMuNDMsMS4yNCw2Ljg2LDIuNDcsMTAuMzEsMy42NSw3LjM4LDIuNTIsOS4xNiw5LjU0LDExLjUyLDE1LjUzLDEuMDQsMi42NS0uNzUsNi43NS0yLjExLDkuODEtLjQ2LDEuMDQtMy41MywxLjIyLTUuNDIsMS4yNi0xLjc4LjAzLTMuNTctLjY0LTQuNDYtLjgzLTUuOTctOC40LTExLjU0LTE1Ljk4LTIzLjI4LTE0LjcuMS0uMzIuMjEtLjY1LjMxLS45NywyLjMyLS41Miw0LjY0LTEuMDUsNi45Ny0xLjU3LjAzLS4yMi4wNi0uNDUuMDktLjY3LTIuOTctMS4xOC01Ljk0LTIuMzctOC45Mi0zLjUyLTEuMzMtLjUyLTIuNy0uOTMtNC4wMy0xLjQ1LTQuODMtMS45LTQuNzktMS44OS04LjI2LDIuMjctNC4zMSw1LjE3LTEwLjIyLDguMTMtMTYuMywxMS4wMS42OS0uODQsMS4zMS0xLjc1LDIuMS0yLjQ4Ljc2LS43MSwxLjY5LTEuMjIsMi4yNi0yLjI5LTQuOSwxLjg3LTkuODEsMy43NC0xNC43MSw1LjYxLS4xMy0uMjItLjI2LS40NS0uMzktLjY3Ljg2LS42MiwxLjcyLTEuMjQsMi41OC0xLjg1LS4wNC0uMTctLjA4LS4zNC0uMTItLjUxLTIuOTQuNjUtNS45MywxLjExLTguOCwyLTQuMTgsMS4yOS04LjI3LDIuODctMTIuMzgsNC4zOC0yLjU5Ljk1LTUuMTIsMS41MS03LjE5LS4xNCwxMS44NC05LjQsMjUuMTYtMTcuMiwzNi41OS0yOC45My00LjIxLTMuNjUtOC4xLTcuMDEtMTEuOTgtMTAuMzguMTUtLjQzLjMtLjg3LjQ1LTEuMywxLjYxLS4wOSwzLjMtLjU1LDQuODEtLjIxLDQuMTQuOTIsOC4yMSwyLjE4LDEyLjY2LDMuNCwzLjU4LTYuNiw3LjEtMTMuMjksNy4zLTIwLjU4LTYuNjgtMi42NS05Ljc5LDQuMTMtMTUuNyw1Ljc2LDIuNTUtMi45Miw0LjU0LTUuMTksNi41Mi03LjQ2LS4yLS4xNy0uMzktLjMzLS41OS0uNS01LjU4LDQuMjgtMTYuODksMTYuMDYtMjQuMTYsMjkuMDctLjE5LS4yOS0uMzctLjU5LS41NS0uODctLjgxLDEuNDYtMS41NywyLjgzLTIuMzMsNC4yMWwtMS4wNC0uMzVjMS41OC01LjcxLDIuODYtMTEuNTMsNC44MS0xNy4xMSwyLjY3LTcuNjcsNi4zMi0xNS4wMiw4LjcxLTIyLjc2LDQuODctMTUuOCwxMy43NS0yOS42NywyMC43LTQ0LjQ1LjY1LTEuMzgsMS4yOC0yLjc3LDEuODgtNC4xNywxLjU4LTMuNjgsMy45Ny03LjM3LS40Ny0xMS4xMy4zLS4xNi41OS0uMzMuODktLjQ5LDcuMTMsNC4wOCwxNC4yNSw4LjE1LDIyLjM4LDEyLjhaIi8+PHBhdGggY2xhc3M9ImNscy0yIiBkPSJtNy4wMyw3MS43MmMuMjUtLjQ4LjM5LTEuMjEuNzctMS4zOCwxLjEtLjQ5LDIuNjItMS4zOCwzLjQxLS45OCwyLjU4LDEuMjgsNC44LjM4LDcuMDYtLjQ4LDIuNzYtMS4wNCw1LjU3LTIuMDUsOC4xNC0zLjQ3LDEuMjItLjY3LDIuNjMtMi4xOSwyLjc3LTMuNDYsMS4wMy05LjY1LDMuNi0xOC44Myw3LjU0LTI3LjY3LjI0LS41My4zLTEuMTQtLjE3LTIuMDMtMS4wMSwxLjYzLTEuNzgsMy40OS0zLjA4LDQuODUtMi4wOCwyLjIxLTQuNDIsNC4yLTYuODIsNi4wNy0xLjM5LDEuMDktMy4wMiwyLjA1LTQuNywyLjU0LTEuMzEuMzktMy4yNi41MS00LjI0LS4yLTQuMzItMy4xMy04LjM4LTYuNi0xMi43MS0xMC4wOSwyLjAzLTIuNDgsMy43My00LjIsNy4xOC0zLjUsMS43NC4zNiw0LjA0LS40Myw1LjY3LTEuNCw1LjQzLTMuMjEsMTAuNjUtNi43OSwxNi4wMS0xMC4xMyw1LjU4LTMuNDgsMTEuNDUtMy40NiwxNy4xMy0uNTMsNC41LDIuMzIsOC43Myw1LjE5LDEzLjAzLDcuOSwxLjQ3LjkzLDIuMzUsMi4yMywxLjM0LDQuMTEtMi4wOCwzLjg4LTQuMDEsNy44NS02LjIyLDExLjY2LTEuOTUsMy4zNy00LjIsNi41Ni02LjQ3LDEwLjA2LDIuMDQuOTYsMy43OCwxLjY3LDUuNCwyLjU4LDIuMjUsMS4yNywzLjI1LDMuMjQsMi45Nyw1Ljg3LS4zMywzLjE1LTEuNTksNS42NC00LjY4LDYuODQtLjg0LjMzLTEuODMuNzItMi42NS41Ni01LjgtMS4xLTkuNzksMi45My0xNC40Myw1LjA0LTEuMi41NC0yLjE5LDEuODMtMi45NSwyLjk5LTMuMyw1LjA4LTguODMsNi43LTEzLjgzLDkuMTctLjUzLjI2LTEuMjIuNzQtMS4zNCwxLjI0LTEuNzYsNy44Mi0zLjQ1LDE1LjY1LTQuNTgsMjQuMDksNC4xLTIuMzIsOC4xOS00LjY1LDEyLjI5LTYuOTcuMTIuMTUuMjMuMzEuMzUuNDYtMS4wNSwxLjE3LTIuMSwyLjM0LTMuMTUsMy41MmwuNS42NmM1LjczLTIuNjEsMTAuOTctNS45OCwxNS4yNC0xMC44Ny4yOC4yMi41Ny40My44NS42NS0xLjgzLDMuMzktMy43OCw2LjcyLTUuNDQsMTAuMi0uOTUsMS45OS0xLjM4LDQuMjEtMi4xMyw2LjMtLjQ4LDEuMzMtLjg0LDIuODItMS43MSwzLjg2LTIuNjEsMy4xMy01LjQ2LDYuMDYtOC4xOSw5LjA5LS40NS41LS43NiwxLjEyLTEuMTQsMS42OC0uNjYuOTktMS4yMSwyLjA5LTIuMDIsMi45NC0uMzkuNDEtMS41OC43MS0xLjg1LjQ2LTIuMjYtMi4xNC01LjUsMi4yNS03Ljc4LTEuNTItMS45LTMuMTMtNS4zNS01LjMzLTcuMjMtOC40Ny0yLjM3LTMuOTUtNS43NS03Ljg0LTUuMTQtMTIuODUuNTEtNC4xNywyLjE2LTguMTgsMi44OS0xMi4zNCwxLjQzLTguMTEsMi42LTE2LjI3LDMuODItMjQuNDIuMTQtLjk1LS4xMS0xLjk1LS4xOS0yLjkzLjE0LjA5LjI5LjE3LjQzLjI2WiIvPjwvZz48L3N2Zz4K';

    // ---------------------------------------------------------------------------
    // 1. Config
    // ---------------------------------------------------------------------------

    let API_URL = '';
    let fankarrToken = sessionStorage.getItem('fankarr_token') || '';

    try {
        const res = await fetch('/FanKarrSearch/config');
        const data = await res.json();
        API_URL = (data.ApiUrl || data.apiUrl || '').replace(/\/$/, '');
    } catch (e) {
        console.error('[FanKarr] Impossible de charger la config :', e);
        return;
    }

    if (!API_URL) {
        console.warn('[FanKarr] Aucune URL API configurée. Configure le plugin dans le Dashboard.');
        return;
    }

    // ---------------------------------------------------------------------------
    // 2. Auth
    // ---------------------------------------------------------------------------

    async function authenticate() {
        const credentials = localStorage.getItem('jellyfin_credentials');
        if (!credentials) { console.warn('[FanKarr] Token Jellyfin introuvable.'); return false; }
        const parsed = JSON.parse(credentials);
        const jellyfinToken = parsed?.Servers?.[0]?.AccessToken;
        const jellyfinUserId = parsed?.Servers?.[0]?.UserId;
        if (!jellyfinToken || !jellyfinUserId) { console.warn('[FanKarr] Token ou UserId introuvable.'); return false; }
        try {
            const res = await fetch(`${API_URL}/api/v1/auth/jellyfin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jellyfinToken, jellyfinUserId }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            fankarrToken = data.token || data.accessToken || '';
            sessionStorage.setItem('fankarr_token', fankarrToken);
            return true;
        } catch (e) {
            console.error('[FanKarr] Échec auth :', e);
            return false;
        }
    }

    // ---------------------------------------------------------------------------
    // 3. API helpers
    // ---------------------------------------------------------------------------

    async function apiGet(path) {
        const res = await fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${fankarrToken}` } });
        if (res.status === 401) { await authenticate(); return apiGet(path); }
        return res.json();
    }

    async function apiPost(path, body) {
        const res = await fetch(`${API_URL}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${fankarrToken}` },
            body: JSON.stringify(body),
        });
        if (res.status === 401) { await authenticate(); return apiPost(path, body); }
        return res.json();
    }

    // ---------------------------------------------------------------------------
    // 4. Styles
    // ---------------------------------------------------------------------------

    const SECTION_ID = 'fankarr-results-section';
    const MODAL_ID = 'fankarr-modal';

    const STYLES = `
    #${SECTION_ID} {
      padding: 0.5em 0 1em;
    }
    #${SECTION_ID} .fankarr-section-title {
      display: flex !important;
      align-items: center !important;
      gap: 0.4em !important;
    }
    #${SECTION_ID} .fankarr-logo {
      height: 1em;
      width: auto;
      display: inline-block;
      vertical-align: middle;
      filter: brightness(0) saturate(100%) invert(80%) sepia(60%) saturate(400%) hue-rotate(5deg) brightness(105%);
    }
    #${SECTION_ID} .fankarr-grid {
      display: flex;
      flex-wrap: wrap;
      row-gap: 0.5em;
      column-gap: 0;
    }
    #${SECTION_ID} .fankarr-card {
      position: relative;
      cursor: pointer;
      margin-right: 0.5em;
    }
    #${SECTION_ID} .fankarr-badge {
      position: absolute;
      top: 6px;
      left: 6px;
      z-index: 2;
      background: var(--accent-color, var(--accent, #00a4dc));
      color: #fff !important;
      font-size: 0.6em;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      pointer-events: none;
    }
    #${SECTION_ID} .fankarr-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0) 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      gap: 0.4em;
      opacity: 0;
      transition: opacity 0.2s ease;
      border-radius: inherit;
      padding: 0.6em;
      box-sizing: border-box;
      z-index: 3;
    }
    #${SECTION_ID} .fankarr-card:hover .fankarr-overlay {
      opacity: 1;
    }
    #${SECTION_ID} .fankarr-overlay-desc {
      color: #fff !important;
      font-size: 0.7em;
      text-align: center;
      line-height: 1.3;
      display: -webkit-box;
      -webkit-line-clamp: 4;
      -webkit-box-orient: vertical;
      overflow: hidden;
      margin-bottom: 0.3em;
      align-self: stretch;
    }
    #${SECTION_ID} .fankarr-btn {
      width: 90%;
      font-size: 0.82em;
      padding: 0.5em 0.4em;
      white-space: nowrap;
      display: flex !important;
      align-items: center;
      justify-content: center;
      gap: 0.35em;
      color: #fff !important;
      background: var(--accent-color, var(--accent, #00a4dc)) !important;
      border: none !important;
      border-radius: 6px;
    }
    #${SECTION_ID} .fankarr-card .cardText-first {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: clip;
    }
    #${SECTION_ID} .fankarr-meta-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4em;
      font-size: 0.75em;
      color: var(--text-color-secondary, #aaa);
      margin-top: 1px;
    }
    #${SECTION_ID} .fankarr-rating { display: flex; align-items: center; gap: 0.2em; }
    #${SECTION_ID} .fankarr-rating-star { color: #f5c518; }

    /* ── Backdrop ── */
    #${MODAL_ID}-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.7);
      z-index: 9998;
      display: none;
      align-items: flex-end;
      justify-content: center;
    }
    #${MODAL_ID}-backdrop.open { display: flex; }
    @media (min-width: 600px) {
      #${MODAL_ID}-backdrop { align-items: center; }
    }

    /* ── Modale ── */
    #${MODAL_ID} {
      background: var(--jf-palette-background-paper, #1a1a1a) !important;
      border-radius: 16px 16px 0 0;
      width: 100%;
      max-width: 500px;
      max-height: 85vh;
      overflow-y: auto;
      padding: 1.5em;
      box-sizing: border-box;
      font-family: var(--font-family, inherit);
      color: #fff !important;
      transform: translateY(100%);
      transition: transform 0.3s ease;
    }
    #${MODAL_ID}-backdrop.open #${MODAL_ID} { transform: translateY(0); }
    @media (min-width: 600px) {
      #${MODAL_ID} {
        border-radius: 12px;
        max-height: 80vh;
        transform: scale(0.95);
        opacity: 0;
        transition: transform 0.2s ease, opacity 0.2s ease;
      }
      #${MODAL_ID}-backdrop.open #${MODAL_ID} { transform: scale(1); opacity: 1; }
    }
    #${MODAL_ID} * { color: #fff !important; box-sizing: border-box; }
    #${MODAL_ID} .fankarr-modal-header { display: flex; align-items: center; gap: 1em; margin-bottom: 1.25em; }
    #${MODAL_ID} .fankarr-modal-poster { width: 60px; aspect-ratio: 2/3; object-fit: cover; border-radius: 6px; flex-shrink: 0; }
    #${MODAL_ID} .fankarr-modal-title { font-size: 1.1em; font-weight: 600; color: #fff !important; }
    #${MODAL_ID} .fankarr-modal-close { margin-left: auto; background: none !important; border: none; color: rgba(255,255,255,0.5) !important; font-size: 1.5em; cursor: pointer; padding: 0; line-height: 1; flex-shrink: 0; }
    #${MODAL_ID} .fankarr-modal-close:hover { color: #fff !important; }
    #${MODAL_ID} .fankarr-modal-subtitle { font-size: 0.85em; color: rgba(255,255,255,0.6) !important; margin-top: 0.2em; }
    #${MODAL_ID} .fankarr-modal-desc { font-size: 0.82em; color: rgba(255,255,255,0.7) !important; line-height: 1.5; margin-bottom: 1em; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }

    /* ── Already-requested banner ── */
    #${MODAL_ID} .fankarr-already-banner {
      display: flex;
      align-items: center;
      gap: 0.5em;
      background: rgba(0, 164, 220, 0.15) !important;
      border: 1px solid rgba(0, 164, 220, 0.4) !important;
      border-radius: 8px;
      padding: 0.6em 0.8em;
      margin-bottom: 1em;
      font-size: 0.82em;
      color: rgba(255,255,255,0.85) !important;
    }
    #${MODAL_ID} .fankarr-already-banner .fankarr-banner-icon {
      font-size: 1.1em;
      color: var(--accent-color, var(--accent, #00a4dc)) !important;
      flex-shrink: 0;
    }

    /* ── Season grid ── */
    #${MODAL_ID} .fankarr-select-all {
      width: 100%; padding: 0.6em;
      border: 2px dashed rgba(255,255,255,0.3) !important;
      border-radius: 8px;
      background: transparent !important;
      color: rgba(255,255,255,0.6) !important;
      font-size: 0.85em; font-family: var(--font-family, inherit);
      cursor: pointer; margin-bottom: 0.75em;
      transition: border-color 0.15s, color 0.15s;
    }
    #${MODAL_ID} .fankarr-select-all:hover,
    #${MODAL_ID} .fankarr-select-all.selected {
      border-color: var(--accent-color, var(--accent, #00a4dc)) !important;
      color: var(--accent-color, var(--accent, #00a4dc)) !important;
    }
    #${MODAL_ID} .fankarr-seasons-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 0.5em; margin-bottom: 1.25em; }
    #${MODAL_ID} .fankarr-season-btn {
      padding: 0.6em 0.25em;
      border: 2px solid rgba(255,255,255,0.25) !important;
      border-radius: 8px;
      background: transparent !important;
      color: #fff !important;
      font-size: 0.8em; font-family: var(--font-family, inherit);
      cursor: pointer; text-align: center;
      transition: border-color 0.15s, background 0.15s, opacity 0.15s;
    }
    #${MODAL_ID} .fankarr-season-btn:hover:not(:disabled) { border-color: var(--accent-color, var(--accent, #00a4dc)) !important; }
    #${MODAL_ID} .fankarr-season-btn.selected {
      border-color: var(--accent-color, var(--accent, #00a4dc)) !important;
      background: var(--accent-color, var(--accent, #00a4dc)) !important;
      color: #fff !important;
    }
    /* Already-requested seasons: shown as selected + locked */
    #${MODAL_ID} .fankarr-season-btn.already {
      border-color: var(--accent-color, var(--accent, #00a4dc)) !important;
      background: var(--accent-color, var(--accent, #00a4dc)) !important;
      color: #fff !important;
      cursor: default;
      opacity: 0.55;
      position: relative;
    }
    #${MODAL_ID} .fankarr-season-btn.already::after {
      content: ' ✓';
      font-size: 0.85em;
    }

    #${MODAL_ID} .fankarr-modal-actions { display: flex; gap: 0.75em; margin-top: 1em; }
    #${MODAL_ID} .fankarr-modal-cancel,
    #${MODAL_ID} .fankarr-modal-submit {
      padding: 0.7em 1em;
      border-radius: 8px;
      font-size: 0.9em;
      font-family: var(--font-family, inherit);
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.15s;
      outline: none !important;
      box-shadow: none !important;
    }
    #${MODAL_ID} .fankarr-modal-cancel:hover,
    #${MODAL_ID} .fankarr-modal-cancel:focus,
    #${MODAL_ID} .fankarr-modal-submit:hover,
    #${MODAL_ID} .fankarr-modal-submit:focus {
      background: inherit;
      border: inherit;
      color: inherit;
      opacity: 0.85;
    }
    #${MODAL_ID} .fankarr-modal-cancel {
      flex: 1;
      background: rgba(255,255,255,0.1) !important;
      color: #fff !important;
      border: 1px solid rgba(255,255,255,0.15) !important;
    }
    #${MODAL_ID} .fankarr-modal-cancel:hover,
    #${MODAL_ID} .fankarr-modal-cancel:focus {
      background: rgba(255,255,255,0.15) !important;
      border: 1px solid rgba(255,255,255,0.15) !important;
      color: #fff !important;
    }
    #${MODAL_ID} .fankarr-modal-submit {
      flex: 2;
      background: var(--accent-color, var(--accent, #00a4dc)) !important;
      color: #fff !important;
      border: none !important;
    }
    #${MODAL_ID} .fankarr-modal-submit:hover,
    #${MODAL_ID} .fankarr-modal-submit:focus {
      background: var(--accent-color, var(--accent, #00a4dc)) !important;
      color: #fff !important;
      border: none !important;
      opacity: 0.85;
    }
    #${MODAL_ID} .fankarr-modal-submit:disabled {
      opacity: 0.4;
      cursor: default;
    }
    #${MODAL_ID} .fankarr-modal-loading { text-align: center; padding: 2em 0; color: rgba(255,255,255,0.6) !important; font-size: 0.9em; }
    #${MODAL_ID} .fankarr-modal-success { text-align: center; padding: 2em 1em; }
    #${MODAL_ID} .fankarr-modal-success-icon { font-size: 2.5em; margin-bottom: 0.4em; color: var(--accent-color, var(--accent, #00a4dc)) !important; }
    #${MODAL_ID} .fankarr-modal-success-title { font-weight: 600; margin-bottom: 0.4em; color: #fff !important; }
    #${MODAL_ID} .fankarr-modal-success-sub { color: rgba(255,255,255,0.6) !important; font-size: 0.9em; margin-bottom: 1.5em; }
    #${MODAL_ID} .fankarr-modal-success button {
      background: var(--accent-color, var(--accent, #00a4dc)) !important;
      color: #fff !important;
      border: none !important;
      border-radius: 8px;
      padding: 0.7em 1em;
      font-size: 0.9em;
      font-weight: 600;
      cursor: pointer;
    }
    #${MODAL_ID} .fankarr-modal-success button:hover,
    #${MODAL_ID} .fankarr-modal-success button:focus {
      background: var(--accent-color, var(--accent, #00a4dc)) !important;
      color: #fff !important;
      border: none !important;
      opacity: 0.85;
      outline: none !important;
      box-shadow: none !important;
    }
  `;

    function injectStyles() {
        if (document.getElementById('fankarr-styles')) return;
        const style = document.createElement('style');
        style.id = 'fankarr-styles';
        style.textContent = STYLES;
        document.head.appendChild(style);
    }

    // ---------------------------------------------------------------------------
    // 5. Modale
    // ---------------------------------------------------------------------------

    function createModal() {
        if (document.getElementById(`${MODAL_ID}-backdrop`)) return;
        const backdrop = document.createElement('div');
        backdrop.id = `${MODAL_ID}-backdrop`;
        backdrop.innerHTML = `<div id="${MODAL_ID}"></div>`;
        document.body.appendChild(backdrop);
        backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });
    }

    function openModal() {
        const backdrop = document.getElementById(`${MODAL_ID}-backdrop`);
        if (backdrop) { backdrop.classList.add('open'); document.body.style.overflow = 'hidden'; }
    }

    function closeModal() {
        const backdrop = document.getElementById(`${MODAL_ID}-backdrop`);
        if (backdrop) { backdrop.classList.remove('open'); document.body.style.overflow = ''; }
    }

    async function showRequestModal(item, alreadyRequestedSeasons = []) {
        createModal();
        const modal = document.getElementById(MODAL_ID);
        const posterHtml = item.image
          ? `<img class="fankarr-modal-poster" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" />`
          : '';

        // alreadyRequestedSeasons: array of season numbers already submitted.
        // Empty array = whole series already requested.
        const wholeSeriesAlreadyRequested = Array.isArray(alreadyRequestedSeasons) && alreadyRequestedSeasons.length === 0 && item._wasRequested;
        const alreadySet = new Set(alreadyRequestedSeasons);

        modal.innerHTML = `
      <div class="fankarr-modal-header">
        ${posterHtml}
        <div><div class="fankarr-modal-title">${escapeHtml(item.title)}</div></div>
        <button class="fankarr-modal-close" aria-label="Fermer">×</button>
      </div>
      <div class="fankarr-modal-loading">Chargement des saisons…</div>
    `;
        modal.querySelector('.fankarr-modal-close').addEventListener('click', closeModal);
        openModal();

        let seasons = [];
        let serieDesc = item.description || '';
        try {
            const data = await apiGet(`/api/v1/series/${item.id}`);
            seasons = data.seasons || [];
            if (data.description) serieDesc = data.description;
        } catch (e) {
            console.error('[FanKarr] Erreur chargement saisons :', e);
        }

        // Seasons selectable = only those NOT already requested
        const selectableSeasons = seasons.filter(s => !alreadySet.has(s.season_number));

        // New selections (from the selectable ones only)
        const selectedSeasons = new Set();

        function renderModal() {
            const allSelectableSelected = selectableSeasons.length > 0 && selectableSeasons.every(s => selectedSeasons.has(s.season_number));
            const hasNewSelection = selectedSeasons.size > 0;

            const isAddMode = item._wasRequested; // already had a request

            const bannerHtml = isAddMode ? `
        <div class="fankarr-already-banner">
          <span class="material-icons fankarr-banner-icon">info</span>
          <span>${
              wholeSeriesAlreadyRequested
                ? 'Toute la série a déjà été demandée.'
                : `Saison${alreadyRequestedSeasons.length > 1 ? 's' : ''} ${alreadyRequestedSeasons.join(', ')} déjà demandée${alreadyRequestedSeasons.length > 1 ? 's' : ''}. Sélectionne les saisons à ajouter.`
            }</span>
        </div>
      ` : '';

            // "Select all remaining" button — only show if there are selectable seasons
            const selectAllHtml = selectableSeasons.length > 0 ? `
        <button class="fankarr-select-all${allSelectableSelected ? ' selected' : ''}">
          ${allSelectableSelected ? '✓ Toutes les saisons restantes sélectionnées' : 'Sélectionner toutes les saisons restantes'}
        </button>
      ` : '';

            // Count hint
            let countHint = '';
            if (wholeSeriesAlreadyRequested) {
                countHint = '';
            } else if (selectedSeasons.size === 0 && selectableSeasons.length > 0) {
                countHint = isAddMode ? 'Sélectionne au moins une saison à ajouter' : 'Toute la série sera demandée';
            } else if (selectedSeasons.size > 0) {
                countHint = `${selectedSeasons.size} saison${selectedSeasons.size > 1 ? 's' : ''} sélectionnée${selectedSeasons.size > 1 ? 's' : ''}`;
            }

            modal.innerHTML = `
        <div class="fankarr-modal-header">
          ${posterHtml}
          <div style="flex:1;min-width:0;">
            <div class="fankarr-modal-title">${escapeHtml(item.title)}</div>
            <div class="fankarr-modal-subtitle">${seasons.length} saison${seasons.length > 1 ? 's' : ''}${item.year ? ' · ' + item.year : ''}${item.rating ? ' · ★ ' + Number(item.rating).toFixed(1) : ''}</div>
          </div>
          <button class="fankarr-modal-close" aria-label="Fermer">×</button>
        </div>
        ${serieDesc ? `<div class="fankarr-modal-desc">${escapeHtml(serieDesc)}</div>` : ''}
        ${bannerHtml}
        ${selectAllHtml}
        <div class="fankarr-seasons-grid">
          ${seasons.map(s => {
                const isAlready = alreadySet.has(s.season_number);
                const isSelected = selectedSeasons.has(s.season_number);
                let cls = 'fankarr-season-btn';
                if (isAlready) cls += ' already selected';
                else if (isSelected) cls += ' selected';
                return `
              <button class="${cls}" data-season="${s.season_number}" ${isAlready ? 'disabled title="Déjà demandée"' : ''}>
                Saison ${s.season_number}
              </button>
            `;
            }).join('')}
        </div>
        ${countHint ? `<div style="font-size:0.8em;color:rgba(255,255,255,0.5);text-align:center;margin-bottom:0.5em;">${countHint}</div>` : ''}
        <div class="fankarr-modal-actions">
          <button class="fankarr-modal-cancel emby-button raised">Annuler</button>
          <button class="fankarr-modal-submit emby-button raised button-submit" ${(isAddMode && !hasNewSelection) || wholeSeriesAlreadyRequested ? 'disabled' : ''}>
            <span class="material-icons" style="font-size:1em">${isAddMode ? 'add' : 'download'}</span>
            ${isAddMode ? 'Demander plus' : 'Demander'}
          </button>
        </div>
      `;

            modal.querySelector('.fankarr-modal-close').addEventListener('click', closeModal);
            modal.querySelector('.fankarr-modal-cancel').addEventListener('click', closeModal);

            const selectAllBtn = modal.querySelector('.fankarr-select-all');
            if (selectAllBtn) {
                selectAllBtn.addEventListener('click', () => {
                    if (allSelectableSelected) {
                        selectedSeasons.clear();
                    } else {
                        selectableSeasons.forEach(s => selectedSeasons.add(s.season_number));
                    }
                    renderModal();
                });
            }

            modal.querySelectorAll('.fankarr-season-btn:not([disabled])').forEach(btn => {
                btn.addEventListener('click', () => {
                    const n = parseInt(btn.dataset.season);
                    if (selectedSeasons.has(n)) { selectedSeasons.delete(n); } else { selectedSeasons.add(n); }
                    renderModal();
                });
            });

            const submitBtn = modal.querySelector('.fankarr-modal-submit');
            if (submitBtn && !submitBtn.disabled) {
                submitBtn.addEventListener('click', async () => {
                    submitBtn.disabled = true;
                    submitBtn.textContent = '…';
                    try {
                        // Send only the newly selected seasons — the API merges (upsert)
                        const seasonsToSend = selectedSeasons.size > 0
                          ? [...selectedSeasons].sort((a, b) => a - b)
                          : [];

                        await apiPost('/api/v1/requests', {
                            serieId: item.id,
                            serieName: item.title,
                            seasons: seasonsToSend,
                        });

                        const newlyRequested = [...selectedSeasons].sort((a, b) => a - b);
                        let seasonsLabel;
                        if (newlyRequested.length === 0) {
                            seasonsLabel = 'Toute la série demandée !';
                        } else if (isAddMode) {
                            seasonsLabel = `Saison${newlyRequested.length > 1 ? 's' : ''} ${newlyRequested.join(', ')} ajoutée${newlyRequested.length > 1 ? 's' : ''} !`;
                        } else {
                            seasonsLabel = `Saison${newlyRequested.length > 1 ? 's' : ''} ${newlyRequested.join(', ')} demandée${newlyRequested.length > 1 ? 's' : ''} !`;
                        }

                        modal.innerHTML = `
              <div class="fankarr-modal-success">
                <div class="fankarr-modal-success-icon">✓</div>
                <div class="fankarr-modal-success-title">${escapeHtml(item.title)}</div>
                <div class="fankarr-modal-success-sub">${seasonsLabel}</div>
                <button class="emby-button raised button-submit" style="width:100%;">Fermer</button>
              </div>
            `;
                        modal.querySelector('button').addEventListener('click', closeModal);

                        // Update card button label
                        const allRequested = [...alreadySet, ...newlyRequested];
                        updateCardButton(item.id, allRequested, seasons.length);

                        // Update item state so reopening the modal reflects the new request
                        item._wasRequested = true;
                        item._requestedSeasons = allRequested.sort((a, b) => a - b);
                        item.request = {
                            ...(item.request || {}),
                            seasons: item._requestedSeasons,
                            status: item.request?.status || 'pending',
                        };
                    } catch (e) {
                        console.error('[FanKarr] Erreur demande :', e);
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Réessayer';
                    }
                });
            }
        }

        renderModal();
    }

    // Update the card button after a successful request
    function updateCardButton(serieId, allRequestedSeasons, totalSeasons) {
        const card = document.querySelector(`[data-fankarr-id="${serieId}"]`);
        if (!card) return;
        const btn = card.querySelector('.fankarr-btn');
        if (!btn) return;

        const allDone = allRequestedSeasons.length === 0 || allRequestedSeasons.length >= totalSeasons;
        if (allDone) {
            btn.innerHTML = '<span class="material-icons" style="font-size:1em">check</span> Demandé';
            btn.classList.add('button-submit');
        } else {
            btn.innerHTML = '<span class="material-icons" style="font-size:1em">add</span> Demander plus';
            btn.classList.remove('button-submit');
        }
    }

    // ---------------------------------------------------------------------------
    // 6. UI — section et cards
    // ---------------------------------------------------------------------------

    function getOrCreateSection(container) {
        let section = document.getElementById(SECTION_ID);
        if (!section) {
            section = document.createElement('div');
            section.id = SECTION_ID;
            section.innerHTML = `
      <h2 class="sectionTitle sectionTitle-cards focuscontainer-x padded-left padded-right fankarr-section-title">
        Découvrir sur FanKaï
        <img class="fankarr-logo" src="${FANKAI_LOGO}" alt="FanKaï" />
      </h2>
      <div class="fankarr-grid padded-left"></div>
    `;
            container.appendChild(section);

            // Reposition before Episodes section if it appears later
            setTimeout(() => {
                const epSection = Array.from(container.querySelectorAll('.verticalSection'))
                  .find(s => s.querySelector('.sectionTitle')?.textContent?.toLowerCase().includes('épisode'));
                if (epSection && section.parentNode === container) {
                    container.insertBefore(section, epSection);
                }
            }, 1000);
        }
        return section;
    }

    function renderResults(section, results) {
        const grid = section.querySelector('.fankarr-grid');
        if (!grid) return;
        grid.innerHTML = '';

        results.forEach(item => {
            // item.request: null → never requested
            // item.request.seasons: [] → whole series requested
            // item.request.seasons: [1,2] → specific seasons requested
            const req = item.request;
            const wasRequested = req != null;
            const requestedSeasons = wasRequested ? (req.seasons || []) : [];
            const wholeSeriesRequested = wasRequested && requestedSeasons.length === 0;

            // Enrich item with request state for modal
            item._wasRequested = wasRequested;
            item._requestedSeasons = requestedSeasons;

            const poster = item.image || (item.posterPath ? `https://image.tmdb.org/t/p/w200${item.posterPath}` : null);
            const year = item.year || '';
            const rating = item.rating ? Number(item.rating).toFixed(1) : null;
            const desc = item.description || '';

            // Button label
            let btnIcon, btnLabel, btnClass;
            if (wholeSeriesRequested) {
                btnIcon = 'check'; btnLabel = 'Demandé'; btnClass = ' button-submit';
            } else if (wasRequested) {
                btnIcon = 'add'; btnLabel = 'Demander plus'; btnClass = '';
            } else {
                btnIcon = 'download'; btnLabel = 'Demander'; btnClass = '';
            }

            const card = document.createElement('div');
            card.className = 'fankarr-card card overflowPortraitCard card-withuserdata';
            card.dataset.fankarrId = item.id;

            card.innerHTML = `
        <div class="cardBox cardBox-bottompadded">
          <div class="cardScalable">
            <div class="cardPadder cardPadder-overflowPortrait"></div>
            ${poster
              ? `<div class="cardImageContainer coveredImage cardContent" style="background-image:url('${escapeHtml(poster)}');"></div>`
              : `<div class="cardImageContainer defaultCardBackground defaultCardBackground1 cardContent"><span class="cardImageIcon material-icons tv" aria-hidden="true"></span></div>`
            }
            <span class="fankarr-badge">SÉRIE</span>
            <div class="fankarr-overlay">
              ${desc ? `<div class="fankarr-overlay-desc">${escapeHtml(desc)}</div>` : ''}
              <button class="fankarr-btn emby-button raised${btnClass}">
                <span class="material-icons" style="font-size:1em">${btnIcon}</span>
                ${btnLabel}
              </button>
            </div>
          </div>
          <div class="cardText cardTextCentered cardText-first"><bdi>${escapeHtml(item.title)}</bdi></div>
          <div class="fankarr-meta-row">
            ${year ? `<span>${year}</span>` : ''}
            ${year && rating ? `<span>·</span>` : ''}
            ${rating ? `<span class="fankarr-rating"><span class="fankarr-rating-star">★</span>${rating}</span>` : ''}
          </div>
        </div>
      `;

            // Always clickable unless whole series already requested
            if (!wholeSeriesRequested) {
                card.querySelector('.fankarr-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    showRequestModal(item, item._requestedSeasons);
                });
            }

            grid.appendChild(card);
        });
    }

    // ---------------------------------------------------------------------------
    // 7. Search hook
    // ---------------------------------------------------------------------------

    let searchTimeout = null;
    let lastQuery = '';

    // Wait for .searchResults to appear in the DOM (max ~3s)
    function waitForSearchResults(maxWait = 3000) {
        return new Promise(resolve => {
            const existing = document.querySelector('.searchResults');
            if (existing) return resolve(existing);

            const interval = 100;
            let elapsed = 0;
            const timer = setInterval(() => {
                const el = document.querySelector('.searchResults');
                elapsed += interval;
                if (el || elapsed >= maxWait) {
                    clearInterval(timer);
                    resolve(el || null);
                }
            }, interval);
        });
    }

    async function onSearch(query) {
        if (!query || query.length < 2) {
            const existing = document.getElementById(SECTION_ID);
            if (existing) existing.remove();
            return;
        }
        if (query === lastQuery) return;
        lastQuery = query;

        try {
            const [searchData, realContainer] = await Promise.all([
                apiGet(`/api/v1/series/search?q=${encodeURIComponent(query)}`),
                waitForSearchResults(),
            ]);

            if (!realContainer) {
                console.warn('[FanKarr] .searchResults introuvable, injection annulée.');
                return;
            }

            const results = searchData.results || searchData || [];
            if (!results || results.length === 0) {
                const existing = document.getElementById(SECTION_ID);
                if (existing) existing.remove();
                return;
            }

            const section = getOrCreateSection(realContainer);
            renderResults(section, results);
        } catch (e) {
            console.error('[FanKarr] Erreur recherche :', e);
            const existing = document.getElementById(SECTION_ID);
            if (existing) existing.remove();
        }
    }

    // ---------------------------------------------------------------------------
    // 8. Observer
    // ---------------------------------------------------------------------------

    function findSearchInput() { return document.querySelector('#searchTextInput'); }

    function isSearchPage() {
        return window.location.hash.includes('search') || !!document.querySelector('#searchTextInput');
    }

    let inputListenerAttached = false;

    function attachInputListener() {
        if (inputListenerAttached) return;
        const input = findSearchInput();
        if (!input) return;
        inputListenerAttached = true;
        input.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            const query = input.value.trim();
            searchTimeout = setTimeout(() => onSearch(query), 400);
        });
        if (input.value) {
            onSearch(input.value.trim());
        }
    }

    const observer = new MutationObserver(() => {
        if (isSearchPage()) { injectStyles(); attachInputListener(); }
        else { inputListenerAttached = false; lastQuery = ''; closeModal(); }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // ---------------------------------------------------------------------------
    // Init
    // ---------------------------------------------------------------------------

    injectStyles();
    createModal();
    if (!fankarrToken) await authenticate();
    if (isSearchPage()) attachInputListener();
    console.info('[FanKarr] Plugin chargé ✓');

    // ---------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------

    function escapeHtml(str) {
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
    }
})();