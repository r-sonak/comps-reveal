import { Game } from './game.js';

// Initialize the game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.init();
});

