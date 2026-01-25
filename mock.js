// Screen Management Mock Logic
document.addEventListener('DOMContentLoaded', () => {
    const screens = document.querySelectorAll('.screen');
    const loginBtn = document.getElementById('btn-login');
    const modeCards = document.querySelectorAll('.mode-card');
    const difficultyCards = document.querySelectorAll('.difficulty-card');
    const exitBtn = document.getElementById('btn-exit-game');
    const backToModeBtn = document.getElementById('btn-back-to-mode');
    const logoutBtn = document.getElementById('btn-logout');

    // Helper function to switch screens
    const showScreen = (screenId) => {
        screens.forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
    };

    // 1. Login -> Mode Selection
    loginBtn.addEventListener('click', () => {
        const username = document.getElementById('input-username').value;
        if (username.trim()) {
            showScreen('screen-mode-select');
        } else {
            const error = document.getElementById('login-error');
            error.textContent = "Please enter a name to proceed.";
            error.classList.add('visible');
        }
    });

    // 2. Mode Selection -> Difficulty or Direct to Game
    modeCards.forEach(card => {
        card.addEventListener('click', () => {
            const mode = card.getAttribute('data-mode');
            if (mode === 'human_vs_ai') {
                showScreen('screen-difficulty');
            } else {
                showScreen('screen-game');
                document.getElementById('game-mode-display').textContent = mode.replace(/_/g, ' ').toUpperCase();
            }
        });
    });

    // 3. Difficulty -> Game
    difficultyCards.forEach(card => {
        card.addEventListener('click', () => {
            showScreen('screen-game');
            document.getElementById('game-mode-display').textContent = "HUMAN VS AI";
        });
    });

    // Navigation Backwards
    backToModeBtn.addEventListener('click', () => showScreen('screen-mode-select'));
    exitBtn.addEventListener('click', () => showScreen('screen-mode-select'));
    logoutBtn.addEventListener('click', () => showScreen('screen-login'));
});