// Listens to the user voice input and appends result to the GPT textarea
function startSpeechRecognition(micButton) {
    let recognition = new webkitSpeechRecognition();
    recognition.lang = 'en-US';
    let textArea = document.getElementById('prompt-textarea');
    recognition.onstart = function () {
        let newImageUrl = chrome.runtime.getURL("src/assets/mic-icon-active.png");
        micButton.style.backgroundImage = `url('${newImageUrl}')`;
        textArea.value = 'Say something ...'
    }
    recognition.onresult = function (event) {
        let transcript = event.results[0][0].transcript;
        textArea.value = transcript;

        textArea.focus();

        let newImageUrl = chrome.runtime.getURL("src/assets/mic-icon.png");
        micButton.style.backgroundImage = `url('${newImageUrl}')`;
    }
    recognition.start();
}

// Creates and returns a mic button
function createMicButton() {
    let micButton = document.createElement('button');
    micButton.id = 'mic-button';
    let imageUrl = chrome.runtime.getURL("src/assets/mic-icon.png");
    micButton.style.backgroundImage = `url('${imageUrl}')`;
    micButton.style.backgroundRepeat = 'no-repeat';
    micButton.style.backgroundSize = 'contain';
    micButton.style.width = '15px';
    micButton.style.height = '15px';
    micButton.style.padding = '10px';
    micButton.style.marginRight = '15px';
    micButton.onclick = () => startSpeechRecognition(micButton);  // Pass micButton as argument
    return micButton;
}

// When the tab is finished loading, add the mic button to the page
chrome.runtime.onMessage.addListener((request) => {
    if (request.message === 'TabUpdated') {

        let textArea = document.getElementById('prompt-textarea');
        let parentElement = textArea.parentElement;

        if (document.getElementById('mic-button')) {
            return;
        }

        let wrapperDiv = document.createElement('div');
        wrapperDiv.style.display = 'flex';
        wrapperDiv.style.alignItems = 'center';

        const micButton = createMicButton();
        parentElement.removeChild(textArea);
        wrapperDiv.appendChild(micButton);
        wrapperDiv.appendChild(textArea);

        parentElement.appendChild(wrapperDiv);

        // Add input event listener to textArea
        textArea.addEventListener('input', () => {
            // If user starts typing, hide the mic button
            if (textArea.value !== '') {
                micButton.style.display = 'none';
            } else {
                // Show the mic button if textArea is empty
                micButton.style.display = 'inline-block';
            }
        });
    }
});