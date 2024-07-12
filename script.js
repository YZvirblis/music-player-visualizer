const audioFileInput = document.getElementById("audioFile");
const playButton = document.getElementById("play");
const pauseButton = document.getElementById("pause");
const stopButton = document.getElementById("stop");
const visualizationTypeSelect = document.getElementById("visualizationType");
const canvas = document.getElementById("visualizerCanvas");
const ctx = canvas.getContext("2d");
const currentTimeElement = document.getElementById("currentTime");
const durationElement = document.getElementById("duration");
const fileNameSpan = document.getElementById("filename");

let audioContext;
let audioSource;
let analyser;
let bufferLength;
let dataArray;
let animationId;
let audioBuffer;
let startTime = 0;
let isPlaying = false;

playButton.addEventListener("click", () => {
  if (audioContext && audioContext.state === "suspended") {
    audioContext.resume();
  } else if (!isPlaying) {
    playAudio();
  }
});

pauseButton.addEventListener("click", () => {
  if (audioContext && audioContext.state === "running") {
    audioContext.suspend();
  }
});

stopButton.addEventListener("click", () => {
  if (audioContext) {
    audioContext.close().then(() => {
      End();
    });
  }
});
function End() {
  cancelAnimationFrame(animationId);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  audioContext = null;
  audioSource = null;
  isPlaying = false;
  updateCurrentTime(0);
  startTime = 0;
  durationElement.innerText = formatTime(0);
  audioFileInput.value = null;
  fileNameSpan.innerText = "No file selected.";
}

audioFileInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      initAudio(e.target.result);
      fileNameSpan.innerText = file.name;
    };
    reader.readAsArrayBuffer(file);
  }
});

visualizationTypeSelect.addEventListener("change", () => {
  if (isPlaying) {
    cancelAnimationFrame(animationId);
    visualize();
  }
});

function initAudio(audioData) {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  audioContext.decodeAudioData(audioData, (buffer) => {
    audioBuffer = buffer;
    setupAudioNodes();
    updateDuration();
  });
}

function setupAudioNodes() {
  audioSource = audioContext.createBufferSource();
  audioSource.buffer = audioBuffer;

  analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  bufferLength = analyser.frequencyBinCount;
  dataArray = new Uint8Array(bufferLength);

  audioSource.connect(analyser);
  analyser.connect(audioContext.destination);

  audioSource.onended = () => {
    stopAudio();
    End();
  };
}

function playAudio() {
  if (isPlaying) {
    audioSource.stop();
    setupAudioNodes();
  }
  audioSource.start(0, startTime);
  isPlaying = true;
  audioContext.resume();
  visualize();
}

function stopAudio() {
  if (audioContext) {
    audioContext.suspend().then(() => {
      cancelAnimationFrame(animationId);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      isPlaying = false;
      updateCurrentTime(0);
      startTime = 0;
    });
  }
}

function updateDuration() {
  if (audioBuffer) {
    const duration = audioBuffer.duration;
    durationElement.textContent = formatTime(duration);
  }
}

function updateCurrentTime(time) {
  currentTimeElement.textContent = formatTime(time);
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
}

function visualize() {
  if (visualizationTypeSelect.value === "bars") {
    visualizeBars();
  } else if (visualizationTypeSelect.value === "waveform") {
    visualizeWaveform();
  }
}

function visualizeBars() {
  function draw() {
    animationId = requestAnimationFrame(draw);

    analyser.getByteFrequencyData(dataArray);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const barWidth = (canvas.width / bufferLength) * 2.5;
    let barHeight;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      barHeight = dataArray[i];
      ctx.fillStyle = "rgb(" + (barHeight + 100) + ",50,50)";
      ctx.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight / 2);

      x += barWidth + 1;
    }

    if (audioContext && audioContext.state === "running") {
      updateCurrentTime(audioContext.currentTime);
    }
  }

  draw();
}

function visualizeWaveform() {
  function draw() {
    animationId = requestAnimationFrame(draw);

    analyser.getByteTimeDomainData(dataArray);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgb(0, 255, 0)";

    ctx.beginPath();

    const sliceWidth = (canvas.width * 1.0) / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * canvas.height) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    if (audioContext && audioContext.state === "running") {
      updateCurrentTime(audioContext.currentTime);
    }
  }

  draw();
}
