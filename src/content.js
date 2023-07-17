function startSpeechRecognition(micButton) {
    let recognition = new webkitSpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;

    let textArea = document.getElementById('prompt-textarea');
    let timeout;

    function setupRecognition(recognition) {
        recognition.onstart = function () {
            let newImageUrl = chrome.runtime.getURL("/src/assets/mic-active.png");
            micButton.style.backgroundImage = `url('${newImageUrl}')`;
            micButton.classList.add('active');
        }

        recognition.onspeechstart = function () {
            clearTimeout(timeout); // Cancel the timer if the user starts speaking again
        }

        recognition.onspeechend = function () {
            // Start a 5-second timer when the user stops speaking
            timeout = setTimeout(() => {
                recognition.abort(); // Stop recognition when the timer completes
                micButton.classList.remove('active');
                let newImageUrl = chrome.runtime.getURL("./src/assets/mic.png");
                micButton.style.backgroundImage = `url('${newImageUrl}')`;
                textArea.focus();
            }, 3000); // 3000ms = 3s

            // Create a new SpeechRecognition instance and start it
            let newRecognition = new webkitSpeechRecognition();
            newRecognition.lang = 'en-US';
            newRecognition.interimResults = true;
            setupRecognition(newRecognition);
            newRecognition.start();
        }

        recognition.onresult = function (event) {
            let transcript = event.results[0][0].transcript;
            textArea.value = transcript;
        }
    }

    setupRecognition(recognition);
    recognition.start();

    // Stop the recognition when the mic button is clicked while active
    micButton.onclick = () => {
        if (micButton.classList.contains('active')) {
            recognition.abort();
            clearTimeout(timeout);  // Clear the timeout
            micButton.classList.remove('active');  // Remove 'active' class
            let newImageUrl = chrome.runtime.getURL("./src/assets/mic.png");
            micButton.style.backgroundImage = `url('${newImageUrl}')`;
        } else {
            startSpeechRecognition(micButton);
        }
    };
}



// Creates and returns a mic button
function createMicButton() {
    let micButton = document.createElement('button');
    micButton.id = 'mic-button';
    let imageUrl = chrome.runtime.getURL("./src/assets/mic.png");
    micButton.style.backgroundImage = `url('${imageUrl}')`;
    micButton.onclick = () => startSpeechRecognition(micButton);
    return micButton;
}

chrome.runtime.onMessage.addListener((request) => {
    if (request.message === 'TabUpdated') {
        setTimeout(() => {
            if (document.getElementById('mic-button')) {
                return;
            }
            fetch(chrome.runtime.getURL('./src/assets/styles.css'))
                .then(response => response.text())
                .then(data => {
                    let style = document.createElement('style');
                    style.innerHTML = data;
                    document.head.appendChild(style);
                });
            const micButton = createMicButton();
            let textArea = document.getElementById('prompt-textarea');

            // Turn off speech recognition on enter (but not shift + enter)
            textArea.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    micButton.style.display = 'inline-block'; // Show the mic button
                }
            });

            // Get the submit button
            const chat = document.querySelector('textarea[tabindex="0"]');
            const submitButton = chat.parentNode.querySelector('button:nth-child(2)');
            // Turn off speech recognition when submit button is clicked
            submitButton.addEventListener('click', () => {
                micButton.style.display = 'inline-block'; // Show the mic button
            });

            // Move the mic button and text area to a wrapper div
            let parentElement = textArea.parentElement;
            let wrapperDiv = document.createElement('div');
            wrapperDiv.classList.add('wrapper-div');
            parentElement.removeChild(textArea);
            wrapperDiv.appendChild(micButton);
            wrapperDiv.appendChild(textArea);
            parentElement.appendChild(wrapperDiv);
            textArea.focus();
        }, 500);
    }
});
