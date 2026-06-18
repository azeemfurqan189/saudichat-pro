const REMEMBER_PHONE_KEY = "sc_remember_phone";
const REMEMBER_ENABLED_KEY = "sc_remember_enabled";

export function getRememberedPhone(): string | null {
  if (typeof window === "undefined") return null;
  if (localStorage.getItem(REMEMBER_ENABLED_KEY) !== "true") return null;
  return localStorage.getItem(REMEMBER_PHONE_KEY);
}

export function setRememberedPhone(phone: string, remember: boolean): void {
  if (typeof window === "undefined") return;
  if (remember) {
    localStorage.setItem(REMEMBER_ENABLED_KEY, "true");
    localStorage.setItem(REMEMBER_PHONE_KEY, phone);
  } else {
    localStorage.removeItem(REMEMBER_ENABLED_KEY);
    localStorage.removeItem(REMEMBER_PHONE_KEY);
  }
}

export function clearAuthSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}
