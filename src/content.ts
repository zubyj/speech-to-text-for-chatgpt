class SpeechToTextManager {
    private readonly MAX_RETRIES = 5;
    private readonly INITIAL_RETRY_DELAY = 500;
    private readonly MIC_BUTTON_ID = 'speech-to-text-button';
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
    private lastKnownPosition: number = 0;

    private updateText(finalText: string, interimText: string): void {
        if (!this.elements.textArea || !this.elements.interimDisplay) return;

        let paragraphElement = this.elements.textArea.querySelector('p');
        if (!paragraphElement) {
            paragraphElement = document.createElement('p');
            this.elements.textArea.appendChild(paragraphElement);
        }

        if (finalText) {
            const selection = window.getSelection();
            const range = selection?.getRangeAt(0);
            const currentText = paragraphElement.textContent || '';
            const currentLength = currentText.length;

            // Determine if we have an active user-placed cursor
            const hasValidSelection = selection &&
                range &&
                paragraphElement.contains(range.commonAncestorContainer) &&
                range.startOffset !== 1;

            // Get insertion position
            let insertPosition;
            if (hasValidSelection) {
                insertPosition = range.startOffset;
                this.lastKnownPosition = insertPosition;
            } else {
                insertPosition = this.lastKnownPosition || currentLength;
            }

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
                selection?.removeAllRanges();
                selection?.addRange(newRange);
            } catch (error) {
                // Silently handle cursor position errors
            }

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

    private async startListening(): Promise<void> {
        if (!this.speechService) return;

        try {
            this.state.isListening = true;
            await this.speechService.start();
            this.elements.micButton?.classList.add('active');
        } catch (error) {
            this.state.isListening = false;
            this.elements.micButton?.classList.remove('active');
            // Show error toast or notification
        }
    }

    private stopListening = (): void => {
        if (!this.speechService) return;

        this.state.isListening = false;
        this.state.lastStopTime = Date.now();
        this.elements.micButton?.classList.remove('active');
        this.elements.micButton?.classList.remove('speaking');
        this.speechService.stop();

        if (this.elements.interimDisplay) {
            this.elements.interimDisplay.style.display = 'none';
        }
        this.lastKnownPosition = 0;
    }

    private handleError = (message: string): void => {
        // Remove active state and stop listening
        this.stopListening();

        // Show error message to user
        const toast = new Toast();
        toast.show(message, 'error');
    }

    private handleMicActivity = (isActive: boolean): void => {
        if (!this.elements.micButton) return;

        if (isActive) {
            this.elements.micButton.classList.add('speaking');
        } else {
            this.elements.micButton.classList.remove('speaking');
        }
    }

    constructor() {
        const config: SpeechManagerConfig = {
            language: 'en-US',
            continuous: true,
            interimResults: true,
            onMicActivity: this.handleMicActivity,
            onEnd: () => this.stopListening() // Add onEnd handler
        };

        this.speechService = new SpeechRecognitionService(
            config,
            this.updateText.bind(this),
            this.handleError // Add error handler
        );
        this.initialize();
    }

    private createInterimDisplay(): HTMLDivElement {
        const interim = document.createElement('div');
        interim.id = 'interim-display';
        interim.className = 'interim-results';
        return interim;
    }

    private async initialize(): Promise<void> {
        try {
            await this.waitForTextArea();
            this.elements.micButton = this.createMicButton();
            this.elements.interimDisplay = this.createInterimDisplay();

            const textAreaContainer = this.elements.textArea?.parentElement;
            if (textAreaContainer) {
                textAreaContainer.style.position = 'relative';
                textAreaContainer.appendChild(this.elements.interimDisplay);
            }

            this.setupEventListeners();
            this.injectStyles();
        } catch (error) {
            // Handle initialization error silently
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

        // Exponential backoff &&
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
                document.getElementById('prompt-textarea')
            );

            if (shouldAddMic) {
                this.addMicButtonToTextArea();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    private createMicButton(): HTMLButtonElement {
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
        micIcon.style.filter = this.isLightMode() ? 'brightness(0.4)' : 'none'; // Make icon darker in light mode
        button.appendChild(micIcon);

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

    private isLightMode(): boolean {
        // Check if html element has dark class
        return !document.documentElement.classList.contains('dark');
    }

    private injectStyles(): void {
        // Load the CSS file from the extension
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = chrome.runtime.getURL('assets/styles.css');
        document.head.appendChild(link);

        // Only inject theme-dependent styles
        const style = document.createElement('style');
        const buttonId = this.MIC_BUTTON_ID;

        style.textContent = `
            #${buttonId} {
                filter: ${this.isLightMode() ? 'brightness(0.98)' : 'none'};
            }

            #${buttonId}:hover {
                background-color: ${this.isLightMode()
                ? 'rgba(0, 0, 0, 0.07)'
                : 'rgb(64, 65, 79)'};
            }
        `;
        document.head.appendChild(style);
    }

    private addMicButtonToTextArea(): void {
        if (!this.elements.textArea || !this.elements.micButton) return;

        // Find the flex container
        const flexContainer = document.querySelector('.flex.gap-x-1\\.5');
        if (!flexContainer) return;

        // Insert after the first child
        const firstChild = flexContainer.firstChild;
        if (firstChild) {
            flexContainer.insertBefore(this.elements.micButton, firstChild.nextSibling);
        }
    }

}

(() => {
    const manager = new SpeechToTextManager();
    manager.initMutationObserver();
})();