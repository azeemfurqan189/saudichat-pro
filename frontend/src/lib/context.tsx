"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Locale } from "./i18n";

interface AppContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  dir: "ltr" | "rtl";
}

const AppContext = createContext<AppContextType>({
  locale: "en",
  setLocale: () => {},
  dir: "ltr",
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const saved = localStorage.getItem("locale") as Locale;
    if (saved === "ar" || saved === "en") setLocaleState(saved);
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("locale", l);
    document.documentElement.lang = l;
    document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
  };

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  return (
    <AppContext.Provider value={{ locale, setLocale, dir: locale === "ar" ? "rtl" : "ltr" }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
