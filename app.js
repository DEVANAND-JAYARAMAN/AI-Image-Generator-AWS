// Replace with your API Gateway endpoint
const API_URL = "https://442ym2nb4c.execute-api.ap-southeast-2.amazonaws.com/dev/generate-image";

// Global variables
let currentImageData = null;
let imageHistory = JSON.parse(localStorage.getItem('imageHistory') || '[]');

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    loadGallery();
    setupEventListeners();
});

function setupEventListeners() {
    // Enter key to generate
    document.getElementById('promptInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            generateImage();
        }
    });
}

async function generateImage() {
    const prompt = document.getElementById("promptInput").value.trim();
    const loading = document.getElementById("loading");
    const img = document.getElementById("resultImage");

    if (!prompt) {
        alert("Enter a prompt!");
        return;
    }

    loading.style.display = "block";
    img.style.display = "none";

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ prompt })
        });

        const data = await response.json();
        console.log("API response:", data);

        if (data.imageBase64) {
            img.src = "data:image/png;base64," + data.imageBase64;
            img.style.display = "block";
            document.getElementById("imageContainer").style.display = "block";
            
            // Store current image
            currentImageData = {
                prompt: prompt,
                imageBase64: data.imageBase64,
                timestamp: Date.now()
            };
            
            // Add to gallery
            addToGallery(currentImageData);
        } else {
            alert("No image returned. Check Lambda logs.");
        }

    } catch (err) {
        console.error("Error:", err);
        alert("Error generating the image!");
    } finally {
        loading.style.display = "none";
    }
}



function downloadImage() {
    if (!currentImageData) {
        showToast("No image to download!", "error");
        return;
    }

    const link = document.createElement('a');
    link.download = `ai-generated-${currentImageData.id}.png`;
    link.href = "data:image/png;base64," + currentImageData.imageBase64;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast("Image downloaded successfully!", "success");
}

function shareImage() {
    if (!currentImageData) {
        showToast("No image to share!", "error");
        return;
    }

    if (navigator.share) {
        // Convert base64 to blob for sharing
        fetch("data:image/png;base64," + currentImageData.imageBase64)
            .then(res => res.blob())
            .then(blob => {
                const file = new File([blob], `ai-generated-${currentImageData.id}.png`, { type: 'image/png' });
                navigator.share({
                    title: 'AI Generated Image',
                    text: `Check out this AI-generated image: "${currentImageData.prompt}"`,
                    files: [file]
                });
            })
            .catch(err => {
                console.error('Error sharing:', err);
                copyImageToClipboard();
            });
    } else {
        copyImageToClipboard();
    }
}

function copyImageToClipboard() {
    if (!currentImageData) return;
    
    fetch("data:image/png;base64," + currentImageData.imageBase64)
        .then(res => res.blob())
        .then(blob => {
            navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);
            showToast("Image copied to clipboard!", "success");
        })
        .catch(err => {
            console.error('Error copying to clipboard:', err);
            showToast("Sharing not supported on this device", "error");
        });
}

function saveToGallery() {
    if (!currentImageData) {
        showToast("No image to save!", "error");
        return;
    }

    // Check if already in history
    const exists = imageHistory.some(item => item.id === currentImageData.id);
    if (exists) {
        showToast("Image already in gallery!", "error");
        return;
    }

    addToHistory(currentImageData);
    showToast("Image saved to gallery!", "success");
}

let imageGallery = [];

function addToGallery(imageData) {
    imageGallery.unshift(imageData);
    if (imageGallery.length > 10) {
        imageGallery = imageGallery.slice(0, 10);
    }
    loadGallery();
}

function loadGallery() {
    const gallery = document.getElementById('gallery');
    
    if (imageGallery.length === 0) {
        gallery.innerHTML = '<p style="text-align: center; opacity: 0.7; grid-column: 1 / -1;">No images generated yet. Create your first masterpiece!</p>';
        return;
    }

    gallery.innerHTML = imageGallery.map((item, index) => `
        <div class="gallery-item" onclick="viewGalleryImage(${index})">
            <img src="data:image/png;base64,${item.imageBase64}" alt="${item.prompt}">
            <div class="gallery-item-overlay">
                <p><strong>Prompt:</strong> ${item.prompt.substring(0, 50)}${item.prompt.length > 50 ? '...' : ''}</p>
            </div>
        </div>
    `).join('');
}

function viewGalleryImage(index) {
    const imageData = imageGallery[index];
    if (imageData) {
        const img = document.getElementById('resultImage');
        img.src = "data:image/png;base64," + imageData.imageBase64;
        img.style.display = "block";
        document.getElementById('imageContainer').style.display = "block";
        
        currentImageData = imageData;
        document.getElementById('promptInput').value = imageData.prompt;
        
        document.querySelector('.result-section').scrollIntoView({ behavior: 'smooth' });
    }
}

function clearGallery() {
    if (imageGallery.length === 0) {
        alert("Gallery is already empty!");
        return;
    }

    if (confirm('Are you sure you want to clear all images from the gallery?')) {
        imageGallery = [];
        loadGallery();
        alert("Gallery cleared successfully!");
    }
}

function generateAgain() {
    if (!currentImageData) {
        showToast("No previous prompt to regenerate!", "error");
        return;
    }
    
    document.getElementById('promptInput').value = currentImageData.prompt;
    document.getElementById('styleSelect').value = currentImageData.style || '';
    document.getElementById('sizeSelect').value = currentImageData.size || '512x512';
    generateImage();
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
