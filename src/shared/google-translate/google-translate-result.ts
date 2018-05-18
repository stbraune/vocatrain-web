export interface GoogleTranslateAlternative {
  text: string;
  score: number;
}

export interface GoogleTranslateResult {
  text: string;
  confidence: number;
  alternatives: GoogleTranslateAlternative[];
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
