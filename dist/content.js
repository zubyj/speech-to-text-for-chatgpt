var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { SpeechRecognitionService } from './services/SpeechRecognitionService';
class SpeechToTextManager {
    constructor() {
        this.MAX_RETRIES = 5;
        this.INITIAL_RETRY_DELAY = 500;
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
                yield this.waitForTextArea();
                this.elements.micButton = this.createMicButton();
                this.elements.interimDisplay = this.createInterimDisplay();
                const textAreaContainer = (_a = this.elements.textArea) === null || _a === void 0 ? void 0 : _a.parentElement;
                if (textAreaContainer) {
                    textAreaContainer.style.position = 'relative';
                    textAreaContainer.appendChild(this.elements.interimDisplay);
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
            const textarea = document.getElementById('prompt-textarea');
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
                !document.querySelector(`#${MIC_BUTTON_ID}`) &&
                !this.isMicRunning &&
                document.getElementById('prompt-textarea'));
            if (shouldAddMic) {
                this.retryCount = 0; // Reset retry count
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
    updateText(finalText, interimText) {
        if (!this.elements.textArea || !this.elements.interimDisplay)
            return;
        // Update the main textarea with final text
        if (finalText) {
            const newText = this.state.previousText + finalText;
            this.elements.textArea.value = newText;
            this.state.previousText = newText;
            this.elements.textArea.dispatchEvent(new Event('input', { bubbles: true }));
        }
        // Show/hide and update interim display
        if (interimText) {
            this.elements.interimDisplay.textContent = interimText;
            this.elements.interimDisplay.style.display = 'block';
        }
        else {
            this.elements.interimDisplay.style.display = 'none';
        }
    }
    toggleSpeech(event) {
        event.preventDefault();
        if (this.state.isListening) {
            this.stopListening();
        }
        else {
            this.startListening();
        }
    }
    startListening() {
        var _a, _b;
        this.state.isListening = true;
        this.state.previousText = ((_a = this.elements.textArea) === null || _a === void 0 ? void 0 : _a.value) || '';
        (_b = this.elements.micButton) === null || _b === void 0 ? void 0 : _b.classList.add('active');
        this.speechService.start();
    }
    stopListening() {
        var _a;
        this.state.isListening = false;
        this.state.lastStopTime = Date.now();
        (_a = this.elements.micButton) === null || _a === void 0 ? void 0 : _a.classList.remove('active');
        this.speechService.stop();
        if (this.elements.interimDisplay) {
            this.elements.interimDisplay.style.display = 'none';
        }
    }
}
// Initialize immediately and add event listeners
const initializeManager = () => __awaiter(void 0, void 0, void 0, function* () {
    const manager = new SpeechToTextManager();
    yield manager.initialize();
    window.addEventListener('resize', () => manager.addMic());
    manager.initMutationObserver();
});
initializeManager();
