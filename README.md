# Speech to Text for ChatGPT

This Chrome extension adds a speech-to-text microphone into the ChatGPT website, providing a hands-free chatting experience.

## Features
1. **Speech to text conversion**: Click the microphone button to start converting your spoken words into text input.
2. **Visual feedback**: The microphone icon changes to indicate when it's actively listening.
3. **Keyboard shortcuts**: Keyboard shortcuts are available for starting/stopping speech recognition, and clearing the input.

## Installation
1. Download or clone this repository.
2. Open the Extension Management page by navigating to chrome://extensions.
   - Alternatively, open this page by clicking on the Chrome menu, hovering over More Tools, and selecting Extensions.
3. Enable Developer Mode by clicking the toggle switch next to Developer mode.
4. Click the Load unpacked button and select the downloaded directory.

## How to use
- Click the microphone button in the input field to start converting your spoken words into text.
- The microphone button will change its image when it's actively listening.
- You can use the following keyboard shortcuts:
  - `Ctrl+M` (or `Cmd+M` on macOS) to toggle the microphone on/off.
  - `Ctrl+D` (or `Cmd+D` on macOS) to clear the current input.
  - `Ctrl+B` (or `Cmd+B` on macOS) to remove the last word from the input.


## Permissions
This extension requires the following permissions:
- Access to `https://chat.openai.com/*` for inserting the speech-to-text functionality.
- Web-accessible resources: assets (mic icons and styles) that need to be loaded into the webpage.

## Version
Current version is 0.0.3

## License
This project is licensed under the terms of the MIT license.
