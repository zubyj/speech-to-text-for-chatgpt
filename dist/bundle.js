"use strict";
class SpeechRecognitionService {
    constructor(config, callback) {
        this.finalText = '';
        this.recognition = new webkitSpeechRecognition();
        this.onTextCallback = callback;
        this.setupRecognition(config);
    }
    setupRecognition(config) {
        this.recognition.continuous = config.continuous;
        this.recognition.interimResults = true; // Always enable interim results
        this.recognition.lang = config.language;
        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                }
                else {
                    interimTranscript += transcript;
                }
            }
            // Call callback with both transcripts separately
            this.onTextCallback(finalTranscript, interimTranscript);
        };
        this.recognition.onend = () => {
            this.onTextCallback('', '');
        };
        // Bind the error handler
        this.handleError = this.handleError.bind(this);
        this.recognition.onerror = this.handleError;
    }
    handleError(error) {
        console.error('Speech recognition error:', error);
        // Implement error handling UI feedback
    }
    start() {
        this.recognition.start();
    }
    stop() {
        this.recognition.stop();
    }
    setLanguage(language) {
        this.recognition.lang = language;
    }
}
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class SpeechToTextManager {
    updateText(finalText, interimText) {
        var _a, _b, _c;
        if (!this.elements.textArea || !this.elements.interimDisplay)
            return;
        let paragraphElement = this.elements.textArea.querySelector('p');
        if (!paragraphElement) {
            paragraphElement = document.createElement('p');
            this.elements.textArea.appendChild(paragraphElement);
        }
        if (finalText) {
            const selection = window.getSelection();
            const range = selection === null || selection === void 0 ? void 0 : selection.getRangeAt(0);
            const currentText = paragraphElement.textContent || '';
            const currentLength = currentText.length;
            console.group('Text Update Operation');
            // Determine if we have an active user-placed cursor
            const hasValidSelection = selection &&
                range &&
                paragraphElement.contains(range.commonAncestorContainer) &&
                range.startOffset !== 1; // Ignore ProseMirror's default offset of 1
            // Get insertion position
            let insertPosition;
            if (hasValidSelection) {
                insertPosition = range.startOffset;
                this.lastKnownPosition = insertPosition;
            }
            else {
                // Use last known position or end of text
                insertPosition = this.lastKnownPosition || currentLength;
            }
            console.log('Position Analysis:', {
                hasValidSelection,
                rangeOffset: range === null || range === void 0 ? void 0 : range.startOffset,
                lastKnownPosition: this.lastKnownPosition,
                currentLength,
                chosenPosition: insertPosition
            });
            const newText = currentText.slice(0, insertPosition) +
                finalText +
                currentText.slice(insertPosition);
            // Update content
            paragraphElement.textContent = newText;
            // Update last known position
            this.lastKnownPosition = insertPosition + finalText.length;
            // Set cursor position
            try {
                const textNode = paragraphElement.firstChild || paragraphElement;
                const newRange = document.createRange();
                newRange.setStart(textNode, this.lastKnownPosition);
                newRange.setEnd(textNode, this.lastKnownPosition);
                selection === null || selection === void 0 ? void 0 : selection.removeAllRanges();
                selection === null || selection === void 0 ? void 0 : selection.addRange(newRange);
            }
            catch (error) {
                console.error('Cursor position error:', error);
            }
            console.log('After Update:', {
                text: paragraphElement.textContent,
                cursorAt: ((_b = (_a = window.getSelection()) === null || _a === void 0 ? void 0 : _a.getRangeAt(0)) === null || _b === void 0 ? void 0 : _b.startOffset) || 'no cursor',
                textLength: ((_c = paragraphElement.textContent) === null || _c === void 0 ? void 0 : _c.length) || 0
            });
            console.groupEnd();
            // Trigger input event
            const inputEvent = new InputEvent('input', {
                bubbles: true,
                cancelable: true,
                inputType: 'insertText',
                data: finalText
            });
            this.elements.textArea.dispatchEvent(inputEvent);
        }
        // Update interim display
        if (interimText) {
            this.elements.interimDisplay.textContent = interimText;
            this.elements.interimDisplay.style.display = 'block';
        }
        else {
            this.elements.interimDisplay.style.display = 'none';
        }
    }
    constructor() {
        this.MAX_RETRIES = 5;
        this.INITIAL_RETRY_DELAY = 500;
        this.MIC_BUTTON_ID = 'speech-to-text-button';
        this.retryCount = 0;
        this.elements = {
            textArea: null,
            displayElement: null,
            micButton: null,
            interimDisplay: null
        };
        this.state = {
            isListening: false,
            previousText: '',
            lastStopTime: 0
        };
        this.isMicRunning = false;
        this.lastKnownPosition = 0;
        this.toggleSpeech = (event) => {
            event.preventDefault();
            if (this.state.isListening) {
                this.stopListening();
            }
            else {
                this.startListening();
            }
        };
        this.startListening = () => {
            var _a, _b;
            if (!this.speechService)
                return;
            this.state.isListening = true;
            // Get the current text content from the contenteditable div
            const paragraphElement = (_a = this.elements.textArea) === null || _a === void 0 ? void 0 : _a.querySelector('p');
            this.state.previousText = (paragraphElement === null || paragraphElement === void 0 ? void 0 : paragraphElement.textContent) || '';
            (_b = this.elements.micButton) === null || _b === void 0 ? void 0 : _b.classList.add('active');
            this.speechService.start();
        };
        this.stopListening = () => {
            var _a;
            if (!this.speechService)
                return;
            this.state.isListening = false;
            this.state.lastStopTime = Date.now();
            (_a = this.elements.micButton) === null || _a === void 0 ? void 0 : _a.classList.remove('active');
            this.speechService.stop();
            if (this.elements.interimDisplay) {
                this.elements.interimDisplay.style.display = 'none';
            }
            this.lastKnownPosition = 0; // Reset position when stopping
        };
        const config = {
            language: 'en-US',
            continuous: true,
            interimResults: true
        };
        this.speechService = new SpeechRecognitionService(config, this.updateText.bind(this));
        this.initialize();
    }
    createInterimDisplay() {
        const interim = document.createElement('div');
        interim.id = 'interim-display';
        interim.className = 'interim-results';
        interim.style.cssText = `
            position: absolute;
            bottom: 100%;
            left: 0;
            width: 100%;
            padding: 8px;
            background: rgba(0, 0, 0, 0.05);
            border-radius: 6px;
            margin-bottom: 4px;
            font-style: italic;
            display: none;
        `;
        return interim;
    }
    initialize() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('Initializing speech-to-text...');
                yield this.waitForTextArea();
                console.log('Found textarea:', this.elements.textArea);
                this.elements.micButton = this.createMicButton();
                this.elements.interimDisplay = this.createInterimDisplay();
                // Only append the interim display to the textarea container
                const textAreaContainer = (_a = this.elements.textArea) === null || _a === void 0 ? void 0 : _a.parentElement;
                if (textAreaContainer) {
                    console.log('Adding elements to container');
                    textAreaContainer.style.position = 'relative';
                    textAreaContainer.appendChild(this.elements.interimDisplay);
                    this.addMicButtonToTextArea(); // This will add the button to the flex container
                }
                else {
                    console.error('No textarea container found');
                }
                this.setupEventListeners();
                this.injectStyles();
            }
            catch (error) {
                console.error('Failed to initialize speech-to-text:', error);
            }
        });
    }
    waitForTextArea(retryCount = 0) {
        return __awaiter(this, void 0, void 0, function* () {
            const textarea = document.querySelector('#prompt-textarea.ProseMirror');
            if (textarea) {
                this.elements.textArea = textarea;
                return;
            }
            if (retryCount >= this.MAX_RETRIES) {
                throw new Error('Failed to find textarea after maximum retries');
            }
            // Exponential backoff
            const delay = this.INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
            yield new Promise(resolve => setTimeout(resolve, delay));
            return this.waitForTextArea(retryCount + 1);
        });
    }
    initMutationObserver() {
        const observer = new MutationObserver((mutations) => {
            const shouldAddMic = mutations.some(mutation => mutation.type === 'childList' &&
                mutation.addedNodes.length > 0 &&
                !document.querySelector(`#${this.MIC_BUTTON_ID}`) &&
                !this.isMicRunning &&
                document.getElementById('prompt-textarea'));
            if (shouldAddMic) {
                this.retryCount = 0;
                this.initializeMic();
            }
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    initializeMic() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.isMicRunning = true;
                yield this.waitForTextArea();
                if (!this.elements.textArea) {
                    throw new Error('TextArea not found');
                }
                this.elements.micButton = this.createMicButton();
                this.speechToTextInput = this.initializeSpeechToText();
                yield this.loadMicButtonStyles();
                this.addMicButtonToTextArea();
            }
            catch (error) {
                console.error('Failed to initialize mic:', error);
                if (this.retryCount < this.MAX_RETRIES) {
                    this.retryCount++;
                    const delay = this.INITIAL_RETRY_DELAY * Math.pow(2, this.retryCount);
                    setTimeout(() => this.initializeMic(), delay);
                }
            }
            finally {
                this.isMicRunning = false;
            }
        });
    }
    createMicButton() {
        const button = document.createElement('button');
        button.id = this.MIC_BUTTON_ID;
        button.className = 'flex h-9 min-w-8 items-center justify-center rounded-full border p-2 text-[13px] font-medium text-token-text-secondary border-token-border-light hover:bg-token-main-surface-secondary';
        button.type = 'button';
        button.setAttribute('aria-label', 'Toggle speech to text');
        // Create the mic icon with specific size
        const micIcon = document.createElement('img');
        micIcon.src = chrome.runtime.getURL('assets/mic.png');
        micIcon.alt = 'Microphone';
        micIcon.style.width = '18px';
        micIcon.style.height = '18px';
        button.appendChild(micIcon);
        button.addEventListener('click', this.toggleSpeech);
        return button;
    }
    setupEventListeners() {
        // Add keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'm') {
                e.preventDefault();
                this.toggleSpeech(e);
            }
        });
    }
    injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #${this.MIC_BUTTON_ID} {
                position: relative;
                overflow: visible;
            }

            #${this.MIC_BUTTON_ID}.active {
                background-color: rgba(0, 0, 0, 0.1);
            }

            #${this.MIC_BUTTON_ID}.active::before,
            #${this.MIC_BUTTON_ID}.active::after {
                content: "";
                position: absolute;
                top: 50%;
                left: 50%;
                width: calc(100% + 10px);
                height: calc(100% + 10px);
                border-radius: 50%;
                border: 2px solid green;
                animation: ring 1s infinite;
                transform: translate(-50%, -50%);
                pointer-events: none;
            }

            #${this.MIC_BUTTON_ID}.active::after {
                animation-delay: 0.5s;
            }

            @keyframes ring {
                0% { 
                    width: 100%;
                    height: 100%;
                    opacity: 0.5;
                }
                100% { 
                    width: calc(100% + 20px);
                    height: calc(100% + 20px);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    addMicButtonToTextArea() {
        if (!this.elements.textArea || !this.elements.micButton)
            return;
        // Find the flex container
        const flexContainer = document.querySelector('.flex.gap-x-1\\.5');
        if (!flexContainer)
            return;
        // Insert after the first child
        const firstChild = flexContainer.firstChild;
        if (firstChild) {
            flexContainer.insertBefore(this.elements.micButton, firstChild.nextSibling);
        }
    }
    initializeSpeechToText() {
        // Already initialized in constructor
        return;
    }
    loadMicButtonStyles() {
        return Promise.resolve();
    }
    getCaretPosition(element) {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount)
            return 0;
        const range = selection.getRangeAt(0);
        if (!element.contains(range.commonAncestorContainer))
            return 0;
        return range.endOffset;
    }
    insertTextAtPosition(currentText, newText, position) {
        return currentText.slice(0, position) + newText + currentText.slice(position);
    }
}
// Initialize immediately and setup observer
(() => {
    console.log('Starting speech-to-text initialization...');
    const manager = new SpeechToTextManager();
    manager.initMutationObserver();
})();
