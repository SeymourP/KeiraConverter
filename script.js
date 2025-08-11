function showSection(section) {
    document.querySelectorAll('.input-section').forEach(el => el.style.display = 'none');
    document.getElementById(section).style.display = 'block';
}

function loadText() {
    const text = document.getElementById('textInput').value;
    const output = document.getElementById('output');
    output.innerText = text;
    updateStylesAndSave();
}

function showInput(type, btn) {
    const sections = ['text', 'url', 'pdf'];
    sections.forEach(id => {
        document.getElementById(id).style.display = (id === type) ? 'flex' : 'none';
    });

    // Toggle active class
    const buttons = document.querySelectorAll('.menuBtn');
    buttons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

// Apply current settings to the output
function updateStyles() {
    const output = document.getElementById('output');
    output.style.fontFamily = document.getElementById('fontSelect').value;
    output.style.fontSize = document.getElementById('fontSize').value + 'px';
    output.style.lineHeight = document.getElementById('lineHeight').value;
    output.style.color = document.getElementById('textColor').value;
    output.style.backgroundColor = document.getElementById('bgColor').value;

    const letterSpacingEl = document.getElementById('letterSpacing');
    const wordSpacingEl = document.getElementById('wordSpacing');
    if (letterSpacingEl) output.style.letterSpacing = letterSpacingEl.value + 'px';
    if (wordSpacingEl) output.style.wordSpacing = wordSpacingEl.value + 'px';
}

// Save preferences in localStorage
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

// Combined function for updating & saving
function updateStylesAndSave() {
    updateStyles();
    savePreferences();
}

// Add listeners for style controls
function setupStyleListeners() {
    const controls = [
        'fontSelect', 'fontSize', 'lineHeight',
        'textColor', 'bgColor', 'letterSpacing', 'wordSpacing'
    ];

    controls.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.type === 'color') {
            el.addEventListener('input', updateStylesAndSave);
        } else if (el.tagName === 'SELECT') {
            el.addEventListener('change', updateStylesAndSave);
        } else {
            el.addEventListener('input', updateStylesAndSave);
        }
    });
}

// Download as PDF
function downloadAsPDF() {
    const element = document.getElementById('output');
    const style = window.getComputedStyle(element);

    const opt = {
        margin: 0.5,
        filename: 'Keira-Converter.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: 2,
            backgroundColor: style.backgroundColor,
            letterRendering: true,
            useCORS: true
        },
        jsPDF: { unit: 'in', format: 'letter', putOnlyUsedFonts: true }
    };

    element.style.fontFamily = style.fontFamily;
    element.style.fontSize = style.fontSize;
    element.style.lineHeight = style.lineHeight;
    element.style.color = style.color;
    element.style.backgroundColor = style.backgroundColor;

    html2pdf().set(opt).from(element).save();
}

// Fetch content from a URL
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

        const output = document.getElementById('output');
        output.innerText = text;
        updateStylesAndSave();
    } catch (error) {
        document.getElementById('output').innerText = "Failed to fetch content. Please check the URL.";
        console.error(error);
    }
}

// Load PDF and extract text
function loadPDF() {
    const fileInput = document.getElementById('pdfInput');
    const file = fileInput.files[0];
    const output = document.getElementById('output');

    if (!file) {
        alert("Please select a PDF file.");
        return;
    }

    const reader = new FileReader();

    reader.onload = function () {
        const typedarray = new Uint8Array(reader.result);

        pdfjsLib.getDocument({ data: typedarray }).promise
            .then(function (pdf) {
                let textPromises = [];

                for (let i = 1; i <= pdf.numPages; i++) {
                    textPromises.push(
                        pdf.getPage(i).then(page => {
                            return page.getTextContent().then(content => {
                                const strings = content.items.map(item => item.str);
                                return strings.join(' ');
                            });
                        })
                    );
                }

                Promise.all(textPromises).then(pagesText => {
                    const fullText = pagesText.join('\n\n');
                    output.innerText = fullText;
                    updateStylesAndSave();
                });
            })
            .catch(function (err) {
                console.error("Error loading PDF:", err);
                alert("Failed to read PDF.");
            });
    };

    reader.onerror = function (err) {
        console.error("FileReader error:", err);
        alert("Error reading file.");
    };

    reader.readAsArrayBuffer(file);
}

// Read aloud function
function readAloud() {
    const text = document.getElementById("output").innerText;
    if (!text.trim()) {
        alert("No text to read!");
        return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    speechSynthesis.speak(utterance);
}

// Stop reading function
function stopReadAloud() {
    speechSynthesis.cancel();
}

// Init on page load
window.addEventListener('DOMContentLoaded', () => {
    loadPreferences();
    setupStyleListeners();
    updateStyles();
});
