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
  if (windowVal && !windowVal.startsWith("$")) {
    return windowVal;
  }
  if (viteFallback && !viteFallback.startsWith("$")) {
    return viteFallback;
  }
  return defaultVal;
};

export const APP_CONFIG = {
  API_URL: getEnv("API_URL", import.meta.env.VITE_API_URL, ""),
  CUSTOMER_PROFILE_URL: getEnv("CUSTOMER_PROFILE_URL", import.meta.env.VITE_CUSTOMER_PROFILE_URL, "http://localhost:5176"),
};
