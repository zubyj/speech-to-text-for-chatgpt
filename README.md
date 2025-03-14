# Speech to Text for ChatGPT

A Chrome extension that adds speech-to-text capability to ChatGPT, allowing for hands-free interaction with the AI assistant.

![Extension Demo](assets/demo.gif)

## Features

- 🎤 Real-time speech-to-text conversion
- 💬 Interim results display while speaking
- 🌓 Light/Dark mode support
- ⌨️ Keyboard shortcut (Cmd/Ctrl + M)
- 📊 Visual microphone activity indicator
- 🔌 Automatic mic disconnection on silence

## Installation

### From Chrome Web Store

1. Visit the [Chrome Web Store](https://chrome.google.com/webstore/detail/your-extension-id)
2. Click "Add to Chrome"
3. Confirm the installation

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/yourusername/speech-to-text-for-chatgpt.git
```

2. Install dependencies:
```bash
npm install
```

3. Build the extension:
```bash
npm run build
```

4. Load the extension in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

## Usage

1. Visit [ChatGPT](https://chat.openai.com)
2. Look for the microphone icon next to the text input
3. Click the mic or press Cmd/Ctrl + M to start recording
4. Speak naturally - your words will appear in the text box
5. Click again or press Cmd/Ctrl + M to stop

## Development

```bash
# Watch for changes
npm run watch

# Build for production
npm run build

# Package for Chrome Web Store
npm run package
```

## Privacy

This extension:
- Only activates on chat.openai.com
- Only requests microphone access when activated
- Does not store or transmit any audio data
- Processes all speech recognition locally

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Acknowledgments

- Icons by [Material Design Icons](https://material.io/icons)
- Built with TypeScript and Chrome Extension APIs
