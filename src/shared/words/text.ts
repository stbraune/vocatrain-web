export interface Text {
  tags: string[];
  meta: string;
  words: {
    [lang: string]: {
      value: string,
      games?: {
        [mode: string]: {
          level: number,
          date: Date,
          answer?: string // used for dialog texts
        }
      }
    }
  };
}
