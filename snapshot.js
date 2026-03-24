// --- Global Variables ---
var video = document.querySelector('#video');
var canvas = document.querySelector('#canvas');
var file = document.querySelector('#videofile');
var videoControls = document.querySelector('#videoControls');
var videow = document.querySelector('#videow');
var snap = document.querySelector('#snap');
var save = document.querySelector('#save');
var videoInfo = document.querySelector('#videoInfo');
var snapSize = document.querySelector('#snapsize');
var context = canvas.getContext('2d');
var slider = document.querySelector('#slider');

// Set target FHD resolution
const TARGET_W = 1080;
const TARGET_H = 1920;

function showInput(id, opt) {
    document.getElementById('select-file').style.display = 'none';
    document.getElementById(id).style.display = '';
}

function loadPage() {
    var textFields = document.querySelectorAll('.mdc-text-field');
    for (let element of textFields) {
        new mdc.textField.MDCTextField(element);
    }
}
window.addEventListener("load", loadPage);

// --- Video Logic ---

function timeUpdate() {
    slider.setAttribute('max', Math.ceil(video.duration));
    slider.value = video.currentTime;
    if(videoInfo) {
        videoInfo.style.display = 'block';
        videoInfo.innerHTML = [
            "Video Resolution: " + video.videoWidth + "x" + video.videoHeight,
            "Length: " + (Math.round(video.duration * 10) / 10) + "s",
            "Current: " + (Math.round(video.currentTime * 10) / 10) + "s",
        ].join('<br>');
    }
}

video.addEventListener('timeupdate', timeUpdate);

video.addEventListener('loadedmetadata', function () {
    video.play();
    video.pause();
    resize(); // Setup canvas size immediately
}, false);

function resize() {
    // Force the canvas to be exactly FHD regardless of display size
    canvas.width = TARGET_W;
    canvas.height = TARGET_H;
    
    if(videow) videow.value = TARGET_W;
    if(snapSize) snapSize.innerHTML = TARGET_W + "x" + TARGET_H;
}

function snapPicture() {
    // Fill background with black (in case of aspect ratio mismatch)
    context.fillStyle = "#000";
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw video frame to the high-res canvas
    // This scales the video frame up/down to fit 1080x1920
    context.drawImage(video, 0, 0, TARGET_W, TARGET_H);
}

function selectVideo() {
    file.click();
}

function loadVideoFile() {
    var fileInput = file.files[0];
    if (fileInput) {
        if (video.src) {
            URL.revokeObjectURL(video.src);
        }
        video.preload = "metadata";
        video.src = URL.createObjectURL(fileInput);
        snap.disabled = false;
        save.disabled = false;
        videoControls.style.display = '';
    }
}

function savePicture() {
    // CRITICAL: Use image/jpeg with 1.0 quality for FHD clarity
    // Default toDataURL() often compresses heavily
    var dataURL = canvas.toDataURL("image/jpeg", 1.0);
    
    var link = document.getElementById("imagelink");
    if(!link) {
        link = document.createElement('a');
        link.id = "imagelink";
    }
    
    link.href = dataURL;
    var rnd = Math.round((Math.random() * 1000));
    link.setAttribute("download", "Snapshot_FHD_" + rnd + ".jpg");
    link.click();
}

// Analytics / UI Event Listeners
window.addEventListener("load", function () {
    var buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.addEventListener('click', function () {
            var name = this.innerText.trim().toLowerCase().replace(' ', '_');
            // gtag("event", "button_click", { "id": name }); 
        });
    });
});
