const CIPHER = {
  'あ': '🍨', 'い': '🦑', 'う': '🐴', 'え': '🖼️', 'お': '👹',
  'か': '🦟', 'き': '🌳', 'く': '🐻', 'け': '⚔️', 'こ': '🐨',
  'さ': '🈂️', 'し': '4️⃣', 'す': '🍉', 'せ': '🪭', 'そ': '🛷',
  'た': '🥁', 'ち': '🩸', 'つ': '🌙', 'て': '✋', 'と': '🍅',
  'な': '🍐', 'に': '✌️', 'ぬ': '🧸', 'ね': '🐱', 'の': '🧠',
  'は': '🦷', 'ひ': '🔥', 'ふ': '🚢', 'へ': '🐍', 'ほ': '📕',
  'ま': '😷', 'み': '💧', 'む': '💜', 'め': '👀', 'も': '🍑',
  'や': '🗻', 'ゆ': '🏹', 'よ': '🪀',
  'ら': '🎒', 'り': '🍎', 'る': '🇷🇴', 'れ': '🧱', 'ろ': '6️⃣',
  'わ': '🦎', 'を': '🎵', 'ん': '🆖',
};

const DAKUTEN_MAP = {
  'が':'か','ぎ':'き','ぐ':'く','げ':'け','ご':'こ',
  'ざ':'さ','じ':'し','ず':'す','ぜ':'せ','ぞ':'そ',
  'だ':'た','ぢ':'ち','づ':'つ','で':'て','ど':'と',
  'ば':'は','び':'ひ','ぶ':'ふ','べ':'へ','ぼ':'ほ',
};

const HANDAKUTEN_MAP = {
  'ぱ':'は','ぴ':'ひ','ぷ':'ふ','ぺ':'へ','ぽ':'ほ',
};

function kata2hira(str) {
  return str.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

const REVERSE = {};
for (const [k, v] of Object.entries(CIPHER)) {
  REVERSE[v] = k;
}

function encode() {
  const raw = document.getElementById('encode-input').value;
  const input = kata2hira(raw);
  let result = '';

  for (const ch of input) {
    if (CIPHER[ch]) {
      result += CIPHER[ch];
    } else if (DAKUTEN_MAP[ch]) {
      result += CIPHER[DAKUTEN_MAP[ch]] + '"';
    } else if (HANDAKUTEN_MAP[ch]) {
      result += CIPHER[HANDAKUTEN_MAP[ch]] + "'";
    } else if (ch === 'ー' || ch === '-') {
      result += 'ー';
    } else if (ch === ' ' || ch === '　') {
      result += ' ';
    } else {
      result += ch;
    }
  }

  const box = document.getElementById('encode-output');
  if (result) {
    box.innerHTML = `<span>${escapeHtml(result)}</span>`;
  } else {
    box.innerHTML = `<span class="placeholder-text">ここに絵文字が表示されます</span>`;
  }
}

function decode() {
  const input = document.getElementById('decode-input').value;
  const segmenter = new Intl.Segmenter('ja', { granularity: 'grapheme' });
  const segments = [...segmenter.segment(input)].map(s => s.segment);

  let result = '';
  let i = 0;
  while (i < segments.length) {
    const seg = segments[i];
    const next = segments[i + 1];

    if (REVERSE[seg]) {
      const kana = REVERSE[seg];
      if (next === '"' || next === '“' || next === '”') {
        const daku = Object.entries(DAKUTEN_MAP).find(([d, s]) => s === kana);
        result += daku ? daku[0] : kana;
        i += 2;
        continue;
      }
      if (next === "'" || next === '‘' || next === '’') {
        const handaku = Object.entries(HANDAKUTEN_MAP).find(([h, s]) => s === kana);
        result += handaku ? handaku[0] : kana;
        i += 2;
        continue;
      }
      result += kana;
    } else if (seg === ' ' || seg === '　') {
      result += ' ';
    } else if (seg === '\n') {
      result += '\n';
    } else if (seg === '"' || seg === '“' || seg === '”' ||
               seg === "'" || seg === '‘' || seg === '’') {
      result += seg;
    } else if (seg === 'ー') {
      result += 'ー';
    } else {
      result += seg;
    }
    i++;
  }

  const box = document.getElementById('decode-output');
  if (result.trim()) {
    box.innerHTML = `<span>${escapeHtml(result)}</span>`;
  } else {
    box.innerHTML = `<span class="placeholder-text">ここに文字が表示されます</span>`;
  }
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function copyOutput(id) {
  const el = document.getElementById(id);
  const span = el.querySelector('span:not(.placeholder-text)');
  if (!span) return;
  navigator.clipboard.writeText(span.textContent).then(() => {
    const btn = el.parentElement.querySelector('.copy-btn');
    const prev = btn.textContent;
    btn.textContent = '✓ 完了';
    setTimeout(() => btn.textContent = prev, 1500);
  });
}

function setMode(mode) {
  document.querySelectorAll('.tab').forEach((t, i) => {
    t.classList.toggle('active', (i === 0) === (mode === 'encode'));
  });
  document.getElementById('encode-section').style.display = mode === 'encode' ? '' : 'none';
  document.getElementById('decode-section').style.display = mode === 'decode' ? '' : 'none';
}

function toggleTable() {
  const body = document.getElementById('table-body');
  const icon = document.getElementById('toggle-icon');
  const open = body.style.display === 'none';
  body.style.display = open ? '' : 'none';
  icon.classList.toggle('open', open);
}

function buildGrid() {
  const grid = document.getElementById('cipher-grid');
  for (const [kana, emoji] of Object.entries(CIPHER)) {
    const cell = document.createElement('div');
    cell.className = 'cipher-cell';
    cell.innerHTML = `<span class="cipher-kana">${kana}</span><span class="cipher-emoji">${emoji}</span>`;
    grid.appendChild(cell);
  }
}

buildGrid();
