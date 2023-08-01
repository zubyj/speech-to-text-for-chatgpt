const MIC_BUTTON_ID = 'mic-button';
const MIC_ACTIVE_CLASS = 'active';
const MIC_IMG_URL = './assets/mic.png';
const MIC_ACTIVE_IMG_URL = '/assets/mic-active.png';

class SpeechToTextManager {
    constructor() {
        this.previousSpeechResult = '';
        this.lastMicStopTime = 0;
        this.isMicRunning = false;
        this.previousInputs = [];
        this.inputIndex = -1;
        this.micButton = null;
        this.textArea = null;
        this.speechToTextInput = null;
        this.unsavedSpeech = '';

        chrome.storage.local.get(["formValues"], (result) => {
            if (result.formValues) {
                this.previousInputs = result.formValues;
            }
        });
    }

    // Initialize the microphone button and speech-to-text functionality.
    async initializeMic() {
        this.isMicRunning = true;

        this.textArea = document.getElementById('prompt-textarea');
        if (!this.textArea) return;

        this.micButton = this.createMicButton(this.textArea);
        this.speechToTextInput = this.initializeSpeechToText(this.micButton, this.textArea);
        await this.loadMicButtonStyles();

        this.addMicButtonToTextArea();
        this.attachKeyboardShortcuts();

        let form = document.getElementsByTagName('form')[0];
        if (form) {
            form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        this.textArea.addEventListener('keydown', (event) => this.cycleThroughPreviousInputs(event));

        this.textArea.addEventListener('input', (event) => {
            this.unsavedSpeech = this.textArea.value;
        });

        this.isMicRunning = false;


    }

    // Cycles through previous inputs in response to ArrowUp and ArrowDown key presses.
    cycleThroughPreviousInputs(event) {
        const shortcutPressed = navigator.platform.startsWith('Mac') ? event.metaKey : event.ctrlKey;
        // const shortcutPressed = event.ctrlKey
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

    createMicButton() {
        const micButton = document.createElement('button');
        micButton.id = MIC_BUTTON_ID;
        const imageUrl = chrome.runtime.getURL(MIC_IMG_URL);
        micButton.style.backgroundImage = `url('${imageUrl}')`;
        micButton.onclick = (event) => this.handleMicButtonClick(event);
        return micButton;
    }

    startSpeechToText() {
        this.speechToTextInput.start();
    }

    handleMicButtonClick(event) {
        event.preventDefault();
        if (this.micButton.classList.contains(MIC_ACTIVE_CLASS)) {
            this.stopSpeechToText();
        } else {
            this.startSpeechToText();
        }
    }

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

    handleSpeechStart() {
        let newImageUrl = chrome.runtime.getURL(MIC_ACTIVE_IMG_URL);
        this.micButton.style.backgroundImage = `url('${newImageUrl}')`;
        this.micButton.classList.add(MIC_ACTIVE_CLASS);
        this.previousSpeechResult = this.textArea.value + ' ';
    }

    handleSpeechResult(event) {
        if (Date.now() - this.lastMicStopTime < 300) return;

        let currentSpeech = '';
        for (let i = 0; i < event.results.length; i++) {
            for (let j = 0; j < event.results[i].length; j++) {
                currentSpeech += event.results[i][j].transcript;
            }
        }
        this.textArea.value = this.previousSpeechResult + currentSpeech;
        this.textArea.dispatchEvent(new Event('input', { bubbles: true }));
    }

    stopSpeechToText() {
        this.speechToTextInput.stop();
        this.lastMicStopTime = Date.now();
        this.micButton.classList.remove(MIC_ACTIVE_CLASS);
        const newImageUrl = chrome.runtime.getURL(MIC_IMG_URL);
        this.micButton.style.backgroundImage = `url('${newImageUrl}')`;
        this.textArea.focus();
    }

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

    addMicButtonToTextArea() {
        const parentElement = this.textArea.parentElement;
        const wrapperDiv = document.createElement('div');
        wrapperDiv.classList.add('wrapper-div');
        parentElement.removeChild(this.textArea);
        parentElement.appendChild(this.micButton);
        wrapperDiv.appendChild(this.micButton);
        wrapperDiv.appendChild(this.textArea);
        parentElement.appendChild(wrapperDiv);
        this.textArea.focus();
    }

    attachKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => this.handleKeyboardEvent(event));
    }

    handleKeyboardEvent(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();

            // add the unsaved speech to storage
            if (this.unsavedSpeech) {
                this.previousInputs.unshift(this.unsavedSpeech);
                chrome.storage.local.set({ formValues: this.previousInputs }, function () {
                    console.log("Form value saved to storage");
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

    handleFormSubmit(e) {
        e.preventDefault();
        if (this.isMicButtonActive()) {
            this.stopSpeechToText();
        }
        if (this.textArea.value) {
            this.previousInputs.unshift(this.textArea.value);
            chrome.storage.local.set({ formValues: this.previousInputs }, function () {
                console.log("Form value saved to storage");
            });
            this.inputIndex = -1;
        }
        // reset currentSpeech after textarea is cleared
    }

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
            case 'w':
                event.preventDefault();
                if (micOn) this.micButton.click();
                let newText = this.textArea.value.split(' ').slice(0, -1).join(' ');
                this.previousSpeechResult = newText + ' ';
                this.textArea.value = newText;
                if (micOn) {
                    setTimeout(() => {
                        this.micButton.click();
                    }, 300)
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
            console.log('Mic button already initialized.');
            return;
        }
        if (!this.isMicButtonActive()) {
            this.initializeMic();
        }
    }
}

let manager = new SpeechToTextManager();
window.addEventListener('resize', () => manager.addMic());
manager.addMic();
