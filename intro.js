// Intro for the home page: beat-reactive lightning, background track, and the subscribe gate.
// Change the song volume here (0.0 = mute, 0.5 = 50%, 1.0 = full).
const DEFAULT_VOLUME = 0.05;

const canvas = document.getElementById("lightning-canvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

let lightningOpacity = 0;
let activeStrikes = [];

function createLightningPath(startX, startY, endY, segments) {
    const path = [{ x: startX, y: startY }];
    let currentX = startX;
    let currentY = startY;
    const segmentHeight = (endY - startY) / segments;

    for (let i = 0; i < segments; i++) {
        currentY += segmentHeight;
        currentX += (Math.random() - 0.5) * 110;
        path.push({ x: currentX, y: currentY });
    }
    return path;
}

function drawLightning(path, width, glowSize, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.shadowBlur = glowSize;
    ctx.shadowColor = "#ff0000";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.stroke();
}

function triggerLightningStrike() {
    activeStrikes = [];
    const totalStrikes = Math.floor(Math.random() * 3) + 2;

    for (let i = 0; i < totalStrikes; i++) {
        const startX = Math.random() * canvas.width;
        activeStrikes.push(createLightningPath(startX, 0, canvas.height, 10));
    }
    lightningOpacity = 1.0;
}

let audioCtx, analyser, dataArray, sourceNode;
let isPlaying = false;
const audio = document.getElementById("bg-audio");
const songUrl = "song.mp3";

let bassHistory = [];
const historySize = 20;
let lastStrikeTime = 0;

function setupAndPlayAudio() {
    try {
        audio.src = songUrl;
        audio.loop = true;
        audio.crossOrigin = "anonymous";
        audio.volume = DEFAULT_VOLUME;

        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContextClass();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;

        dataArray = new Uint8Array(analyser.frequencyBinCount);

        sourceNode = audioCtx.createMediaElementSource(audio);
        sourceNode.connect(analyser);
        analyser.connect(audioCtx.destination);

        if (audioCtx.state === "suspended") {
            audioCtx.resume();
        }

        audio.currentTime = 7;

        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    isPlaying = true;
                    animateDance();
                })
                .catch((err) => {
                    console.error("Playback failed directly:", err);
                    audio.src = "song.mp3";
                    audio.volume = DEFAULT_VOLUME;
                    audio.play().then(() => {
                        isPlaying = true;
                        animateDance();
                    });
                });
        }
    } catch (err) {
        console.error("Audio initialization glitch:", err);
    }
}

function animateDance() {
    requestAnimationFrame(animateDance);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!isPlaying) return;

    analyser.getByteFrequencyData(dataArray);
    const bassValue = (dataArray[0] + dataArray[1] + dataArray[2] + dataArray[3]) / 4;

    let sum = 0;
    for (let i = 0; i < bassHistory.length; i++) {
        sum += bassHistory[i];
    }
    const bassAverage = bassHistory.length > 0 ? sum / bassHistory.length : 120;

    bassHistory.push(bassValue);
    if (bassHistory.length > historySize) {
        bassHistory.shift();
    }

    const currentTime = Date.now();
    const timeSinceLastStrike = currentTime - lastStrikeTime;

    if (
        (bassValue > bassAverage * 1.04 && timeSinceLastStrike > 180) ||
        (bassValue >= 240 && timeSinceLastStrike > 320)
    ) {
        triggerLightningStrike();
        lastStrikeTime = currentTime;
    }

    if (lightningOpacity > 0) {
        ctx.globalAlpha = lightningOpacity;
        activeStrikes.forEach((path) => {
            drawLightning(path, 5, 35, "#ff3333");
            drawLightning(path, 1.5, 5, "#ffffff");
        });
        lightningOpacity *= 0.75;
        if (lightningOpacity < 0.01) lightningOpacity = 0;
    }

    const normalized = bassValue / 255;
    const glowIntensity = normalized * 50;
    const redShift = Math.floor(13 + lightningOpacity * 35);

    document.documentElement.style.setProperty("--beat-glow", `${glowIntensity}px`);
    document.documentElement.style.setProperty("--beat-color-pulse", `rgb(${redShift}, 13, 17)`);
}

// Subscribe gate: first-time visitors must click subscribe, then verify, before the links appear.
let clickedSubscribe = false;

function checkLayoutLock() {
    const container = document.getElementById("menu-links");
    const modal = document.getElementById("subscription-modal");
    const subBtn = document.getElementById("subscribe-action-btn");
    const verifyBtn = document.getElementById("verify-action-btn");
    const errorMsg = document.getElementById("locker-error");

    let hasVisitedBefore = null;
    try {
        hasVisitedBefore = localStorage.getItem("stripes_visited");
    } catch (err) {
        console.error("Storage unavailable:", err);
    }

    if (!hasVisitedBefore) {
        container.style.display = "none";
        modal.style.display = "block";

        subBtn.addEventListener("click", () => {
            clickedSubscribe = true;
            errorMsg.style.display = "none";
        });

        verifyBtn.addEventListener("click", () => {
            if (!clickedSubscribe) {
                errorMsg.style.display = "block";
            } else {
                try {
                    localStorage.setItem("stripes_visited", "true");
                } catch (err) {
                    console.error("Storage unavailable:", err);
                }
                modal.style.display = "none";
                container.style.display = "flex";
            }
        });
    } else {
        modal.style.display = "none";
        container.style.display = "flex";
    }
}

const overlay = document.getElementById("overlay-screen");
const siteContent = document.getElementById("site-content");
const enterStatus = document.getElementById("enter-status");

overlay.addEventListener("click", () => {
    enterStatus.textContent = "Loading Track...";
    overlay.classList.add("hidden");
    siteContent.classList.add("active");

    setupAndPlayAudio();
    checkLayoutLock();
});
