export interface SpeechManagerConfig {
    language: string;
    continuous: boolean;
    interimResults: boolean;
    onError?: (message: string) => void;
    onMicActivity?: (isActive: boolean) => void;
    onEnd?: () => void;
}

export interface UIElements {
    textArea: HTMLTextAreaElement | null;
    displayElement: HTMLParagraphElement | null;
    micButton: HTMLButtonElement | null;
    interimDisplay: HTMLDivElement | null;
}

export interface SpeechState {
    isListening: boolean;
    previousText: string;
    lastStopTime: number;
}

export type SpeechCallback = (finalText: string, interimText: string) => void;
