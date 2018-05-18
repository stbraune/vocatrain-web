export interface GoogleTranslateResult {
  text: string;
  confidence: number;
  alternatives: {
    text: string,
    score: number
  }[];
  seeAlso: string[];
  from: {
    language: {
      didYouMean: boolean,
      iso: string
    },
    text: {
      autoCorrected: boolean,
      value: string,
      didYouMean: string
    }
  };
  raw?: string;
}
