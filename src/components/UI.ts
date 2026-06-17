import { exportData, importData, setProxyMode } from "../app/SettingsManager";
import { getWispServer, setWispServer } from "../app/utils";

export const ASSET_PATH = "/assets/chrome";

function fire(type: string, detail?: unknown) {
  document.dispatchEvent(new CustomEvent(type, { detail }));
}

function closeSettingsOverlay() {
  const overlay = document.getElementById("settings-overlay") as HTMLDivElement | null;
  if (overlay) overlay.style.display = "none";
}

function openSettingsOverlay() {
  const overlay = document.getElementById("settings-overlay") as HTMLDivElement | null;
  if (overlay) overlay.style.display = "flex";
}

function iconSvg(path: string, viewBox = "0 0 24 24") {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      ${path}
    </svg>
  `;
}

export function initUI(app: HTMLElement) {
  app.innerHTML = `
    <style>
      :root {
        --cr-frame-bg: #222222;
        --cr-toolbar-bg: rgba(60,60,60,1);
        --cr-omnibox-bg: #222222;
        --cr-omnibox-hover: rgb(75, 75, 75);
        --cr-text-primary: #e3e3e3;
        --cr-text-secondary: #c7c7c7;
        --cr-hover-bg: rgba(255, 255, 255, 0.08);
        --cr-active-bg: rgba(255, 255, 255, 0.12);
        --cr-border-radius-pill: 999px;
      }

      * { box-sizing: border-box; }

      html, body {
        margin: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: var(--cr-frame-bg);
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      body { user-select: none; }

      #view-stack, #web-view, #browser-root {
        width: 100%;
        height: 100%;
      }

      #browser-root {
        display: flex;
        flex-direction: column;
        background: var(--cr-frame-bg);
      }

      #chrome-ui-wrapper {
        display: flex;
        flex-direction: column;
        background: var(--cr-frame-bg);
        box-shadow: 0 1px 0 rgba(0,0,0,0.4);
        z-index: 4;
      }

      #tab-strip-container {
        height: 38px;
        display: flex;
        align-items: flex-end;
        padding: 0 6px;
        background: var(--cr-frame-bg);
        border-bottom: 1px solid rgba(255,255,255,0.04);
      }

      #tab-bar {
        display: flex;
        align-items: flex-end;
        height: 100%;
        gap: 2px;
        flex: 1;
        overflow: hidden;
      }

      .tab {
        height: 34px;
        min-width: 96px;
        max-width: 250px;
        width: 220px;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 0 10px 0 12px;
        border: 0;
        background: transparent;
        color: var(--cr-text-secondary);
        position: relative;
        cursor: pointer;
        flex: 0 1 auto;
        transition:
          background-color 120ms ease,
          color 120ms ease,
          width 120ms ease,
          transform 120ms ease;
      }

      .tab:hover {
        background: rgba(255,255,255,0.05);
      }

      .tab.active {
        background: var(--cr-toolbar-bg);
        color: var(--cr-text-primary);
        z-index: 3;
      }

      .tab-enter {
        opacity: 0.55;
        transform: translateY(2px);
      }

      .tab-favicon {
        width: 16px;
        height: 16px;
        object-fit: contain;
        flex: 0 0 auto;
      }

      .tab-title {
        flex: 1;
        min-width: 0;
        font-size: 12.5px;
        line-height: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .tab-close {
        width: 22px;
        height: 22px;
        margin-left: 2px;
        border: 0;
        outline: none;
        background: transparent;
        color: inherit;
        border-radius: 999px;
        font-size: 18px;
        line-height: 1;
        cursor: pointer;
        opacity: 0.85;
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 120ms ease, opacity 120ms ease;
        appearance: none;
      }

      .tab-close:hover {
        background: var(--cr-active-bg);
        opacity: 1;
      }

      #tab-finder-btn {
        width: 30px;
        height: 30px;
        border: 0;
        outline: none;
        appearance: none;
        background: transparent;
        color: var(--cr-text-primary);
        border-radius: 999px;
        margin-bottom: 2px;
        cursor: pointer;
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 120ms ease, transform 120ms ease;
      }

      #tab-finder-btn:hover {
        background: var(--cr-hover-bg);
      }

      #tab-finder-btn:active {
        transform: scale(0.96);
      }

      #tab-finder-btn svg {
        width: 18px;
        height: 18px;
      }

      #topbar {
        height: 48px;
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 0 8px;
        background: var(--cr-toolbar-bg);
        border-bottom: 1px solid rgba(255,255,255,0.04);
      }

      .nav-group,
      .actions-group {
        display: flex;
        align-items: center;
        gap: 2px;
        flex: 0 0 auto;
      }

      .toolbar-btn {
        width: 30px;
        height: 30px;
        border: 0;
        outline: none;
        appearance: none;
        border-radius: 999px;
        background: transparent;
        cursor: pointer;
        color: transparent;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 120ms ease, transform 120ms ease, opacity 120ms ease;
      }

      .toolbar-btn:hover {
        background-color: var(--cr-hover-bg);
      }

      .toolbar-btn:active {
        transform: scale(0.96);
      }

      .toolbar-btn:disabled {
        opacity: 0.35;
        cursor: default;
      }

      .toolbar-btn svg {
        width: 16px;
        height: 16px;
        stroke: currentColor;
        color: var(--cr-text-primary);
      }

      .omnibox-shell {
        height: 32px;
        flex: 1;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 0 12px;
        border-radius: var(--cr-border-radius-pill);
        background: var(--cr-omnibox-bg);
        border: 1px solid transparent;
        transition: background-color 140ms ease, border-color 140ms ease, box-shadow 140ms ease;
        min-width: 0;
      }

      .omnibox-shell:hover {
        background: var(--cr-omnibox-hover);
      }

      .omnibox-shell:focus-within {
        border-color: #8ab4f8;
        box-shadow: 0 0 0 1px rgba(138,180,248,0.35);
      }

      .omnibox-icon {
        width: 16px;
        height: 16px;
        flex: 0 0 auto;
        background: none;
        opacity: 0.9;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .omnibox-icon svg {
        width: 16px;
        height: 16px;
        color: var(--cr-text-secondary);
      }

      #url-bar {
        border: 0;
        outline: none;
        background: transparent;
        color: var(--cr-text-primary);
        font-size: 13px;
        width: 100%;
        min-width: 0;
        font-family: inherit;
      }

      #url-bar::placeholder {
        color: var(--cr-text-secondary);
      }

      #frames-container {
        flex: 1;
        position: relative;
        background: var(--cr-toolbar-bg);
      }

      .proxy-frame {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        border: 0;
        opacity: 0;
        pointer-events: none;
        transition: opacity 140ms ease;
        background: white;
      }

      .proxy-frame.active {
        opacity: 1;
        pointer-events: auto;
      }

      #settings-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.55);
        backdrop-filter: blur(3px);
        z-index: 9999;
        display: flex;
        justify-content: center;
        align-items: center;
        animation: overlayFade 140ms ease;
      }

      #settings-modal {
        width: min(460px, calc(100vw - 24px));
        border-radius: 14px;
        padding: 22px;
        background: var(--cr-toolbar-bg);
        color: var(--cr-text-primary);
        border: 1px solid rgba(255,255,255,0.08);
        box-shadow: 0 18px 60px rgba(0,0,0,0.45);
        animation: modalPop 150ms ease;
      }

      #settings-title {
        margin: 0 0 18px 0;
        font-size: 18px;
        font-weight: 600;
      }

      .settings-section {
        margin-bottom: 18px;
      }

      .settings-section label {
        display: block;
        margin-bottom: 8px;
        color: var(--cr-text-secondary);
        font-size: 13px;
      }

      .settings-section input[type="text"] {
        width: 100%;
        border: 1px solid rgba(255,255,255,0.16);
        border-radius: 8px;
        padding: 9px 12px;
        background: var(--cr-frame-bg);
        color: var(--cr-text-primary);
        outline: none;
      }

      .settings-section input[type="text"]:focus {
        border-color: #8ab4f8;
      }

      .settings-hint {
        margin: 7px 0 0 0;
        font-size: 11.5px;
        color: var(--cr-text-secondary);
      }

      .choice-actions,
      .data-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .choice-actions button,
      .data-actions button {
        border: 1px solid rgba(255,255,255,0.16);
        border-radius: 8px;
        background: var(--cr-frame-bg);
        color: var(--cr-text-primary);
        padding: 7px 12px;
        cursor: pointer;
      }

      .choice-actions button:hover,
      .data-actions button:hover {
        background: var(--cr-hover-bg);
      }

      .settings-actions {
        margin-top: 24px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .settings-actions-right {
        display: flex;
        gap: 8px;
      }

      .settings-actions button {
        border-radius: 8px;
        border: 0;
        padding: 8px 14px;
        cursor: pointer;
      }

      #settings-reset {
        background: transparent;
        color: #f28b82;
        border: 1px solid rgba(242, 139, 130, 0.25);
      }

      #settings-cancel {
        background: transparent;
        color: var(--cr-text-primary);
      }

      #settings-cancel:hover {
        background: var(--cr-hover-bg);
      }

      .primary-btn {
        background: #8ab4f8;
        color: #202124;
        font-weight: 600;
      }

      .primary-btn:hover {
        background: #aecbfa;
      }

      @keyframes overlayFade {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes modalPop {
        from {
          opacity: 0;
          transform: translateY(8px) scale(0.98);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
    </style>

    <div id="view-stack">
      <div id="web-view" class="view-container">
        <div id="browser-root">
          <div id="chrome-ui-wrapper">
            <div id="tab-strip-container">
              <div id="tab-bar">
                <button id="tab-finder-btn" type="button" title="Search tabs" aria-label="Search tabs">
                  ${iconSvg(`
                    <circle cx="10" cy="10" r="5"></circle>
                    <path d="M14 14l5 5"></path>
                    <path d="M16 8h6"></path>
                    <path d="M18 5h4"></path>
                    <path d="M18 11h4"></path>
                  `)}
                </button>
              </div>
            </div>

            <div id="topbar">
              <div class="nav-group">
                <button id="back-btn" class="toolbar-btn" type="button" title="Back" aria-label="Back">
                  ${iconSvg(`<path d="M15 18l-6-6 6-6"></path>`)}
                </button>
                <button id="forward-btn" class="toolbar-btn" type="button" title="Forward" aria-label="Forward">
                  ${iconSvg(`<path d="M9 18l6-6-6-6"></path>`)}
                </button>
                <button id="reload-btn" class="toolbar-btn" type="button" title="Reload" aria-label="Reload">
                  ${iconSvg(`<path d="M20 11a8 8 0 1 0 2 5"></path><path d="M20 5v6h-6"></path>`)}
                </button>
              </div>

              <div class="omnibox-shell">
                <div class="omnibox-icon" aria-hidden="true">
                  ${iconSvg(`<circle cx="12" cy="12" r="8"></circle><path d="M15 15l4 4"></path>`, "0 0 24 24")}
                </div>
                <input id="url-bar" type="text" placeholder="Search Google or type a URL" autocomplete="off" spellcheck="false" />
              </div>

              <div class="actions-group">
                <button id="menu-btn" class="toolbar-btn" type="button" title="Settings and more" aria-label="Settings and more">
                  ${iconSvg(`<circle cx="12" cy="5" r="1.5"></circle><circle cx="12" cy="12" r="1.5"></circle><circle cx="12" cy="19" r="1.5"></circle>`)}
                </button>
              </div>
            </div>
          </div>

          <div id="frames-container"></div>
        </div>
      </div>
    </div>

    <div id="settings-overlay" style="display:none;">
      <div id="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <h2 id="settings-title">Settings</h2>

        <div class="settings-section">
          <label for="wisp-input">Wisp server</label>
          <input id="wisp-input" type="text" spellcheck="false" autocomplete="off" placeholder="wss://example.com/" />
          <p class="settings-hint">WebSocket URL used for the proxy transport.</p>
        </div>

        <div class="settings-section">
          <label>Proxy</label>
          <div class="choice-actions">
            <button id="choice-uv" type="button">Ultraviolet</button>
            <button id="choice-scram" type="button">Scramjet</button>
          </div>
          <p class="settings-hint">Switching proxy mode will reload the app.</p>
        </div>

        <div class="settings-section">
          <label>Data Management</label>
          <div class="data-actions">
            <button id="export-data" type="button">Export Data</button>
            <button id="import-data" type="button">Import Data</button>
            <input type="file" id="import-input" accept=".json" style="display:none;" />
          </div>
          <p class="settings-hint">Backup or restore your settings and site data.</p>
        </div>

        <div class="settings-actions">
          <button id="settings-reset" type="button">Reset</button>
          <div class="settings-actions-right">
            <button id="settings-cancel" type="button">Cancel</button>
            <button id="settings-save" type="button" class="primary-btn">Save</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const urlBar = document.getElementById("url-bar") as HTMLInputElement | null;
  const tabFinderBtn = document.getElementById("tab-finder-btn") as HTMLButtonElement | null;
  const backBtn = document.getElementById("back-btn") as HTMLButtonElement | null;
  const forwardBtn = document.getElementById("forward-btn") as HTMLButtonElement | null;
  const reloadBtn = document.getElementById("reload-btn") as HTMLButtonElement | null;
  const menuBtn = document.getElementById("menu-btn") as HTMLButtonElement | null;

  if (urlBar) {
    urlBar.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        let query = urlBar.value.trim();
        if (!query) return;

        const isProbablyUrl = query.includes(".") && !query.includes(" ");
        if (isProbablyUrl && !query.startsWith("http")) {
          query = "https://" + query;
        } else if (!isProbablyUrl) {
          query = "https://www.google.com/search?q=" + encodeURIComponent(query);
        }

        fire("omnibox-submit", query);
      }
    });

    urlBar.addEventListener("focus", () => {
      requestAnimationFrame(() => urlBar.select());
    });
  }

  tabFinderBtn?.addEventListener("click", () => fire("browser-tab-finder"));
  backBtn?.addEventListener("click", () => fire("browser-back"));
  forwardBtn?.addEventListener("click", () => fire("browser-forward"));
  reloadBtn?.addEventListener("click", () => fire("browser-reload"));
  menuBtn?.addEventListener("click", () => openSettingsOverlay());

  window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    const ctrl = e.ctrlKey || e.metaKey;

    if (ctrl && key === "l") {
      e.preventDefault();
      urlBar?.focus();
      urlBar?.select();
    } else if (ctrl && key === "t") {
      e.preventDefault();
      fire("browser-new-tab");
    } else if (ctrl && key === "w") {
      e.preventDefault();
      fire("browser-close-active-tab");
    } else if (ctrl && key === "r") {
      e.preventDefault();
      fire("browser-reload");
    } else if (e.altKey && e.key === "ArrowLeft") {
      e.preventDefault();
      fire("browser-back");
    } else if (e.altKey && e.key === "ArrowRight") {
      e.preventDefault();
      fire("browser-forward");
    } else if (e.key === "Escape") {
      closeSettingsOverlay();
    }
  });

  window.addEventListener("message", (event) => {
    if (event.data && event.data.type === "navigate" && event.data.value) {
      let query = String(event.data.value).trim();
      if (!query.startsWith("http") && !query.includes(".")) {
        query = "https://www.google.com/search?q=" + encodeURIComponent(query);
      } else if (!query.startsWith("http")) {
        query = "https://" + query;
      }
      fire("omnibox-submit", query);
    }
  });

  const settingsOverlay = document.getElementById("settings-overlay") as HTMLDivElement | null;
  const settingsCancel = document.getElementById("settings-cancel") as HTMLButtonElement | null;
  const settingsSave = document.getElementById("settings-save") as HTMLButtonElement | null;
  const settingsReset = document.getElementById("settings-reset") as HTMLButtonElement | null;
  const exportBtn = document.getElementById("export-data") as HTMLButtonElement | null;
  const importBtn = document.getElementById("import-data") as HTMLButtonElement | null;
  const importInput = document.getElementById("import-input") as HTMLInputElement | null;
  const wispInput = document.getElementById("wisp-input") as HTMLInputElement | null;
  const choiceUv = document.getElementById("choice-uv") as HTMLButtonElement | null;
  const choiceScram = document.getElementById("choice-scram") as HTMLButtonElement | null;

  if (wispInput) {
    wispInput.value = getWispServer();
  }

  settingsCancel?.addEventListener("click", closeSettingsOverlay);

  settingsOverlay?.addEventListener("click", (e) => {
    if (e.target === settingsOverlay) closeSettingsOverlay();
  });

  settingsSave?.addEventListener("click", () => {
    if (wispInput) {
      setWispServer(wispInput.value.trim() || getWispServer());
    }
    closeSettingsOverlay();
    location.reload();
  });

  settingsReset?.addEventListener("click", () => {
    if (!confirm("Reset all local Deployable data?")) return;
    localStorage.clear();
    location.reload();
  });

  exportBtn?.addEventListener("click", () => exportData());
  importBtn?.addEventListener("click", () => importInput?.click());

  importInput?.addEventListener("change", () => {
    const file = importInput.files?.[0];
    if (file) importData(file);
    importInput.value = "";
  });

  choiceUv?.addEventListener("click", async () => {
    await setProxyMode("choice-uv");
    location.reload();
  });

  choiceScram?.addEventListener("click", async () => {
    await setProxyMode("choice-scram");
    location.reload();
  });
}
