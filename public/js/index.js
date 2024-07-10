const userStatus = {
    microphone: false,
    mute: false,
    username: "user#" + Math.floor(Math.random() * 999999),
    online: false,
};

const usernameInput = document.getElementById("username");
const usernameLabel = document.getElementById("username-label");
const usernameDiv = document.getElementById("username-div");
const usersDiv = document.getElementById("users");

usernameInput.value = userStatus.username;
usernameLabel.innerText = userStatus.username;

window.onload = (e) => {
    mainFunction(1000);
    startMicrophoneAnalysis(); // Call startMicrophoneAnalysis when the page is loaded
};

// Use the Ngrok URL for Socket.IO connection
//const socket = io("ws://127.0.0.1:1000");

var socket = io("ws://localhost:1000");

socket.emit("userInformation", userStatus);

function mainFunction(time) {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        var mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.start();

        var audioChunks = [];

        mediaRecorder.addEventListener("dataavailable", function (event) {
            audioChunks.push(event.data);
        });

        mediaRecorder.addEventListener("stop", function () {
            var audioBlob = new Blob(audioChunks);
            audioChunks = [];

            var fileReader = new FileReader();
            fileReader.readAsDataURL(audioBlob);
            fileReader.onloadend = function () {
                if (!userStatus.microphone || !userStatus.online) return;
                var base64String = fileReader.result;
                socket.emit("voice", base64String);
            };

            mediaRecorder.start();
            setTimeout(function () {
                mediaRecorder.stop();
            }, time);
        });

        setTimeout(function () {
            mediaRecorder.stop();
        }, time);
    });

    socket.on("send", function (data) {
        var audio = new Audio(data);
        amplifyAndPlayAudio(audio); // Amplify and play the audio
    });

    socket.on("usersUpdate", function (data) {
        usersDiv.innerHTML = '';
        for (const key in data) {
            if (!Object.hasOwnProperty.call(data, key)) continue;
            const element = data[key];
            const li = document.createElement("li");
            li.innerText = element.username;
            usersDiv.append(li);
        }
    });
}

usernameLabel.onclick = function () {
    usernameDiv.style.display = "block";
    usernameLabel.style.display = "none";
}

function changeUsername() {
    userStatus.username = usernameInput.value;
    usernameLabel.innerText = userStatus.username;
    usernameDiv.style.display = "none";
    usernameLabel.style.display = "block";
    emitUserInformation();
}

function toggleConnection(e) {
    userStatus.online = !userStatus.online;
    editButtonClass(e, userStatus.online);
    emitUserInformation();
}

function toggleMute(e) {
    userStatus.mute = !userStatus.mute;
    editButtonClass(e, userStatus.mute);
    emitUserInformation();
}

function toggleMicrophone(e) {
    userStatus.microphone = !userStatus.microphone;
    editButtonClass(e, userStatus.microphone);
    emitUserInformation();
}

function editButtonClass(target, bool) {
    const classList = target.classList;
    classList.remove("enable-btn");
    classList.remove("disable-btn");

    if (bool)
        return classList.add("enable-btn");

    classList.add("disable-btn");
}

function emitUserInformation() {
    socket.emit("userInformation", userStatus);
}

// Microphone Analysis Code
let sensitivity = 100; // Initial sensitivity value (between 1 and 100)

// Function to start microphone analysis
function startMicrophoneAnalysis() {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(function (stream) {
            const audioContext = new AudioContext();
            const analyser = audioContext.createAnalyser();
            const microphone = audioContext.createMediaStreamSource(stream);
            const scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);

            analyser.smoothingTimeConstant = 0.2; // Adjust smoothing for faster response
            analyser.fftSize = 2048; // Higher FFT size for more accurate frequency analysis

            microphone.connect(analyser);
            analyser.connect(scriptProcessor);
            scriptProcessor.connect(audioContext.destination);
            scriptProcessor.onaudioprocess = function () {
                const array = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteFrequencyData(array);
                const average = array.reduce((a, value) => a + value, 0) / array.length;
                updateVolumeMeter(Math.round(average));
            };
        })
        .catch(function (err) {
            console.error('Error accessing microphone:', err);
        });
}

// Function to update volume meter display
function updateVolumeMeter(volume) {
    const allPids = document.querySelectorAll('.pid');
    const numberOfPidsToColor = Math.round(volume * (sensitivity / 100) / 10);
    allPids.forEach((pid, index) => {
        if (index < numberOfPidsToColor) {
            pid.style.backgroundColor = "#69ce2b"; // Color based on volume
        } else {
            pid.style.backgroundColor = "#e6e7e8"; // Default background color
        }
    });
}

// Function to handle slider input and update sensitivity
document.getElementById('sensitivity-slider').addEventListener('input', function (e) {
    sensitivity = e.target.value;
});

// Amplification code
let amplificationFactor = 1.0; // Initial amplification factor

document.getElementById('amplification-slider').addEventListener('input', function(e) {
    amplificationFactor = e.target.value;
});

function amplifyAndPlayAudio(audio) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaElementSource(audio);
    const gainNode = audioContext.createGain();

    gainNode.gain.value = amplificationFactor;
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);

    audio.play();
}
