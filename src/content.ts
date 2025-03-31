// Import the SpeechRecognitionService
import SpeechRecognitionService from './services/SpeechRecognitionService';
import { SpeechManagerConfig, SpeechCallback, UIElements, SpeechState } from './types';

// Add a simple Toast class
class Toast {
    private element: HTMLDivElement;
    private readonly TOAST_DURATION = 3000; // 3 seconds
    
    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'stt-toast';
        this.element.style.display = 'none';
        document.body.appendChild(this.element);
    }
    
    show(message: string, type: 'error' | 'info' = 'info'): void {
        this.element.textContent = message;
        this.element.className = `stt-toast ${type}`;
        this.element.style.display = 'block';
        
        setTimeout(() => {
            this.element.style.display = 'none';
        }, this.TOAST_DURATION);
    }
}

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

        // Get the current selection
        const selection = window.getSelection();
        const range = selection?.getRangeAt(0);

        // If we have a valid selection within the text area
        if (selection && range && this.elements.textArea.contains(range.commonAncestorContainer)) {
            // Store the current position
            this.lastKnownPosition = range.startOffset;

            // Insert text at the current selection
            range.deleteContents();
            range.insertNode(document.createTextNode(finalText));

            // Move cursor to end of inserted text
            range.setStartAfter(range.endContainer);
            range.setEndAfter(range.endContainer);
            selection.removeAllRanges();
            selection.addRange(range);
        } else {
            // If no valid selection, append to the end
            const textNode = document.createTextNode(finalText);
            this.elements.textArea.appendChild(textNode);

            // Move cursor to end of inserted text
            const newRange = document.createRange();
            newRange.setStartAfter(textNode);
            newRange.setEndAfter(textNode);
            selection?.removeAllRanges();
            selection?.addRange(newRange);
        }

        // Trigger input event
        const inputEvent = new InputEvent('input', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertText',
            data: finalText
        });
        this.elements.textArea.dispatchEvent(inputEvent);

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
            onEnd: () => this.stopListening(),
            onError: this.handleError
        };

        this.speechService = new SpeechRecognitionService(
            config,
            this.updateText.bind(this)
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
        console.log('Attempting to find textarea...');
        const textarea = document.querySelector('#prompt-textarea.ProseMirror');
        console.log('Found textarea:', textarea);

        if (textarea) {
            this.elements.textArea = textarea as HTMLTextAreaElement;
            return;
        }

        // Log all textareas on the page to see what's available
        const allTextareas = document.querySelectorAll('textarea');
        console.log('All textareas on page:', allTextareas);

        // Log the entire prompt area structure
        const promptArea = document.querySelector('.prompt-area');
        console.log('Prompt area structure:', promptArea?.innerHTML);

        if (retryCount >= this.MAX_RETRIES) {
            throw new Error('Failed to find textarea after maximum retries');
        }

        // Exponential backoff &&
        const delay = this.INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.waitForTextArea(retryCount + 1);
    }

    public initMutationObserver(): void {
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
        micIcon.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLW1pYyI+PHBhdGggZD0iTTEyIDJhMyAzIDAgMCAwLTMgM3Y3YTMgMyAwIDAgMCA2IDBWNWEzIDMgMCAwIDAtMy0zWiIvPjxwYXRoIGQ9Ik0xOSAxMHYyYTcgNyAwIDAgMS0xNCAwdi0yIi8+PHBhdGggZD0iTTEyIDE5di00Ii8+PC9zdmc+'; // Base64 encoded SVG mic icon
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
        // Create a style element directly instead of loading from chrome
        const style = document.createElement('style');
        const buttonId = this.MIC_BUTTON_ID;

        style.textContent = `
            .stt-toast {
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                padding: 12px 24px;
                background-color: #333;
                color: white;
                border-radius: 4px;
                z-index: 10000;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            }
            
            .stt-toast.error {
                background-color: #d32f2f;
            }
            
            #interim-display {
                position: absolute;
                bottom: 100%;
                left: 0;
                width: 100%;
                color: gray;
                padding: 5px;
                margin-bottom: 5px;
                font-style: italic;
            }
            
            #${buttonId} {
                filter: ${this.isLightMode() ? 'brightness(0.98)' : 'none'};
            }

            #${buttonId}:hover {
                background-color: ${this.isLightMode()
                ? 'rgba(0, 0, 0, 0.07)'
                : 'rgb(64, 65, 79)'};
            }
            
            #${buttonId}.speaking {
                background-color: #10a37f;
                border-color: #10a37f;
            }
            
            #${buttonId}.speaking img {
                filter: brightness(10);
            }
        `;
        document.head.appendChild(style);
    }

    private addMicButtonToTextArea(): void {
        if (!this.elements.textArea || !this.elements.micButton) return;

        // Look for the flex container that holds the action buttons (upload, search, etc.)
        const actionContainer = document.querySelector('.bg-primary-surface-primary .flex.items-center.gap-2');

        if (!actionContainer) {
            console.log('Could not find action container');
            return;
        }

        // Insert after first action button
        const firstAction = actionContainer.firstElementChild;
        if (firstAction) {
            actionContainer.insertBefore(this.elements.micButton, firstAction.nextSibling);
        }
    }

}

(() => {
    const manager = new SpeechToTextManager();
    manager.initMutationObserver();
})();