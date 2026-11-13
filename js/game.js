'use strict';

var Slovkica = (function () {
  var MAX_GUESSES = 5;
  var SOUTH_CHAR = /^[a-zčćđšž]$/;
  var EN_CHAR = /^[a-z]$/;

  function normalize(word) {
    return String(word || '').trim().toLowerCase().normalize('NFC');
  }

  function lettersOf(word) {
    return Array.from(normalize(word));
  }

  function uniqueList(list) {
    var seen = Object.create(null);
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var word = normalize(list[i]);
      if (!word || seen[word]) continue;
      seen[word] = true;
      out.push(word);
    }
    return out;
  }

  function listFrom(source, lang, length) {
    var bucket = source[lang] && source[lang][length];
    return uniqueList(bucket || []);
  }

  function combine(source, options) {
    var languages = options.languages || [];
    var length = options.length;
    var hasHr = languages.indexOf('hr') !== -1;
    var hasSr = languages.indexOf('sr') !== -1;
    var hasEn = languages.indexOf('en') !== -1;
    var useIntersection = !!options.intersection && hasHr && hasSr;
    var hr = hasHr ? listFrom(source, 'hr', length) : [];
    var sr = hasSr ? listFrom(source, 'sr', length) : [];
    var en = hasEn ? listFrom(source, 'en', length) : [];
    var result = Object.create(null);

    if (useIntersection) {
      var srSet = Object.create(null);
      for (var i = 0; i < sr.length; i++) srSet[sr[i]] = true;
      for (var j = 0; j < hr.length; j++) {
        if (srSet[hr[j]]) result[hr[j]] = true;
      }
    } else {
      for (var a = 0; a < hr.length; a++) result[hr[a]] = true;
      for (var b = 0; b < sr.length; b++) result[sr[b]] = true;
    }

    for (var c = 0; c < en.length; c++) result[en[c]] = true;
    return Object.keys(result);
  }

  function buildDictionary(options) {
    return combine(WORDS, options);
  }

  function buildAnswers(options) {
    var answers = typeof ANSWERS === 'undefined' ? [] : combine(ANSWERS, options);
    if (answers.length) return answers;
    return buildDictionary(options);
  }

  function pickAnswer(words, previous) {
    if (!words.length) return '';
    if (words.length === 1) return words[0];
    var word = words[Math.floor(Math.random() * words.length)];
    var guard = 0;
    while (word === previous && guard < 8) {
      word = words[Math.floor(Math.random() * words.length)];
      guard += 1;
    }
    return word;
  }

  function evaluate(guess, answer) {
    var g = lettersOf(guess);
    var a = lettersOf(answer);
    var marks = [];
    var counts = Object.create(null);

    for (var i = 0; i < a.length; i++) {
      marks.push('absent');
      counts[a[i]] = (counts[a[i]] || 0) + 1;
    }

    for (var green = 0; green < g.length && green < a.length; green++) {
      if (g[green] === a[green]) {
        marks[green] = 'correct';
        counts[g[green]] -= 1;
      }
    }

    for (var yellow = 0; yellow < g.length; yellow++) {
      if (marks[yellow] === 'correct') continue;
      if (counts[g[yellow]] > 0) {
        marks[yellow] = 'present';
        counts[g[yellow]] -= 1;
      }
    }

    return marks;
  }

  function allowedChar(ch, languages) {
    var south = languages.indexOf('hr') !== -1 || languages.indexOf('sr') !== -1;
    return south ? SOUTH_CHAR.test(ch) : EN_CHAR.test(ch);
  }

  return {
    MAX_GUESSES: MAX_GUESSES,
    normalize: normalize,
    lettersOf: lettersOf,
    buildDictionary: buildDictionary,
    buildAnswers: buildAnswers,
    pickAnswer: pickAnswer,
    evaluate: evaluate,
    allowedChar: allowedChar
  };
})();
