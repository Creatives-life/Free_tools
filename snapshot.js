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
    if (slider) {
        slider.setAttribute('max', Math.ceil(video.duration));
        slider.value = video.currentTime;
    }
    if (videoInfo) {
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
    resize(); // Setup canvas size based on loaded video resolution
}, false);

function resize() {
    // Automatically match native video dimensions (handles 16:9, 9:16, etc.)
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    if (videow) videow.value = video.videoWidth;
    if (snapSize) snapSize.innerHTML = video.videoWidth + "x" + video.videoHeight;
}

function snapPicture() {
    // Resize dynamically in case video dimensions changed
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas at native resolution
    context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
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
        if (videoControls) videoControls.style.display = '';
    }
}

function savePicture() {
    var dataURL = canvas.toDataURL("image/jpeg", 1.0);
    
    var link = document.getElementById("imagelink");
    if (!link) {
        link = document.createElement('a');
        link.id = "imagelink";
    }
    
    link.href = dataURL;
    var rnd = Math.round((Math.random() * 1000));
    link.setAttribute("download", "Snapshot_" + canvas.width + "x" + canvas.height + "_" + rnd + ".jpg");
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
