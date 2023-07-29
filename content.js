let speechRecognition;
let previousSpeechText = '';
let lastStopTime = 0;
let isChatbotActive = false;
let isChatbotRunning = false;
const MIC_BUTTON_ID = 'mic-button';

async function initializeChatbot() {
    isChatbotRunning = true;

    const textArea = document.getElementById('prompt-textarea');
    if (!textArea) return;

    let micButton = document.getElementById(MIC_BUTTON_ID);
    if (micButton) return;

    micButton = createMicButton(textArea);
    speechRecognition = initializeSpeechRecognition({ micButton, textArea });
    await loadMicButtonStyles();

    wrapTextAreaWithMicButton(textArea, micButton);
    attachKeyboardShortcuts(textArea, micButton);

    isChatbotRunning = false;
}

function createMicButton(textArea) {
    const micButton = document.createElement('button');
    micButton.id = MIC_BUTTON_ID;
    const imageUrl = chrome.runtime.getURL("./assets/mic.png");
    micButton.style.backgroundImage = `url('${imageUrl}')`;
    micButton.onclick = (event) => handleMicButtonClick({ event, micButton, textArea });
    return micButton;
}

function startSpeechRecognition() {
    speechRecognition.start();
}

function handleMicButtonClick({ event, micButton, textArea }) {
    event.preventDefault();
    if (micButton.classList.contains('active')) {
        stopSpeechRecognition(micButton, textArea);
    } else {
        startSpeechRecognition();
    }
}

function initializeSpeechRecognition({ micButton, textArea }) {
    const recognition = new webkitSpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onstart = () => handleSpeechRecognitionStart(micButton, textArea);
    recognition.onresult = (event) => handleSpeechRecognitionResult({ event, micButton, textArea });
    recognition.onerror = (error) => console.error('Speech recognition error:', error);
    return recognition;
}

function handleSpeechRecognitionStart(micButton, textArea) {
    let newImageUrl = chrome.runtime.getURL("/assets/mic-active.png");
    micButton.style.backgroundImage = `url('${newImageUrl}')`;
    micButton.classList.add('active');
    previousSpeechText = textArea.value + ' ';
}

function handleSpeechRecognitionResult({ event, micButton, textArea }) {
    if (Date.now() - lastStopTime < 300) return;

    let currentSpeech = '';
    for (let i = 0; i < event.results.length; i++) {
        for (let j = 0; j < event.results[i].length; j++) {
            currentSpeech += event.results[i][j].transcript;
        }
    }
    textArea.value = previousSpeechText + currentSpeech;
    textArea.dispatchEvent(new Event('input', { bubbles: true }));
}

function stopSpeechRecognition(micButton, textArea) {
    speechRecognition.stop();
    lastStopTime = Date.now();
    micButton.classList.remove('active');
    const newImageUrl = chrome.runtime.getURL("./assets/mic.png");
    micButton.style.backgroundImage = `url('${newImageUrl}')`;
    textArea.focus();
}

async function loadMicButtonStyles() {
    try {
        const response = await fetch(chrome.runtime.getURL('./assets/styles.css'));
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.text();
        let style = document.createElement('style');
        style.innerHTML = data;
        document.head.appendChild(style);
    } catch (error) {
        console.error('Error fetching CSS file:', error);
    }
}

function wrapTextAreaWithMicButton(textArea, micButton) {
    const parentElement = textArea.parentElement;
    const wrapperDiv = document.createElement('div');
    wrapperDiv.classList.add('wrapper-div');
    parentElement.removeChild(textArea);
    wrapperDiv.appendChild(micButton);
    wrapperDiv.appendChild(textArea);
    parentElement.appendChild(wrapperDiv);
    textArea.focus();
}

function attachKeyboardShortcuts(textArea, micButton) {
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            if (isMicButtonActive(micButton)) {
                micButton.click();
            }
            if (isMicButtonActive(micButton)) {
                setTimeout(() => {
                    micButton.click();
                }, 800)
            }
        }

        const isMac = navigator.userAgent.includes('Mac');
        const shortcutPressed = isMac ? event.metaKey : event.ctrlKey;
        if (!shortcutPressed) return;

        const key = event.key.toLowerCase();
        handleKeyboardShortcut({ key, micButton, textArea, event });
    });
}

function handleKeyboardShortcut({ key, micButton, textArea, event }) {
    let micOn = isMicButtonActive(micButton);
    switch (key) {
        case 'm':
            event.preventDefault();
            micButton.click();
            break;
        case 'd':
            event.preventDefault();
            if (micOn) micButton.click();
            previousSpeechText = '';
            textArea.value = '';
            if (micOn) {
                setTimeout(() => {
                    micButton.click();
                }, 300)
            }
            break;
        case 'b':
            event.preventDefault();
            if (micOn) micButton.click();
            let newText = textArea.value.split(' ').slice(0, -1).join(' ');
            textArea.value = newText;
            if (micOn) {
                setTimeout(() => {
                    micButton.click();
                }, 800)
            }
            break;

        default:
            return;
    }
}

function isMicButtonActive(micButton) {
    return micButton.classList.contains('active');
}

function addChatbot() {
    if (!isChatbotActive) {
        initializeChatbot();
        isChatbotActive = true;
    }
}

function initMutationObserver() {
    const observer = new MutationObserver(
        (mutations) => {
            for (const mutation of mutations) {
                if (
                    mutation.type === 'childList' &&
                    mutation.addedNodes.length > 0 &&
                    !document.querySelector(`#${MIC_BUTTON_ID}`) &&
                    !isChatbotRunning &&
                    isChatbotActive
                ) {
                    removeChatbot();
                    initializeChatbot();
                }
            }
        });
    observer.observe(document.body, { childList: true, subtree: true });
}

function removeChatbot() {
    if (speechRecognition) {
        speechRecognition.onend = null;
        speechRecognition.abort();
    }
    const micButton = document.querySelector(`#${MIC_BUTTON_ID}`);
    if (micButton) micButton.remove();
}

window.addEventListener('resize', addChatbot);
addChatbot();
initMutationObserver();
