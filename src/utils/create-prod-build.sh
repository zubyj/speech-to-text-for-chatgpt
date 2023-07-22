#!/bin/bash

# Create a directory called chatgpt-mic
mkdir chatgpt-mic

# Copy the manifest, content script, background script, src, and assets to chatgpt-mic
cp manifest.json chatgpt-mic/
cp background.js chatgpt-mic/
cp content.js chatgpt-mic/
cp -R src chatgpt-mic/
cp -R assets chatgpt-mic/

# Remove the screenshots directory
rm -rf src/assets/screenshots

# Zip the chatgpt-mic folder
zip -r chatgpt-mic.zip chatgpt-mic

# Remove the chatgpt-mic directory
rm -r chatgpt-mic
