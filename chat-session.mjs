function createStorageAdapter(storage) {
  return {
    getItem(key) {
      return storage?.getItem(key) ?? null;
    },
    setItem(key, value) {
      storage?.setItem(key, value);
    },
    removeItem(key) {
      storage?.removeItem(key);
    },
  };
}

function createSessionId(prefix = 'user') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeSessionId(sessionId) {
  const cleaned = (sessionId || '').trim();
  return cleaned || createSessionId();
}

function getSessionStorageKey(sessionId) {
  return `winterworld-chat:${normalizeSessionId(sessionId)}`;
}

function readMessages(storage, sessionId) {
  const adapter = createStorageAdapter(storage);
  const key = getSessionStorageKey(sessionId);
  const rawValue = adapter.getItem(key);

  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Could not parse chat session data.', error);
    return [];
  }
}

function writeMessages(storage, sessionId, messages) {
  const adapter = createStorageAdapter(storage);
  const key = getSessionStorageKey(sessionId);
  adapter.setItem(key, JSON.stringify(messages));
}

function ensureSessionId(storage, providedSessionId) {
  const adapter = createStorageAdapter(storage);
  const requested = normalizeSessionId(providedSessionId);
  const stored = adapter.getItem('winterworld-current-session');

  if (requested && requested !== 'user-') {
    adapter.setItem('winterworld-current-session', requested);
    return requested;
  }

  if (stored) {
    return stored;
  }

  const generated = createSessionId();
  adapter.setItem('winterworld-current-session', generated);
  return generated;
}

function setCurrentSession(storage, sessionId) {
  const adapter = createStorageAdapter(storage);
  const normalized = normalizeSessionId(sessionId);
  adapter.setItem('winterworld-current-session', normalized);
  return normalized;
}

function resetSession(storage, sessionId) {
  const adapter = createStorageAdapter(storage);
  const normalized = normalizeSessionId(sessionId);
  adapter.removeItem(getSessionStorageKey(normalized));
  return normalized;
}

function appendMessage(storage, sessionId, message) {
  const messages = readMessages(storage, sessionId);
  const nextMessages = [...messages, message];
  writeMessages(storage, sessionId, nextMessages);
  return nextMessages;
}

export {
  createSessionId,
  normalizeSessionId,
  ensureSessionId,
  setCurrentSession,
  readMessages,
  writeMessages,
  appendMessage,
  resetSession,
};
