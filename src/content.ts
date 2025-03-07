import { SpeechRecognitionService } from './services/SpeechRecognitionService';
import { UIElements, SpeechState, SpeechManagerConfig } from './types';

class SpeechToTextManager {
    private readonly MAX_RETRIES = 5;
    private readonly INITIAL_RETRY_DELAY = 500;
    private retryCount = 0;
    private speechService: SpeechRecognitionService;
    private elements: UIElements = {
        textArea: null,
        displayElement: null,
        micButton: null
    };
    private state: SpeechState = {
        isListening: false,
        previousText: '',
        lastStopTime: 0
    };

    constructor() {
        const config: SpeechManagerConfig = {
            language: 'en-US',
            continuous: true,
            interimResults: true
        };

        this.speechService = new SpeechRecognitionService(config, this.updateText.bind(this));
        this.initialize();
    }

    private async initialize(): Promise<void> {
        try {
            await this.waitForTextArea();
            this.elements.micButton = this.createMicButton();
            this.setupEventListeners();
            this.injectStyles();
        } catch (error) {
            console.error('Failed to initialize speech-to-text:', error);
        }
    }

    private async waitForTextArea(retryCount = 0): Promise<void> {
        const textarea = document.getElementById('prompt-textarea');

        if (textarea) {
            this.elements.textArea = textarea as HTMLTextAreaElement;
            return;
        }

        if (retryCount >= this.MAX_RETRIES) {
            throw new Error('Failed to find textarea after maximum retries');
        }

        // Exponential backoff
        const delay = this.INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.waitForTextArea(retryCount + 1);
    }

    private initMutationObserver(): void {
        const observer = new MutationObserver((mutations) => {
            const shouldAddMic = mutations.some(mutation =>
                mutation.type === 'childList' &&
                mutation.addedNodes.length > 0 &&
                !document.querySelector(`#${MIC_BUTTON_ID}`) &&
                !this.isMicRunning &&
                document.getElementById('prompt-textarea')
            );

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

    async initializeMic(): Promise<void> {
        try {
            this.isMicRunning = true;
            await this.waitForTextArea();

            if (!this.elements.textArea) {
                throw new Error('TextArea not found');
            }

            this.elements.micButton = this.createMicButton();
            this.speechToTextInput = this.initializeSpeechToText();
            await this.loadMicButtonStyles();
            this.addMicButtonToTextArea();

        } catch (error) {
            console.error('Failed to initialize mic:', error);

            if (this.retryCount < this.MAX_RETRIES) {
                this.retryCount++;
                const delay = this.INITIAL_RETRY_DELAY * Math.pow(2, this.retryCount);
                setTimeout(() => this.initializeMic(), delay);
            }
        } finally {
            this.isMicRunning = false;
        }
    }

    private updateText(text: string): void {
        if (!this.elements.displayElement || !this.elements.textArea) return;

        const newText = this.state.previousText + text;
        this.elements.textArea.value = newText;
        this.elements.displayElement.textContent = newText;

        // Trigger ChatGPT's internal events
        this.elements.textArea.dispatchEvent(new Event('input', { bubbles: true }));
    }

    private toggleSpeech(event: Event): void {
        event.preventDefault();

        if (this.state.isListening) {
            this.stopListening();
        } else {
            this.startListening();
        }
    }

    private startListening(): void {
        this.state.isListening = true;
        this.state.previousText = this.elements.textArea?.value || '';
        this.elements.micButton?.classList.add('active');
        this.speechService.start();
    }

    private stopListening(): void {
        this.state.isListening = false;
        this.state.lastStopTime = Date.now();
        this.elements.micButton?.classList.remove('active');
        this.speechService.stop();
    }

    // ... rest of the implementation
}

// Initialize immediately and add event listeners
const initializeManager = async () => {
    const manager = new SpeechToTextManager();
    await manager.initialize();
    window.addEventListener('resize', () => manager.addMic());
    manager.initMutationObserver();
};

initializeManager();
