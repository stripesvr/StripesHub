const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/clip', (req, res) => {
    const { url, start, end } = req.body;
    const outputFilename = `clip_${Date.now()}.mp4`;
    const outputPath = path.join(__dirname, outputFilename);

    console.log(`🎬 Processing clip request for URL: ${url} (${start} to ${end})`);

    // Step 1: Ask yt-dlp to get the hidden direct stream URLs from the platform
    const command = `yt-dlp -g "${url}"`;

    exec(command, (error, stdout) => {
        if (error) {
            console.error(`❌ yt-dlp error: ${error.message}`);
            return res.status(500).json({ error: "Failed to fetch stream links. Is yt-dlp installed?" });
        }

        // Split out the video and audio direct stream links returned by yt-dlp
        const streamUrls = stdout.trim().split('\n');
        const videoStream = streamUrls[0];
        const audioStream = streamUrls[1] || videoStream; // fallback if stream is combined

        console.log("⚡ Stream links found! Slicing segment with FFmpeg...");

        // Step 2: Tell FFmpeg to grab just the segment between start and end times
        const ffmpegCmd = `ffmpeg -ss ${start} -i "${videoStream}" -ss ${start} -i "${audioStream}" -to ${end} -c:v libx264 -c:a aac -strict -2 "${outputPath}"`;

        exec(ffmpegCmd, (ffmpegErr) => {
            if (ffmpegErr) {
                console.error(`❌ FFmpeg error: ${ffmpegErr.message}`);
                return res.status(500).json({ error: "Failed to slice video segment. Is FFmpeg installed?" });
            }

            console.log("🎉 Clip created! Sending to frontend...");

            // Step 3: Send the finished .mp4 file back to the browser
            res.download(outputPath, outputFilename, (err) => {
                if (err) console.error("Error sending file:", err);
                
                // Clean up and delete the temporary clip from your computer to save space
                if (fs.existsSync(outputPath)) {
                    fs.unlinkSync(outputPath);
                }
            });
        });
    });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Clip API Processing Engine Online at http://localhost:${PORT}`));
