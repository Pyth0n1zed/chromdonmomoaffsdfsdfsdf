import { Tab } from "./types";
import { homeDataURL } from "../components/StartPage";
import { PREFIX, CURRENT_PROXY } from "./constants";
import { normalizeUrl } from "./utils";
import { checkLarp } from "./EasterEgg";
import logo from "../assets/logo.png";
import { sj } from "../index";

export const ASSET_PATH = "/assets/chrome";

let tabs: Tab[] = [];
let activeTab: Tab | null = null;

export function getTabs() {
  return tabs;
}

export function getActiveTab() {
  return activeTab;
}

export function setActiveTab(tab: Tab | null) {
  activeTab = tab;
  syncToolbarButtons();
}

function $(id: string) {
  return document.getElementById(id);
}

function getUrlBar() {
  return document.getElementById("url-bar") as HTMLInputElement | null;
}

function getButton(id: string) {
  return document.getElementById(id) as HTMLButtonElement | null;
}

function dispatchStateChanged() {
  document.dispatchEvent(new CustomEvent("tab-state-changed"));
}

function syncToolbarButtons() {
  const backBtn = getButton("back-btn");
  const forwardBtn = getButton("forward-btn");

  if (!activeTab) {
    if (backBtn) backBtn.disabled = true;
    if (forwardBtn) forwardBtn.disabled = true;
    return;
  }

  if (backBtn) backBtn.disabled = activeTab.historyIndex <= 0;
  if (forwardBtn)
    forwardBtn.disabled = activeTab.historyIndex >= activeTab.history.length - 1;
}

function normalizeDisplayTitle(url: string) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "") || u.href;
  } catch {
    return url;
  }
}

function setTabLoadingState(tab: Tab, isLoading: boolean) {
  tab.loading = isLoading;
  tab.tabElement.dataset.loading = String(isLoading);

  const faviconEl = tab.tabElement.querySelector(
    ".tab-favicon",
  ) as HTMLImageElement | null;

  if (!faviconEl) return;

  if (isLoading) {
    faviconEl.src = `${ASSET_PATH}/throbber_small.svg`;
    return;
  }

  faviconEl.src =
    tab.url === homeDataURL ? logo : tab.favicon || logo;
}

function triggerErrorPage(tab: Tab, message: string) {
  tab.loading = false;
  setTabLoadingState(tab, false);

  const errorHTML = `
    <div style="font-family: system-ui, sans-serif; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background-color: #202124;">
      <img src="${ASSET_PATH}/icon_picture_delete.svg" width="64" style="margin-bottom: 20px; filter: invert(1); opacity: 0.7;">
      <h2 style="margin:0 0 10px 0; font-weight: 400;">This site can't be reached</h2>
      <p style="color: #9aa0a6; margin:0;">${message}</p>
    </div>
  `;

  tab.frame.src = "data:text/html;charset=utf-8," + encodeURIComponent(errorHTML);
  updateTabMetadata(tab, "Network Error");
}

function updateActiveFrameVisibility() {
  document.querySelectorAll(".proxy-frame").forEach((el) => {
    el.classList.remove("active");
  });

  if (activeTab) {
    activeTab.frame.classList.add("active");
  }
}

function updateTabClasses() {
  document.querySelectorAll(".tab").forEach((el) => el.classList.remove("active"));

  if (activeTab) {
    activeTab.tabElement.classList.add("active");
  }
}

function syncTabUI() {
  updateTabClasses();
  updateActiveFrameVisibility();

  const urlBar = getUrlBar();
  if (urlBar && activeTab) {
    urlBar.value = activeTab.url === homeDataURL ? "" : activeTab.url;
  }

  syncToolbarButtons();
  dispatchStateChanged();
}

async function navigateHistory(delta: -1 | 1) {
  if (!activeTab) return;

  const nextIndex = activeTab.historyIndex + delta;
  if (nextIndex < 0 || nextIndex >= activeTab.history.length) return;

  activeTab.historyIndex = nextIndex;
  const target = activeTab.history[nextIndex];

  loadTab(activeTab, target, target === homeDataURL, false);
}

document.addEventListener("omnibox-submit", ((e: CustomEvent) => {
  if (activeTab) {
    loadTab(activeTab, e.detail, false);
  } else {
    void createTab(e.detail);
  }
}) as EventListener);

document.addEventListener("browser-new-tab", () => {
  void createTab(homeDataURL);
});

document.addEventListener("browser-back", () => {
  void navigateHistory(-1);
});

document.addEventListener("browser-forward", () => {
  void navigateHistory(1);
});

document.addEventListener("browser-reload", () => {
  if (!activeTab) return;
  loadTab(activeTab, activeTab.url, activeTab.url === homeDataURL, false);
});

document.addEventListener("browser-close-active-tab", () => {
  if (activeTab) closeTab(activeTab.id);
});

export async function createTab(url: string = homeDataURL) {
  const framesContainer = document.getElementById(
    "frames-container",
  ) as HTMLDivElement;
  const tabBar = document.getElementById("tab-bar") as HTMLDivElement;
  const newTabBtn = document.getElementById(
    "new-tab-btn",
  ) as HTMLButtonElement | null;

  const id = Math.random().toString(36).substring(2, 11);

  const sjFrame = sj.createFrame();
  const frame = sjFrame.frame;
  frame.className = "proxy-frame";
  frame.id = `frame-${id}`;

  framesContainer.appendChild(frame);

  const tabElement = document.createElement("div");
  tabElement.className = "tab";
  tabElement.id = `tab-${id}`;
  tabElement.setAttribute("role", "tab");
  tabElement.setAttribute("aria-selected", "false");
  tabElement.innerHTML = `
    <img class="tab-favicon" src="${logo}" alt="" />
    <span class="tab-title">New Tab</span>
    <button class="tab-close" type="button" title="Close Tab" aria-label="Close Tab">&times;</button>
  `;

  if (newTabBtn) {
    tabBar.insertBefore(tabElement, newTabBtn);
  } else {
    tabBar.appendChild(tabElement);
  }

  tabElement.classList.add("tab-enter");

  const tab: Tab = {
    id,
    url: "",
    history: [],
    historyIndex: -1,
    frame,
    tabElement,
    sjFrame,
    loading: false,
  };

  tabs.push(tab);

  requestAnimationFrame(() => {
    tabElement.classList.remove("tab-enter");
  });

  tabElement.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;

    if (target.closest(".tab-close")) {
      closeTab(id);
      return;
    }

    switchTab(id);
  });

  tabElement.addEventListener("auxclick", (e) => {
    if (e.button === 1) {
      e.preventDefault();
      closeTab(id);
    }
  });

  const syncMetadata = () => {
    try {
      const win = frame.contentWindow as Window & { document?: Document } | null;
      if (!win) return;

      const doc = win.document;
      if (!doc) return;

      const title = doc.title?.trim();
      const favicon = doc.querySelector("link[rel*='icon']")?.getAttribute("href") || undefined;

      updateTabMetadata(tab, title, favicon);
    } catch {
      // Ignore cross-origin or transient access issues
    }
  };

  frame.addEventListener("load", () => {
    setTabLoadingState(tab, false);
    syncMetadata();

    try {
      const frameHref = frame.contentWindow?.location.href || "";
      if (frameHref.includes(PREFIX)) {
        const encodedUrl = frameHref.substring(frameHref.indexOf(PREFIX) + PREFIX.length);
        let decodedUrl = "";

        if (CURRENT_PROXY === "choice-scram") {
          decodedUrl = decodeURIComponent(encodedUrl);
        } else {
          decodedUrl = (window as any).Ultraviolet.codec.xor.decode(encodedUrl);
        }

        if (
          decodedUrl &&
          normalizeUrl(decodedUrl) !== normalizeUrl(tab.url)
        ) {
          tab.url = decodedUrl;

          if (activeTab === tab) {
            const urlBar = getUrlBar();
            if (urlBar) urlBar.value = decodedUrl;
          }

          tab.history = tab.history.slice(0, tab.historyIndex + 1);
          tab.history.push(decodedUrl);
          tab.historyIndex++;
          checkLarp(decodedUrl);
        }
      }
    } catch {
      if (tab.url !== homeDataURL && !tab.url.includes("data:text/html")) {
        triggerErrorPage(tab, "Failed to resolve connection.");
      }
    }

    syncToolbarButtons();
  });

  const metadataInterval = window.setInterval(() => {
    if (tabs.includes(tab)) {
      syncMetadata();
    } else {
      clearInterval(metadataInterval);
    }
  }, 1000);

  loadTab(tab, url, url === homeDataURL);
  switchTab(id);

  return tab;
}

export function updateTabMetadata(tab: Tab, title?: string, favicon?: string) {
  if (title) {
    tab.title = title;
  }
  if (favicon) {
    tab.favicon = favicon;
  }

  const titleEl = tab.tabElement.querySelector(".tab-title");
  const faviconEl = tab.tabElement.querySelector(".tab-favicon") as HTMLImageElement | null;

  const displayTitle =
    tab.url === homeDataURL
      ? "Home"
      : tab.title?.trim() || normalizeDisplayTitle(tab.url);

  if (titleEl) {
    titleEl.textContent = displayTitle;
  }

  if (faviconEl && !tab.loading) {
    faviconEl.src = tab.url === homeDataURL ? logo : tab.favicon || logo;
  }

  syncToolbarButtons();
}

export function switchTab(id: string) {
  const urlBar = getUrlBar();
  const tab = tabs.find((t) => t.id === id);
  if (!tab) return;

  activeTab = tab;

  tabs.forEach((t) => {
    t.tabElement.setAttribute("aria-selected", t.id === id ? "true" : "false");
  });

  syncTabUI();

  if (urlBar) {
    urlBar.value = tab.url === homeDataURL ? "" : tab.url;
  }

  syncToolbarButtons();
}

export function closeTab(id: string) {
  const index = tabs.findIndex((t) => t.id === id);
  if (index === -1) return;

  const tab = tabs[index];
  const wasActive = activeTab?.id === id;

  tab.frame.remove();
  tab.tabElement.remove();
  tabs.splice(index, 1);

  if (tabs.length === 0) {
    void createTab(homeDataURL);
    return;
  }

  if (wasActive) {
    const nextTab = tabs[index] || tabs[index - 1] || tabs[0];
    switchTab(nextTab.id);
  } else {
    syncToolbarButtons();
  }
}

export function loadTab(
  tab: Tab,
  url: string,
  isHome: boolean = false,
  push: boolean = true,
) {
  const urlBar = getUrlBar();

  if (push) {
    tab.history = tab.history.slice(0, tab.historyIndex + 1);
    tab.history.push(url);
    tab.historyIndex++;
  }

  tab.url = url;

  if (isHome) {
    tab.loading = false;
    if (activeTab === tab && urlBar) urlBar.value = "";
    setTabLoadingState(tab, false);
    tab.frame.src = homeDataURL;
  } else {
    if (activeTab === tab && urlBar) urlBar.value = url;
    setTabLoadingState(tab, true);

    let encodedUrl: string;

    if (CURRENT_PROXY === "choice-scram") {
      encodedUrl = encodeURIComponent(url);
    } else {
      encodedUrl = (window as any).Ultraviolet.codec.xor.encode(url);
    }

    tab.frame.src = PREFIX + encodedUrl;
    checkLarp(url);
  }

  updateTabMetadata(tab, isHome ? "Home" : tab.title || url);
  syncToolbarButtons();
}
