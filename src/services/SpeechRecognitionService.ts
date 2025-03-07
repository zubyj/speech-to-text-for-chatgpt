import { SpeechManagerConfig, SpeechCallback } from '../types';

export class SpeechRecognitionService {
    private recognition: webkitSpeechRecognition;
    private onTextCallback: SpeechCallback;

    constructor(config: SpeechManagerConfig, callback: SpeechCallback) {
        this.recognition = new webkitSpeechRecognition();
        this.onTextCallback = callback;
        this.setupRecognition(config);
    }

    private setupRecognition(config: SpeechManagerConfig) {
        this.recognition.continuous = config.continuous;
        this.recognition.interimResults = config.interimResults;
        this.recognition.lang = config.language;

        this.recognition.onresult = (event) => {
            let transcript = '';
            for (let i = 0; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }
            this.onTextCallback(transcript);
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
