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

const SMALL_KANA_MAP = {
  'ぁ':'あ','ぃ':'い','ぅ':'う','ぇ':'え','ぉ':'お',
  'っ':'つ','ゃ':'や','ゅ':'ゆ','ょ':'よ','ゎ':'わ',
};

let currentCipher = { ...CIPHER };

(function () {
  try {
    const saved = localStorage.getItem('menchi-cipher-custom');
    if (saved) Object.assign(currentCipher, JSON.parse(saved));
  } catch (e) {}
})();

function kata2hira(str) {
  return str.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

function encode() {
  const raw = document.getElementById('encode-input').value;
  const input = kata2hira(raw);
  let result = '';

  for (const ch of input) {
    const base = SMALL_KANA_MAP[ch] ?? ch;
    if (currentCipher[base]) {
      result += currentCipher[base];
    } else if (DAKUTEN_MAP[base]) {
      result += currentCipher[DAKUTEN_MAP[base]] + '"';
    } else if (HANDAKUTEN_MAP[base]) {
      result += currentCipher[HANDAKUTEN_MAP[base]] + "'";
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
  updateSharePanel('encode-output', 'encode-share');
}

function decode() {
  const reverse = {};
  for (const [k, v] of Object.entries(currentCipher)) reverse[v] = k;

  const input = document.getElementById('decode-input').value;
  const segmenter = new Intl.Segmenter('ja', { granularity: 'grapheme' });
  const segments = [...segmenter.segment(input)].map(s => s.segment);

  let result = '';
  let i = 0;
  while (i < segments.length) {
    const seg = segments[i];
    const next = segments[i + 1];

    if (reverse[seg]) {
      const kana = reverse[seg];
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
  updateSharePanel('decode-output', 'decode-share');
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function copyOutput(id) {
  const el = document.getElementById(id);
  const span = el.querySelector('span:not(.placeholder-text)');
  if (!span) return;
  copyText(span.textContent).then(() => {
    showCopyStatus(el, '✓ 完了');
  }).catch(() => {
    selectOutputText(span);
    showCopyStatus(el, '選択中');
  });
}

function copyText(text) {
  if (copyTextWithTextarea(text)) return Promise.resolve();

  if (navigator.clipboard) {
    return navigator.clipboard.writeText(text);
  }

  return Promise.reject();
}

function copyTextWithTextarea(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '0';
  textarea.style.width = '1px';
  textarea.style.height = '1px';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.appendChild(textarea);
  textarea.focus({ preventScroll: true });
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch (e) {
    copied = false;
  }
  document.body.removeChild(textarea);
  return copied;
}

function showCopyStatus(outputEl, text) {
  const btn = outputEl.parentElement.querySelector('.copy-btn');
  const prev = btn.textContent;
  btn.textContent = text;
  setTimeout(() => btn.textContent = prev, 1500);
}

function selectOutputText(span) {
  const range = document.createRange();
  range.selectNodeContents(span);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

function getOutputText(id) {
  const el = document.getElementById(id);
  const span = el?.querySelector('span:not(.placeholder-text)');
  return span?.textContent.trim() || '';
}

function updateSharePanel(outputId, panelId) {
  const panel = document.getElementById(panelId);
  if (!panel) return;
  const hasText = !!getOutputText(outputId);
  panel.classList.toggle('is-disabled', !hasText);
  panel.querySelectorAll('button').forEach((button) => {
    button.disabled = !hasText;
  });
}

function buildShareText(outputId) {
  const text = getOutputText(outputId);
  return `${text}\n\n文字暗号ツールで変換しました\n${location.origin}${location.pathname}`;
}

function shareOutput(outputId, service) {
  const text = buildShareText(outputId);
  if (!getOutputText(outputId)) return;

  if (service === 'native' && navigator.share) {
    navigator.share({
      title: '文字暗号ツール',
      text,
      url: location.href,
    }).catch(() => {});
    return;
  }

  const encodedText = encodeURIComponent(text);
  const encodedUrl = encodeURIComponent(location.href);
  const urls = {
    x: `https://twitter.com/intent/tweet?text=${encodedText}`,
    line: `https://line.me/R/msg/text/?${encodedText}`,
    bluesky: `https://bsky.app/intent/compose?text=${encodedText}`,
    native: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
  };

  window.location.href = urls[service];
}

function setMode(mode) {
  document.querySelectorAll('.tab').forEach((t, i) => {
    t.classList.toggle('active', (i === 0) === (mode === 'decode'));
  });
  document.getElementById('decode-section').style.display = mode === 'decode' ? '' : 'none';
  document.getElementById('encode-section').style.display = mode === 'encode' ? '' : 'none';
}

function toggleTable() {
  const body = document.getElementById('table-body');
  const icon = document.getElementById('toggle-icon');
  const open = body.style.display === 'none';
  body.style.display = open ? '' : 'none';
  icon.classList.toggle('open', open);
}

let editMode = false;

function toggleEditMode() {
  editMode = !editMode;
  document.getElementById('edit-btn').textContent = editMode ? '完了' : 'カスタマイズ';
  document.getElementById('edit-btn').classList.toggle('active-edit', editMode);
  rebuildGrid();
}

function saveCipher() {
  const diff = {};
  for (const [k, v] of Object.entries(currentCipher)) {
    if (v !== CIPHER[k]) diff[k] = v;
  }
  const hasCustom = Object.keys(diff).length > 0;
  if (hasCustom) {
    localStorage.setItem('menchi-cipher-custom', JSON.stringify(diff));
  } else {
    localStorage.removeItem('menchi-cipher-custom');
  }
  document.getElementById('reset-btn').style.display = hasCustom ? '' : 'none';
}

function resetCipher() {
  if (!confirm('デフォルトの暗号表に戻しますか？')) return;
  currentCipher = { ...CIPHER };
  localStorage.removeItem('menchi-cipher-custom');
  document.getElementById('reset-btn').style.display = 'none';
  rebuildGrid();
}

function rebuildGrid() {
  document.getElementById('cipher-grid').innerHTML = '';
  buildGrid();
  renderCustomChars();
}

function buildGrid() {
  const grid = document.getElementById('cipher-grid');
  for (const [kana, emoji] of Object.entries(currentCipher)) {
    if (!(kana in CIPHER)) continue; // 特殊文字はスキップ
    const cell = document.createElement('div');
    cell.className = 'cipher-cell' + (editMode ? ' editing' : '');

    const kanaEl = document.createElement('span');
    kanaEl.className = 'cipher-kana';
    kanaEl.textContent = kana;
    cell.appendChild(kanaEl);

    if (editMode) {
      const input = document.createElement('input');
      input.className = 'emoji-input';
      input.value = emoji;
      input.addEventListener('change', (e) => {
        const val = e.target.value.trim();
        if (val) {
          currentCipher[kana] = val;
          saveCipher();
        } else {
          e.target.value = currentCipher[kana];
        }
      });
      cell.appendChild(input);
    } else {
      const emojiEl = document.createElement('span');
      emojiEl.className = 'cipher-emoji';
      emojiEl.textContent = emoji;
      cell.appendChild(emojiEl);
    }

    grid.appendChild(cell);
  }
}

// 起動時にカスタム差分があればリセットボタンを表示
(function () {
  const saved = localStorage.getItem('menchi-cipher-custom');
  if (saved) document.getElementById('reset-btn').style.display = '';
})();

// ── お気に入り機能 ──────────────────────────────

function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem('menchi-cipher-favorites') || '[]');
  } catch (e) { return []; }
}

function saveFavorite() {
  const input = document.getElementById('fav-name-input');
  const name = input.value.trim();
  if (!name) { input.focus(); return; }

  const favorites = getFavorites();
  const existing = favorites.findIndex(f => f.name === name);
  if (existing >= 0) {
    if (!confirm(`「${name}」を上書きしますか？`)) return;
    favorites[existing].cipher = { ...currentCipher };
  } else {
    favorites.push({ name, cipher: { ...currentCipher } });
  }
  localStorage.setItem('menchi-cipher-favorites', JSON.stringify(favorites));
  input.value = '';
  renderFavorites();
}

function loadFavorite(index) {
  const favorites = getFavorites();
  if (!favorites[index]) return;
  currentCipher = { ...CIPHER, ...favorites[index].cipher };
  saveCipher();
  rebuildGrid();
}

function deleteFavorite(index) {
  const favorites = getFavorites();
  if (!confirm(`「${favorites[index]?.name}」を削除しますか？`)) return;
  favorites.splice(index, 1);
  localStorage.setItem('menchi-cipher-favorites', JSON.stringify(favorites));
  renderFavorites();
}

function renderFavorites() {
  const list = document.getElementById('favorites-list');
  if (!list) return;
  const favorites = getFavorites();
  if (favorites.length === 0) {
    list.innerHTML = '<div class="fav-empty">保存済みの設定はありません</div>';
    return;
  }
  list.innerHTML = favorites.map((f, i) => `
    <div class="fav-item">
      <span class="fav-name">${escapeHtml(f.name)}</span>
      <button class="ctrl-btn fav-load-btn" onclick="loadFavorite(${i})">読み込む</button>
      <button class="ctrl-btn fav-del-btn" onclick="deleteFavorite(${i})">削除</button>
    </div>
  `).join('');
}

// ── 特殊文字機能 ──────────────────────────────

function renderCustomChars(addNew = false) {
  const list = document.getElementById('custom-chars-list');
  if (!list) return;

  const entries = Object.entries(currentCipher).filter(([k]) => !(k in CIPHER));
  list.innerHTML = '';

  entries.forEach(([char, emoji]) => {
    const row = document.createElement('div');
    row.className = 'custom-char-row';
    row.innerHTML = `
      <span class="custom-char-value">${escapeHtml(char)}</span>
      <span class="custom-char-arrow">→</span>
      <span class="custom-char-emoji">${escapeHtml(emoji)}</span>
    `;
    const delBtn = document.createElement('button');
    delBtn.className = 'ctrl-btn fav-del-btn';
    delBtn.textContent = '削除';
    delBtn.addEventListener('click', () => deleteCustomChar(char));
    row.appendChild(delBtn);
    list.appendChild(row);
  });

  if (entries.length === 0 && !addNew) {
    const empty = document.createElement('div');
    empty.className = 'fav-empty';
    empty.textContent = '特殊文字の変換はまだありません';
    list.appendChild(empty);
  }

  if (addNew) {
    const row = document.createElement('div');
    row.className = 'custom-char-row new-row';

    const charInput = document.createElement('input');
    charInput.type = 'text';
    charInput.className = 'custom-char-input';
    charInput.placeholder = '文字';
    charInput.maxLength = 10;

    const arrow = document.createElement('span');
    arrow.className = 'custom-char-arrow';
    arrow.textContent = '→';

    const emojiInput = document.createElement('input');
    emojiInput.type = 'text';
    emojiInput.className = 'custom-char-input emoji-wide';
    emojiInput.placeholder = '絵文字';

    const addBtn = document.createElement('button');
    addBtn.className = 'ctrl-btn fav-load-btn';
    addBtn.textContent = '決定';

    const confirm = () => {
      const char = charInput.value.trim();
      const emoji = emojiInput.value.trim();
      if (!char || !emoji) return;
      currentCipher[char] = emoji;
      saveCipher();
      renderCustomChars();
    };

    addBtn.addEventListener('click', confirm);
    emojiInput.addEventListener('keydown', e => { if (e.key === 'Enter') confirm(); });
    charInput.addEventListener('keydown', e => { if (e.key === 'Enter') emojiInput.focus(); });

    row.append(charInput, arrow, emojiInput, addBtn);
    list.appendChild(row);
    charInput.focus();
  }
}

function addCustomChar() {
  renderCustomChars(true);
}

function deleteCustomChar(char) {
  delete currentCipher[char];
  saveCipher();
  renderCustomChars();
}

buildGrid();
renderFavorites();
renderCustomChars();
