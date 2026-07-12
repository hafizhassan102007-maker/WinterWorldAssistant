import { createSessionId, ensureSessionId, setCurrentSession, readMessages, appendMessage } from './chat-session.mjs';

const messagesEl = document.getElementById('messages');
const chatForm = document.getElementById('chatForm');
const messageInput = document.getElementById('messageInput');
const statusPill = document.getElementById('statusPill');
const DEFAULT_WEBHOOK_URL = 'http://localhost:5678/webhook/e314dc59-419f-4cfa-af0e-0ee93cf094ae';

let currentSessionId = '';

function getWebhookUrl() {
  return DEFAULT_WEBHOOK_URL;
}

function updateStatus(label, type = 'live') {
  statusPill.textContent = label;
  statusPill.className = `status-pill ${type}`;
}

function addMessage(text, role = 'bot', persist = true) {
  const messageWrapper = document.createElement('div');
  messageWrapper.className = `message ${role}`;

  const avatar = document.createElement('span');
  avatar.className = 'avatar';
  avatar.textContent = role === 'user' ? '🙂' : '❄️';

  const bubble = document.createElement('div');
  bubble.className = 'bubble';

  const content = document.createElement(role === 'user' ? 'p' : 'div');
  content.className = role === 'user' ? '' : 'markdown-body';

  if (role === 'user') {
    content.textContent = text;
  } else {
    content.innerHTML = renderMarkdown(text);
  }

  bubble.appendChild(content);
  messageWrapper.appendChild(avatar);
  messageWrapper.appendChild(bubble);
  messagesEl.appendChild(messageWrapper);
  if (persist) {
    appendMessage(sessionStorage, currentSessionId, {
      role,
      text,
      timestamp: new Date().toISOString(),
    });
  }
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function renderMarkdown(text) {
  const escaped = escapeHtml(text);

  const parsed = escaped
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br />');

  return parsed;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function extractReplyText(data, fallbackText = '') {
  if (typeof data === 'string' && data.trim()) {
    return data.trim();
  }

  if (data && typeof data === 'object') {
    if (typeof data.output === 'string' && data.output.trim()) {
      return data.output.trim();
    }

    if (typeof data.reply === 'string' && data.reply.trim()) {
      return data.reply.trim();
    }
  }

  return fallbackText || 'Your n8n workflow replied successfully.';
}

function renderSessionMessages() {
  messagesEl.innerHTML = '';

  const storedMessages = readMessages(sessionStorage, currentSessionId);
  if (!storedMessages.length) {
    addMessage('Hello! I’m WinterWorld Assistant. I can help with bookings, questions, and support requests.', 'bot', false);
    return;
  }

  storedMessages.forEach((message) => {
    addMessage(message.text, message.role, false);
  });
}

function applySession(sessionId) {
  const normalizedSessionId = (sessionId || '').trim() || createSessionId('session');
  currentSessionId = setCurrentSession(sessionStorage, normalizedSessionId);
  renderSessionMessages();
}

async function sendToWebhook(message) {
  const webhookUrl = getWebhookUrl();

  if (!webhookUrl) {
    updateStatus('Demo mode', 'demo');
    return 'Webhook URL not configured.';
  }

  try {
    updateStatus('Thinking…', 'live');

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chatInput: message,
      }),
    });

    let replyText = '';

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      replyText = text || `Request failed with ${response.status}`;
      updateStatus('Webhook issue', 'error');
      return replyText;
    }

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const data = await response.json().catch(() => null);
      replyText = extractReplyText(data);
    } else {
      replyText = await response.text().catch(() => '');
    }

    if (!replyText) {
      replyText = 'Your n8n workflow replied successfully.';
    }

    updateStatus('Online now', 'live');
    return replyText;
  } catch (error) {
    console.error(error);
    updateStatus('Webhook issue', 'error');
    return `I could not reach your n8n workflow. ${error.message}`;
  }
}

chatForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const message = messageInput.value.trim();
  if (!message) return;

  addMessage(message, 'user');
  messageInput.value = '';
  messageInput.disabled = true;
  chatForm.querySelector('button').disabled = true;

  const reply = await sendToWebhook(message);
  addMessage(reply, 'bot');

  messageInput.disabled = false;
  chatForm.querySelector('button').disabled = false;
  messageInput.focus();
});

function initializeSession() {
  const storedSession = sessionStorage.getItem('winterworld-current-session');
  if (!storedSession) {
    currentSessionId = ensureSessionId(sessionStorage, createSessionId('session'));
  } else {
    currentSessionId = ensureSessionId(sessionStorage, storedSession);
  }
  renderSessionMessages();
}

initializeSession();
updateStatus('Online now', 'live');
