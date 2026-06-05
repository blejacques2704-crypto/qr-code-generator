// Configuration
const API_BASE_URL = '';
let selectedFiles = [];

// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const messageContainer = document.getElementById('messageContainer');
const resultsSection = document.getElementById('resultsSection');
const resultsList = document.getElementById('resultsList');
const refreshBtn = document.getElementById('refreshBtn');
const historyList = document.getElementById('historyList');
const qrModal = document.getElementById('qrModal');
const qrImage = document.getElementById('qrImage');
const qrInfo = document.getElementById('qrInfo');
const downloadQrBtn = document.getElementById('downloadQrBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const closeBtn = document.querySelector('.close-btn');

// Event Listeners
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', handleDragOver);
dropZone.addEventListener('dragleave', handleDragLeave);
dropZone.addEventListener('drop', handleDrop);

fileInput.addEventListener('change', handleFileSelect);
uploadBtn.addEventListener('click', uploadFiles);
refreshBtn.addEventListener('click', loadHistory);

closeModalBtn.addEventListener('click', closeModal);
closeBtn.addEventListener('click', closeModal);
qrModal.addEventListener('click', (e) => {
    if (e.target === qrModal) closeModal();
});

// File Handling
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('dragover');
    
    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
}

function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    addFiles(files);
}

function addFiles(files) {
    // Filter valid files
    const validFiles = files.filter(file => {
        const validMimes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
        if (!validMimes.includes(file.type)) {
            showMessage(`${file.name} n'est pas un format valide (JPG, PNG, GIF, PDF)`, 'error');
            return false;
        }
        if (file.size > 50 * 1024 * 1024) {
            showMessage(`${file.name} est trop volumineux (max 50MB)`, 'error');
            return false;
        }
        return true;
    });

    selectedFiles = [...selectedFiles, ...validFiles];
    displaySelectedFiles();
    uploadBtn.disabled = selectedFiles.length === 0;
}

function displaySelectedFiles() {
    let html = '<div class="selected-files">';
    html += `<h4>${selectedFiles.length} fichier(s) sélectionné(s)</h4>`;
    
    selectedFiles.forEach((file, index) => {
        html += `
            <div class="file-item">
                <span class="file-item-name">${file.name}</span>
                <span class="file-item-size">${formatFileSize(file.size)}</span>
                <button type="button" class="file-item-remove" onclick="removeFile(${index})">Supprimer</button>
            </div>
        `;
    });
    
    html += '</div>';
    
    let existingSelected = dropZone.querySelector('.selected-files');
    if (existingSelected) {
        existingSelected.remove();
    }
    
    dropZone.insertAdjacentHTML('afterend', html);
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    if (selectedFiles.length === 0) {
        let selected = dropZone.nextElementSibling;
        if (selected && selected.classList.contains('selected-files')) {
            selected.remove();
        }
    } else {
        displaySelectedFiles();
    }
    uploadBtn.disabled = selectedFiles.length === 0;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Upload
async function uploadFiles() {
    if (selectedFiles.length === 0) {
        showMessage('Veuillez sélectionner au moins un fichier', 'error');
        return;
    }

    uploadBtn.disabled = true;
    progressContainer.classList.remove('hidden');
    messageContainer.innerHTML = '';
    resultsSection.classList.add('hidden');

    const totalFiles = selectedFiles.length;
    let uploadedCount = 0;
    const uploadedData = [];

    for (let i = 0; i < totalFiles; i++) {
        const file = selectedFiles[i];
        const formData = new FormData();
        formData.append('file', file);

        try {
            progressText.textContent = `Chargement ${i + 1}/${totalFiles}: ${file.name}...`;
            const response = await fetch(`${API_BASE_URL}/api/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erreur lors de l\'upload');
            }

            const result = await response.json();
            uploadedData.push(result.data);
            uploadedCount++;
            updateProgress((uploadedCount / totalFiles) * 100);

        } catch (error) {
            showMessage(`Erreur: ${file.name} - ${error.message}`, 'error');
        }
    }

    progressContainer.classList.add('hidden');
    uploadBtn.disabled = false;

    if (uploadedCount > 0) {
        showMessage(`✓ ${uploadedCount} fichier(s) uploadé(s) avec succès`, 'success');
        displayResults(uploadedData);
        selectedFiles = [];
        let selected = dropZone.nextElementSibling;
        if (selected && selected.classList.contains('selected-files')) {
            selected.remove();
        }
        fileInput.value = '';
        uploadBtn.disabled = true;
        
        // Refresh history
        setTimeout(loadHistory, 1000);
    } else {
        showMessage('Aucun fichier n\'a pu être uploadé', 'error');
    }
}

function updateProgress(percent) {
    progressFill.style.width = percent + '%';
}

function displayResults(data) {
    resultsSection.classList.remove('hidden');
    let html = '';

    data.forEach((item, index) => {
        html += `
            <div class="result-card">
                <img src="${item.qrCode}" alt="QR Code">
                <p><strong>${item.filename}</strong></p>
                <p>${formatFileSize(item.fileSize || 0)}</p>
                <div class="result-card-buttons">
                    <button class="btn btn-primary btn-sm" onclick="viewQR('${item.qrCode}', '${item.filename}', ${item.id})">
                        👁️ Voir
                    </button>
                    <button class="btn btn-success btn-sm" onclick="downloadQRCode(${item.id}, '${item.filename}')">
                        ⬇️ Télécharger
                    </button>
                </div>
            </div>
        `;
    });

    resultsList.innerHTML = html;
}

function viewQR(qrCodeData, filename, uploadId) {
    qrImage.src = qrCodeData;
    qrInfo.textContent = `QR Code pour: ${filename}`;
    downloadQrBtn.onclick = () => downloadQRCode(uploadId, filename);
    qrModal.classList.remove('hidden');
}

function closeModal() {
    qrModal.classList.add('hidden');
}

async function downloadQRCode(uploadId, filename) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/download-qr/${uploadId}`);
        if (!response.ok) throw new Error('Erreur lors du téléchargement');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename.replace(/\.[^/.]+$/, '')}-qr.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        showMessage('QR Code téléchargé avec succès', 'success');
    } catch (error) {
        showMessage(`Erreur: ${error.message}`, 'error');
    }
}

// History
async function loadHistory() {
    try {
        refreshBtn.disabled = true;
        const response = await fetch(`${API_BASE_URL}/api/uploads`);
        
        if (!response.ok) throw new Error('Erreur lors du chargement de l\'historique');

        const result = await response.json();
        displayHistory(result.data);
        refreshBtn.disabled = false;

    } catch (error) {
        showMessage(`Erreur: ${error.message}`, 'error');
        refreshBtn.disabled = false;
    }
}

function displayHistory(uploads) {
    if (!uploads || uploads.length === 0) {
        historyList.innerHTML = `
            <div class="empty-state">
                <p>Aucun upload pour l'instant</p>
            </div>
        `;
        return;
    }

    let html = '';
    uploads.forEach(upload => {
        const date = new Date(upload.created_at).toLocaleString('fr-FR');
        html += `
            <div class="history-item">
                <div class="history-item-info">
                    <div class="history-item-name">${upload.original_name}</div>
                    <div class="history-item-meta">
                        ${formatFileSize(upload.file_size)} • ${upload.file_type} • ${date}
                    </div>
                </div>
                <div class="history-item-actions">
                    <button class="btn btn-primary" onclick="viewQR('${upload.qr_code_data}', '${upload.original_name}', ${upload.id})">
                        👁️ Voir QR
                    </button>
                    <button class="btn btn-success" onclick="downloadQRCode(${upload.id}, '${upload.original_name}')">
                        ⬇️ Télécharger
                    </button>
                    <button class="btn btn-danger" onclick="deleteUpload(${upload.id}, this)">
                        🗑️ Supprimer
                    </button>
                </div>
            </div>
        `;
    });

    historyList.innerHTML = html;
}

async function deleteUpload(uploadId, button) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet upload ?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/uploads/${uploadId}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Erreur lors de la suppression');

        const result = await response.json();
        showMessage('Upload supprimé avec succès', 'success');
        
        // Remove item from DOM
        button.closest('.history-item').remove();
        
        // Reload history
        loadHistory();

    } catch (error) {
        showMessage(`Erreur: ${error.message}`, 'error');
    }
}

// Messages
function showMessage(text, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = text;

    messageContainer.appendChild(messageDiv);

    // Auto remove after 5 seconds
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadHistory();
});
