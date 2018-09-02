require('colors');
const jsdiff = require('diff');

var Diff = require('diff/lib/diff/base').default;
var generateOptions = require('diff/lib/util/params').generateOptions;
var XRegExp = require('xregexp');

// Based on https://en.wikipedia.org/wiki/Latin_script_in_Unicode
//
// Ranges and exceptions:
// Latin-1 Supplement, 0080–00FF
//  - U+00D7  × Multiplication sign
//  - U+00F7  ÷ Division sign
// Latin Extended-A, 0100–017F
// Latin Extended-B, 0180–024F
// IPA Extensions, 0250–02AF
// Spacing Modifier Letters, 02B0–02FF
//  - U+02C7  ˇ &#711;  Caron
//  - U+02D8  ˘ &#728;  Breve
//  - U+02D9  ˙ &#729;  Dot Above
//  - U+02DA  ˚ &#730;  Ring Above
//  - U+02DB  ˛ &#731;  Ogonek
//  - U+02DC  ˜ &#732;  Small Tilde
//  - U+02DD  ˝ &#733;  Double Acute Accent
// Latin Extended Additional, 1E00–1EFF
const extendedWordChars = /^[a-zA-Z\u{C0}-\u{FF}\u{D8}-\u{F6}\u{F8}-\u{2C6}\u{2C8}-\u{2D7}\u{2DE}-\u{2FF}\u{1E00}-\u{1EFF}]+$/u;
const reWhitespace = /\S/;
const wordDiff = Object.assign(new Diff(), {
  equals(left, right) {
    function sanitize(word) {
      const regexp = XRegExp(`[^\\pL]`, 'g');
      return XRegExp.replace(word, regexp, '', 'all');
    }

    if (this.options.ignoreCase) {
      left = left.toLowerCase();
      right = right.toLowerCase();
    }

    if (this.options.ignoreSpecialChars) {
      left = sanitize(left);
      right = sanitize(right);
    }

    // process.stdout.write('comparing "' + left + '" with "' + right + '"\n');
    return left === right || (this.options.ignoreWhitespace && !reWhitespace.test(left) && !reWhitespace.test(right));
  },

  tokenize(value) {
    let tokens = value.split(/(\s+|\b)/);

    // Join the boundary splits that we do not consider to be boundaries. This is primarily the extended Latin character set.
    for (let i = 0; i < tokens.length - 1; i++) {
      // If we have an empty string in the next field and we have only word chars before and after, merge
      if (!tokens[i + 1] && tokens[i + 2]
        && extendedWordChars.test(tokens[i])
        && extendedWordChars.test(tokens[i + 2])) {
        tokens[i] += tokens[i + 2];
        tokens.splice(i + 1, 2);
        i--;
      }
    }

    return tokens;
  }
});

function diffWords(oldStr, newStr, options) {
  return wordDiff.diff(oldStr, newStr, generateOptions(options, {
    ignoreWhitespace: true,
    ignoreCase: true,
    ignoreSpecialChars: true
  }));
}

let total = 0;
// console.log(Object.keys(jsdiff));
[
  [
    'Един неочакван сюжет',
    'Неочакван сюжет'
  ],
  [
    'Един Млад и талентлив мъж отишъл до известен драматург.',
    '(Млад и талантлив човек отишъл при известен драматург.)'
  ],
  [
    'Господин, отскоро пиша, прибрах пиеса за Вие.',
    'Господине, отскоро пиша, донесох Ви една пиеса.'
  ],
  [
    'Моля Ви да я четете.',
    'Моля Ви да я прочетете.'
  ],
  [
    'Какъв е сюжетът?',
    'Какъв е сюжетът й?'
  ],
  [
    'Тя му обича, но той...',
    'Тя го обича, а той ...'
  ],
  [
    'Той мечти за друга жена, нали?',
    'А той мечтае за друга жена, така ли?'
  ],
  [
    'Не, сюжетът е по-различен.',
    'Не, сюжетът е друг.'
  ],
  [
    'Той обича ли една друга?',
    'Друга ли обича?'
  ],
  [
    'Не, той обича жената си, Лили.',
    'Не, обича жена си, Лили.'
  ],
  [
    'Добре, оставите ми пиесата, ще я прочета.',
    'Добре, оставете пиесата, ще я прочета.'
  ],
  [
    'Най-сетне нещо оригинално.',
    'Най-после нещо оригинално.'
  ],
  [
    'Този млад човек пишеше една оригинална пиеса.',
    'Този млад човек написа една оригинална пиеса.'
  ],
  [
    'Пиесата беше неочакван сюжет.',
    'Пиесата беше с неочакван сюжет.'
  ],
  [
    'Той отишъл при известен драматург.',
    'Той отишъл при един известен драматург.'
  ],
  [
    'Той му дал пиесата е му моли да я прочете.',
    'Даде му пиесата и го помоли да я прочете.'
  ],
  [
    'Драматургът я прочел и много му я се харесал.',
    'Драматургът я прочете и много я хареса.',
  ],
  [
    'в офис',
    'в офиса'
  ]
].forEach((sample) => {
  const actual = sample[0];
  const expect = sample[1];

  const diff = diffWords(actual, expect);
  let errors = 0;
  diff.forEach((part, index) => {
    var color = part.added ? 'green' :
      part.removed ? 'red' : 'grey';
    if (part.removed) {
      errors += 1;
    }

    if (part.added) {
      // errors += 1;

      const prev = diff[index - 1];
      if (prev && prev.removed) {
        // errors -= 1;
      } else {
        errors += 1;
      }
    }
    process.stderr.write(part.value[color]);
  });
  total += errors;
  process.stderr.write('; Errors: ' + errors + '\n');
  console.log(diff);
});

process.stderr.write('Total: ' + total + '\n');

// process.stderr.write('hello'.random + '\n');
