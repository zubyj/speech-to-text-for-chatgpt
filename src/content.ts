import { SpeechRecognitionService } from './services/SpeechRecognitionService';
import { UIElements, SpeechState, SpeechManagerConfig } from './types';

class SpeechToTextManager {
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

    private initialize(): void {
        // Initialize UI elements
        this.elements.textArea = document.getElementById('prompt-textarea') as HTMLTextAreaElement;
        if (!this.elements.textArea) return;

        this.elements.displayElement = this.elements.textArea.querySelector('p');
        this.elements.micButton = this.createMicButton();

        this.setupEventListeners();
        this.injectStyles();
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

// Initialize the manager
new SpeechToTextManager();
