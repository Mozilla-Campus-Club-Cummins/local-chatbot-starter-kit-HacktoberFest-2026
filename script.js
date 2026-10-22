const chatWindow = document.getElementById('chat-window');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const themeToggle = document.getElementById('theme-toggle');

// Toggle the dark theme when the user clicks the theme button
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle("dark");
});

sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    sendMessage();
  }
});

async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  // 1. Render User Message & clear input
  appendMessage(text, 'user');
  userInput.value = '';

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

  // Add a copy button only to AI responses
  if (senderClass === 'ai') {
    const copyBtn = document.createElement('button');
    copyBtn.classList.add('copy-btn');
    copyBtn.textContent = '📋 Copy';
    copyBtn.setAttribute('aria-label', 'Copy AI response');

    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(text);

        copyBtn.textContent = '✓ Copied!';
        copyBtn.disabled = true;

        setTimeout(() => {
          copyBtn.textContent = '📋 Copy';
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

  chatWindow.appendChild(messageElement);

  // Auto-scroll to the bottom
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function toggleInputState(isDisabled) {
  userInput.disabled = isDisabled;
  sendBtn.disabled = isDisabled;
}

/*added function*/
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