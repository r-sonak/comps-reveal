/**
 * Main Game Class
 * Handles all game logic, rendering, and state management
 */
export class Game {
  constructor() {
    // Game state
    this.isPlaying = false;
    this.score = 0;
    this.playerRow = 14; // Start at bottom row
    this.playerCol = 4; // Start in middle column
    this.gameSpeed = 400; // Milliseconds between car movements (faster)
    this.cars = []; // Array of car objects
    this.gameInterval = null;
    this.carInterval = null;
    
    // Grid dimensions
    this.gridRows = 15;
    this.gridCols = 10;
    
    // Competition data
    this.competitions = [
      {
        name: 'Nasha',
        city: 'West Lafayette, IN',
        host: 'Purdue',
        date: 'Jan 31, 2026'
      },
      {
        name: 'Blacksburg Ki Badmaash (BKB)',
        city: 'Blacksburg, VA',
        host: 'Virginia Tech',
        date: 'Feb 7, 2026'
      },
      {
        name: 'River City Raas (RCR)',
        city: 'Richmond, VA',
        host: 'VCU',
        date: 'Feb 14, 2026'
      },
      {
        name: 'Maryland Masti',
        city: 'College Park, MD',
        host: 'University of Maryland',
        date: 'Mar 7, 2026'
      }
    ];
    
    // Revealed competitions (indices)
    this.revealedComps = [];
    
    // DOM elements
    this.titleScreen = null;
    this.gameScreen = null;
    this.gameOverModal = null;
    this.gameGrid = null;
    this.scoreDisplay = null;
    this.competitionCards = null;
    this.playButton = null;
    this.playAgainButton = null;
    this.revealModal = null;
    
    // Input state
    this.isWaitingForInput = false;
    this.touchStartX = 0;
    this.touchStartY = 0;
    
    // Bind methods
    this.handleKeyPress = this.handleKeyPress.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    this.checkCollisions = this.checkCollisions.bind(this);
  }
  
  /**
   * Initialize the game - set up DOM references and event listeners
   */
  init() {
    // Get DOM elements
    this.titleScreen = document.getElementById('title-screen');
    this.gameScreen = document.getElementById('game-screen');
    this.gameOverModal = document.getElementById('game-over-modal');
    this.gameGrid = document.getElementById('game-grid');
    this.scoreDisplay = document.getElementById('score');
    this.competitionCards = document.getElementById('competition-cards');
    this.playButton = document.getElementById('play-button');
    this.playAgainButton = document.getElementById('play-again-button');
    this.revealModal = document.getElementById('reveal-modal');
    
    // Set up event listeners
    this.playButton.addEventListener('click', () => this.startGame());
    this.playAgainButton.addEventListener('click', () => this.startGame());
    
    // Check if we should show all competitions (3+ games played)
    this.checkPermanentReveals();
    
    // Render initial competition cards
    this.renderCompetitionCards();
  }
  
  /**
   * Check localStorage for playthrough count and show all competitions if >= 3
   */
  checkPermanentReveals() {
    const playthroughs = parseInt(localStorage.getItem('playthroughs') || '0');
    if (playthroughs >= 3) {
      // Show all competitions permanently
      this.revealedComps = [0, 1, 2, 3];
    }
  }
  
  /**
   * Start a new game
   */
  startGame() {
    // Hide title screen and modal
    this.titleScreen.classList.remove('active');
    this.gameOverModal.classList.remove('active');
    if (this.revealModal) this.revealModal.classList.remove('active');
    
    // Show game screen
    this.gameScreen.classList.add('active');
    
    // Reset game state
    this.isPlaying = true;
    this.isWaitingForInput = false;
    this.score = 0;
    this.playerRow = 14;
    this.playerCol = 4;
    this.cars = [];
    this.revealedComps = [];
    
    // Check for permanent reveals
    // this.checkPermanentReveals(); // Disabled
    
    // Render competition cards
    this.renderCompetitionCards();
    
    // Update score display
    this.updateScore();
    
    // Render game grid
    this.renderGrid();
    
    // Add keyboard listener
    window.addEventListener('keydown', this.handleKeyPress);
    
    // Add touch listeners
    document.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    document.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    
    // Start game loop
    this.startGameLoop();
    
    // Start spawning cars
    this.startCarSpawning();
  }
  
  /**
   * Render the game grid
   */
  renderGrid() {
    this.gameGrid.innerHTML = '';
    
    // Create cells
    for (let row = 0; row < this.gridRows; row++) {
      for (let col = 0; col < this.gridCols; col++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.row = row;
        cell.dataset.col = col;
        
        // Mark road lanes (rows 1-13 are roads)
        if (row > 0 && row < 14) {
          cell.classList.add('lane');
        }
        
        this.gameGrid.appendChild(cell);
      }
    }
    
    // Render player
    this.renderPlayer();
    
    // Render cars
    this.renderCars();
  }
  
  /**
   * Render the player
   */
  renderPlayer() {
    const cell = this.getCell(this.playerRow, this.playerCol);
    if (cell) {
      const player = document.createElement('div');
      player.className = 'player';
      player.textContent = '🐻'; // Bear emoji for player
      cell.appendChild(player);
    }
  }
  
  /**
   * Render all cars
   */
  renderCars() {
    // Clear existing cars
    document.querySelectorAll('.car').forEach(car => car.remove());
    
    // Render each car
    this.cars.forEach(car => {
      const cell = this.getCell(car.row, car.col);
      if (cell) {
        const carElement = document.createElement('div');
        carElement.className = `car ${car.direction}`;
        carElement.textContent = '🚗'; // Car emoji
        cell.appendChild(carElement);
      }
    });
  }
  
  /**
   * Get a cell element by row and column
   */
  getCell(row, col) {
    return document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
  }
  
  /**
   * Handle keyboard input
   */
  handleKeyPress(event) {
    // If waiting for input on reveal screen, any key resumes game
    if (this.isWaitingForInput) {
      this.resumeGame();
      return;
    }

    if (!this.isPlaying) return;
    
    let newRow = this.playerRow;
    let newCol = this.playerCol;
    
    switch(event.key) {
      case 'ArrowUp':
        newRow = Math.max(0, this.playerRow - 1);
        break;
      case 'ArrowDown':
        newRow = Math.min(this.gridRows - 1, this.playerRow + 1);
        break;
      case 'ArrowLeft':
        newCol = Math.max(0, this.playerCol - 1);
        break;
      case 'ArrowRight':
        newCol = Math.min(this.gridCols - 1, this.playerCol + 1);
        break;
      default:
        return;
    }
    
    // Only move if position changed
    if (newRow !== this.playerRow || newCol !== this.playerCol) {
      const oldRow = this.playerRow;
      this.playerRow = newRow;
      this.playerCol = newCol;
      
      // Check if player moved up (score increase)
      if (newRow < oldRow) {
        this.score++;
        this.updateScore();
        this.checkCompetitionReveals();
      }
      
      // Infinite Scroll Logic:
      // If score is high enough (> 13) and player is near top (< 5),
      // shift the grid "up" (move player down) to create endless road effect
      if (this.score > 13 && this.playerRow < 5) {
        this.playerRow += 10;
        // Also shift cars down to match, or just let them be (they regenerate)
        // Shifting cars ensures we don't teleport into one easily
        this.cars.forEach(car => {
          car.row += 10;
        });
        // Remove cars that went off bottom
        this.cars = this.cars.filter(car => car.row < this.gridRows);
      }
      
      // Re-render
      this.renderGrid();
      
      // Check for collisions
      if (this.checkCollisions()) {
        this.gameOver();
      }
    }
  }
  
  /**
   * Check for collisions between player and cars
   */
  checkCollisions() {
    return this.cars.some(car => 
      car.row === this.playerRow && car.col === this.playerCol
    );
  }
  
  /**
   * Start the game loop (car movement)
   */
  startGameLoop() {
    this.gameInterval = setInterval(() => {
      if (!this.isPlaying) return;
      
      // Move all cars
      this.cars.forEach(car => {
        if (car.direction === 'left') {
          car.col--;
          if (car.col < 0) {
            car.col = this.gridCols - 1; // Wrap around
          }
        } else {
          car.col++;
          if (car.col >= this.gridCols) {
            car.col = 0; // Wrap around
          }
        }
      });
      
      // Re-render cars
      this.renderCars();
      
      // Check for collisions
      if (this.checkCollisions()) {
        this.gameOver();
      }
    }, this.gameSpeed);
  }
  
  /**
   * Start spawning cars randomly
   */
  startCarSpawning() {
    // Spawn initial cars
    this.spawnCars();
    
    // Spawn new cars periodically
    this.carInterval = setInterval(() => {
      if (this.isPlaying) {
        this.spawnCars();
      }
    }, 1200); // Faster spawns
  }
  
  /**
   * Spawn cars in random lanes
   */
  spawnCars() {
    // Spawn 2-5 cars in random road lanes (rows 1-13)
    const numCars = Math.floor(Math.random() * 4) + 2;
    
    for (let i = 0; i < numCars; i++) {
      const row = Math.floor(Math.random() * 12) + 1; // Rows 1-13
      const direction = Math.random() > 0.5 ? 'left' : 'right';
      const col = direction === 'left' 
        ? this.gridCols - 1  // Start from right
        : 0;                  // Start from left
      
      // Don't spawn if there's already a car in this row
      if (!this.cars.some(car => car.row === row)) {
        this.cars.push({ row, col, direction });
      }
    }
    
    this.renderCars();
  }
  
  /**
   * Update score display
   */
  updateScore() {
    this.scoreDisplay.textContent = this.score;
  }
  
  /**
   * Check if score milestones are reached and reveal competitions
   */
  checkCompetitionReveals() {
    // Disabled permanent reveals feature
    /*
    // Check if we should show all competitions permanently
    const playthroughs = parseInt(localStorage.getItem('playthroughs') || '0');
    if (playthroughs >= 3) {
      // All competitions should already be revealed
      return;
    }
    */
    
    // Check milestones: 10, 20, 30, 40
    const milestones = [10, 20, 30, 40];
    milestones.forEach((milestone, index) => {
      if (this.score === milestone && !this.revealedComps.includes(index)) {
        this.revealedComps.push(index);
        this.renderCompetitionCards();
        this.showRevealModal(index);
      }
    });
  }
  
  /**
   * Show full-screen reveal modal and pause game
   */
  showRevealModal(index) {
    this.pauseGame();
    
    const comp = this.competitions[index];
    document.getElementById('reveal-name').textContent = comp.name;
    document.getElementById('reveal-city').textContent = `📍 ${comp.city}`;
    document.getElementById('reveal-host').textContent = `🏫 ${comp.host}`;
    document.getElementById('reveal-date').textContent = `📅 ${comp.date}`;
    
    this.revealModal.classList.add('active');
    this.isWaitingForInput = true;
  }
  
  /**
   * Pause the game loop
   */
  pauseGame() {
    this.isPlaying = false;
    if (this.gameInterval) clearInterval(this.gameInterval);
    if (this.carInterval) clearInterval(this.carInterval);
    // We keep the keyboard listener to detect the "continue" key press
  }
  
  /**
   * Resume the game after reveal
   */
  resumeGame() {
    this.revealModal.classList.remove('active');
    this.isWaitingForInput = false;
    this.isPlaying = true;
    this.startGameLoop();
    this.startCarSpawning();
  }
  
  /**
   * Render competition cards
   */
  renderCompetitionCards() {
    this.competitionCards.innerHTML = '';
    
    this.competitions.forEach((comp, index) => {
      // Only render if revealed
      if (this.revealedComps.includes(index)) {
        const card = document.createElement('div');
        card.className = 'competition-card revealed';
        card.innerHTML = `
          <h4>${comp.name}</h4>
          <p>📍 ${comp.city}</p>
          <p>🏫 ${comp.host}</p>
          <p>📅 ${comp.date}</p>
        `;
        this.competitionCards.appendChild(card);
      }
    });
  }
  
  /**
   * Handle game over
   */
  gameOver() {
    this.isPlaying = false;
    
    // Stop intervals
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
    }
    if (this.carInterval) {
      clearInterval(this.carInterval);
    }
    
    // Remove keyboard listener
    window.removeEventListener('keydown', this.handleKeyPress);
    document.removeEventListener('touchstart', this.handleTouchStart);
    document.removeEventListener('touchend', this.handleTouchEnd);
    
    // Update playthrough count
    const playthroughs = parseInt(localStorage.getItem('playthroughs') || '0');
    localStorage.setItem('playthroughs', (playthroughs + 1).toString());
    
    // Check if we should show all competitions now
    /* Disabled permanent reveal
    if (playthroughs + 1 >= 3) {
      this.revealedComps = [0, 1, 2, 3];
      this.renderCompetitionCards();
    }
    */
    
    // Show game over modal
    document.getElementById('final-score').textContent = this.score;
    this.gameOverModal.classList.add('active');
  }
}
