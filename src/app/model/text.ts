export interface Text {
  tags: string[];
  meta: string;
  words: {
    [lang: string]: string
  };
}
