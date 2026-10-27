const chatWindow = document.getElementById('chat-window');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const themeToggle = document.getElementById('theme-toggle');
const clearChatBtn = document.getElementById('clear-chat-btn');
const scrollBottomBtn = document.getElementById('scroll-bottom-btn');

// --- Chat history persistence (localStorage) ---
const STORAGE_KEY = 'chatHistory';
let chatHistory = []; // [{ text, sender, time }]

// localStorage can throw (private mode, quota, corrupted JSON), so every access is guarded
function loadChatHistory() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(parsed)) return [];

    // Drop malformed entries so one bad record can't break the whole chat
    return parsed.filter(
      (msg) =>
        msg &&
        typeof msg.text === 'string' &&
        (msg.sender === 'user' || msg.sender === 'ai')
    );
  } catch (error) {
    console.error('Failed to load chat history:', error);
    return [];
  }
}

function saveChatHistory() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chatHistory));
  } catch (error) {
    console.error('Failed to save chat history:', error);
  }
}

// Re-render saved messages after the greeting that is already in index.html
document.addEventListener('DOMContentLoaded', () => {
  chatHistory = loadChatHistory();
  chatHistory.forEach((msg) =>
    appendMessage(msg.text, msg.sender, msg.time, false)
  );
});

// Show the button when the user scrolls up
function updateScrollButton() {
  const distanceFromBottom =
    chatWindow.scrollHeight - chatWindow.scrollTop - chatWindow.clientHeight;

  scrollBottomBtn.style.display = distanceFromBottom > 20 ? 'block' : 'none';
}

chatWindow.addEventListener('scroll', updateScrollButton);

// Scroll to the latest message when clicked
scrollBottomBtn.addEventListener('click', () => {
  chatWindow.scrollTo({
    top: chatWindow.scrollHeight,
    behavior: 'smooth'
  });
});

// Toggle the dark theme when the user clicks the theme button
themeToggle.addEventListener('click', () => {
  document.body.classList.toggle("dark");
});

// Clear chat window and restore initial greeting without timestamp
if (clearChatBtn) {
  clearChatBtn.addEventListener('click', () => {
    chatHistory = [];
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear chat history:', error);
    }

    chatWindow.innerHTML = `
      <div class="message ai">
        <span class="message-text">Hello :) I am your local AI. How can I help you today?</span>
      </div>
    `;
  });
}

sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});

// Automatically resize textarea as the user types
userInput.addEventListener('input', () => {
  userInput.style.height = 'auto';

  const maxHeight = 150;
  userInput.style.height = Math.min(userInput.scrollHeight, maxHeight) + 'px';

  userInput.style.overflowY =
    userInput.scrollHeight > maxHeight ? 'auto' : 'hidden';
});

// Helper: Format timestamp as "hh:mm AM/PM"
function formatTimestamp() {
  const now = new Date();
  return now.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  // 1. Render User Message & clear input
  appendMessage(text, 'user');
  userInput.value = '';

  userInput.style.height = 'auto';
  userInput.style.overflowY = 'hidden';

  // 2. Disable controls while waiting for backend
  toggleInputState(true);
  showTypingIndicator();

  try {
    // 3. Call Plain Java Backend endpoint
    const response = await fetch('http://localhost:8080/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: text }),
    });

    if (!response.ok) {
      throw new Error(`Server status: ${response.status}`);
    }

    const data = await response.json();
    removeTypingIndicator();

    // 4. Render AI Reply
    appendMessage(data.reply || 'No response received.', 'ai');

  } catch (error) {
    console.error('Fetch error:', error);
    appendMessage('Error: Unable to reach the local backend server.', 'error');
  } finally {
    removeTypingIndicator();
    toggleInputState(false);
    userInput.focus();
  }
}

// time/shouldSave let us re-render saved messages without saving them a second time
function appendMessage(text, senderClass, time = formatTimestamp(), shouldSave = true) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message', senderClass);

  const textElement = document.createElement('span');
  textElement.classList.add('message-text');
  textElement.textContent = text;

  messageElement.appendChild(textElement);

  messageElement.style.whiteSpace = 'pre-wrap';

  // Add a copy button only to AI responses
  if (senderClass === 'ai') {
    const copyBtn = document.createElement('button');
    copyBtn.classList.add('copy-btn');
    copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>`;
    copyBtn.setAttribute('aria-label', 'Copy AI response');

    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(text);

        copyBtn.textContent = '✓';
        copyBtn.disabled = true;

        setTimeout(() => {
          copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>`;
          copyBtn.disabled = false;
        }, 1500);
      } catch (error) {
        console.error('Failed to copy response:', error);
        copyBtn.textContent = 'Copy failed';

        setTimeout(() => {
          copyBtn.textContent = '📋 Copy';
        }, 1500);
      }
    });

    messageElement.appendChild(copyBtn);
  }

  // Timestamp container
  const timeElement = document.createElement('span');
  timeElement.classList.add('message-time');
  timeElement.textContent = time;

  messageElement.appendChild(timeElement);
  chatWindow.appendChild(messageElement);

  // Auto-scroll to the bottom
  chatWindow.scrollTop = chatWindow.scrollHeight;

  // Persist chat messages only; error notices are temporary and shouldn't come back on reload
  if (shouldSave && senderClass !== 'error') {
    chatHistory.push({ text, sender: senderClass, time });
    saveChatHistory();
  }
}

function toggleInputState(isDisabled) {
  userInput.disabled = isDisabled;
  sendBtn.disabled = isDisabled;
}

function showTypingIndicator() {
  const indicator = document.createElement('div');
  indicator.className = 'message typing-indicator';
  indicator.id = 'typing-indicator';
  indicator.innerHTML = '<span>•</span><span>•</span><span>•</span>';
  chatWindow.appendChild(indicator);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function removeTypingIndicator() {
  const indicator = document.getElementById('typing-indicator');
  if (indicator) indicator.remove();
}