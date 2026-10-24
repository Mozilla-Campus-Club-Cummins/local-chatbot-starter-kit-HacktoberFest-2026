const chatWindow = document.getElementById('chat-window');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const themeToggle = document.getElementById('theme-toggle');
const scrollBottomBtn = document.getElementById('scroll-bottom-btn');

/*added lines*/
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

function appendMessage(text, senderClass) {
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
  timeElement.textContent = formatTimestamp();

  messageElement.appendChild(timeElement);
  chatWindow.appendChild(messageElement);

  // Auto-scroll to the bottom
  chatWindow.scrollTop = chatWindow.scrollHeight;
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