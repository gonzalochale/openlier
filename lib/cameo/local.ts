export interface LocalCameoRecord {
  imageBase64: string;
  mimeType: string;
  updatedAt: string;
  schemaVersion: number;
}

const LOCAL_CAMEO_KEY = "openlier:cameo";
const LOCAL_CAMEO_SCHEMA_VERSION = 1;

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isLocalCameoRecord(value: unknown): value is LocalCameoRecord {
  if (!value || typeof value !== "object") return false;

  const record = value as Partial<LocalCameoRecord>;
  return (
    typeof record.imageBase64 === "string" &&
    typeof record.mimeType === "string" &&
    typeof record.updatedAt === "string" &&
    record.schemaVersion === LOCAL_CAMEO_SCHEMA_VERSION
  );
}

function removeLocalCameoUnsafe() {
  if (!canUseLocalStorage()) return;
  window.localStorage.removeItem(LOCAL_CAMEO_KEY);
}

export function validateImage(imageBase64: string): string | null {
  if (!imageBase64 || typeof imageBase64 !== "string") {
    return "Image data required";
  }
  if (imageBase64.length < 1000) return "Image appears empty";
  if (imageBase64.length > 2_000_000) return "Image exceeds size limit";
  return null;
}

export function getLocalCameo(): LocalCameoRecord | null {
  if (!canUseLocalStorage()) return null;

  try {
    const raw = window.localStorage.getItem(LOCAL_CAMEO_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!isLocalCameoRecord(parsed)) {
      removeLocalCameoUnsafe();
      return null;
    }

    const validationError = validateImage(parsed.imageBase64);
    if (validationError) {
      removeLocalCameoUnsafe();
      return null;
    }

    return parsed;
  } catch {
    removeLocalCameoUnsafe();
    return null;
  }
}

export function getLocalCameoReferenceImage(): {
  imageBase64: string;
  mimeType: string;
} | null {
  const cameo = getLocalCameo();
  if (!cameo) return null;

  return {
    imageBase64: cameo.imageBase64,
    mimeType: cameo.mimeType,
  };
}

export function hasLocalCameo(): boolean {
  return getLocalCameo() !== null;
}

export function saveLocalCameo(
  imageBase64: string,
  mimeType = "image/jpeg",
): LocalCameoRecord {
  if (!canUseLocalStorage()) {
    throw new Error("Local storage is unavailable in this browser");
  }

  const validationError = validateImage(imageBase64);
  if (validationError) throw new Error(validationError);

  const cameo: LocalCameoRecord = {
    imageBase64,
    mimeType,
    updatedAt: new Date().toISOString(),
    schemaVersion: LOCAL_CAMEO_SCHEMA_VERSION,
  };

  window.localStorage.setItem(LOCAL_CAMEO_KEY, JSON.stringify(cameo));
  return cameo;
}

export function removeLocalCameo(): void {
  removeLocalCameoUnsafe();
}
