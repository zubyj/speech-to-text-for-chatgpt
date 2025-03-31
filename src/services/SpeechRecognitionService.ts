// Add type definitions for Web Speech API
interface SpeechRecognitionErrorEvent {
    error: string;
    message?: string;
}

interface SpeechRecognitionEvent {
    resultIndex: number;
    results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
    length: number;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
    isFinal: boolean;
    length: number;
    [index: number]: {
        transcript: string;
    };
}

// Define webkitSpeechRecognition interface
interface webkitSpeechRecognition {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    onstart: () => void;
    onend: () => void;
    onresult: (event: SpeechRecognitionEvent) => void;
    onerror: (event: SpeechRecognitionErrorEvent) => void;
}

// Import the speech manager config
import { SpeechManagerConfig, SpeechCallback } from '../types';

class SpeechRecognitionService {
    private readonly NO_SPEECH_TIMEOUT = 10000; // 10 seconds
    private noSpeechTimer: number | null = null;
    private isPermissionGranted = false;
    private recognition: webkitSpeechRecognition;
    private onTextCallback: (finalText: string, interimText: string) => void;
    private onErrorCallback?: (message: string) => void;
    private onMicActivityChange?: (isActive: boolean) => void;
    private finalText: string = '';
    private mediaStream: MediaStream | null = null;
    private audioContext: AudioContext | null = null;
    private microphoneActive = false;
    private volumeCheckInterval: number | null = null;

    constructor(
        config: SpeechManagerConfig, 
        callback: (finalText: string, interimText: string) => void,
        errorCallback?: (message: string) => void
    ) {
        this.recognition = new (window as any).webkitSpeechRecognition();
        this.onTextCallback = callback;
        this.onErrorCallback = errorCallback;
        this.onMicActivityChange = config.onMicActivity;
        this.setupRecognition(config);
    }

    private setupRecognition(config: SpeechManagerConfig) {
        this.recognition.continuous = config.continuous;
        this.recognition.interimResults = true; // Always enable interim results
        this.recognition.lang = config.language;

        this.recognition.onstart = () => {
            this.startNoSpeechTimer();
        };

        this.recognition.onresult = (event: SpeechRecognitionEvent) => {
            this.resetNoSpeechTimer();
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }

            // Call callback with both transcripts separately
            this.onTextCallback(finalTranscript, interimTranscript);
        };

        this.recognition.onend = () => {
            if (this.noSpeechTimer) {
                clearTimeout(this.noSpeechTimer);
                this.noSpeechTimer = null;
            }
            this.stop(); // Call stop to clean up resources
            if (config.onEnd) {
                config.onEnd();
            }
        };

        this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            switch (event.error) {
                case 'not-allowed':
                case 'permission-denied':
                    this.isPermissionGranted = false;
                    this.onError('Please enable microphone access in your browser settings.');
                    break;
                case 'no-speech':
                    this.onError('No speech detected. Please try again.');
                    break;
                case 'audio-capture':
                    this.onError('No microphone found. Please check your hardware.');
                    break;
                default:
                    this.onError('An error occurred with the microphone.');
            }
            this.stop();
        };
    }

    private handleError(error: Error): void {
        // Implement error handling UI feedback
        this.onError(error.message);
    }

    private startNoSpeechTimer() {
        this.noSpeechTimer = window.setTimeout(() => {
            this.onError('No speech detected for a while. Stopping recording.');
            this.stop();
        }, this.NO_SPEECH_TIMEOUT);
    }

    private resetNoSpeechTimer() {
        if (this.noSpeechTimer) {
            clearTimeout(this.noSpeechTimer);
            this.startNoSpeechTimer();
        }
    }

    private async checkMicrophoneActivity() {
        if (!this.mediaStream) return;

        this.audioContext = new AudioContext();
        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        const analyser = this.audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        this.volumeCheckInterval = window.setInterval(() => {
            analyser.getByteFrequencyData(dataArray);
            const volume = dataArray.reduce((a, b) => a + b) / dataArray.length;
            const isActive = volume > 5; // Threshold for considering mic active

            if (this.microphoneActive !== isActive) {
                this.microphoneActive = isActive;
                if (this.onMicActivityChange) {
                    this.onMicActivityChange(isActive);
                }
            }
        }, 100);
    }

    public async start(): Promise<void> {
        try {
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.isPermissionGranted = true;
            await this.checkMicrophoneActivity();
            this.recognition.start();
        } catch (error) {
            this.isPermissionGranted = false;
            this.onError('Please enable microphone access in your browser settings.');
            throw error;
        }
    }

    public stop(): void {
        // Clear all timers and states
        if (this.noSpeechTimer) {
            clearTimeout(this.noSpeechTimer);
            this.noSpeechTimer = null;
        }
        if (this.volumeCheckInterval) {
            clearInterval(this.volumeCheckInterval);
            this.volumeCheckInterval = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }

        // Stop recognition last
        try {
            this.recognition.stop();
        } catch (e) {
            // Ignore errors if recognition was already stopped
        }
    }

    public setLanguage(language: string): void {
        this.recognition.lang = language;
    }

    private onError(message: string) {
        // Use error callback if provided
        if (this.onErrorCallback) {
            this.onErrorCallback(message);
        }
    }
}

export default SpeechRecognitionService;
