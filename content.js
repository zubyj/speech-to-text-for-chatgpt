// Constant identifiers and URLs for microphone button states and images.
const MIC_BUTTON_ID = 'mic-button';
const MIC_ACTIVE_CLASS = 'active';
const MIC_IMG_URL = './assets/mic.png';
const MIC_ACTIVE_IMG_URL = '/assets/mic-active.png';

// Defines a manager class for handling speech-to-text functionality.
class SpeechToTextManager {
    constructor() {
        // Initialize properties to manage state and DOM elements.
        this.previousSpeechResult = '';
        this.lastMicStopTime = 0;
        this.isMicRunning = false;
        this.previousInputs = [];
        this.inputIndex = -1;
        this.micButton = null;
        this.textArea = null;
        this.speechToTextInput = null;
        this.unsavedSpeech = '';
        this.initMutationObserver = this.initMutationObserver.bind(this);

        // Retrieve stored message history from local Chrome storage.
        chrome.storage.local.get(["messageHistory"], (result) => {
            if (result.messageHistory) {
                this.previousInputs = result.messageHistory;
            }
        });
    }

    // Sets up a mutation observer to re-add mic button if UI changes.
    initMutationObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0 && !document.querySelector(`#${MIC_BUTTON_ID}`) && !this.isMicRunning) {
                    this.initializeMic();
                }
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // Initializes the microphone button and sets up speech-to-text.
    async initializeMic() {
        this.isMicRunning = true;
        this.textArea = document.getElementById('prompt-textarea');
        if (!this.textArea) return;

        this.micButton = this.createMicButton();
        this.speechToTextInput = this.initializeSpeechToText();
        await this.loadMicButtonStyles();
        this.addMicButtonToTextArea();
        this.isMicRunning = false;
    }

    // New method to update visible text
    updateVisibleText(text) {
        if (!this.textArea) return;

        // Update the ProseMirror content
        this.textArea.innerHTML = `<p>${text}</p>`;

        // Trigger input event on the div to ensure ChatGPT registers the change
        this.textArea.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Cycles through previously entered inputs using keyboard shortcuts.
    cycleThroughPreviousInputs(event) {
        const shortcutPressed = navigator.platform.startsWith('Mac') ? event.metaKey : event.ctrlKey;
        if (shortcutPressed && event.key === "ArrowDown") {
            if (this.inputIndex < this.previousInputs.length - 1) {
                this.inputIndex++;
                this.textArea.value = this.previousInputs[this.inputIndex];
            }
        } else if (shortcutPressed && event.key === "ArrowUp") {
            if (this.inputIndex > 0) {
                this.inputIndex--;
                this.textArea.value = this.previousInputs[this.inputIndex];
            }
        }
    }

    // Creates a button element for activating the microphone.
    createMicButton() {
        const micButton = document.createElement('button');
        micButton.id = MIC_BUTTON_ID;
        const imageUrl = chrome.runtime.getURL(MIC_IMG_URL);
        micButton.style.backgroundImage = `url('${imageUrl}')`;
        micButton.onclick = (event) => this.handleMicButtonClick(event);
        return micButton;
    }

    // Starts the speech recognition service.
    startSpeechToText() {
        this.speechToTextInput.start();
    }

    // Event handler for mic button click, toggling the speech-to-text functionality.
    handleMicButtonClick(event) {
        event.preventDefault();
        if (this.micButton.classList.contains(MIC_ACTIVE_CLASS)) {
            this.stopSpeechToText();
        } else {
            this.startSpeechToText();
        }
    }

    // Initializes the speech recognition API.
    initializeSpeechToText() {
        const recognition = new webkitSpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = true;
        recognition.continuous = true;

        recognition.onstart = () => this.handleSpeechStart();
        recognition.onresult = (event) => this.handleSpeechResult(event);
        recognition.onerror = (error) => console.error('Speech recognition error:', error);
        return recognition;
    }

    // Updates UI and internal state on speech start.
    handleSpeechStart() {
        let newImageUrl = chrome.runtime.getURL(MIC_ACTIVE_IMG_URL);
        this.micButton.style.backgroundImage = `url('${newImageUrl}')`;
        this.micButton.classList.add(MIC_ACTIVE_CLASS);
    }

    // Processes and displays the speech-to-text results.
    handleSpeechResult(event) {
        if (Date.now() - this.lastMicStopTime < 300) return;

        const results = Array.from(event.results);
        let finalText = '';
        let interimText = '';

        // Process all results
        for (let i = 0; i < results.length; i++) {
            if (results[i].isFinal) {
                finalText += results[i][0].transcript + ' ';
            } else if (i === results.length - 1) {
                // Only use the last interim result
                interimText = results[i][0].transcript;
            }
        }

        // Combine final and interim text
        const displayText = (finalText + interimText).trim();
        this.updateVisibleText(displayText);
    }

    // Stops the speech recognition service.
    stopSpeechToText() {
        this.speechToTextInput.stop();
        this.lastMicStopTime = Date.now();
        this.micButton.classList.remove(MIC_ACTIVE_CLASS);
        const newImageUrl = chrome.runtime.getURL(MIC_IMG_URL);
        this.micButton.style.backgroundImage = `url('${newImageUrl}')`;
        this.textArea.focus();
    }

    // Loads and applies CSS styles from a local file.
    async loadMicButtonStyles() {
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

    // Wraps the textarea and microphone button in a div, adjusting layout.
    addMicButtonToTextArea() {
        const parentElement = this.textArea.parentElement;
        if (!parentElement) return;

        // Insert mic button as sibling of ProseMirror div
        parentElement.insertBefore(this.micButton, this.textArea);

        // Position the mic button
        parentElement.style.position = 'relative';
        this.micButton.style.position = 'absolute';
        this.micButton.style.left = '10px';
        this.micButton.style.bottom = '10px';
        this.micButton.style.zIndex = '2';

        // Add padding to the ProseMirror div
        this.textArea.style.paddingLeft = '40px';
    }

    // Attaches event listeners for keyboard shortcuts.
    attachKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => this.handleKeyboardEvent(event));
    }

    // General handler for keyboard events throughout the application.
    handleKeyboardEvent(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();

            // add the unsaved speech to storage
            if (this.unsavedSpeech) {
                this.previousInputs.unshift(this.unsavedSpeech);
                chrome.storage.local.set({ messageHistory: this.previousInputs }, function () {
                });
                this.inputIndex = -1;
                this.unsavedSpeech = '';
            }

            this.handleFormSubmit(event);
            if (this.isMicButtonActive()) {
                this.micButton.click();
            }
            if (this.isMicButtonActive()) {
                setTimeout(() => {
                    this.micButton.click();
                }, 800)
            }
        }

        if (!event.ctrlKey) return;

        const key = event.key.toLowerCase();
        this.handleKeyboardShortcut(key, event);
    }

    // Submits the form and optionally stops speech recognition.
    handleFormSubmit(e) {
        e.preventDefault();
        if (this.isMicButtonActive()) {
            this.stopSpeechToText();
        }
        if (this.textArea.value) {
            this.previousInputs.unshift(this.textArea.value);
            chrome.storage.local.set({ messageHistory: this.previousInputs }, function () {
            });
            this.inputIndex = -1;
        }
        // reset currentSpeech after textarea is cleared
    }

    // Handles specific keyboard shortcuts.
    handleKeyboardShortcut(key, event) {
        let micOn = this.isMicButtonActive();
        switch (key) {
            // Toggles the mic
            case 's':
                event.preventDefault();
                this.micButton.click();
                break;
            // Clears the text
            case 'u':
                event.preventDefault();
                if (micOn) this.micButton.click();
                this.previousSpeechResult = '';
                this.textArea.value = '';
                if (micOn) {
                    setTimeout(() => {
                        this.micButton.click();
                    }, 300)
                }
                break;
            // Deletes the word before the cursor
            // Mic is paused while deleting & readded after
            case 'w':
                event.preventDefault();
                if (micOn) this.micButton.click();
                // Updated regex to match a word at the end or the only word in the textarea
                let newText = this.textArea.value.replace(/(?:\s|^)(\S+)$/, '');
                this.textArea.value = newText;
                if (micOn) {
                    setTimeout(() => {
                        this.micButton.click();
                    }, 300);
                }
                break;
            default:
                break;
        }
    }

    // Checks if the mic button is active.
    isMicButtonActive() {
        return this.micButton && this.micButton.classList.contains(MIC_ACTIVE_CLASS);
    }

    // Initialize the microphone if it isn't already active.
    addMic() {
        if (document.getElementById(MIC_BUTTON_ID)) {
            return;
        }
        if (!this.isMicButtonActive()) {
            this.initializeMic();
        }
    }
}

// Instantiate the manager and setup event listeners.
let manager = new SpeechToTextManager();
window.addEventListener('resize', () => manager.addMic());
manager.addMic();
manager.initMutationObserver();
