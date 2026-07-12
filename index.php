<?php require_once 'logger.php'; ?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>StripesVR Homepage</title>
    <style>
        :root {
            --beat-glow: 0px;
            --beat-color-pulse: #0d0d11;
        }

        body {
            background-color: var(--beat-color-pulse);
            background-image: radial-gradient(circle at center, rgba(255, 30, 30, 0.15) 0%, transparent 80%);
            color: #ffffff;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            min-height: 100vh;
            margin: 0;
            padding: 40px 20px;
            box-sizing: border-box;
            overflow-x: hidden;
            position: relative;
        }

        canvas#lightning-canvas {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            pointer-events: none;
            z-index: 1;
        }

        .main-content {
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            filter: blur(20px);
            transition: filter 1.2s cubic-bezier(0.25, 1, 0.5, 1);
            pointer-events: none;
            position: relative;
            z-index: 2;
        }

        .main-content.active {
            filter: blur(0px);
            pointer-events: auto;
        }

        .enter-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(13, 13, 17, 0.95);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            cursor: pointer;
            transition: opacity 0.8s ease, visibility 0.8s;
        }

        .enter-overlay.hidden {
            opacity: 0;
            visibility: hidden;
        }

        .enter-text {
            font-size: 2rem;
            font-weight: bold;
            color: #ffffff;
            letter-spacing: 3px;
            text-transform: uppercase;
            text-shadow: 0 0 15px rgba(255, 51, 51, 0.9), 
                         0 0 30px rgba(255, 51, 51, 0.5);
            animation: pulseText 2s infinite ease-in-out;
        }

        @keyframes pulseText {
            0%, 100% { transform: scale(1); opacity: 0.8; }
            50% { transform: scale(1.05); opacity: 1; }
        }

        .profile-pic {
            width: 150px;
            height: 150px;
            object-fit: cover;
            border: 5px solid #ff1111;
            box-shadow: 0 0 calc(20px + var(--beat-glow)) rgba(255, 10, 10, 0.6);
            margin-bottom: 20px;
            border-radius: 50%;
        }

        .title-container {
            height: 60px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 40px;
        }

        .typewriter-text {
            font-size: 2.5rem;
            font-weight: bold;
            color: #ffffff;
            text-shadow: 0 0 calc(15px + var(--beat-glow)) rgba(255, 10, 10, 0.8), 
                         0 0 calc(30px + var(--beat-glow)) rgba(255, 0, 0, 0.5);
            letter-spacing: 2px;
            border-right: 3px solid #ff1111;
            white-space: nowrap;
            background: transparent;
            padding-right: 4px;
            animation: blink 0.75s step-end infinite;
        }

        @keyframes blink {
            from, to { border-color: transparent }
            50% { border-color: #ff1111; }
        }

        .links-container {
            width: 100%;
            max-width: 500px;
            display: flex;
            flex-direction: column;
            gap: 20px;
            margin-bottom: 40px;
        }

        .card-link {
            background: linear-gradient(135deg, #16161f 0%, #1f1f2e 100%);
            border: 1px solid #33334d;
            border-radius: 12px;
            padding: 15px 20px;
            text-decoration: none;
            color: #ffffff;
            display: flex;
            flex-direction: column;
            transition: all 0.1s ease;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        }

        .card-link:hover {
            transform: translateY(-3px);
            border-color: #ff1111;
            box-shadow: 0 6px 25px rgba(255, 10, 10, 0.5);
        }

        .btn-name {
            font-size: 1.25rem;
            font-weight: bold;
            color: #ff3333;
            margin-bottom: 5px;
        }

        .btn-description {
            font-size: 0.9rem;
            color: #b0b0bc;
            line-height: 1.4;
        }

        .counter-container {
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            margin-top: 20px;
        }

        .counter-label {
            font-size: 1rem;
            color: #ff1111;
            text-shadow: 0 0 10px rgba(255, 11, 11, 0.6);
            margin-bottom: 8px;
            font-weight: 500;
            letter-spacing: 2px;
        }

        .counter-digits {
            font-size: 1.6rem;
            font-weight: bold;
            color: #ffffff;
            font-family: monospace;
            letter-spacing: 4px;
            text-shadow: 0 0 calc(10px + var(--beat-glow)) rgba(255, 10, 10, 0.8);
        }
    </style>
</head>
<body>

    <canvas id="lightning-canvas"></canvas>
    <audio id="bg-audio" crossorigin="anonymous"></audio>

    <div class="enter-overlay" id="overlay-screen">
        <div class="enter-text" id="enter-status">Click to Enter...</div>
    </div>

    <div class="main-content" id="site-content">
        <img src="151.png" alt="StripesVR Profile Picture" class="profile-pic">

        <div class="title-container">
            <div class="typewriter-text" id="typewriter"></div>
        </div>

        <div class="links-container">
            <a href="frida.html" class="card-link">
                <span class="btn-name">Frida Tools</span>
                <span class="btn-description">Needed For Every Mod In Here!</span>
            </a>
        
            <a href="cyber.html" class="card-link">
                <span class="btn-name">Cyber.exe Tutorial</span>
                <span class="btn-description">All Of The Downloads And Links Needed For The Cyber.exe Mod Menu</span>
            </a>

            <a href="n5.html" class="card-link">
                <span class="btn-name">N5 Menu Tutorial</span>
                <span class="btn-description">All The Downloads Needed For The N5 Modding Tutorial</span>
            </a>

            <a href="standy.html" class="card-link">
                <span class="btn-name">Standy Mod</span>
                <span class="btn-description">Download N Stuff For Standy Mod Works For Every Game!</span>
            </a>
        </div>

        <div class="counter-container">
            <div class="counter-label">VIEWS</div>
            <div class="counter-digits" id="view-counter">000000</div>
        </div>
    </div>

    <script>
        const textArray = ["StripesVR"];
        let textIndex = 0;
        let charIndex = 0;
        let isDeleting = false;
        const typeSpeed = 150;  
        const eraseSpeed = 100; 
        const delayBetween = 2500; 
        const typewriterElement = document.getElementById("typewriter");

        function type() {
            const currentText = textArray[textIndex];
            if (isDeleting) {
                typewriterElement.textContent = currentText.substring(0, charIndex - 1);
                charIndex--;
            } else {
                typewriterElement.textContent = currentText.substring(0, charIndex + 1);
                charIndex++;
            }

            let nextActionSpeed = isDeleting ? eraseSpeed : typeSpeed;

            if (!isDeleting && charIndex === currentText.length) {
                nextActionSpeed = delayBetween; 
                isDeleting = true;
            } else if (isDeleting && charIndex === 0) {
                isDeleting = false;
                nextActionSpeed = 500; 
            }
            setTimeout(type, nextActionSpeed);
        }

        const canvas = document.getElementById('lightning-canvas');
        const ctx = canvas.getContext('2d');

        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        let lightningOpacity = 0;
        let activeStrikes = [];

        function createLightningPath(startX, startY, endY, segments) {
            let path = [{x: startX, y: startY}];
            let currentX = startX;
            let currentY = startY;
            let segmentHeight = (endY - startY) / segments;

            for (let i = 0; i < segments; i++) {
                currentY += segmentHeight;
                let deviation = (Math.random() - 0.5) * 110; 
                currentX += deviation;
                path.push({x: currentX, y: currentY});
            }
            return path;
        }

        function drawLightning(path, width, glowSize, color) {
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.shadowBlur = glowSize;
            ctx
