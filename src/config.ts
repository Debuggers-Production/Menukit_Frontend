declare global {
  interface Window {
    APP_CONFIG?: {
      API_URL?: string;
      CUSTOMER_PROFILE_URL?: string;
      STORE_APP_URL?: string;
      MAIN_APP_URL?: string;
      BACKEND_URL?: string;
      FRONTEND_URL?: string;
      [key: string]: string | undefined;
    };
  }
}

const getEnv = (key: string, viteFallback: string | undefined, defaultVal: string = ""): string => {
  const windowVal = typeof window !== 'undefined' && window.APP_CONFIG ? window.APP_CONFIG[key] : undefined;
  if (windowVal && windowVal.trim() !== "" && !windowVal.startsWith("$")) {
    return windowVal.replace(/\/+$/, "");
  }
  if (viteFallback && viteFallback.trim() !== "" && !viteFallback.startsWith("$")) {
    return viteFallback.replace(/\/+$/, "");
  }
  return defaultVal.replace(/\/+$/, "");
};

export const APP_CONFIG = {
  API_URL: getEnv("API_URL", import.meta.env.VITE_API_URL, ""),
  CUSTOMER_PROFILE_URL: getEnv("CUSTOMER_PROFILE_URL", import.meta.env.VITE_CUSTOMER_PROFILE_URL, "http://localhost:5176"),
  GOOGLE_ADSENSE_CLIENT_ID: getEnv("GOOGLE_ADSENSE_CLIENT_ID", import.meta.env.VITE_GOOGLE_ADSENSE_CLIENT_ID, "ca-pub-3222424909905554"),
  FORCE_SHOW_ADS: getEnv("FORCE_SHOW_ADS", import.meta.env.VITE_FORCE_SHOW_ADS, "false"),
};
