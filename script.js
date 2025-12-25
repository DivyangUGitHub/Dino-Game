// Webcam Dino Game - Main Controller
// This module handles UI interactions and connects camera with game

document.addEventListener('DOMContentLoaded', () => {
    // Get UI elements
    const startCameraBtn = document.getElementById('startCamera');
    const calibrateBtn = document.getElementById('calibrate');
    const startGameBtn = document.getElementById('startGame');
    const pauseGameBtn = document.getElementById('pauseGame');
    const resetGameBtn = document.getElementById('resetGame');
    const messageStartBtn = document.getElementById('messageStart');
    const soundToggleBtn = document.getElementById('soundToggle');
    const debugToggleBtn = document.getElementById('debugToggle');
    
    // Sound state
    let soundEnabled = true;
    
    // Debug state
    let debugMode = false;
    
    // Initialize UI
    function initUI() {
        // Set initial game message
        dinoGame.showMessage('WEBCAM DINO GAME', 'Start camera and click Start Game to play', 'start');
        
        // Update button states
        updateButtonStates();
    }
    
    // Update button states based on game and camera status
    function updateButtonStates() {
        const cameraReady = cameraDetector.isCameraOn;
        const calibrated = cameraDetector.isCalibrated;
        const gameState = dinoGame.getGameState();
        
        // Camera button
        startCameraBtn.disabled = false;
        startCameraBtn.innerHTML = cameraReady ? 
            '<i class="fas fa-stop"></i> Stop Camera' : 
            '<i class="fas fa-play"></i> Start Camera';
        
        // Calibrate button
        calibrateBtn.disabled = !cameraReady;
        
        // Game buttons
        startGameBtn.disabled = !cameraReady || !calibrated;
        pauseGameBtn.disabled = gameState !== 'playing' && gameState !== 'paused';
        
        // Update pause button text based on game state
        if (gameState === 'paused') {
            pauseGameBtn.innerHTML = '<i class="fas fa-play"></i> Resume';
            pauseGameBtn.classList.remove('btn-warning');
            pauseGameBtn.classList.add('btn-success');
        } else {
            pauseGameBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
            pauseGameBtn.classList.remove('btn-success');
            pauseGameBtn.classList.add('btn-warning');
        }
    }
    
    // Event Listeners
    startCameraBtn.addEventListener('click', async () => {
        if (!cameraDetector.isCameraOn) {
            // Start camera
            const success = await cameraDetector.startCamera();
            
            if (success) {
                // Enable calibrate button
                calibrateBtn.disabled = false;
                
                // Update game message
                dinoGame.showMessage('CAMERA ACTIVE', 'Calibrate then start the game', 'calibrate');
                
                // Update message button to trigger calibration
                const messageAction = document.getElementById('messageAction');
                if (messageAction) {
                    messageAction.onclick = () => {
                        cameraDetector.calibrate();
                        calibrateBtn.click();
                    };
                    messageAction.innerHTML = '<i class="fas fa-sliders-h"></i> Calibrate';
                }
            }
        } else {
            // Stop camera
            cameraDetector.stopCamera();
            
            // Update game message
            dinoGame.showMessage('CAMERA STOPPED', 'Start camera to play', 'start');
        }
        
        updateButtonStates();
    });
    
    calibrateBtn.addEventListener('click', () => {
        cameraDetector.calibrate();
        
        // Update game message after calibration
        setTimeout(() => {
            if (cameraDetector.isCalibrated) {
                dinoGame.showMessage('CALIBRATION COMPLETE', 'Start the game!', 'start');
            }
            updateButtonStates();
        }, 2100); // Slightly longer than calibration time
    });
    
    startGameBtn.addEventListener('click', () => {
        dinoGame.startGame();
        updateButtonStates();
    });
    
    pauseGameBtn.addEventListener('click', () => {
        dinoGame.pauseGame();
        updateButtonStates();
    });
    
    resetGameBtn.addEventListener('click', () => {
        dinoGame.resetGame();
        updateButtonStates();
    });
    
    messageStartBtn.addEventListener('click', () => {
        startCameraBtn.click();
    });
    
    soundToggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        soundEnabled = !soundEnabled;
        soundToggleBtn.innerHTML = `<i class="fas fa-volume-${soundEnabled ? 'up' : 'mute'}"></i> Sound: ${soundEnabled ? 'ON' : 'OFF'}`;
        
        // In a real implementation, you would toggle game sounds here
        console.log(`Sound ${soundEnabled ? 'enabled' : 'disabled'}`);
    });
    
    debugToggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        debugMode = !debugMode;
        debugToggleBtn.innerHTML = `<i class="fas fa-bug"></i> Debug Mode: ${debugMode ? 'ON' : 'OFF'}`;
        
        // In a real implementation, you would toggle debug visualizations here
        console.log(`Debug mode ${debugMode ? 'enabled' : 'disabled'}`);
        
        // Toggle debug info display
        const accuracyElement = document.getElementById('accuracy');
        if (debugMode) {
            accuracyElement.parentElement.style.display = 'block';
        } else {
            accuracyElement.parentElement.style.display = 'none';
        }
    });
    
    // Keyboard controls for testing (can be disabled in final version)
    document.addEventListener('keydown', (e) => {
        // Only respond if game is playing
        if (dinoGame.getGameState() !== 'playing') return;
        
        switch(e.code) {
            case 'Space':
            case 'ArrowUp':
                e.preventDefault();
                dinoGame.dinoJump();
                break;
            case 'ArrowDown':
                e.preventDefault();
                dinoGame.dinoDuck();
                break;
        }
    });
    
    document.addEventListener('keyup', (e) => {
        if (dinoGame.getGameState() !== 'playing') return;
        
        if (e.code === 'ArrowDown') {
            dinoGame.dinoNeutral();
        }
    });
    
    // Initialize the UI
    initUI();
    
    // Periodically update button states
    setInterval(updateButtonStates, 500);
    
    // Log startup
    console.log('Webcam Dino Game loaded successfully!');
    console.log('Instructions:');
    console.log('1. Click "Start Camera" to enable webcam');
    console.log('2. Click "Calibrate" to set up motion detection');
    console.log('3. Click "Start Game" to begin playing');
    console.log('4. Jump or duck in front of the camera to control the dinosaur');
});