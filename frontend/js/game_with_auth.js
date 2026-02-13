/**
 * ============================================
 * AI TIC-TAC-TOE GAME - WITH AUTHENTICATION
 * Complete  Logic with Login/Register/Password Reset
 * 
 * ============================================
 */

// ===========================
// CONFIGURATION & STATE
// ===========================

const CONFIG = {
    API_URL: 'https://ai-tictactoe-backend.onrender.com/api',
    SOUNDS_ENABLED: true,
    MUSIC_ENABLED: true,
    VOLUME: 0.5
};

const GAME_STATE = {
    currentUser: null,
    currentMode: null,
    currentDifficulty: null,
    matchId: null,
    currentRound: 1,
    player1Score: 0,
    player2Score: 0,
    board: Array(9).fill(null),
    currentPlayer: 'X',
    gameActive: false,
    isAITurn: false
};

// ===========================
// CHART VARIABLES (NEW)
// ===========================
let resultsChart = null;
let difficultyChart = null;
let trendChart = null;

// ===========================
// INITIALIZATION
// ===========================

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    setupEventListeners();
    setupAudioControls();
    checkExistingSession();
}

// ===========================
// EVENT LISTENERS
// ===========================

function setupEventListeners() {
    // Authentication
    document.getElementById('btn-login').addEventListener('click', handleLogin);
    document.getElementById('btn-register').addEventListener('click', handleRegister);
    document.getElementById('btn-forgot-password').addEventListener('click', showForgotPassword);
    document.getElementById('btn-submit-reset-email').addEventListener('click', handleRequestReset);
    document.getElementById('btn-back-to-login').addEventListener('click', showLoginForm);
    
    // Allow Enter key
    document.getElementById('input-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    // Mode Selection
    document.querySelectorAll('.mode-card').forEach(card => {
        card.addEventListener('click', () => handleModeSelection(card.dataset.mode));
    });

    // Difficulty Selection
    document.querySelectorAll('.difficulty-card').forEach(card => {
        card.addEventListener('click', () => handleDifficultySelection(card.dataset.difficulty));
    });

    // Game Board
    document.querySelectorAll('.cell').forEach((cell, index) => {
        cell.addEventListener('click', () => handleCellClick(index));
    });

    // Navigation
    document.getElementById('btn-logout').addEventListener('click', handleLogout);
    document.getElementById('btn-back-to-mode').addEventListener('click', () => showScreen('screen-mode-select'));
    document.getElementById('btn-exit-game').addEventListener('click', handleExitGame);
    document.getElementById('btn-view-stats').addEventListener('click', showStatistics);
    document.getElementById('btn-back-to-menu').addEventListener('click', () => showScreen('screen-mode-select'));

    // Modals
    document.getElementById('btn-next-round').addEventListener('click', startNextRound);
    document.getElementById('btn-play-again').addEventListener('click', handlePlayAgain);
    document.getElementById('btn-main-menu').addEventListener('click', handleMainMenu);
     // One-time listener to bypass browser autoplay restrictions
document.addEventListener('click', () => {
    const music = document.getElementById('audio-music');
    if (music.paused && CONFIG.MUSIC_ENABLED) {
        music.volume = CONFIG.VOLUME;
        music.play();
    }
}, { once: true }); // 'once: true' ensures this only runs on the first click
}

// ===========================
// AUDIO CONTROLS
// ===========================

function setupAudioControls() {
    const muteBtn = document.getElementById('btn-mute');
    const volumeSlider = document.getElementById('volume-slider');

    muteBtn.addEventListener('click', () => {
        CONFIG.SOUNDS_ENABLED = !CONFIG.SOUNDS_ENABLED;
        muteBtn.classList.toggle('muted');
    });

    volumeSlider.addEventListener('input', (e) => {
        CONFIG.VOLUME = e.target.value / 100;
        updateAllVolumes();
    });
}

function playSound(soundId) {
    if (!CONFIG.SOUNDS_ENABLED) return;
    const audio = document.getElementById(soundId);
    if (audio) {
        audio.volume = CONFIG.VOLUME;
        audio.currentTime = 0;
        audio.play().catch(e => console.log('Audio play prevented:', e));
    }
}

function updateAllVolumes() {
    document.querySelectorAll('audio').forEach(audio => {
        audio.volume = CONFIG.VOLUME;
    });
}

// ===========================
// SESSION MANAGEMENT
// ===========================

function checkExistingSession() {
    const savedUser = localStorage.getItem('tictactoe_user');
    if (savedUser) {
        try {
            GAME_STATE.currentUser = JSON.parse(savedUser);
            showScreen('screen-mode-select');
        } catch (e) {
            localStorage.removeItem('tictactoe_user');
        }
    }
}

// ===========================
// AUTHENTICATION - LOGIN
// ===========================

async function handleLogin() {
    const loginBtn = document.getElementById('btn-login');
    const usernameOrEmail = document.getElementById('input-username').value.trim().toLowerCase();
    const password = document.getElementById('input-password').value;
    const errorEl = document.getElementById('login-error');

    // Clear previous errors
    errorEl.textContent = '';
    errorEl.classList.remove('visible');

    // Validate
    if (!usernameOrEmail || !password) {
        errorEl.textContent = "Please enter username/email and password.";
        errorEl.classList.add('visible');
        return;
    }

    // Set Loading State
    const originalText = loginBtn.innerHTML;
    loginBtn.disabled = true;
    loginBtn.classList.add('processing');
    loginBtn.innerHTML = `<div class="btn-loading-content"><div class="spinner"></div><span>Signing In...</span></div>`;

    try {
        const response = await fetch(`${CONFIG.API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username_or_email: usernameOrEmail,
                password: password
            })
        });

        const data = await response.json();
        
        if (response.ok) {
            GAME_STATE.currentUser = data.user;
            localStorage.setItem('tictactoe_user', JSON.stringify(data.user));
            playSound('audio-click');
            showScreen('screen-mode-select');
        } else {
            errorEl.textContent = data.detail || "Login failed";
            errorEl.classList.add('visible');
            // Reset button if failed
            loginBtn.disabled = false;
            loginBtn.classList.remove('processing');
            loginBtn.innerHTML = originalText;
        }
    } catch (error) {
        console.error('Login error:', error);
        errorEl.textContent = "Connection error. Please try again.";
        errorEl.classList.add('visible');
        // Reset button if error
        loginBtn.disabled = false;
        loginBtn.classList.remove('processing');
        loginBtn.innerHTML = originalText;
    }
}

// ===========================
// AUTHENTICATION - REGISTER
// ===========================
async function handleRegister() {
    const regBtn = document.getElementById('btn-register');
    const username = document.getElementById('input-reg-username').value.trim();
    const email = document.getElementById('input-email').value.trim();
    const password = document.getElementById('input-reg-password').value;
    const errorEl = document.getElementById('login-error');

    // Clear previous errors
    errorEl.textContent = '';
    errorEl.classList.remove('visible');

    // Validation checks
    if (!username || !email || !password) {
        errorEl.textContent = "Please fill in all fields.";
        errorEl.classList.add('visible');
        return;
    }

    if (username.length < 3) {
        errorEl.textContent = "Username must be at least 3 characters.";
        errorEl.classList.add('visible');
        return;
    }

    if (password.length < 6) {
        errorEl.textContent = "Password must be at least 6 characters.";
        errorEl.classList.add('visible');
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        errorEl.textContent = "Please enter a valid email address.";
        errorEl.classList.add('visible');
        return;
    }

    // Set Loading State
    const originalText = regBtn.innerHTML;
    regBtn.disabled = true;
    regBtn.classList.add('processing');
    regBtn.innerHTML = `<div class="btn-loading-content"><div class="spinner"></div><span>Creating Account...</span></div>`;

    try {
        const response = await fetch(`${CONFIG.API_URL}/auth/register`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                email: email,
                password: password
            })
        });

        const data = await response.json();
        
        if (response.ok) {
            GAME_STATE.currentUser = data.user;
            localStorage.setItem('tictactoe_user', JSON.stringify(data.user));
            playSound('audio-click');
            showScreen('screen-mode-select');
        } else {
            const errorMessage = data.detail || 'Registration failed';
            errorEl.textContent = errorMessage;
            errorEl.classList.add('visible');
            // Reset button
            regBtn.disabled = false;
            regBtn.classList.remove('processing');
            regBtn.innerHTML = originalText;
        }
    } catch (error) {
        console.error('Network error:', error);
        errorEl.textContent = "Connection error. Please try again.";
        errorEl.classList.add('visible');
        // Reset button
        regBtn.disabled = false;
        regBtn.classList.remove('processing');
        regBtn.innerHTML = originalText;
    }
}

// ===========================
// PASSWORD RESET
// ===========================

function showForgotPassword() {
    document.getElementById('login-form-container').style.display = 'none';
    document.getElementById('forgot-password-container').style.display = 'block';
    document.getElementById('login-error').textContent = '';
    document.getElementById('login-error').classList.remove('visible');
}

function showLoginForm() {
    document.getElementById('login-form-container').style.display = 'block';
    document.getElementById('forgot-password-container').style.display = 'none';
    document.getElementById('reset-error').textContent = '';
    document.getElementById('reset-error').classList.remove('visible');
}

async function handleRequestReset() {
    const email = document.getElementById('input-reset-email').value.trim();
    const errorEl = document.getElementById('reset-error');
    const successEl = document.getElementById('reset-success');

    errorEl.textContent = '';
    errorEl.classList.remove('visible');
    successEl.textContent = '';
    successEl.classList.remove('visible');

    if (!email) {
        errorEl.textContent = "Please enter your email address.";
        errorEl.classList.add('visible');
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        errorEl.textContent = "Please enter a valid email address.";
        errorEl.classList.add('visible');
        return;
    }

    try {
        const response = await fetch(`${CONFIG.API_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        });

        const data = await response.json();
        
        successEl.textContent = "If the email exists, a reset link has been sent. Check your inbox.";
        successEl.classList.add('visible');
        
        if (data.data && data.data.reset_token) {
            console.log('Reset Token (DEV ONLY):', data.data.reset_token);
            console.log('Reset Link (DEV ONLY):', data.data.reset_link);
            
            setTimeout(() => {
                if (confirm('Development Mode: Use reset token directly?')) {
                    showResetPasswordForm(data.data.reset_token);
                }
            }, 1000);
        }
        
    } catch (error) {
        console.error('Reset request error:', error);
        successEl.textContent = "If the email exists, a reset link has been sent.";
        successEl.classList.add('visible');
    }
}

function showResetPasswordForm(token) {
    const newPassword = prompt('Enter new password (6+ characters):');
    if (newPassword && newPassword.length >= 6) {
        handleResetPassword(token, newPassword);
    }
}

async function handleResetPassword(token, newPassword) {
    try {
        const response = await fetch(`${CONFIG.API_URL}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                reset_token: token,
                new_password: newPassword
            })
        });

        const data = await response.json();
        
        if (response.ok) {
            alert('Password reset successful! You can now login with your new password.');
            showLoginForm();
        } else {
            alert('Reset failed: ' + (data.detail || 'Unknown error'));
        }
    } catch (error) {
        console.error('Reset password error:', error);
        alert('Connection error. Please try again.');
    }
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('tictactoe_user');
        GAME_STATE.currentUser = null;
        playSound('audio-click');
        showScreen('screen-login');
    }
}

// ===========================
// SCREEN NAVIGATION
// ===========================

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

// ===========================
// MODE & DIFFICULTY SELECTION
// ===========================

async function handleModeSelection(mode) {
    GAME_STATE.currentMode = mode;
    playSound('audio-click');

    if (mode === 'human_vs_ai') {
        showScreen('screen-difficulty');
    } else {
        GAME_STATE.currentDifficulty = null;
        await startNewMatch();
    }
}

async function handleDifficultySelection(difficulty) {
    GAME_STATE.currentDifficulty = difficulty;
    playSound('audio-click');
    await startNewMatch();
}


async function startNewMatch() {
    try {
        const response = await fetch(`${CONFIG.API_URL}/matches/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: GAME_STATE.currentUser.id,
                mode: GAME_STATE.currentMode,
                difficulty: GAME_STATE.currentDifficulty
            })
        });

        const data = await response.json();
        
        if (response.ok) {
            GAME_STATE.matchId = data.match_id;
            GAME_STATE.currentRound = 1;
            GAME_STATE.player1Score = 0;
            GAME_STATE.player2Score = 0;
            
            updateGameDisplay();
            showScreen('screen-game');
            startNewRound();
        } else {
            alert('Failed to start match: ' + (data.detail || 'Unknown error'));
        }
    } catch (error) {
        console.error('Start match error:', error);
        alert('Connection error. Please try again.');
    }
}

async function startNewRound() {
    GAME_STATE.board = Array(9).fill(null);
    GAME_STATE.currentPlayer = 'X';
    GAME_STATE.gameActive = true;
    GAME_STATE.isAITurn = false;

    document.querySelectorAll('.cell').forEach(cell => {
        cell.textContent = '';
        cell.classList.remove('x', 'o', 'taken', 'winning');
    });

    document.getElementById('ai-explanation').style.display = 'none';

    updateTurnIndicator();

    if (GAME_STATE.currentMode === 'ai_vs_ai') {
        setTimeout(() => playAIvsAI(), 1000);
    }
}

function updateGameDisplay() {
    const modeDisplay = document.getElementById('game-mode-display');
    const player1Name = document.getElementById('player1-name');
    const player2Name = document.getElementById('player2-name');
    const player1Score = document.getElementById('player1-score');
    const player2Score = document.getElementById('player2-score');
    const currentRound = document.getElementById('current-round');

    let modeText = GAME_STATE.currentMode.replace(/_/g, ' ').toUpperCase();
    if (GAME_STATE.currentDifficulty) {
        modeText += ` (${GAME_STATE.currentDifficulty.toUpperCase()})`;
    }
    modeDisplay.textContent = modeText;

    if (GAME_STATE.currentMode === 'human_vs_ai') {
        player1Name.textContent = GAME_STATE.currentUser.username;
        player2Name.textContent = `AI (${GAME_STATE.currentDifficulty})`;
    } else if (GAME_STATE.currentMode === 'human_vs_human') {
        player1Name.textContent = 'Player 1';
        player2Name.textContent = 'Player 2';
    } else {
        player1Name.textContent = 'AI 1';
        player2Name.textContent = 'AI 2';
    }

    player1Score.textContent = GAME_STATE.player1Score;
    player2Score.textContent = GAME_STATE.player2Score;
    currentRound.textContent = GAME_STATE.currentRound;
}

function updateTurnIndicator() {
    const turnText = document.getElementById('turn-text');
    
    if (GAME_STATE.currentMode === 'human_vs_ai') {
        if (GAME_STATE.currentPlayer === 'X') {
            turnText.textContent = `${GAME_STATE.currentUser.username}'s Turn (X)`;
        } else {
            turnText.textContent = `AI's Turn (O)`;
        }
    } else if (GAME_STATE.currentMode === 'human_vs_human') {
        turnText.textContent = `Player ${GAME_STATE.currentPlayer === 'X' ? '1' : '2'}'s Turn (${GAME_STATE.currentPlayer})`;
    } else {
        turnText.textContent = `AI ${GAME_STATE.currentPlayer === 'X' ? '1' : '2'}'s Turn (${GAME_STATE.currentPlayer})`;
    }
}

// ===========================
// GAME LOGIC - CELL CLICK
// ===========================

async function handleCellClick(index) {
    if (!GAME_STATE.gameActive) return;
    if (GAME_STATE.board[index] !== null) return;
    if (GAME_STATE.isAITurn) return;

    await makeMove(index, GAME_STATE.currentPlayer);
}

async function makeMove(index, player) {
    GAME_STATE.board[index] = player;

    const cell = document.querySelector(`.cell[data-index="${index}"]`);
    cell.textContent = player;
    cell.classList.add(player.toLowerCase(), 'taken');

    playSound('audio-click');

    const result = checkGameEnd();
    
    if (result) {
        await handleRoundEnd(result);
    } else {
        GAME_STATE.currentPlayer = player === 'X' ? 'O' : 'X';
        updateTurnIndicator();

        if (GAME_STATE.currentMode === 'human_vs_ai' && GAME_STATE.currentPlayer === 'O') {
            GAME_STATE.isAITurn = true;
            await makeAIMove();
        }
    }
}

// ===========================
// AI MOVE LOGIC
// ===========================

async function makeAIMove() {
    const thinkingEl = document.getElementById('ai-thinking');
    thinkingEl.classList.add('visible');

    try {
        const response = await fetch(`${CONFIG.API_URL}/ai/move`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                board: GAME_STATE.board,
                difficulty: GAME_STATE.currentDifficulty,
                player: 'O'
            })
        });

        const data = await response.json();

        thinkingEl.classList.remove('visible');

        if (response.ok) {
            displayAIExplanation(data);

            setTimeout(() => {
                GAME_STATE.isAITurn = false;
                makeMove(data.move, 'O');
            }, 500);
        } else {
            alert('AI move failed: ' + (data.detail || 'Unknown error'));
            GAME_STATE.isAITurn = false;
        }
    } catch (error) {
        console.error('AI move error:', error);
        thinkingEl.classList.remove('visible');
        alert('Connection error. Please try again.');
        GAME_STATE.isAITurn = false;
    }
}

function displayAIExplanation(data) {
    const explanationEl = document.getElementById('ai-explanation');
    explanationEl.style.display = 'block';

    document.getElementById('ai-move').textContent = `Position ${data.move}`;
    document.getElementById('ai-score').textContent = data.score;
    document.getElementById('ai-nodes').textContent = data.nodes_evaluated;
    document.getElementById('ai-pruned').textContent = data.branches_pruned || 0;
    document.getElementById('ai-detail').textContent = data.explanation || 'Optimal move calculated using Minimax algorithm.';
}

// ===========================
// AI vs AI MODE
// ===========================

async function playAIvsAI() {
    if (!GAME_STATE.gameActive) return;

    const thinkingEl = document.getElementById('ai-thinking');
    thinkingEl.classList.add('visible');

    try {
        const response = await fetch(`${CONFIG.API_URL}/ai/move`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                board: GAME_STATE.board,
                difficulty: 'hard',
                player: GAME_STATE.currentPlayer
            })
        });

        const data = await response.json();
        thinkingEl.classList.remove('visible');

        if (response.ok) {
            displayAIExplanation(data);
            
            await makeMove(data.move, GAME_STATE.currentPlayer);

            if (GAME_STATE.gameActive) {
                setTimeout(() => playAIvsAI(), 1500);
            }
        }
    } catch (error) {
        console.error('AI vs AI error:', error);
        thinkingEl.classList.remove('visible');
    }
}

// ===========================
// GAME END CHECKING
// ===========================

function checkGameEnd() {
    const winner = checkWinner();
    if (winner) {
        highlightWinningCells(winner.line);
        return { type: 'win', winner: winner.player };
    }

    if (GAME_STATE.board.every(cell => cell !== null)) {
        return { type: 'draw' };
    }

    return null;
}

function checkWinner() {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];

    for (const pattern of winPatterns) {
        const [a, b, c] = pattern;
        if (GAME_STATE.board[a] && 
            GAME_STATE.board[a] === GAME_STATE.board[b] && 
            GAME_STATE.board[a] === GAME_STATE.board[c]) {
            return { player: GAME_STATE.board[a], line: pattern };
        }
    }

    return null;
}

function highlightWinningCells(line) {
    line.forEach(index => {
        document.querySelector(`.cell[data-index="${index}"]`).classList.add('winning');
    });
}

// ===========================
// ROUND END HANDLING
// ===========================

async function handleRoundEnd(result) {
    GAME_STATE.gameActive = false;

    if (result.type === 'win') {
        if (result.winner === 'X') {
            GAME_STATE.player1Score++;
        } else {
            GAME_STATE.player2Score++;
        }
    }

    if (result.type === 'win') {
        if (GAME_STATE.currentMode === 'human_vs_ai') {
            playSound(result.winner === 'X' ? 'audio-win' : 'audio-lose');
        } else {
            playSound('audio-win');
        }
    } else {
        playSound('audio-draw');
    }

    await saveRound(result);

    setTimeout(() => {
        showRoundResultModal(result);
    }, 1500);
}

async function saveRound(result) {
    try {
        await fetch(`${CONFIG.API_URL}/matches/${GAME_STATE.matchId}/round`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                round_number: GAME_STATE.currentRound,
                winner: result.type === 'win' ? result.winner : null,
                board_state: GAME_STATE.board,
                player1_score: GAME_STATE.player1Score,
                player2_score: GAME_STATE.player2Score
            })
        });
    } catch (error) {
        console.error('Save round error:', error);
    }
}

function showRoundResultModal(result) {
    const modal = document.getElementById('modal-round-result');
    const icon = document.getElementById('round-result-icon');
    const title = document.getElementById('round-result-title');
    const message = document.getElementById('round-result-message');

    if (result.type === 'win') {
        icon.textContent = result.winner === 'X' ? '🎉' : '😔';
        title.textContent = `Round ${GAME_STATE.currentRound} Complete`;
        
        if (GAME_STATE.currentMode === 'human_vs_ai') {
            message.textContent = result.winner === 'X' ? 'You won this round!' : 'AI won this round!';
        } else {
            message.textContent = `Player ${result.winner} won this round!`;
        }
    } else {
        icon.textContent = '🤝';
        title.textContent = `Round ${GAME_STATE.currentRound} Complete`;
        message.textContent = "It's a draw!";
    }

    document.getElementById('modal-player1-name').textContent = document.getElementById('player1-name').textContent;
    document.getElementById('modal-player2-name').textContent = document.getElementById('player2-name').textContent;
    document.getElementById('modal-player1-score').textContent = GAME_STATE.player1Score;
    document.getElementById('modal-player2-score').textContent = GAME_STATE.player2Score;

    if (GAME_STATE.player1Score === 2 || GAME_STATE.player2Score === 2) {
        modal.classList.remove('active');
        setTimeout(() => showMatchResultModal(), 500);
    } else if (GAME_STATE.currentRound === 3) {
        modal.classList.remove('active');
        setTimeout(() => showMatchResultModal(), 500);
    } else {
        modal.classList.add('active');
    }
}

function startNextRound() {
    document.getElementById('modal-round-result').classList.remove('active');
    GAME_STATE.currentRound++;
    updateGameDisplay();
    startNewRound();
}

// ===========================
// MATCH END HANDLING
// ===========================

async function showMatchResultModal() {
    const modal = document.getElementById('modal-match-result');
    const icon = document.getElementById('match-result-icon');
    const title = document.getElementById('match-result-title');
    const message = document.getElementById('match-result-message');

    let matchResult;
    if (GAME_STATE.player1Score > GAME_STATE.player2Score) {
        matchResult = 'player1_win';
        icon.textContent = '🏆';
        
        if (GAME_STATE.currentMode === 'human_vs_ai') {
            message.textContent = 'Congratulations! You won the match!';
        } else {
            message.textContent = 'Player 1 won the match!';
        }
    } else if (GAME_STATE.player2Score > GAME_STATE.player1Score) {
        matchResult = 'player2_win';
        icon.textContent = GAME_STATE.currentMode === 'human_vs_ai' ? '🤖' : '🏆';
        
        if (GAME_STATE.currentMode === 'human_vs_ai') {
            message.textContent = 'AI won the match. Better luck next time!';
        } else {
            message.textContent = 'Player 2 won the match!';
        }
    } else {
        matchResult = 'draw';
        icon.textContent = '🤝';
        message.textContent = 'Match ended in a draw!';
    }

    title.textContent = 'Match Complete';

    document.getElementById('final-player1-name').textContent = document.getElementById('player1-name').textContent;
    document.getElementById('final-player2-name').textContent = document.getElementById('player2-name').textContent;
    document.getElementById('final-player1-score').textContent = GAME_STATE.player1Score;
    document.getElementById('final-player2-score').textContent = GAME_STATE.player2Score;

    await saveMatchResult(matchResult);

    modal.classList.add('active');
}

async function saveMatchResult(result) {
    try {
        await fetch(`${CONFIG.API_URL}/matches/${GAME_STATE.matchId}/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                result: result,
                final_score_p1: GAME_STATE.player1Score,
                final_score_p2: GAME_STATE.player2Score
            })
        });
    } catch (error) {
        console.error('Save match result error:', error);
    }
}

function handlePlayAgain() {
    document.getElementById('modal-match-result').classList.remove('active');
    startNewMatch();
}

function handleMainMenu() {
    document.getElementById('modal-match-result').classList.remove('active');
    showScreen('screen-mode-select');
}

function handleExitGame() {
    if (GAME_STATE.gameActive) {
        if (confirm('Are you sure you want to exit? This will end the current match.')) {
            showScreen('screen-mode-select');
        }
    } else {
        showScreen('screen-mode-select');
    }
}

// ===========================
// STATISTICS (UPDATED WITH CHARTS!)
// ===========================

async function showStatistics() {
    showScreen('screen-stats');
    await loadStatistics();
}

async function loadStatistics() {
    try {
        const response = await fetch(`${CONFIG.API_URL}/users/${GAME_STATE.currentUser.id}/stats`);
        const data = await response.json();

        if (response.ok) {
            displayStatistics(data);
            
            // NEW: Create/update charts
            createResultsChart(data);
            createDifficultyChart(data);
            createTrendChart(data);
        }
    } catch (error) {
        console.error('Load statistics error:', error);
    }
}

function displayStatistics(stats) {
    document.getElementById('stat-total-matches').textContent = stats.total_matches;
    document.getElementById('stat-matches-won').textContent = stats.matches_won;
    document.getElementById('stat-win-rate').textContent = `${stats.win_rate}%`;

    const tbody = document.getElementById('history-tbody');
    tbody.innerHTML = '';

    stats.match_history.forEach(match => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${new Date(match.date).toLocaleDateString()}</td>
            <td>${match.opponent}</td>
            <td>${match.mode}</td>
            <td>${match.difficulty || '-'}</td>
            <td>${match.result}</td>
            <td>${match.score}</td>
        `;
    });
}

// ===========================
// NEW CHART FUNCTIONS
// ===========================

/**
 * Create Pie Chart for Win/Loss/Draw Distribution
 */
function createResultsChart(stats) {
    const ctx = document.getElementById('resultsChart');
    if (!ctx) return;
    
    if (resultsChart) {
        resultsChart.destroy();
    }
    
    const losses = stats.matches_lost || 0;
    const draws = stats.total_matches - stats.matches_won - losses;
    
    resultsChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Wins', 'Losses', 'Draws'],
            datasets: [{
                data: [
                    stats.matches_won || 0,
                    losses,
                    draws >= 0 ? draws : 0
                ],
                backgroundColor: ['#28a745', '#dc3545', '#ffc107'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 15, font: { size: 13 } }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Create Bar Chart for Performance by Difficulty
 */
function createDifficultyChart(stats) {
    const ctx = document.getElementById('difficultyChart');
    if (!ctx) return;
    
    if (difficultyChart) {
        difficultyChart.destroy();
    }
    
    const performance = calculatePerformanceByDifficulty(stats.match_history || []);
    
    difficultyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Easy', 'Medium', 'Hard'],
            datasets: [
                {
                    label: 'Wins',
                    data: [performance.easy.wins, performance.medium.wins, performance.hard.wins],
                    backgroundColor: '#28a745',
                    borderRadius: 5
                },
                {
                    label: 'Losses',
                    data: [performance.easy.losses, performance.medium.losses, performance.hard.losses],
                    backgroundColor: '#dc3545',
                    borderRadius: 5
                },
                {
                    label: 'Draws',
                    data: [performance.easy.draws, performance.medium.draws, performance.hard.draws],
                    backgroundColor: '#ffc107',
                    borderRadius: 5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } }
            },
            plugins: {
                legend: { position: 'bottom', labels: { padding: 15, font: { size: 13 } } }
            }
        }
    });
}

/**
 * Create Line Chart for Win Rate Trend
 */
function createTrendChart(stats) {
    const ctx = document.getElementById('trendChart');
    if (!ctx) return;
    
    if (trendChart) {
        trendChart.destroy();
    }
    
    const trendData = calculateWinRateTrend(stats.match_history || []);
    
    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: trendData.labels,
            datasets: [{
                label: 'Win Rate %',
                data: trendData.values,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: '#667eea',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { callback: function(value) { return value + '%'; } }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Win Rate: ${context.parsed.y.toFixed(1)}%`;
                        }
                    }
                }
            }
        }
    });
}

// ===========================
// HELPER FUNCTIONS FOR CHARTS
// ===========================

function calculatePerformanceByDifficulty(history) {
    const performance = {
        easy: { wins: 0, losses: 0, draws: 0 },
        medium: { wins: 0, losses: 0, draws: 0 },
        hard: { wins: 0, losses: 0, draws: 0 }
    };
    
    history.forEach(match => {
        const difficulty = (match.difficulty || 'easy').toLowerCase();
        const result = (match.result || '').toLowerCase();
        
        if (performance[difficulty]) {
            if (result.includes('win') || result.includes('won')) {
                performance[difficulty].wins++;
            } else if (result.includes('loss') || result.includes('lost')) {
                performance[difficulty].losses++;
            } else {
                performance[difficulty].draws++;
            }
        }
    });
    
    return performance;
}

function calculateWinRateTrend(history) {
    if (!history || history.length === 0) {
        return { labels: ['No matches yet'], values: [0] };
    }
    
    const sorted = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));
    const labels = [];
    const values = [];
    let wins = 0;
    let total = 0;
    
    sorted.forEach((match, index) => {
        total++;
        const result = (match.result || '').toLowerCase();
        
        if (result.includes('win') || result.includes('won')) {
            wins++;
        }
        
        if ((index + 1) % 5 === 0 || index === sorted.length - 1) {
            const winRate = total > 0 ? (wins / total) * 100 : 0;
            labels.push(`Match ${index + 1}`);
            values.push(winRate);
        }
    });
    
    return { labels, values };
}
