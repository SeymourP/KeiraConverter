function showSection(section) {
    document.querySelectorAll('.input-section').forEach(el => el.style.display = 'none');
    document.getElementById(section).style.display = 'block';
  }
  
  function loadText() {
    const text = document.getElementById('textInput').value;
    const output = document.getElementById('output');
    output.innerText = text;
    updateStyles();
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
  
  function updateStyles() {
    const output = document.getElementById('output');
    output.style.fontFamily = document.getElementById('fontSelect').value;
    output.style.fontSize = document.getElementById('fontSize').value + 'px';
    output.style.lineHeight = document.getElementById('lineHeight').value;
    output.style.color = document.getElementById('textColor').value;
    output.style.backgroundColor = document.getElementById('bgColor').value;
  }
  
  // Add real-time listeners for all controls:
  function setupStyleListeners() {
    const controls = ['fontSelect', 'fontSize', 'lineHeight', 'textColor', 'bgColor'];
  
    controls.forEach(id => {
      const el = document.getElementById(id);
  
      // Use 'input' event for color inputs to get real-time updates
      if (el.type === 'color') {
        el.addEventListener('input', updateStyles);
      } else if (el.tagName === 'SELECT') {
        el.addEventListener('change', updateStyles);
      } else {
        el.addEventListener('input', updateStyles);
      }
    });
  }
  
  
  function downloadAsPDF() {
    const element = document.getElementById('output');
  
    // Get computed styles from output div
    const style = window.getComputedStyle(element);
  
    const opt = {
      margin:       0.5,
      filename:     'Keira-Converter.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  {
        scale: 2, // higher scale = better resolution
        backgroundColor: style.backgroundColor,
        letterRendering: true,
        useCORS: true
      },
      jsPDF:        { 
        unit: 'in', 
        format: 'letter',
        putOnlyUsedFonts: true,
        // You can add font here if embedded — html2pdf can't embed custom fonts on its own
      }
    };
  
    // Temporarily apply inline styles to ensure html2canvas respects them
    element.style.fontFamily = style.fontFamily;
    element.style.fontSize = style.fontSize;
    element.style.lineHeight = style.lineHeight;
    element.style.color = style.color;
    element.style.backgroundColor = style.backgroundColor;
  
    html2pdf().set(opt).from(element).save().then(() => {
      // Optional: clean up styles if you modified anything
    });
  }
  
  
  
  
  // Placeholder: you'll need a CORS proxy or backend for real link fetching
  async function fetchURL() {
    const url = document.getElementById('urlInput').value;
    const proxyURL = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
  
    try {
      const response = await fetch(proxyURL);
      const data = await response.json();
  
      // Parse the HTML content
      const parser = new DOMParser();
      const doc = parser.parseFromString(data.contents, "text/html");
  
      // Extract the main content
      const article = doc.querySelector('article') || doc.body;
      let text = article.innerText || "Could not extract readable content.";
  
      // ✅ Clean up: replace multiple newlines with a single newline
      text = text.replace(/\n\s*\n+/g, '\n\n');
  
      // Display the cleaned text
      const output = document.getElementById('output');
      output.innerText = text;
      updateStyles();
    } catch (error) {
      const output = document.getElementById('output');
      output.innerText = "Failed to fetch content. Please check the URL.";
      console.error(error);
    }
  }
  
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
          console.log("PDF loaded with", pdf.numPages, "pages");
  
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
            updateStyles();
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
  
  // Initialize listeners on page load:
  window.addEventListener('DOMContentLoaded', () => {
    setupStyleListeners();
    updateStyles(); // apply initial styles
  });
  