const acceptBtn = document.getElementById('accept-btn');
const readBtn = document.getElementById('read-btn');
const proceedBtn = document.getElementById('proceed-btn');
const closingBtn = document.getElementById('closing-btn');
const guestbookClosingBtn = document.getElementById('guestbook-closing-btn');
const newspaperProceedBtn = document.getElementById('newspaper-proceed-btn');
const overlay = document.getElementById('newspaper-envelope-overlay');
const overlayStage = document.getElementById('overlay-stage');
const envelope = document.getElementById('envelope');
const newspaperEnvelope = document.getElementById('newspaper-envelope');
const letter = document.getElementById('letter');
const newspaperLetter = document.getElementById('newspaper-letter');
const bgMusic = document.getElementById('bg-music');
const voiceMessage = document.getElementById('voice-message');
const guestbookForm = document.getElementById('guestbook-form');
const entries = document.getElementById('entries');
const envelopeVideo = document.getElementById('envelope-video');
const openingAudio = document.getElementById('opening-audio');
const ownerBtn = document.getElementById('owner-btn');
const ownerModal = document.getElementById('owner-modal');
const ownerEntriesContainer = document.getElementById('owner-entries');
const exportEntriesBtn = document.getElementById('export-entries');
const clearEntriesBtn = document.getElementById('clear-entries');
const closeOwnerModalBtn = document.getElementById('close-owner-modal');
const compatibilityNoteEnvelope = document.getElementById('compatibility-note-envelope');
const compatibilityNoteGuestbook = document.getElementById('compatibility-note-guestbook');

let _openingSaveInterval = null;

if (acceptBtn) {
  acceptBtn.addEventListener('click', () => {
    window.location.href = '../envelope/';
  });
}

if (readBtn && overlay && newspaperEnvelope && newspaperLetter) {
  readBtn.addEventListener('click', () => {
    overlay.classList.remove('hidden');
    requestAnimationFrame(() => {
      overlayStage.classList.add('visible');
      newspaperEnvelope.classList.add('open');
    });

    setTimeout(() => {
      newspaperLetter.classList.add('visible');
    }, 700);

    setTimeout(() => {
      newspaperProceedBtn?.classList.remove('hidden');
    }, 1200);

    playAmbient();
    // start opening audio and envelope video when overlay opens
    // this click is a user gesture, which may allow audible autoplay in strict browsers
    try { if (openingAudio) { openingAudio.muted = false; openingAudio.volume = 1.0; } } catch(e){}
    try { if (envelopeVideo) { envelopeVideo.muted = false; envelopeVideo.volume = 1.0; } } catch(e){}
    startOpeningPlayback();
    playEnvelopeVideo();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

if (proceedBtn) {
  proceedBtn.addEventListener('click', () => {
    // fade out envelope video, keep opening audio playing, then navigate
    try {
      if (envelopeVideo) {
        envelopeVideo.classList.add('fade-out');
        setTimeout(() => {
          try { envelopeVideo.pause(); envelopeVideo.currentTime = 0; envelopeVideo.style.display = 'none'; } catch(e) {}
          window.location.href = '../guestbook/';
        }, 600);
        return;
      }
    } catch (e) {}
    window.location.href = '../guestbook/';
  });
}

if (newspaperProceedBtn) {
  newspaperProceedBtn.addEventListener('click', () => {
    // if any envelope video was started, fade it out when proceeding
    try {
      if (envelopeVideo) {
        envelopeVideo.classList.add('fade-out');
        setTimeout(() => {
          try { envelopeVideo.pause(); envelopeVideo.currentTime = 0; envelopeVideo.style.display = 'none'; } catch(e) {}
          window.location.href = '../guestbook/';
        }, 600);
        return;
      }
    } catch (e) {}
    window.location.href = '../guestbook/';
  });
}

if (closingBtn) {
  closingBtn.addEventListener('click', () => {
    window.location.href = '../closing/';
  });
}

if (guestbookClosingBtn) {
  guestbookClosingBtn.addEventListener('click', () => {
    // stop the opening audio before moving to the closing page
    stopOpeningPlayback();
    window.location.href = '../closing/';
  });
}

if (envelope && letter) {
  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      envelope.classList.add('open');
      letter.classList.add('visible');
    }, 600);
    playAmbient();
    // envelope page: play video and opening audio when it opens
    startOpeningPlayback();
    playEnvelopeVideo();
  });
}

if (openingAudio && !envelope && window.location.pathname.includes('/newspaper/')) {
  window.addEventListener('DOMContentLoaded', () => {
    startOpeningPlayback();
    document.body.addEventListener('click', () => {
      try { openingAudio.play().catch(() => {}); } catch (e) {}
    }, { once: true });
  });
}

if (guestbookForm && entries) {
  restoreEntries();
  guestbookForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const nameInput = document.getElementById('guest-name');
    const messageInput = document.getElementById('guest-message');

    const name = nameInput.value.trim();
    const message = messageInput.value.trim();

    if (!name || !message) return;

    addEntry(name, message);
    saveEntries();

    nameInput.value = '';
    messageInput.value = '';
  });
}

// Owner-only view: show modal with entries after passphrase check
if (ownerBtn) {
  ownerBtn.addEventListener('click', () => {
    const storedPass = localStorage.getItem('bridgertonGuestbookOwnerPass');
    if (!storedPass) {
      const newPass = prompt('Create an owner passphrase to protect guestbook entries (stored locally on this browser):');
      if (!newPass) return;
      localStorage.setItem('bridgertonGuestbookOwnerPass', newPass);
      alert('Passphrase saved locally. Click Owner again and enter it to view entries.');
      return;
    }
    const attempt = prompt('Enter owner passphrase:');
    if (attempt !== storedPass) {
      alert('Incorrect passphrase.');
      return;
    }
    // success
    if (ownerModal) {
      ownerModal.classList.remove('hidden');
      ownerModal.setAttribute('aria-hidden', 'false');
    }
    renderOwnerEntries();
  });
}

if (closeOwnerModalBtn) {
  closeOwnerModalBtn.addEventListener('click', () => {
    if (ownerModal) {
      ownerModal.classList.add('hidden');
      ownerModal.setAttribute('aria-hidden', 'true');
    }
  });
}

if (exportEntriesBtn) {
  exportEntriesBtn.addEventListener('click', () => {
    const stored = localStorage.getItem('bridgertonGuestbookEntries') || '[]';
    const blob = new Blob([stored], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'guestbook-entries.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });
}

if (clearEntriesBtn) {
  clearEntriesBtn.addEventListener('click', () => {
    if (!confirm('Clear all guestbook entries? This cannot be undone.')) return;
    localStorage.removeItem('bridgertonGuestbookEntries');
    if (entries) entries.innerHTML = '';
    if (ownerEntriesContainer) ownerEntriesContainer.innerHTML = '';
    alert('Guestbook entries cleared.');
  });
}

function renderOwnerEntries() {
  if (!ownerEntriesContainer) return;
  ownerEntriesContainer.innerHTML = '';
  const stored = localStorage.getItem('bridgertonGuestbookEntries');
  if (!stored) {
    ownerEntriesContainer.innerHTML = '<p>No entries yet.</p>';
    return;
  }
  try {
    const arr = JSON.parse(stored);
    if (!Array.isArray(arr) || arr.length === 0) {
      ownerEntriesContainer.innerHTML = '<p>No entries yet.</p>';
      return;
    }
    // entries were saved as array of {name,message}
    arr.slice().reverse().forEach((item) => {
      const div = document.createElement('div');
      div.className = 'owner-entry';
      const n = document.createElement('div');
      n.style.fontWeight = '600';
      n.textContent = item.name || 'Guest';
      const m = document.createElement('div');
      m.style.whiteSpace = 'pre-wrap';
      m.textContent = item.message || '';
      div.appendChild(n);
      div.appendChild(m);
      ownerEntriesContainer.appendChild(div);
    });
  } catch (e) {
    ownerEntriesContainer.innerHTML = '<p>Could not parse entries.</p>';
  }
}

  // Resume opening audio on guestbook page if present
  if (openingAudio && !envelope && window.location.pathname.includes('/guestbook/')) {
    // if there's a saved time, resume from there
    const savedTime = parseFloat(sessionStorage.getItem('openingAudioTime') || '0');
    const wasPlaying = sessionStorage.getItem('openingAudioPlaying') === 'true';
    if (!isNaN(savedTime) && savedTime > 0) {
      try {
        openingAudio.currentTime = savedTime;
      } catch (e) {}
    }
    if (wasPlaying) {
      try { openingAudio.muted = false; } catch(e){}
      openingAudio.play().catch(() => {});
      startOpeningSaveInterval();
    }
  }

  // Stop opening audio and clear saved state
  function stopOpeningPlayback() {
    if (openingAudio) {
      try { openingAudio.pause(); } catch (e) {}
      try { openingAudio.currentTime = 0; } catch (e) {}
    }
    sessionStorage.removeItem('openingAudioTime');
    sessionStorage.removeItem('openingAudioPlaying');
    if (_openingSaveInterval) {
      clearInterval(_openingSaveInterval);
      _openingSaveInterval = null;
    }
  }

  function startOpeningPlayback() {
    if (!openingAudio) return;
    // resume from saved time if available
    const savedTime = parseFloat(sessionStorage.getItem('openingAudioTime') || '0');
    try {
      if (!isNaN(savedTime) && savedTime > 0) openingAudio.currentTime = savedTime;
    } catch (e) {}
    openingAudio.play().then(() => {
      sessionStorage.setItem('openingAudioPlaying', 'true');
      startOpeningSaveInterval();
    }).catch(() => {});
  }

  function startOpeningSaveInterval() {
    if (!openingAudio) return;
    if (_openingSaveInterval) return;
    _openingSaveInterval = setInterval(() => {
      try { sessionStorage.setItem('openingAudioTime', openingAudio.currentTime); } catch (e) {}
    }, 1000);
  }

function setAudioMuted(muted) {
  try {
    if (openingAudio) { openingAudio.muted = !!muted; if (!muted) openingAudio.play().catch(()=>{}); }
  } catch(e){}
  try { if (envelopeVideo) envelopeVideo.muted = !!muted; } catch(e){}
}

function updateAudioButtons() {
  // no-op after removing mute controls
}

  function playEnvelopeVideo() {
    if (!envelopeVideo) return;
    envelopeVideo.style.display = 'block';
    envelopeVideo.play().catch(() => {});
  }

function playAmbient() {
  if (bgMusic) {
    bgMusic.play().catch(() => {});
  }
  if (voiceMessage) {
    voiceMessage.play().catch(() => {});
  }
}

function getCompatibilityMessage() {
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  const isSafari = /Safari/.test(ua) && !/Chrome|Chromium|Edg|OPR|Firefox/.test(ua);
  if (isIOS) {
    return 'Mobile Safari often requires a first tap before audio will play. If sound does not start automatically, tap once anywhere on the page.';
  }
  if (isSafari) {
    return 'Safari sometimes blocks audio until the page is interacted with. If sound does not begin, tap anywhere on the page.';
  }
  return 'Some browsers require a tap before sound will play. If audio remains silent, click anywhere on the page.';
}

function updateCompatibilityNotes() {
  const message = getCompatibilityMessage();
  if (compatibilityNoteEnvelope) compatibilityNoteEnvelope.textContent = message;
  if (compatibilityNoteGuestbook) compatibilityNoteGuestbook.textContent = message;
}

updateCompatibilityNotes();

function addEntry(name, message) {
  const entry = document.createElement('div');
  entry.className = 'entry';
  entry.innerHTML = `
    <p class="entry-name">${escapeHtml(name)}</p>
    <p class="entry-message">${escapeHtml(message)}</p>
  `;
  entries.prepend(entry);
}

function saveEntries() {
  const saved = Array.from(entries.querySelectorAll('.entry')).map((entry) => ({
    name: entry.querySelector('.entry-name')?.textContent || '',
    message: entry.querySelector('.entry-message')?.textContent || '',
  }));
  localStorage.setItem('bridgertonGuestbookEntries', JSON.stringify(saved));
}

function restoreEntries() {
  const stored = localStorage.getItem('bridgertonGuestbookEntries');
  if (!stored) return;
  try {
    const savedEntries = JSON.parse(stored);
    savedEntries.reverse().forEach((item) => addEntry(item.name, item.message));
  } catch (error) {
    console.warn('Could not restore guestbook entries', error);
  }
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
