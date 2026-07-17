import type { routing } from "../i18n/routing";
import type en from "@omnio/i18n/messages/en.json";
import type { ModuleMessages } from "../generated/messages";

declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    // Base app catalog plus every module's namespaced catalog (modgen-generated).
    Messages: typeof en & ModuleMessages;
  }
}
