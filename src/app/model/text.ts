export interface Text {
  tags: string[];
  meta: string;
  words: {
    [lang: string]: {
      value: string,
      level?: {
        [mode: string]: number
      }
    }
  };
}
