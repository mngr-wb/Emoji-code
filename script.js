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
  'ゔ':'う',
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
  'っ':'つ','ゃ':'や','ゅ':'ゆ','ょ':'よ','ゎ':'わ','ゕ':'か','ゖ':'け',
};

const SMALL_KANA_REVERSE = Object.fromEntries(
  Object.entries(SMALL_KANA_MAP).map(([small, large]) => [large, small])
);

const CONFIG_VERSION = 1;

let currentCipher = { ...CIPHER };

(function () {
  try {
    const saved = localStorage.getItem('menchi-cipher-custom');
    if (saved) {
      const candidate = normalizeCipher({ ...CIPHER, ...JSON.parse(saved) });
      if (validateCipher(candidate).ok) currentCipher = candidate;
    }
  } catch (e) {}
})();

function kata2hira(str) {
  return str.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

function normalizeCipher(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('暗号表の形式が正しくありません');
  }
  const entries = Object.entries(value);
  if (entries.length > 200) throw new Error('暗号表の項目が多すぎます');
  const normalized = {};
  for (const [key, emoji] of entries) {
    const normalizedKey = kata2hira(key.trim());
    if (!normalizedKey || normalizedKey.length > 20 || typeof emoji !== 'string' || !emoji.trim() || emoji.length > 80) {
      throw new Error('文字または絵文字の形式が正しくありません');
    }
    if (normalizedKey === '__proto__' || normalizedKey === 'constructor' || normalizedKey === 'prototype') {
      throw new Error('使用できない文字名が含まれています');
    }
    if (normalizedKey in normalized) throw new Error(`「${normalizedKey}」の設定が重複しています`);
    normalized[normalizedKey] = emoji.trim();
  }
  return normalized;
}

function validateCipher(cipher) {
  const used = new Map();
  for (const [key, emoji] of Object.entries(cipher)) {
    if (/^[\^"'“”‘’]/u.test(emoji)) {
      return { ok: false, error: `「${key}」の絵文字は記号（^・引用符）から始められません` };
    }
    if (used.has(emoji)) {
      return { ok: false, error: `「${used.get(emoji)}」と「${key}」に同じ絵文字が使われています` };
    }
    used.set(emoji, key);
  }
  const entries = [...used.entries()];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const [firstEmoji, firstKey] = entries[i];
      const [secondEmoji, secondKey] = entries[j];
      if (firstEmoji.startsWith(secondEmoji) || secondEmoji.startsWith(firstEmoji)) {
        return {
          ok: false,
          error: `「${firstKey}」と「${secondKey}」の絵文字は先頭部分が重なるため使えません`,
        };
      }
    }
  }
  return { ok: true, error: '' };
}

function getCustomKeys(cipher) {
  return Object.keys(cipher)
    .filter(key => !(key in CIPHER))
    .sort((a, b) => b.length - a.length);
}

function encodeText(raw, cipher = currentCipher) {
  const input = kata2hira(raw);
  let result = '';
  const customKeys = getCustomKeys(cipher);

  for (let i = 0; i < input.length;) {
    const customKey = customKeys.find(key => input.startsWith(key, i));
    if (customKey) {
      result += cipher[customKey];
      i += customKey.length;
      continue;
    }

    const ch = input[i];
    if (SMALL_KANA_MAP[ch] && cipher[SMALL_KANA_MAP[ch]]) {
      result += cipher[SMALL_KANA_MAP[ch]] + '^';
    } else if (DAKUTEN_MAP[ch] && cipher[DAKUTEN_MAP[ch]]) {
      result += cipher[DAKUTEN_MAP[ch]] + '"';
    } else if (HANDAKUTEN_MAP[ch] && cipher[HANDAKUTEN_MAP[ch]]) {
      result += cipher[HANDAKUTEN_MAP[ch]] + "'";
    } else if (cipher[ch]) {
      result += cipher[ch];
    } else if (ch === 'ー' || ch === '-') {
      result += 'ー';
    } else if (ch === ' ' || ch === '　') {
      result += ' ';
    } else {
      result += ch;
    }
    i++;
  }

  return result;
}

function encode() {
  const raw = document.getElementById('encode-input').value;
  const result = encodeText(raw);

  const box = document.getElementById('encode-output');
  if (result) {
    box.innerHTML = `<span>${escapeHtml(result)}</span>`;
  } else {
    box.innerHTML = `<span class="placeholder-text">ここに絵文字が表示されます</span>`;
  }
  updateSharePanel('encode-output', 'encode-share');
}

function decodeText(input, cipher = currentCipher) {
  const tokens = Object.entries(cipher)
    .map(([key, emoji]) => ({ key, emoji }))
    .sort((a, b) => b.emoji.length - a.emoji.length);
  let result = '';
  let i = 0;
  while (i < input.length) {
    const match = tokens.find(({ emoji }) => input.startsWith(emoji, i));
    if (match) {
      const kana = match.key;
      const nextIndex = i + match.emoji.length;
      const next = input[nextIndex];
      if (next === '^' && SMALL_KANA_REVERSE[kana]) {
        result += SMALL_KANA_REVERSE[kana];
        i = nextIndex + 1;
        continue;
      }
      if (next === '"' || next === '“' || next === '”') {
        const daku = Object.entries(DAKUTEN_MAP).find(([d, s]) => s === kana);
        if (daku) {
          result += daku[0];
          i = nextIndex + 1;
          continue;
        }
      }
      if (next === "'" || next === '‘' || next === '’') {
        const handaku = Object.entries(HANDAKUTEN_MAP).find(([h, s]) => s === kana);
        if (handaku) {
          result += handaku[0];
          i = nextIndex + 1;
          continue;
        }
      }
      result += kana;
      i = nextIndex;
      continue;
    }
    const character = String.fromCodePoint(input.codePointAt(i));
    result += character;
    i += character.length;
  }

  return result;
}

function decode() {
  const input = document.getElementById('decode-input').value;
  const result = decodeText(input);

  const box = document.getElementById('decode-output');
  if (result) {
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
  return span?.textContent || '';
}

function setSettingsStatus(message, isError = false) {
  const status = document.getElementById('settings-status');
  if (!status) return;
  status.textContent = message;
  status.classList.toggle('is-error', isError);
}

function setShareStatus(message, isError = false) {
  const status = document.getElementById('share-status');
  if (!status) return;
  status.textContent = message;
  status.classList.toggle('is-error', isError);
}

function refreshConversions() {
  encode();
  decode();
}

function tryExample(mode) {
  if (mode === 'encode') {
    document.getElementById('encode-input').value = 'きゃっと';
    encode();
  } else {
    document.getElementById('decode-input').value = encodeText('きゃっと');
    decode();
  }
}

function clearInput(mode) {
  const input = document.getElementById(`${mode}-input`);
  input.value = '';
  mode === 'encode' ? encode() : decode();
  input.focus();
}

function sendToOtherMode(mode) {
  const output = getOutputText(`${mode}-output`);
  if (!output) return;
  const targetMode = mode === 'encode' ? 'decode' : 'encode';
  document.getElementById(`${targetMode}-input`).value = output;
  setMode(targetMode);
  targetMode === 'encode' ? encode() : decode();
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

function getCipherOverrides(cipher = currentCipher) {
  return Object.fromEntries(Object.entries(cipher).filter(([key, emoji]) => CIPHER[key] !== emoji));
}

function encodeSharePayload(payload) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeSharePayload(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function buildDecodeLink(message) {
  const payload = {
    version: CONFIG_VERSION,
    message,
    cipher: getCipherOverrides(),
  };
  const url = `${location.origin}${location.pathname}#share=${encodeSharePayload(payload)}`;
  if (url.length > 8000) throw new Error('暗号表が大きいため共有リンクを作成できません');
  return url;
}

function buildShareText(outputId) {
  const text = getOutputText(outputId);
  const url = outputId === 'encode-output'
    ? buildDecodeLink(text)
    : `${location.origin}${location.pathname}`;
  return `${text}\n\n文字暗号ツールで変換しました\n${url}`;
}

function copyShareLink() {
  const message = getOutputText('encode-output');
  if (!message) return;
  try {
    copyText(buildDecodeLink(message)).then(() => {
      setShareStatus('解読リンクをコピーしました');
    }).catch(() => {
      setShareStatus('リンクをコピーできませんでした', true);
    });
  } catch (error) {
    setShareStatus(error.message, true);
  }
}

function shareOutput(outputId, service) {
  if (!getOutputText(outputId)) return;
  let text;
  let shareUrl;
  try {
    text = buildShareText(outputId);
    shareUrl = outputId === 'encode-output'
      ? buildDecodeLink(getOutputText(outputId))
      : location.href;
  } catch (error) {
    setShareStatus(error.message, true);
    return;
  }

  if (service === 'native' && navigator.share) {
    navigator.share({
      title: '文字暗号ツール',
      text: getOutputText(outputId),
      url: shareUrl,
    }).catch(() => {});
    return;
  }

  const encodedText = encodeURIComponent(text);
  const encodedUrl = encodeURIComponent(shareUrl);
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
  const validation = validateCipher(currentCipher);
  if (!validation.ok) {
    setSettingsStatus(validation.error, true);
    return false;
  }
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
  refreshConversions();
  return true;
}

function resetCipher() {
  if (!confirm('デフォルトの暗号表に戻しますか？')) return;
  currentCipher = { ...CIPHER };
  localStorage.removeItem('menchi-cipher-custom');
  document.getElementById('reset-btn').style.display = 'none';
  rebuildGrid();
  refreshConversions();
  setSettingsStatus('デフォルトの暗号表に戻しました');
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
          const candidate = { ...currentCipher, [kana]: val };
          const validation = validateCipher(candidate);
          if (!validation.ok) {
            e.target.value = currentCipher[kana];
            setSettingsStatus(validation.error, true);
            return;
          }
          currentCipher = candidate;
          saveCipher();
          setSettingsStatus(`「${kana}」の設定を保存しました`);
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
  const candidate = normalizeCipher({ ...CIPHER, ...favorites[index].cipher });
  const validation = validateCipher(candidate);
  if (!validation.ok) {
    setSettingsStatus(validation.error, true);
    return;
  }
  currentCipher = candidate;
  saveCipher();
  rebuildGrid();
  refreshConversions();
  setSettingsStatus(`「${favorites[index].name}」を読み込みました`);
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
      const char = kata2hira(charInput.value.trim());
      const emoji = emojiInput.value.trim();
      if (!char || !emoji) return;
      const candidate = { ...currentCipher, [char]: emoji };
      const validation = validateCipher(candidate);
      if (!validation.ok) {
        setSettingsStatus(validation.error, true);
        return;
      }
      currentCipher = candidate;
      saveCipher();
      renderCustomChars();
      setSettingsStatus(`「${char}」の特殊変換を追加しました`);
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
  refreshConversions();
  setSettingsStatus(`「${char}」の特殊変換を削除しました`);
}

function exportCipher() {
  const data = JSON.stringify({ version: CONFIG_VERSION, cipher: currentCipher }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'emoji-code-settings.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setSettingsStatus('設定ファイルを書き出しました');
}

async function importCipher(event) {
  const input = event.target;
  const file = input.files?.[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (data.version !== CONFIG_VERSION || !data.cipher) {
      throw new Error('対応していない設定ファイルです');
    }
    const imported = normalizeCipher(data.cipher);
    const candidate = normalizeCipher({ ...CIPHER, ...imported });
    const validation = validateCipher(candidate);
    if (!validation.ok) throw new Error(validation.error);
    currentCipher = candidate;
    saveCipher();
    rebuildGrid();
    refreshConversions();
    setSettingsStatus('設定ファイルを読み込みました');
  } catch (error) {
    setSettingsStatus(error.message || '設定ファイルを読み込めませんでした', true);
  } finally {
    input.value = '';
  }
}

function loadSharedMessage() {
  if (!location.hash.startsWith('#share=')) return;
  try {
    const payload = decodeSharePayload(location.hash.slice(7));
    if (payload.version !== CONFIG_VERSION || typeof payload.message !== 'string') {
      throw new Error('対応していない共有リンクです');
    }
    const overrides = normalizeCipher(payload.cipher || {});
    const candidate = normalizeCipher({ ...CIPHER, ...overrides });
    const validation = validateCipher(candidate);
    if (!validation.ok) throw new Error(validation.error);
    currentCipher = candidate;
    rebuildGrid();
    document.getElementById('decode-input').value = payload.message;
    setMode('decode');
    decode();
    setSettingsStatus('共有された暗号表で解読しました（端末には保存していません）');
  } catch (error) {
    setSettingsStatus(error.message || '共有リンクを読み込めませんでした', true);
  }
}

buildGrid();
renderFavorites();
renderCustomChars();
loadSharedMessage();
