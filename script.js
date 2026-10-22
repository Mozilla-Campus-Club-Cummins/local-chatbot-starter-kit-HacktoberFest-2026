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
userInput.addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    sendMessage();
  }
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

  // Message text container
  const textElement = document.createElement('span');
  textElement.classList.add('message-text');
  textElement.textContent = text;

  // Timestamp container
  const timeElement = document.createElement('span');
  timeElement.classList.add('message-time');
  timeElement.textContent = formatTimestamp();

  messageElement.appendChild(textElement);
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