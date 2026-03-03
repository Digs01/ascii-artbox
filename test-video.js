const { videoToAscii } = require('./packages/core/dist/index.js');
const fs = require('fs');
const path = require('path');

async function run() {
    try {
        console.log('Testing videoToAscii...');
        // We need a dummy video first
        const execSync = require('child_process').execSync;
        if (!fs.existsSync('test.mp4')) {
            console.log('Generating test.mp4...');
            execSync('ffmpeg -f lavfi -i testsrc=duration=1:size=320x240:rate=10 test.mp4 -y');
        }

        const frames = await videoToAscii('test.mp4', {
            fps: 5,
            width: 50,
            returnFrames: true
        });

        console.log('Result frames count:', frames ? frames.length : 0);
        if (frames && frames.length > 0) {
            console.log('First frame length:', frames[0].length);
            console.log('Second frame length:', frames.length > 1 ? frames[1].length : 'N/A');
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

run();
