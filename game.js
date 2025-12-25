// Webcam Dino Game - Game Engine
// This module handles the game logic and rendering

class DinoGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameMessage = document.getElementById('gameMessage');
        
        // Game state
        this.gameState = 'idle'; // 'idle', 'playing', 'paused', 'gameOver'
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('dinoHighScore')) || 0;
        this.speed = 1.0;
        this.gameTime = 0;
        this.obstaclesAvoided = 0;
        
        // Game elements
        this.dino = {
            x: 80,
            y: this.canvas.height - 100,
            width: 60,
            height: 80,
            jumpVelocity: 0,
            isJumping: false,
            isDucking: false,
            duckHeight: 40,
            normalHeight: 80,
            color: '#4dff91'
        };
        
        this.ground = {
            y: this.canvas.height - 20,
            height: 20,
            color: '#555'
        };
        
        this.obstacles = [];
        this.clouds = [];
        this.stars = [];
        
        // Game settings
        this.gravity = 0.8;
        this.jumpForce = -16;
        this.obstacleSpeed = 5;
        this.obstacleFrequency = 0.02; // Chance per frame
        this.lastObstacleTime = 0;
        
        // Game loop control
        this.lastTime = 0;
        this.gameLoopId = null;
        
        // UI elements
        this.scoreElement = document.getElementById('score');
        this.highScoreElement = document.getElementById('highScore');
        this.speedElement = document.getElementById('speed');
        this.obstaclesAvoidedElement = document.getElementById('obstaclesAvoided');
        this.gameTimeElement = document.getElementById('gameTime');
        
        // Initialize
        this.init();
    }
    
    init() {
        // Set initial high score display
        this.highScoreElement.textContent = this.highScore.toString().padStart(5, '0');
        
        // Create initial clouds and stars for background
        this.createBackgroundElements();
        
        // Bind camera callbacks
        if (typeof cameraDetector !== 'undefined') {
            cameraDetector.setCallbacks(
                () => this.dinoJump(),    // onJump
                () => this.dinoDuck(),    // onDuck  
                () => this.dinoNeutral()  // onNeutral
            );
        }
    }
    
    createBackgroundElements() {
        // Create clouds
        for (let i = 0; i < 5; i++) {
            this.clouds.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * (this.canvas.height / 2),
                width: 60 + Math.random() * 60,
                height: 30 + Math.random() * 20,
                speed: 0.5 + Math.random() * 1,
                color: 'rgba(255, 255, 255, 0.7)'
            });
        }
        
        // Create stars (for night mode)
        for (let i = 0; i < 30; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * (this.canvas.height / 2),
                size: 1 + Math.random() * 2,
                brightness: 0.5 + Math.random() * 0.5
            });
        }
    }
    
    startGame() {
        if (this.gameState === 'playing') return;
        
        // Reset game state
        this.score = 0;
        this.speed = 1.0;
        this.gameTime = 0;
        this.obstaclesAvoided = 0;
        this.obstacles = [];
        
        // Reset dino
        this.dino.y = this.canvas.height - 100;
        this.dino.jumpVelocity = 0;
        this.dino.isJumping = false;
        this.dino.isDucking = false;
        this.dino.height = this.dino.normalHeight;
        
        // Update UI
        this.updateUI();
        this.hideMessage();
        
        // Set game state
        this.gameState = 'playing';
        
        // Start game loop
        this.lastTime = performance.now();
        this.gameLoop();
    }
    
    pauseGame() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            this.showMessage('GAME PAUSED', 'Click Resume to continue', 'resume');
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            this.hideMessage();
            this.gameLoop();
        }
    }
    
    resetGame() {
        this.gameState = 'idle';
        this.score = 0;
        this.speed = 1.0;
        this.gameTime = 0;
        this.obstaclesAvoided = 0;
        this.obstacles = [];
        
        // Reset dino
        this.dino.y = this.canvas.height - 100;
        this.dino.jumpVelocity = 0;
        this.dino.isJumping = false;
        this.dino.isDucking = false;
        this.dino.height = this.dino.normalHeight;
        
        // Update UI
        this.updateUI();
        
        // Show start message
        this.showMessage('WEBCAM DINO GAME', 'Start camera and click Start Game to play', 'start');
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        
        // Update high score if needed
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('dinoHighScore', this.highScore.toString());
            this.showMessage('GAME OVER', `NEW HIGH SCORE: ${this.score}`, 'restart');
        } else {
            this.showMessage('GAME OVER', `SCORE: ${this.score}`, 'restart');
        }
        
        // Update UI
        this.highScoreElement.textContent = this.highScore.toString().padStart(5, '0');
    }
    
    gameLoop(currentTime = performance.now()) {
        if (this.gameState !== 'playing') return;
        
        // Calculate delta time
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        // Update game time
        this.gameTime += deltaTime / 1000; // Convert to seconds
        
        // Update game elements
        this.update(deltaTime);
        
        // Render
        this.render();
        
        // Continue game loop
        this.gameLoopId = requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    update(deltaTime) {
        // Update dino
        this.updateDino();
        
        // Update obstacles
        this.updateObstacles(deltaTime);
        
        // Update background
        this.updateBackground(deltaTime);
        
        // Spawn new obstacles
        this.spawnObstacles();
        
        // Check collisions
        this.checkCollisions();
        
        // Update score and speed
        this.updateScore(deltaTime);
        
        // Update UI
        this.updateUI();
    }
    
    updateDino() {
        // Apply gravity if jumping
        if (this.dino.isJumping) {
            this.dino.jumpVelocity += this.gravity;
            this.dino.y += this.dino.jumpVelocity;
            
            // Check if landed
            if (this.dino.y >= this.canvas.height - 100) {
                this.dino.y = this.canvas.height - 100;
                this.dino.isJumping = false;
                this.dino.jumpVelocity = 0;
            }
        }
        
        // Update ducking state
        if (this.dino.isDucking) {
            this.dino.height = this.dino.duckHeight;
        } else {
            this.dino.height = this.dino.normalHeight;
        }
    }
    
    updateObstacles(deltaTime) {
        // Move obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            obstacle.x -= this.obstacleSpeed * this.speed;
            
            // Remove if off screen
            if (obstacle.x + obstacle.width < 0) {
                this.obstacles.splice(i, 1);
                this.obstaclesAvoided++;
            }
        }
    }
    
    updateBackground(deltaTime) {
        // Move clouds
        for (const cloud of this.clouds) {
            cloud.x -= cloud.speed * (this.speed * 0.5);
            
            // Reset if off screen
            if (cloud.x + cloud.width < 0) {
                cloud.x = this.canvas.width;
                cloud.y = Math.random() * (this.canvas.height / 2);
            }
        }
        
        // Move stars (slower than clouds)
        for (const star of this.stars) {
            star.x -= 0.2 * (this.speed * 0.3);
            
            // Reset if off screen
            if (star.x < 0) {
                star.x = this.canvas.width;
                star.y = Math.random() * (this.canvas.height / 2);
            }
        }
    }
    
    spawnObstacles() {
        // Increase spawn chance with score
        const adjustedFrequency = this.obstacleFrequency + (this.score / 100000);
        
        // Spawn new obstacle randomly
        if (Math.random() < adjustedFrequency && 
            this.obstacles.length < 3 && 
            this.gameTime - this.lastObstacleTime > 1) {
            
            const types = ['cactus', 'bird', 'rock'];
            const type = types[Math.floor(Math.random() * types.length)];
            
            let height, y;
            
            if (type === 'bird') {
                height = 40;
                y = this.canvas.height - 180 + Math.random() * 50; // Flying
            } else if (type === 'rock') {
                height = 50;
                y = this.canvas.height - 70; // On ground
            } else {
                // cactus
                height = 60 + Math.random() * 40;
                y = this.canvas.height - 80; // On ground
            }
            
            this.obstacles.push({
                x: this.canvas.width,
                y: y,
                width: type === 'bird' ? 60 : 40,
                height: height,
                type: type,
                color: type === 'bird' ? '#e17055' : 
                       type === 'rock' ? '#aaa' : '#33cc73'
            });
            
            this.lastObstacleTime = this.gameTime;
        }
    }
    
    checkCollisions() {
        const dinoLeft = this.dino.x;
        const dinoRight = this.dino.x + this.dino.width;
        const dinoTop = this.dino.y;
        const dinoBottom = this.dino.y + this.dino.height;
        
        for (const obstacle of this.obstacles) {
            const obstacleLeft = obstacle.x;
            const obstacleRight = obstacle.x + obstacle.width;
            const obstacleTop = obstacle.y;
            const obstacleBottom = obstacle.y + obstacle.height;
            
            // Simple AABB collision detection
            if (dinoRight > obstacleLeft && 
                dinoLeft < obstacleRight && 
                dinoBottom > obstacleTop && 
                dinoTop < obstacleBottom) {
                
                // Game over on collision
                this.gameOver();
                break;
            }
        }
    }
    
    updateScore(deltaTime) {
        // Increase score over time
        this.score += Math.floor(deltaTime / 10) * this.speed;
        
        // Increase speed gradually
        if (this.gameTime > 30 && this.speed < 2.5) {
            this.speed = 1.0 + (this.gameTime / 40);
        }
    }
    
    updateUI() {
        // Update score display
        this.scoreElement.textContent = this.score.toString().padStart(5, '0');
        
        // Update speed display
        this.speedElement.textContent = `x${this.speed.toFixed(1)}`;
        
        // Update obstacles avoided
        this.obstaclesAvoidedElement.textContent = this.obstaclesAvoided.toString();
        
        // Update game time
        const minutes = Math.floor(this.gameTime / 60);
        const seconds = Math.floor(this.gameTime % 60);
        this.gameTimeElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw gradient background
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#0c1427');
        gradient.addColorStop(1, '#1a1a2e');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw stars
        for (const star of this.stars) {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
            this.ctx.fillRect(star.x, star.y, star.size, star.size);
        }
        
        // Draw clouds
        for (const cloud of this.clouds) {
            this.ctx.fillStyle = cloud.color;
            this.ctx.beginPath();
            this.ctx.ellipse(cloud.x, cloud.y, cloud.width/2, cloud.height/2, 0, 0, Math.PI * 2);
            this.ctx.ellipse(cloud.x + cloud.width/3, cloud.y - cloud.height/4, cloud.width/3, cloud.height/2, 0, 0, Math.PI * 2);
            this.ctx.ellipse(cloud.x - cloud.width/3, cloud.y - cloud.height/4, cloud.width/3, cloud.height/2, 0, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Draw ground
        this.ctx.fillStyle = this.ground.color;
        this.ctx.fillRect(0, this.ground.y, this.canvas.width, this.ground.height);
        
        // Draw ground pattern
        this.ctx.fillStyle = '#444';
        for (let x = 0; x < this.canvas.width; x += 30) {
            this.ctx.fillRect(x, this.ground.y, 15, 3);
        }
        
        // Draw obstacles
        for (const obstacle of this.obstacles) {
            this.ctx.fillStyle = obstacle.color;
            
            if (obstacle.type === 'cactus') {
                // Draw cactus
                this.ctx.fillRect(obstacle.x, obstacle.y, 15, obstacle.height);
                this.ctx.fillRect(obstacle.x - 10, obstacle.y + obstacle.height - 30, 35, 15);
                this.ctx.fillRect(obstacle.x - 5, obstacle.y + obstacle.height - 50, 25, 10);
            } else if (obstacle.type === 'bird') {
                // Draw bird
                this.ctx.beginPath();
                this.ctx.ellipse(obstacle.x, obstacle.y, obstacle.width/2, obstacle.height/2, 0, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Bird wing
                this.ctx.beginPath();
                this.ctx.ellipse(obstacle.x - 15, obstacle.y, 10, 5, Math.PI/4, 0, Math.PI * 2);
                this.ctx.fill();
            } else {
                // Draw rock
                this.ctx.beginPath();
                this.ctx.ellipse(obstacle.x + obstacle.width/2, obstacle.y + obstacle.height/2, 
                                obstacle.width/2, obstacle.height/2, 0, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        
        // Draw dino
        this.ctx.fillStyle = this.dino.color;
        
        if (this.dino.isDucking) {
            // Ducking dino
            this.ctx.fillRect(this.dino.x, this.dino.y, this.dino.width, this.dino.height);
            
            // Dino head (while ducking)
            this.ctx.beginPath();
            this.ctx.ellipse(this.dino.x + this.dino.width - 10, this.dino.y + 10, 15, 10, 0, 0, Math.PI * 2);
            this.ctx.fill();
        } else {
            // Standing/jumping dino
            this.ctx.fillRect(this.dino.x, this.dino.y, this.dino.width - 20, this.dino.height);
            
            // Dino legs
            this.ctx.fillRect(this.dino.x + 10, this.dino.y + this.dino.height - 10, 15, 20);
            this.ctx.fillRect(this.dino.x + 30, this.dino.y + this.dino.height - 10, 15, 20);
            
            // Dino tail
            this.ctx.fillRect(this.dino.x - 15, this.dino.y + 20, 15, 10);
            
            // Dino head
            this.ctx.beginPath();
            this.ctx.ellipse(this.dino.x + this.dino.width - 20, this.dino.y + 20, 20, 15, 0, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Dino eye
            this.ctx.fillStyle = '#000';
            this.ctx.beginPath();
            this.ctx.arc(this.dino.x + this.dino.width - 25, this.dino.y + 15, 3, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Dino smile
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(this.dino.x + this.dino.width - 30, this.dino.y + 25, 8, 0, Math.PI);
            this.ctx.stroke();
        }
        
        // Draw score on canvas too
        this.ctx.fillStyle = '#4dff91';
        this.ctx.font = '20px "Press Start 2P", monospace';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`SCORE: ${this.score.toString().padStart(5, '0')}`, this.canvas.width - 20, 30);
        
        // Draw speed indicator
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`SPEED: x${this.speed.toFixed(1)}`, 20, 30);
    }
    
    showMessage(title, text, action = 'start') {
        this.gameMessage.innerHTML = `
            <h2>${title}</h2>
            <p>${text}</p>
            <button id="messageAction" class="btn btn-primary">
                <i class="fas fa-${action === 'start' ? 'play' : action === 'resume' ? 'play' : 'redo'}"></i>
                ${action === 'start' ? 'Start Game' : action === 'resume' ? 'Resume' : 'Play Again'}
            </button>
        `;
        this.gameMessage.style.display = 'flex';
        
        // Add event listener to the button
        setTimeout(() => {
            const button = document.getElementById('messageAction');
            if (button) {
                button.onclick = () => {
                    if (action === 'start' || action === 'restart') {
                        this.startGame();
                    } else if (action === 'resume') {
                        this.pauseGame(); // This will resume since we're paused
                    }
                };
            }
        }, 10);
    }
    
    hideMessage() {
        this.gameMessage.style.display = 'none';
    }
    
    // Dino control methods (called by camera detector)
    dinoJump() {
        if (this.gameState !== 'playing' || this.dino.isJumping) return;
        
        this.dino.isJumping = true;
        this.dino.jumpVelocity = this.jumpForce;
        this.dino.isDucking = false;
    }
    
    dinoDuck() {
        if (this.gameState !== 'playing' || this.dino.isJumping) return;
        
        this.dino.isDucking = true;
    }
    
    dinoNeutral() {
        if (this.gameState !== 'playing') return;
        
        this.dino.isDucking = false;
    }
    
    // Public methods for UI control
    getGameState() {
        return this.gameState;
    }
}

// Create global game instance
const dinoGame = new DinoGame();