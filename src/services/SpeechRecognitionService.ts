import { SpeechManagerConfig, SpeechCallback } from '../types';

export class SpeechRecognitionService {
    private recognition: webkitSpeechRecognition;
    private onTextCallback: SpeechCallback;
    private finalText: string = '';

    constructor(config: SpeechManagerConfig, callback: SpeechCallback) {
        this.recognition = new webkitSpeechRecognition();
        this.onTextCallback = callback;
        this.setupRecognition(config);
    }

    private setupRecognition(config: SpeechManagerConfig) {
        this.recognition.continuous = config.continuous;
        this.recognition.interimResults = true; // Always enable interim results
        this.recognition.lang = config.language;

        let finalTranscript = '';

        this.recognition.onresult = (event) => {
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }

            this.onTextCallback(finalTranscript + interimTranscript);
        };

        this.recognition.onend = () => {
            finalTranscript = '';
        };

        this.recognition.onerror = this.handleError;
    }

    private handleError(error: SpeechRecognitionError) {
        console.error('Speech recognition error:', error);
        // Implement error handling UI feedback
    }

    public start(): void {
        this.recognition.start();
    }

    public stop(): void {
        this.recognition.stop();
    }

    public setLanguage(language: string): void {
        this.recognition.lang = language;
    }
}
