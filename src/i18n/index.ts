import type { Messages } from "./en";
import { en } from "./en";

export type { Messages };

type SupportedLanguage = "ko" | "en" | "ja";

const LANG_MAP: Record<string, SupportedLanguage> = {
  ko: "ko",
  "ko-kr": "ko",
  ko_kr: "ko",
  en: "en",
  "en-us": "en",
  en_us: "en",
  "en-gb": "en",
  en_gb: "en",
  ja: "ja",
  "ja-jp": "ja",
  ja_jp: "ja",
};

const detectLanguage = (): SupportedLanguage => {
  const lang = (process.env.LANG ?? process.env.LANGUAGE ?? "en").split(".")[0].toLowerCase();

  return LANG_MAP[lang] ?? LANG_MAP[lang.split(/[-_]/)[0]] ?? "en";
};

const loaders: Record<SupportedLanguage, () => Promise<Messages>> = {
  en: async () => en,
  ko: async () => (await import("./ko.js")).ko,
  ja: async () => (await import("./ja.js")).ja,
};

export const loadMessages = async (configLanguage?: SupportedLanguage): Promise<Messages> => {
  const lang = configLanguage ?? detectLanguage();
  return loaders[lang]();
};
