class SpeechToTextManager {
    private readonly MAX_RETRIES = 5;
    private readonly INITIAL_RETRY_DELAY = 500;
    private readonly MIC_BUTTON_ID = 'speech-to-text-button';
    private retryCount = 0;
    private speechService: SpeechRecognitionService;
    private elements: UIElements = {
        textArea: null,
        displayElement: null,
        micButton: null,
        interimDisplay: null
    };
    private state: SpeechState = {
        isListening: false,
        previousText: '',
        lastStopTime: 0
    };
    private isMicRunning = false;

    private updateText(finalText: string, interimText: string): void {
        if (!this.elements.textArea || !this.elements.interimDisplay) return;

        // Get the paragraph element or create one if it doesn't exist
        let paragraphElement = this.elements.textArea.querySelector('p');
        if (!paragraphElement) {
            paragraphElement = document.createElement('p');
            this.elements.textArea.appendChild(paragraphElement);
        }

        // Update the text content
        if (finalText) {
            const currentText = paragraphElement.textContent || '';
            const cursorPosition = this.getCaretPosition(paragraphElement);
            const newText = this.insertTextAtPosition(currentText, finalText, cursorPosition);
            paragraphElement.textContent = newText;

            // Trigger input event for ChatGPT to recognize the change
            const inputEvent = new InputEvent('input', {
                bubbles: true,
                cancelable: true,
                inputType: 'insertText',
                data: finalText
            });
            this.elements.textArea.dispatchEvent(inputEvent);
        }

        // Show/hide and update interim display
        if (interimText) {
            this.elements.interimDisplay.textContent = interimText;
            this.elements.interimDisplay.style.display = 'block';
        } else {
            this.elements.interimDisplay.style.display = 'none';
        }
    }

    private toggleSpeech = (event: Event): void => {
        event.preventDefault();
        if (this.state.isListening) {
            this.stopListening();
        } else {
            this.startListening();
        }
    }

    private startListening = (): void => {
        if (!this.speechService) return;
        this.state.isListening = true;
        // Get the current text content from the contenteditable div
        const paragraphElement = this.elements.textArea?.querySelector('p');
        this.state.previousText = paragraphElement?.textContent || '';
        this.elements.micButton?.classList.add('active');
        this.speechService.start();
    }

    private stopListening = (): void => {
        if (!this.speechService) return;
        this.state.isListening = false;
        this.state.lastStopTime = Date.now();
        this.elements.micButton?.classList.remove('active');
        this.speechService.stop();
        if (this.elements.interimDisplay) {
            this.elements.interimDisplay.style.display = 'none';
        }
    }

    constructor() {
        const config: SpeechManagerConfig = {
            language: 'en-US',
            continuous: true,
            interimResults: true
        };

        this.speechService = new SpeechRecognitionService(config, this.updateText.bind(this));
        this.initialize();
    }

    private createInterimDisplay(): HTMLDivElement {
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

    private async initialize(): Promise<void> {
        try {
            console.log('Initializing speech-to-text...');
            await this.waitForTextArea();
            console.log('Found textarea:', this.elements.textArea);

            this.elements.micButton = this.createMicButton();
            this.elements.interimDisplay = this.createInterimDisplay();

            const textAreaContainer = this.elements.textArea?.parentElement;
            if (textAreaContainer) {
                console.log('Adding elements to container');
                textAreaContainer.style.position = 'relative';
                textAreaContainer.appendChild(this.elements.micButton);
                textAreaContainer.appendChild(this.elements.interimDisplay);
            } else {
                console.error('No textarea container found');
            }

            this.setupEventListeners();
            this.injectStyles();
        } catch (error) {
            console.error('Failed to initialize speech-to-text:', error);
        }
    }

    private async waitForTextArea(retryCount = 0): Promise<void> {
        const textarea = document.querySelector('#prompt-textarea.ProseMirror');

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
                !document.querySelector(`#${this.MIC_BUTTON_ID}`) &&
                !this.isMicRunning &&
                document.getElementById('prompt-textarea')
            );

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

    private createMicButton(): HTMLButtonElement {
        const button = document.createElement('button');
        button.id = this.MIC_BUTTON_ID;
        button.className = 'speech-to-text-button';
        button.type = 'button';
        button.setAttribute('aria-label', 'Toggle speech to text');

        // Create the mic icon
        const micIcon = document.createElement('img');
        micIcon.src = chrome.runtime.getURL('assets/mic.png');
        micIcon.alt = 'Microphone';
        button.appendChild(micIcon);

        // Add click listener
        button.addEventListener('click', this.toggleSpeech);

        return button;
    }

    private setupEventListeners(): void {
        // Add keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'm') {
                e.preventDefault();
                this.toggleSpeech(e);
            }
        });
    }

    private injectStyles(): void {
        const style = document.createElement('style');
        style.textContent = `
            #${this.MIC_BUTTON_ID} {
                background-repeat: no-repeat;
                background-size: 20px;
                justify-content: center;
                width: 32px;
                height: 32px;
                position: absolute;
                left: 10px;
                top: 50%;
                transform: translateY(-50%);
                overflow: visible;
                z-index: 2;
                border: .5px solid grey;
                border-radius: 50%;
                background-color: transparent;
                background-position: center;
                cursor: pointer;
            }

            #${this.MIC_BUTTON_ID}:hover {
                filter: brightness(1.2);
                background-color: #424242;
            }

            #${this.MIC_BUTTON_ID}.active {
                animation: breathing 2s infinite;
            }

            #${this.MIC_BUTTON_ID}.active::before,
            #${this.MIC_BUTTON_ID}.active::after {
                content: "";
                position: absolute;
                top: -5px;
                left: -5px;
                width: calc(100% + 10px);
                height: calc(100% + 10px);
                border-radius: 50%;
                border: 2px solid green;
                animation: ring 1s infinite;
            }

            #${this.MIC_BUTTON_ID}.active::after {
                animation-delay: 0.5s;
            }

            @keyframes ring {
                0% { transform: scale(0.5); opacity: 0.5; }
                100% { transform: scale(1.5); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    private addMicButtonToTextArea(): void {
        if (!this.elements.textArea || !this.elements.micButton) return;

        const textAreaContainer = this.elements.textArea.parentElement;
        if (!textAreaContainer) return;

        // Remove existing button if present
        const existingButton = document.querySelector(`#${this.MIC_BUTTON_ID}`);
        if (existingButton) {
            existingButton.remove();
        }

        textAreaContainer.style.position = 'relative';
        textAreaContainer.appendChild(this.elements.micButton);
    }

    private initializeSpeechToText(): void {
        // Already initialized in constructor
        return;
    }

    private loadMicButtonStyles(): Promise<void> {
        return Promise.resolve();
    }

    private getCaretPosition(element: Node): number {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return 0;

        const range = selection.getRangeAt(0);
        if (!element.contains(range.commonAncestorContainer)) return 0;

        return range.endOffset;
    }

    private insertTextAtPosition(currentText: string, newText: string, position: number): string {
        return currentText.slice(0, position) + newText + currentText.slice(position);
    }
}

// Initialize immediately and setup observer
(() => {
    console.log('Starting speech-to-text initialization...');
    const manager = new SpeechToTextManager();
    manager.initMutationObserver();
})();