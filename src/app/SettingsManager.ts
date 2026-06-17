import { openDB } from "idb";

const DB_NAME = "SettingsDB";
const STORE_NAME = "settings";

async function openSettingsDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
}

export async function setProxyMode(mode: "choice-uv" | "choice-scram") {
  const db = await openSettingsDB();
  await db.put(STORE_NAME, mode, "deployable.proxy");
}

export function exportData() {
  const data: Record<string, string> = {};

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) data[key] = localStorage.getItem(key) || "";
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `deployable-backup-${new Date().toISOString().split("T")[0]}.json`;
  a.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function importData(file: File) {
  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target?.result as string);

      if (
        confirm("This will overwrite your current settings and data. Continue?")
      ) {
        localStorage.clear();

        for (const [key, value] of Object.entries(data)) {
          localStorage.setItem(key, value as string);
        }

        alert("Data imported successfully! Reloading...");
        location.reload();
      }
    } catch {
      alert("Invalid backup file.");
    }
  };

  reader.readAsText(file);
}
