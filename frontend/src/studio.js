import './style.css'

// --- State ---
let studioState = {
    mode: 'direct',
    targetFile: null,
    referenceFile: null,
    isProcessing: false
};

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

// --- DOM Elements ---
const modeBtns = document.querySelectorAll('.mode-btn');
const targetZone = document.getElementById('target-zone');
const referenceZone = document.getElementById('reference-zone');
const targetInput = document.getElementById('target-input');
const referenceInput = document.getElementById('reference-input');
const targetPreview = document.getElementById('target-preview');
const referencePreview = document.getElementById('reference-preview');
const processBtn = document.getElementById('process-btn');
const resultContainer = document.getElementById('result-container');
const resultImage = document.getElementById('result-image');

// --- Mode Switching ---
modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        studioState.mode = btn.dataset.mode;
        
        if (studioState.mode === 'reference') {
            referenceZone.classList.remove('hidden');
        } else {
            referenceZone.classList.add('hidden');
            studioState.referenceFile = null;
            referencePreview.classList.add('hidden');
        }
        checkReady();
    });
});

// --- Upload Handling ---
targetZone.onclick = () => targetInput.click();
referenceZone.onclick = () => referenceInput.click();

targetInput.onchange = (e) => handleFile(e.target.files[0], 'target');
referenceInput.onchange = (e) => handleFile(e.target.files[0], 'reference');

function handleFile(file, type) {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        if (type === 'target') {
            studioState.targetFile = file;
            targetPreview.src = e.target.result;
            targetPreview.classList.remove('hidden');
            targetZone.querySelector('.upload-placeholder').classList.add('hidden');
        } else {
            studioState.referenceFile = file;
            referencePreview.src = e.target.result;
            referencePreview.classList.remove('hidden');
            referenceZone.querySelector('.upload-placeholder').classList.add('hidden');
        }
        checkReady();
    };
    reader.readAsDataURL(file);
}

function checkReady() {
    let ready = !!studioState.targetFile;
    if (studioState.mode === 'reference') {
        ready = ready && !!studioState.referenceFile;
    }
    
    if (ready) {
        processBtn.classList.remove('disabled');
        processBtn.disabled = false;
    } else {
        processBtn.classList.add('disabled');
        processBtn.disabled = true;
    }
}

// --- Processing ---
processBtn.onclick = async () => {
    if (studioState.isProcessing) return;
    
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Please login to process images');
        window.location.href = '/login.html';
        return;
    }

    studioState.isProcessing = true;
    processBtn.textContent = 'Processing with Neural AI...';
    
    const formData = new FormData();
    formData.append('image', studioState.targetFile);
    if (studioState.mode === 'reference') {
        formData.append('reference', studioState.referenceFile);
    }
    formData.append('type', studioState.mode);

    try {
        const res = await fetch(`${API_BASE}/beautify`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        
        const data = await res.json();
        if (data.success) {
            let beautifiedUrl = data.beautifiedImageUrl;
            if (beautifiedUrl.startsWith('/')) {
                const backendBase = API_BASE.endsWith('/api') ? API_BASE.slice(0, -4) : (API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE);
                beautifiedUrl = `${backendBase}${beautifiedUrl}`;
            }
            resultImage.src = beautifiedUrl;
            const originalResultImage = document.getElementById('original-result-image');
            if (originalResultImage) {
                originalResultImage.src = targetPreview.src;
            }
            resultContainer.classList.remove('hidden');
            resultContainer.scrollIntoView({ behavior: 'smooth' });

            // Setup Download Button
            const downloadBtn = document.getElementById('download-btn');
            downloadBtn.onclick = async () => {
                try {
                    downloadBtn.disabled = true;
                    const response = await fetch(beautifiedUrl, { mode: 'cors' });
                    if (!response.ok) {
                        throw new Error(`Download failed: ${response.status}`);
                    }

                    const blob = await response.blob();
                    const link = document.createElement('a');
                    const blobUrl = URL.createObjectURL(blob);

                    link.href = blobUrl;
                    link.download = `beautify-ai-${Date.now()}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(blobUrl);
                } catch (err) {
                    console.error('Download error:', err);
                    alert('Download failed. Please open the image and save it manually.');
                } finally {
                    downloadBtn.disabled = false;
                }
            };
        } else {
            alert(data.message || 'Transformation failed');
        }
    } catch (err) {
        console.error('Processing error:', err);
        alert('Could not connect to AI server');
    } finally {
        studioState.isProcessing = false;
        processBtn.textContent = 'Initialize AI Transformation';
    }
};

// --- Demo Animation ---
const demoBtn = document.getElementById('demo-btn');
const demoContainer = document.getElementById('demo-container');
const facePlaceholder = document.getElementById('face-placeholder');
const processingSteps = document.querySelectorAll('.step');

demoBtn.addEventListener('click', startDemo);

function startDemo() {
    demoContainer.classList.remove('hidden');
    demoBtn.style.display = 'none';
    
    facePlaceholder.classList.add('beautifying');
    
    let stepIndex = 0;
    const steps = [
        'Analyzing face...',
        'Smoothing skin...',
        'Enhancing eyes...',
        'Brightening smile...',
        'Final touches...',
        '✨ Beauty complete!'
    ];
    
    const stepInterval = setInterval(() => {
        processingSteps.forEach(step => step.classList.remove('active'));
        processingSteps[stepIndex].classList.add('active');
        
        stepIndex++;
        if (stepIndex >= steps.length) {
            clearInterval(stepInterval);
            setTimeout(() => {
                facePlaceholder.classList.remove('beautifying');
                demoContainer.classList.add('hidden');
                demoBtn.style.display = 'inline-flex';
                processingSteps.forEach(step => step.classList.remove('active'));
                processingSteps[0].classList.add('active');
            }, 2000);
        }
    }, 800);
}

// --- Initialize ---
lucide.createIcons();
checkReady();
