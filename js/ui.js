'use strict';

(function () {
  var settingsBtn = document.getElementById('settings-btn');
  var setupNote = document.getElementById('setup-note');
  var startBtn = document.getElementById('start-btn');
  var intersectionLabel = document.getElementById('intersection-label');
  var intersectionInput = document.getElementById('intersection');
  var duoForm = document.getElementById('duo-form');
  var duoHint = document.getElementById('duo-hint');
  var duoError = document.getElementById('duo-error');
  var secretInput = document.getElementById('secret-input');
  var eyeBtn = document.getElementById('eye-btn');
  var startGuessBtn = document.getElementById('start-guess');
  var statusEl = document.getElementById('status');
  var boardEl = document.getElementById('board');
  var endPanel = document.getElementById('end-panel');
  var endTitle = document.getElementById('end-title');
  var endWord = document.getElementById('end-word');
  var newRoundBtn = document.getElementById('new-round');
  var keyboardEl = document.getElementById('keyboard');

  var screens = {
    setup: document.getElementById('screen-setup'),
    duo: document.getElementById('screen-duo'),
    handoff: document.getElementById('screen-handoff'),
    play: document.getElementById('screen-play')
  };

  var state = {
    screen: 'setup',
    languages: ['hr'],
    length: 5,
    mode: 'solo',
    intersection: false,
    dictionary: [],
    answers: [],
    dictSet: Object.create(null),
    answer: '',
    guesses: [],
    current: '',
    locked: false,
    ended: false,
    keyState: {},
    token: 0
  };

  var messageToken = 0;

  function selectedLanguages() {
    return Array.from(document.querySelectorAll('input[name="lang"]:checked')).map(function (input) {
      return input.value;
    });
  }

  function selectedLength() {
    var input = document.querySelector('input[name="length"]:checked');
    return Number(input ? input.value : 5);
  }

  function selectedMode() {
    var input = document.querySelector('input[name="mode"]:checked');
    return input ? input.value : 'solo';
  }

  function countMessage(n) {
    var mod10 = n % 10;
    var mod100 = n % 100;
    var one = mod10 === 1 && mod100 !== 11;
    var paucal = mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14);
    if (one) return 'U igri je ' + n + ' riječ.';
    if (paucal) return 'U igri su ' + n + ' riječi.';
    return 'U igri je ' + n + ' riječi.';
  }

  function readOptions() {
    var languages = selectedLanguages();
    var bothSouth = languages.indexOf('hr') !== -1 && languages.indexOf('sr') !== -1;
    return {
      languages: languages,
      length: selectedLength(),
      mode: selectedMode(),
      intersection: bothSouth && intersectionInput.checked
    };
  }

  function refreshSetup() {
    var options = readOptions();
    var bothSouth = options.languages.indexOf('hr') !== -1 && options.languages.indexOf('sr') !== -1;
    intersectionLabel.hidden = !bothSouth;

    if (!options.languages.length) {
      setupNote.textContent = 'Odaberi barem jedan jezik.';
      setupNote.classList.add('warn');
      startBtn.disabled = true;
      return;
    }

    var words = Slovkica.buildDictionary(options);
    if (!words.length) {
      setupNote.textContent = 'Nema riječi za ove postavke.';
      setupNote.classList.add('warn');
      startBtn.disabled = true;
      return;
    }

    setupNote.classList.remove('warn');
    setupNote.textContent = countMessage(words.length);
    startBtn.disabled = false;
  }

  function showScreen(name) {
    if (name !== 'play') state.token += 1;
    state.screen = name;
    Object.keys(screens).forEach(function (key) {
      screens[key].classList.toggle('active', key === name);
    });
    var onSetup = name === 'setup';
    settingsBtn.classList.toggle('invisible', onSetup);
    settingsBtn.disabled = onSetup;
    settingsBtn.setAttribute('aria-hidden', onSetup ? 'true' : 'false');
    if (name !== 'play') endPanel.hidden = true;
    if (name === 'setup') {
      state.answer = '';
      refreshSetup();
    }
    if (name === 'duo') prepareDuo();
    if (name === 'handoff') startGuessBtn.focus();
  }

  function toSet(list) {
    var set = Object.create(null);
    for (var i = 0; i < list.length; i++) set[list[i]] = true;
    return set;
  }

  function southSelected() {
    return state.languages.indexOf('hr') !== -1 || state.languages.indexOf('sr') !== -1;
  }

  function prepareDuo() {
    secretInput.maxLength = state.length;
    secretInput.value = '';
    secretInput.type = 'password';
    eyeBtn.classList.remove('revealed');
    eyeBtn.setAttribute('aria-pressed', 'false');
    eyeBtn.setAttribute('aria-label', 'Prikaži riječ');
    duoHint.textContent = 'Unesi riječ od ' + state.length + ' slova. Oko je privremeno pokazuje.';
    duoError.textContent = '';
    secretInput.focus();
  }

  function setStatus(text) {
    messageToken += 1;
    statusEl.textContent = text || '';
    if (!text) return;
    var token = messageToken;
    setTimeout(function () {
      if (token === messageToken) statusEl.textContent = '';
    }, 1600);
  }

  function renderBoard() {
    boardEl.style.setProperty('--cols', String(state.length));
    boardEl.replaceChildren();
    for (var rowIndex = 0; rowIndex < Slovkica.MAX_GUESSES; rowIndex++) {
      var row = document.createElement('div');
      row.className = 'row';
      row.dataset.row = String(rowIndex);
      row.style.setProperty('--cols', String(state.length));
      for (var col = 0; col < state.length; col++) {
        var tile = document.createElement('div');
        tile.className = 'tile';
        tile.setAttribute('aria-hidden', 'true');
        row.appendChild(tile);
      }
      boardEl.appendChild(row);
    }
  }

  function buildKeyboard() {
    var rows = [
      ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
      ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
      ['enter', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'back']
    ];
    if (southSelected()) rows.push(['č', 'ć', 'đ', 'š', 'ž']);
    keyboardEl.replaceChildren();

    rows.forEach(function (keys, index) {
      var row = document.createElement('div');
      row.className = 'key-row';
      if (index === 1) row.classList.add('mid');
      if (keys[0] === 'č') row.classList.add('dia');

      keys.forEach(function (key) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'key';
        button.dataset.key = key;
        if (key === 'enter' || key === 'back') button.classList.add('wide');
        if (key === 'enter') {
          button.textContent = 'ENTER';
        } else if (key === 'back') {
          button.setAttribute('aria-label', 'Obriši');
          button.textContent = '⌫';
        } else {
          button.textContent = key;
        }
        if (state.keyState[key]) button.classList.add(state.keyState[key]);
        row.appendChild(button);
      });

      keyboardEl.appendChild(row);
    });
  }

  function resetBoard() {
    state.guesses = [];
    state.current = '';
    state.locked = false;
    state.ended = false;
    state.keyState = {};
    state.token += 1;
    endPanel.hidden = true;
    messageToken += 1;
    statusEl.textContent = '';
    renderBoard();
    buildKeyboard();
  }

  function paintCurrent(pop) {
    var row = boardEl.querySelector('[data-row="' + state.guesses.length + '"]');
    if (!row) return;
    var chars = Array.from(state.current);
    for (var i = 0; i < state.length; i++) {
      var tile = row.children[i];
      var hasChar = !!chars[i];
      tile.textContent = chars[i] || '';
      tile.classList.toggle('filled', hasChar);
      if (pop && i === chars.length - 1 && hasChar) {
        tile.classList.remove('pop');
        void tile.offsetWidth;
        tile.classList.add('pop');
      }
    }
  }

  function typeLetter(ch) {
    if (state.screen !== 'play' || state.locked || state.ended) return;
    if (!Slovkica.allowedChar(ch, state.languages)) return;
    if (Array.from(state.current).length >= state.length) return;
    state.current += ch;
    if (statusEl.textContent) {
      messageToken += 1;
      statusEl.textContent = '';
    }
    paintCurrent(true);
  }

  function backspace() {
    if (state.screen !== 'play' || state.locked || state.ended) return;
    var chars = Array.from(state.current);
    chars.pop();
    state.current = chars.join('');
    paintCurrent(false);
  }

  function shake(rowIndex) {
    var row = boardEl.querySelector('[data-row="' + rowIndex + '"]');
    if (!row) return;
    row.classList.remove('shake');
    void row.offsetWidth;
    row.classList.add('shake');
  }

  function upgradeKey(letter, mark) {
    var rank = { absent: 1, present: 2, correct: 3 };
    var previous = state.keyState[letter];
    if (previous && rank[previous] >= rank[mark]) return;
    state.keyState[letter] = mark;
    var button = keyboardEl.querySelector('[data-key="' + CSS.escape(letter) + '"]');
    if (!button) return;
    button.classList.remove('absent', 'present', 'correct');
    button.classList.add(mark);
  }

  function revealRow(rowIndex, guess, marks, onDone) {
    var row = boardEl.querySelector('[data-row="' + rowIndex + '"]');
    var chars = Array.from(guess);
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var pending = chars.length;
    var finished = false;

    function finish() {
      if (finished) return;
      finished = true;
      onDone();
    }

    function one() {
      pending -= 1;
      if (pending <= 0) finish();
    }

    chars.forEach(function (ch, index) {
      var tile = row.children[index];
      function show() {
        var called = false;
        var painted = false;
        function paint() {
          if (painted) return;
          painted = true;
          tile.textContent = ch;
          tile.classList.add('filled', marks[index]);
        }
        function doneTile() {
          if (called) return;
          called = true;
          paint();
          tile.removeEventListener('animationend', doneTile);
          upgradeKey(ch, marks[index]);
          one();
        }
        tile.classList.remove('pop');
        void tile.offsetWidth;
        tile.classList.add('flip');
        if (reduce) {
          doneTile();
          return;
        }
        tile.addEventListener('animationend', doneTile);
        setTimeout(paint, 250);
        setTimeout(doneTile, 700);
      }
      if (reduce) show();
      else setTimeout(show, index * 280);
    });
  }

  function bounceRow(rowIndex) {
    var row = boardEl.querySelector('[data-row="' + rowIndex + '"]');
    if (!row) return;
    Array.from(row.children).forEach(function (tile, index) {
      setTimeout(function () {
        tile.classList.remove('bounce');
        void tile.offsetWidth;
        tile.classList.add('bounce');
      }, index * 90);
    });
  }

  function showEnd(won, rowIndex) {
    endTitle.textContent = won ? 'Točno!' : 'Kraj runde.';
    endWord.textContent = state.answer;
    endPanel.hidden = false;
    if (won) bounceRow(rowIndex);
  }

  function commitGuess() {
    if (state.screen !== 'play' || state.locked || state.ended) return;
    var guess = state.current;
    if (Array.from(guess).length < state.length) {
      shake(state.guesses.length);
      setStatus('Premalo slova.');
      return;
    }
    if (!state.dictSet[guess]) {
      shake(state.guesses.length);
      setStatus('Nema te riječi u rječniku.');
      return;
    }

    var marks = Slovkica.evaluate(guess, state.answer);
    var rowIndex = state.guesses.length;
    var token = state.token;
    state.locked = true;
    revealRow(rowIndex, guess, marks, function () {
      if (token !== state.token) return;
      state.guesses.push(guess);
      state.current = '';
      var won = guess === state.answer;
      var lost = !won && state.guesses.length >= Slovkica.MAX_GUESSES;
      if (won || lost) {
        state.ended = true;
        showEnd(won, rowIndex);
        return;
      }
      state.locked = false;
    });
  }

  function pressKey(key) {
    if (key === 'enter') commitGuess();
    else if (key === 'back') backspace();
    else typeLetter(key);
  }

  function startGame() {
    var options = readOptions();
    var dictionary = Slovkica.buildDictionary(options);
    if (!options.languages.length || !dictionary.length) {
      refreshSetup();
      return;
    }
    state.languages = options.languages.slice();
    state.length = options.length;
    state.mode = options.mode;
    state.intersection = options.intersection;
    state.dictionary = dictionary;
    state.dictSet = toSet(dictionary);
    state.answers = Slovkica.buildAnswers(options);
    if (options.mode === 'duo') {
      showScreen('duo');
      return;
    }
    state.answer = Slovkica.pickAnswer(state.answers, '');
    resetBoard();
    showScreen('play');
  }

  function confirmSecret(event) {
    event.preventDefault();
    var word = Slovkica.normalize(secretInput.value);
    if (Array.from(word).length !== state.length) {
      duoError.textContent = 'Riječ mora imati točno ' + state.length + ' slova.';
      return;
    }
    if (!state.dictSet[word]) {
      duoError.textContent = 'Riječ nije u odabranom rječniku.';
      return;
    }
    state.answer = word;
    secretInput.value = '';
    secretInput.type = 'password';
    eyeBtn.classList.remove('revealed');
    eyeBtn.setAttribute('aria-pressed', 'false');
    eyeBtn.setAttribute('aria-label', 'Prikaži riječ');
    showScreen('handoff');
  }

  function newRound() {
    if (state.mode === 'duo') {
      showScreen('duo');
      return;
    }
    state.answer = Slovkica.pickAnswer(state.answers, state.answer);
    resetBoard();
    showScreen('play');
  }

  settingsBtn.addEventListener('click', function () {
    showScreen('setup');
  });

  screens.setup.addEventListener('change', refreshSetup);
  startBtn.addEventListener('click', startGame);
  duoForm.addEventListener('submit', confirmSecret);

  secretInput.addEventListener('input', function () {
    var chars = Array.from(secretInput.value.normalize('NFC'));
    var clean = [];
    for (var i = 0; i < chars.length; i++) {
      if (Slovkica.allowedChar(chars[i].toLowerCase(), state.languages)) clean.push(chars[i]);
      if (clean.length >= state.length) break;
    }
    var next = clean.join('');
    if (next !== secretInput.value) secretInput.value = next;
    duoError.textContent = '';
  });

  eyeBtn.addEventListener('click', function () {
    var reveal = secretInput.type === 'password';
    secretInput.type = reveal ? 'text' : 'password';
    eyeBtn.classList.toggle('revealed', reveal);
    eyeBtn.setAttribute('aria-pressed', reveal ? 'true' : 'false');
    eyeBtn.setAttribute('aria-label', reveal ? 'Sakrij riječ' : 'Prikaži riječ');
    secretInput.focus();
  });

  startGuessBtn.addEventListener('click', function () {
    resetBoard();
    showScreen('play');
  });

  newRoundBtn.addEventListener('click', newRound);

  keyboardEl.addEventListener('click', function (event) {
    var button = event.target.closest('.key');
    if (!button) return;
    pressKey(button.dataset.key);
  });

  document.addEventListener('keydown', function (event) {
    if (state.screen !== 'play') return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      commitGuess();
      return;
    }
    if (event.key === 'Backspace') {
      event.preventDefault();
      backspace();
      return;
    }
    if (event.key.length === 1) {
      var ch = event.key.toLowerCase().normalize('NFC');
      if (Slovkica.allowedChar(ch, state.languages)) {
        event.preventDefault();
        typeLetter(ch);
      }
    }
  });

  refreshSetup();
})();
