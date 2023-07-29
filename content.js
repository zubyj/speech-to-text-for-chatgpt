let recognition;
let prevText = '';
let lastStopTime = 0;
let isMainActive = false;
let isMainRunning = false;

/**
 * Initialize the mic button for the chatbot
 */
async function main() {
    isMainRunning = true;

    const textArea = document.getElementById('prompt-textarea');
    if (!textArea) return;

    let micButton = document.getElementById('mic-button');
    if (micButton) return;

    micButton = createMicButton(textArea);

    recognition = initSpeechRecognition(micButton, textArea);
    await loadCSSStyles();

    wrapTextAreaWithMicButton(textArea, micButton);
    attachKeyboardShortcuts(textArea, micButton);

    isMainRunning = false;
}

/**
 * Creates a new mic button and attach its click handler
 * @param {HTMLTextAreaElement} textArea - The textArea element
 * @returns {HTMLButtonElement} - The newly created mic button
 */
function createMicButton(textArea) {
    const micButton = document.createElement('button');
    micButton.id = 'mic-button';
    const imageUrl = chrome.runtime.getURL("./assets/mic.png");
    micButton.style.backgroundImage = `url('${imageUrl}')`;
    micButton.onclick = (e) => handleClick(e, micButton, textArea);
    return micButton;
}

/**
 * Starts the speech recognition
 * @param {SpeechRecognition} recognition - The speech recognition object
 */
function startSpeechRecognition(recognition) {
    recognition.start();
}

/**
 * Handles the click event of the mic button
 * @param {Event} e - The click event
 * @param {HTMLButtonElement} micButton - The mic button element
 * @param {HTMLTextAreaElement} textArea - The textArea element
 */
function handleClick(e, micButton, textArea) {
    e.preventDefault();
    if (micButton.classList.contains('active')) {
        stopSpeechRecognition(micButton, textArea);
    } else {
        startSpeechRecognition(recognition);
    }
}

/**
 * Initializes the Speech Recognition object
 * @param {HTMLButtonElement} micButton - The mic button element
 * @param {HTMLTextAreaElement} textArea - The textArea element
 * @returns {SpeechRecognition} - The speech recognition object
 */
function initSpeechRecognition(micButton, textArea) {
    recognition = new webkitSpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onstart = () => handleRecognitionStart(micButton, textArea);
    recognition.onresult = (event) => handleRecognitionResult(event, micButton, textArea);
    recognition.onerror = (error) => console.error('Speech recognition error:', error);
    return recognition;
}

/**
 * Handles the start event of the speech recognition
 * @param {HTMLButtonElement} micButton - The mic button element
 * @param {HTMLTextAreaElement} textArea - The textArea element
 */
function handleRecognitionStart(micButton, textArea) {
    let newImageUrl = chrome.runtime.getURL("/assets/mic-active.png");
    micButton.style.backgroundImage = `url('${newImageUrl}')`;
    micButton.classList.add('active');
    prevText = textArea.value + ' ';
}

/**
 * Handles the result event of the speech recognition
 * @param {Event} event - The recognition result event
 * @param {HTMLButtonElement} micButton - The mic button element
 * @param {HTMLTextAreaElement} textArea - The textArea element
 */
function handleRecognitionResult(event, micButton, textArea) {
    if (Date.now() - lastStopTime < 300) return; // Add this line

    let currSpeech = '';
    for (let i = 0; i < event.results.length; i++) {
        for (let j = 0; j < event.results[i].length; j++) {
            currSpeech += event.results[i][j].transcript;
        }
    }
    textArea.value = prevText + currSpeech;
    textArea.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * Stops the speech recognition
 * @param {HTMLButtonElement} micButton - The mic button element
 * @param {HTMLTextAreaElement} textArea - The textArea element
 */
function stopSpeechRecognition(micButton, textArea) {
    recognition.stop();
    lastStopTime = Date.now(); // Add this line
    micButton.classList.remove('active');
    const newImageUrl = chrome.runtime.getURL("./assets/mic.png");
    micButton.style.backgroundImage = `url('${newImageUrl}')`;
    textArea.focus();
}

/**
 * Loads the CSS styles for the mic button
 */
async function loadCSSStyles() {
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

/**
 * Wraps the textArea with the mic button
 * @param {HTMLTextAreaElement} textArea - The textArea element
 * @param {HTMLButtonElement} micButton - The mic button element
 */
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

/**
 * Attaches keyboard shortcuts for the chatbot
 * @param {HTMLTextAreaElement} textArea - The textArea element
 * @param {HTMLButtonElement} micButton - The mic button element
 */
function attachKeyboardShortcuts(textArea, micButton) {
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            let micOn = micButton.classList.contains('active');
            event.preventDefault();
            if (micOn) micButton.click();
            if (micOn) {
                setTimeout(() => {
                    micButton.click();
                }, 800)
            }
        }

        const isMac = navigator.userAgent.includes('Mac');
        const shortcutPressed = isMac ? event.metaKey : event.ctrlKey;
        if (!shortcutPressed) return;

        const key = event.key.toLowerCase();
        handleKeyboardShortcut(key, micButton, textArea, event);
    });
}

/**
 * Handles the keyboard shortcuts for the chatbot
 * @param {string} key - The key pressed
 * @param {HTMLButtonElement} micButton - The mic button element
 * @param {HTMLTextAreaElement} textArea - The textArea element
 * @param {Event} event - The keyboard event
 */
function handleKeyboardShortcut(key, micButton, textArea, event) {
    let micOn = micButton.classList.contains('active');
    switch (key) {
        case 'm':
            event.preventDefault();
            micButton.click();
            break;
        case 'd':
            event.preventDefault();
            if (micOn) micButton.click();
            prevText = '';
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

// Run main function if page is dynamically updated
function addMicrophone() {
    if (!isMainActive) {
        main();
        isMainActive = true;
    }
}

// Initialize observer to reload button if it is removed
function initObserver() {
    const observer = new MutationObserver(
        (mutations) => {
            for (const mutation of mutations) {
                if (
                    mutation.type === 'childList' &&
                    mutation.addedNodes.length > 0 &&
                    !document.querySelector('#mic-button') &&
                    !isMainRunning &&
                    isMainActive
                ) {
                    removeMain();
                    main();
                }
            }
        });
    observer.observe(document.body, { childList: true, subtree: true });
}

// Remove main function
function removeMain() {
    if (recognition) {
        recognition.onend = null;
        recognition.abort();
    }
    const micButton = document.querySelector('#mic-button');
    if (micButton) micButton.remove();
}

window.addEventListener('resize', addMicrophone);
addMicrophone();
initObserver();
