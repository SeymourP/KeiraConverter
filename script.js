function showSection(section) {
    document.querySelectorAll('.input-section').forEach(el => el.style.display = 'none');
    document.getElementById(section).style.display = 'block';
}

// Main input section toggle
function showInput(type, btn) {
    const sections = ['text', 'url', 'pdf', 'typing'];
    sections.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.display = (id === type) ? 'flex' : 'none';
    });

    document.querySelectorAll('.menuBtn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    const output = document.getElementById('output');
    if (type === 'typing') {
        if (output) output.style.display = 'block';
        newTypingPrompt();
    } else {
        disableOutputTyping();
        if (output) {
            if (!output.innerText.trim()) {
                output.classList.add('placeholder');
                output.innerText = "Your text will appear here...";
            }
        }
    }
}

// Apply current settings
function updateStyles() {
    ['output', 'typingPrompt'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.fontFamily = document.getElementById('fontSelect').value;
        el.style.fontSize = document.getElementById('fontSize').value + 'px';
        el.style.lineHeight = document.getElementById('lineHeight').value;
        el.style.color = document.getElementById('textColor').value;
        el.style.backgroundColor = document.getElementById('bgColor').value;
        el.style.letterSpacing = document.getElementById('letterSpacing')?.value + 'px';
        el.style.wordSpacing = document.getElementById('wordSpacing')?.value + 'px';
    });
}

// Save preferences
function savePreferences() {
    const prefs = {
        fontSelect: document.getElementById('fontSelect').value,
        fontSize: document.getElementById('fontSize').value,
        lineHeight: document.getElementById('lineHeight').value,
        textColor: document.getElementById('textColor').value,
        bgColor: document.getElementById('bgColor').value,
        letterSpacing: document.getElementById('letterSpacing')?.value || 0,
        wordSpacing: document.getElementById('wordSpacing')?.value || 0
    };
    localStorage.setItem('keiraPrefs', JSON.stringify(prefs));
}

// Load saved preferences
function loadPreferences() {
    const saved = localStorage.getItem('keiraPrefs');
    if (!saved) return;
    const prefs = JSON.parse(saved);
    Object.keys(prefs).forEach(key => {
        const el = document.getElementById(key);
        if (el) el.value = prefs[key];
    });
    updateStyles();
}

function updateStylesAndSave() {
    updateStyles();
    savePreferences();
}

function setupStyleListeners() {
    const controls = [
        'fontSelect', 'fontSize', 'lineHeight',
        'textColor', 'bgColor', 'letterSpacing', 'wordSpacing'
    ];
    controls.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener((el.type === 'color' || el.tagName !== 'SELECT') ? 'input' : 'change', updateStylesAndSave);
    });
}

// Fetch URL content
async function fetchURL() {
    const url = document.getElementById('urlInput').value;
    const proxyURL = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    try {
        const response = await fetch(proxyURL);
        const data = await response.json();
        const parser = new DOMParser();
        const doc = parser.parseFromString(data.contents, "text/html");
        const article = doc.querySelector('article') || doc.body;
        let text = article.innerText || "Could not extract readable content.";
        text = text.replace(/\n\s*\n+/g, '\n\n');
        document.getElementById('output').innerText = text;
        updateStylesAndSave();
    } catch (error) {
        document.getElementById('output').innerText = "Failed to fetch content. Please check the URL.";
        console.error(error);
    }
}

// PDF loader
function loadPDF() {
    const file = document.getElementById('pdfInput').files[0];
    const output = document.getElementById('output');
    if (!file) {
        alert("Please select a PDF file.");
        return;
    }
    const reader = new FileReader();
    reader.onload = function () {
        const typedarray = new Uint8Array(reader.result);
        pdfjsLib.getDocument({ data: typedarray }).promise.then(pdf => {
            let textPromises = [];
            for (let i = 1; i <= pdf.numPages; i++) {
                textPromises.push(pdf.getPage(i).then(page => page.getTextContent().then(content => content.items.map(item => item.str).join(' '))));
            }
            Promise.all(textPromises).then(pagesText => {
                output.innerText = pagesText.join('\n\n');
                updateStylesAndSave();
            });
        }).catch(err => {
            console.error("Error loading PDF:", err);
            alert("Failed to read PDF.");
        });
    };
    reader.readAsArrayBuffer(file);
}

// Read aloud
function readAloud() {
    const text = document.getElementById("output").innerText;
    if (!text.trim() || document.getElementById("output").classList.contains('placeholder')) {
        alert("No text to read!");
        return;
    }
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    const voices = speechSynthesis.getVoices();
    const femaleVoice = voices.find(v => /female|woman|zira|susan/i.test(v.name));
    if (femaleVoice) utterance.voice = femaleVoice;
    speechSynthesis.speak(utterance);
}
speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
function stopReadAloud() { speechSynthesis.cancel(); }

// Random word/paragraph generation
function getRandomWords(count = 10) {
    const letters = "abcdefghijklmnopqrstuvwxyz";
    const words = [];
    for (let i = 0; i < count; i++) {
        let word = "";
        const len = Math.floor(Math.random() * 6) + 3;
        for (let j = 0; j < len; j++) {
            word += letters.charAt(Math.floor(Math.random() * letters.length));
        }
        words.push(word);
    }
    return words.join(' ');
}
async function getRandomParagraph() {
    try {
        const apiURL = "https://api.quotable.io/random?minLength=100&maxLength=200";
        const proxyURL = `https://api.allorigins.win/get?url=${encodeURIComponent(apiURL)}`;

        const response = await fetch(proxyURL);
        const data = await response.json();

        // The actual API's JSON is inside data.contents
        const quoteData = JSON.parse(data.contents);

        // Take only first 15 words
        let words = quoteData.content.split(/\s+/).slice(0, 15).join(" ");
        return words;
    } catch (error) {
        console.error("Failed to fetch paragraph:", error);
        return "The quick brown fox jumps over the lazy dog and keeps running very fast.";
    }
}

// Typing prompt system
let typingPromptText = "";
async function newTypingPrompt() {
    const mode = document.getElementById('typingMode')?.value || 'words';

    if (mode === 'paragraph') {
        typingPromptText = await getRandomParagraph(); // now async
    } else {
        typingPromptText = getRandomWords(10);
    }

    document.getElementById('typingPrompt').innerHTML = escapeHTML(typingPromptText);
    document.getElementById('typingFeedback').innerText = "";

    const output = document.getElementById('output');
    output.innerText = "";
    output.contentEditable = "true";
    output.setAttribute('spellcheck', 'false');
    output.classList.remove('placeholder');
    output.focus();

    updateStyles();
    enableOutputTyping();
}
function escapeHTML(str) {
    return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
function typingInputHandler(e) {
    const typed = (e.currentTarget.innerText || "").replace(/\n/g, '');
    const prompt = typingPromptText || "";
    const feedbackEl = document.getElementById('typingFeedback');
    const promptEl = document.getElementById('typingPrompt');
    let html = "";
    for (let i = 0; i < prompt.length; i++) {
        if (i < typed.length) {
            html += `<span style="color:${typed[i] === prompt[i] ? 'green' : 'red'};">${escapeHTML(prompt[i])}</span>`;
        } else {
            html += `<span>${escapeHTML(prompt[i])}</span>`;
        }
    }
    promptEl.innerHTML = html;
    if (typed.length === prompt.length && typed === prompt) {
        feedbackEl.innerText = "✅ Completed!";
        setTimeout(newTypingPrompt, 1000); // auto-generate new prompt after completion
    } else if (typed.length === 0) {
        feedbackEl.innerText = "";
    } else if (typed.length > prompt.length) {
        feedbackEl.innerText = "You typed more than required.";
    } else {
        const correctSoFar = typed.split("").filter((ch, i) => ch === prompt[i]).length;
        feedbackEl.innerText = `${correctSoFar}/${prompt.length} correct so far.`;
    }
}
function enableOutputTyping() {
    const output = document.getElementById('output');
    if (!output) return;
    output.removeEventListener('input', typingInputHandler);
    output.addEventListener('input', typingInputHandler);
}
function disableOutputTyping() {
    const output = document.getElementById('output');
    if (!output) return;
    output.removeEventListener('input', typingInputHandler);
}

// Init
window.addEventListener('DOMContentLoaded', () => {
    loadPreferences();
    setupStyleListeners();
    updateStyles();
    const output = document.getElementById('output');
    if (!output.innerText.trim()) {
        output.classList.add('placeholder');
        output.innerText = "Your text will appear here...";
    }
    output.addEventListener('focus', () => {
        if (output.classList.contains('placeholder')) {
            output.innerText = "";
            output.classList.remove('placeholder');
        }
    });
    output.addEventListener('blur', () => {
        if (!output.innerText.trim()) {
            output.classList.add('placeholder');
            output.innerText = "Your text will appear here...";
        }
    });
    output.addEventListener('input', () => {
        updateStylesAndSave();
    });
    output.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text');
    document.execCommand('insertText', false, text);
    updateStylesAndSave();
    });
});
