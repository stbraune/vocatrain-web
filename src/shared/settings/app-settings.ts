export interface AppSettings {
  appLanguage: string;
  userLanguages: {
    iso: string,
    enabled: boolean
  }[];
  backendUrl: string;
  lefthandMode: boolean;
}
