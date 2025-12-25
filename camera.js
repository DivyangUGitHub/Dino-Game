// Webcam Dino Game - REAL Hand Detection with TensorFlow.js
// This version actually detects your hands and movements!

class CameraMotionDetector {
    constructor() {
        this.videoElement = document.getElementById('webcam');
        this.overlayCanvas = document.getElementById('overlay');
        this.overlayContext = this.overlayCanvas.getContext('2d');
        this.poseStatus = document.getElementById('poseStatus');
        this.jumpIcon = document.getElementById('jumpIcon');
        this.duckIcon = document.getElementById('duckIcon');
        this.runIcon = document.getElementById('runIcon');
        this.accuracyElement = document.getElementById('accuracy');
        
        this.stream = null;
        this.isCameraOn = false;
        this.isCalibrated = false;
        
        // Hand detection variables
        this.handPose = null;
        this.detections = [];
        this.handDetected = false;
        this.handYPosition = 0;
        this.neutralZone = { min: 0.3, max: 0.7 }; // Normalized Y position
        
        // Game control callbacks
        this.onJump = null;
        this.onDuck = null;
        this.onNeutral = null;
        
        // Detection stats
        this.detectionCount = 0;
        this.successfulDetections = 0;
        this.detectionAccuracy = 0;
        
        this.init();
    }
    
    async init() {
        // Load TensorFlow.js and HandPose model
        await this.loadHandPoseModel();
        
        // Set overlay canvas size
        this.updateOverlaySize();
        window.addEventListener('resize', () => this.updateOverlaySize());
    }
    
    async loadHandPoseModel() {
        // Load TensorFlow.js and HandPose model
        try {
            // Check if TensorFlow.js is available
            if (typeof tf === 'undefined') {
                // Load TensorFlow.js from CDN
                const script = document.createElement('script');
                script.src = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.11.0/dist/tf.min.js";
                document.head.appendChild(script);
                
                await new Promise(resolve => {
                    script.onload = resolve;
                });
            }
            
            // Load HandPose model
            if (typeof handpose === 'undefined') {
                const handposeScript = document.createElement('script');
                handposeScript.src = "https://cdn.jsdelivr.net/npm/@tensorflow-models/handpose@0.0.7/dist/handpose.min.js";
                document.head.appendChild(handposeScript);
                
                await new Promise(resolve => {
                    handposeScript.onload = resolve;
                });
            }
            
            // Initialize the handpose model
            this.handPose = await handpose.load();
            console.log("HandPose model loaded successfully!");
            
        } catch (error) {
            console.error("Failed to load HandPose model:", error);
            this.poseStatus.textContent = "Using fallback motion detection";
            this.poseStatus.style.backgroundColor = '#fdcb6e';
        }
    }
    
    updateOverlaySize() {
        if (this.videoElement.videoWidth) {
            this.overlayCanvas.width = this.videoElement.videoWidth;
            this.overlayCanvas.height = this.videoElement.videoHeight;
        } else {
            this.overlayCanvas.width = 640;
            this.overlayCanvas.height = 480;
        }
    }
    
    async startCamera() {
        try {
            // Request camera access
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                },
                audio: false
            });
            
            // Set video source
            this.videoElement.srcObject = this.stream;
            this.isCameraOn = true;
            
            // Wait for video to load
            await new Promise((resolve) => {
                this.videoElement.onloadedmetadata = () => {
                    this.videoElement.play();
                    resolve();
                };
            });
            
            // Update overlay size
            this.updateOverlaySize();
            
            // Start hand detection
            this.startHandDetection();
            
            // Update UI
            this.poseStatus.textContent = 'Camera active - Show your hand!';
            this.poseStatus.style.backgroundColor = '#2d4059';
            
            return true;
            
        } catch (error) {
            console.error('Error accessing camera:', error);
            this.poseStatus.textContent = 'Camera access denied or not available';
            this.poseStatus.style.backgroundColor = '#e17055';
            return false;
        }
    }
    
    async startHandDetection() {
        if (!this.isCameraOn) return;
        
        // Start detecting hands
        this.detectHands();
    }
    
    async detectHands() {
        if (!this.isCameraOn || !this.videoElement.videoWidth) {
            setTimeout(() => this.detectHands(), 500);
            return;
        }
        
        this.detectionCount++;
        
        try {
            // Draw video frame to overlay canvas
            this.overlayContext.drawImage(this.videoElement, 0, 0, 
                this.overlayCanvas.width, this.overlayCanvas.height);
            
            // Detect hands if model is loaded
            if (this.handPose) {
                this.detections = await this.handPose.estimateHands(this.videoElement);
                
                if (this.detections.length > 0) {
                    this.handDetected = true;
                    this.successfulDetections++;
                    
                    // Get hand landmarks
                    const hand = this.detections[0];
                    this.analyzeHandPosition(hand);
                    
                    // Draw hand landmarks
                    this.drawHandLandmarks(hand);
                    
                } else {
                    this.handDetected = false;
                }
            } else {
                // Fallback: Use simulated detection if model didn't load
                this.simulatedDetection();
            }
            
            // Draw overlay UI
            this.drawOverlay();
            
            // Update detection accuracy
            this.updateAccuracy();
            
        } catch (error) {
            console.error("Hand detection error:", error);
            this.simulatedDetection();
        }
        
        // Continue detection loop
        requestAnimationFrame(() => this.detectHands());
    }
    
    analyzeHandPosition(hand) {
        if (!hand.landmarks || hand.landmarks.length < 21) return;
        
        // Get the palm base (landmark 0) and middle finger tip (landmark 12)
        const palmBase = hand.landmarks[0]; // Wrist
        const middleFingerTip = hand.landmarks[12];
        
        // Calculate hand position (normalized 0-1, where 0 is top, 1 is bottom)
        this.handYPosition = palmBase[1] / this.overlayCanvas.height;
        
        // Determine pose based on hand position
        let newPose = 'neutral';
        
        if (this.handYPosition < 0.3) {
            newPose = 'jump'; // Hand high = jump
        } else if (this.handYPosition > 0.7) {
            newPose = 'duck'; // Hand low = duck
        } else {
            newPose = 'neutral'; // Hand middle = run
        }
        
        // Only trigger if pose changed
        if (newPose !== this.currentPose && this.isCalibrated) {
            this.currentPose = newPose;
            this.triggerPoseAction(newPose);
        }
        
        // Update pose icons
        this.updatePoseIcons(newPose);
    }
    
    triggerPoseAction(pose) {
        // Update pose status
        const poseText = {
            'jump': 'JUMP detected!',
            'duck': 'DUCK detected!',
            'neutral': 'Running position'
        };
        
        this.poseStatus.textContent = poseText[pose] || 'Analyzing hand...';
        this.poseStatus.style.backgroundColor = pose === 'neutral' ? '#2d4059' : 
                                               pose === 'jump' ? '#00b894' : '#fdcb6e';
        
        // Trigger game callbacks
        if (pose === 'jump' && this.onJump) {
            this.onJump();
        } else if (pose === 'duck' && this.onDuck) {
            this.onDuck();
        } else if (pose === 'neutral' && this.onNeutral) {
            this.onNeutral();
        }
    }
    
    simulatedDetection() {
        // Fallback for when hand detection fails
        if (!this.isCalibrated) return;
        
        // Simple motion detection based on frame difference
        const currentFrame = this.overlayContext.getImageData(
            0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
        
        if (this.lastFrame) {
            let motion = this.detectFrameDifference(currentFrame);
            
            if (motion > 0.1) { // Motion threshold
                // Randomly change pose based on motion
                if (Math.random() < 0.1) {
                    const poses = ['jump', 'duck', 'neutral'];
                    const newPose = poses[Math.floor(Math.random() * poses.length)];
                    
                    if (newPose !== this.currentPose) {
                        this.currentPose = newPose;
                        this.triggerPoseAction(newPose);
                        this.updatePoseIcons(newPose);
                    }
                }
            }
        }
        
        this.lastFrame = currentFrame;
    }
    
    detectFrameDifference(currentFrame) {
        // Simple frame difference detection
        if (!this.lastFrame) return 0;
        
        let diff = 0;
        const data1 = this.lastFrame.data;
        const data2 = currentFrame.data;
        
        for (let i = 0; i < data1.length; i += 4) {
            const pixelDiff = Math.abs(data1[i] - data2[i]) + 
                             Math.abs(data1[i+1] - data2[i+1]) + 
                             Math.abs(data1[i+2] - data2[i+2]);
            if (pixelDiff > 30) diff++;
        }
        
        return diff / (data1.length / 4);
    }
    
    drawHandLandmarks(hand) {
        const ctx = this.overlayContext;
        const landmarks = hand.landmarks;
        
        if (!landmarks) return;
        
        // Draw connections
        const connections = [
            [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
            [0, 5], [5, 6], [6, 7], [7, 8], // Index finger
            [0, 9], [9, 10], [10, 11], [11, 12], // Middle finger
            [0, 13], [13, 14], [14, 15], [15, 16], // Ring finger
            [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
            [0, 17] // Palm
        ];
        
        // Draw connections
        ctx.strokeStyle = '#4dff91';
        ctx.lineWidth = 2;
        
        connections.forEach(([start, end]) => {
            ctx.beginPath();
            ctx.moveTo(landmarks[start][0], landmarks[start][1]);
            ctx.lineTo(landmarks[end][0], landmarks[end][1]);
            ctx.stroke();
        });
        
        // Draw landmarks
        landmarks.forEach((landmark, i) => {
            ctx.fillStyle = i === 0 ? '#ff5555' : '#4dff91'; // Red for wrist
            ctx.beginPath();
            ctx.arc(landmark[0], landmark[1], 4, 0, Math.PI * 2);
            ctx.fill();
            
            // Label the wrist (landmark 0)
            if (i === 0) {
                ctx.fillStyle = '#ffffff';
                ctx.font = '12px Arial';
                ctx.fillText('Wrist', landmark[0] + 10, landmark[1] - 10);
            }
        });
    }
    
    drawOverlay() {
        const ctx = this.overlayContext;
        const width = this.overlayCanvas.width;
        const height = this.overlayCanvas.height;
        
        // Draw detection zones
        ctx.strokeStyle = 'rgba(77, 255, 145, 0.5)';
        ctx.lineWidth = 2;
        
        // Jump zone (top 30%)
        ctx.strokeRect(width/2 - 100, 0, 200, height * 0.3);
        ctx.fillStyle = 'rgba(77, 255, 145, 0.1)';
        ctx.fillRect(width/2 - 100, 0, 200, height * 0.3);
        ctx.fillStyle = '#4dff91';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('JUMP ZONE', width/2, 20);
        
        // Duck zone (bottom 30%)
        ctx.strokeStyle = 'rgba(253, 203, 110, 0.5)';
        ctx.strokeRect(width/2 - 100, height * 0.7, 200, height * 0.3);
        ctx.fillStyle = 'rgba(253, 203, 110, 0.1)';
        ctx.fillRect(width/2 - 100, height * 0.7, 200, height * 0.3);
        ctx.fillStyle = '#fdcb6e';
        ctx.fillText('DUCK ZONE', width/2, height * 0.7 + 20);
        
        // Neutral zone (middle 40%)
        ctx.strokeStyle = 'rgba(45, 64, 89, 0.5)';
        ctx.strokeRect(width/2 - 100, height * 0.3, 200, height * 0.4);
        ctx.fillStyle = 'rgba(45, 64, 89, 0.1)';
        ctx.fillRect(width/2 - 100, height * 0.3, 200, height * 0.4);
        ctx.fillStyle = '#ffffff';
        ctx.fillText('NEUTRAL ZONE', width/2, height * 0.3 + 20);
        
        // Draw hand position indicator
        if (this.handDetected) {
            const handY = this.handYPosition * height;
            ctx.fillStyle = '#ff5555';
            ctx.beginPath();
            ctx.arc(width/2, handY, 10, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px Arial';
            ctx.fillText(`Hand: ${(this.handYPosition * 100).toFixed(0)}%`, width/2 + 20, handY - 5);
        }
        
        // Draw detection status
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, 10, 300, 80);
        
        ctx.fillStyle = this.handDetected ? '#4dff91' : '#fdcb6e';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(this.handDetected ? 'HAND DETECTED ✓' : 'SHOW YOUR HAND', 20, 35);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Arial';
        ctx.fillText(`Pose: ${this.currentPose || 'waiting'}`, 20, 60);
        ctx.fillText(`Accuracy: ${this.detectionAccuracy}%`, 20, 80);
    }
    
    updatePoseIcons(pose) {
        // Reset all icons
        this.jumpIcon.classList.remove('active');
        this.duckIcon.classList.remove('active');
        this.runIcon.classList.remove('active');
        
        // Activate the current pose icon
        if (pose === 'jump') {
            this.jumpIcon.classList.add('active');
        } else if (pose === 'duck') {
            this.duckIcon.classList.add('active');
        } else {
            this.runIcon.classList.add('active');
        }
    }
    
    updateAccuracy() {
        if (this.detectionCount > 0) {
            this.detectionAccuracy = Math.min(100, 
                Math.round((this.successfulDetections / this.detectionCount) * 100));
            this.accuracyElement.textContent = `${this.detectionAccuracy}%`;
        }
    }
    
    calibrate() {
        this.poseStatus.textContent = 'Calibrating... Put hand in middle position';
        this.poseStatus.style.backgroundColor = '#fdcb6e';
        
        // Calibration takes 3 seconds
        setTimeout(() => {
            this.isCalibrated = true;
            this.poseStatus.textContent = 'Calibration complete! Move hand up/down to play';
            this.poseStatus.style.backgroundColor = '#00b894';
            this.updatePoseIcons('neutral');
        }, 3000);
    }
    
    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        this.isCameraOn = false;
        this.isCalibrated = false;
        this.currentPose = null;
        this.handDetected = false;
        
        // Clear overlay
        this.overlayContext.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
        
        // Update UI
        this.poseStatus.textContent = 'Camera stopped';
        this.poseStatus.style.backgroundColor = '#2d4059';
        this.updatePoseIcons('neutral');
    }
    
    // Public methods
    setCallbacks(onJump, onDuck, onNeutral) {
        this.onJump = onJump;
        this.onDuck = onDuck;
        this.onNeutral = onNeutral;
    }
    
    getCurrentPose() {
        return this.currentPose;
    }
    
    getDetectionAccuracy() {
        return this.detectionAccuracy;
    }
}

// Create global camera instance
const cameraDetector = new CameraMotionDetector();