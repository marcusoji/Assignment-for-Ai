/**
 * ============================================
 * AI TIC-TAC-TOE GAME - WITH AUTHENTICATION
 * Complete Frontend Logic with Login/Register/Password Reset
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
    const usernameOrEmail = document.getElementById('input-username').value.trim();
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
        }
    } catch (error) {
        console.error('Login error:', error);
        errorEl.textContent = "Connection error. Please try again.";
        errorEl.classList.add('visible');
    }
}

// ===========================
// AUTHENTICATION - REGISTER
// ===========================

async function handleRegister() {
    // Get values from CORRECT input IDs
    const username = document.getElementById('input-reg-username').value.trim();
    const email = document.getElementById('input-email').value.trim();
    const password = document.getElementById('input-reg-password').value;
    const errorEl = document.getElementById('login-error');

    // Clear previous errors
    errorEl.textContent = '';
    errorEl.classList.remove('visible');

    // Validate
    if (!username || !email || !password) {
        errorEl.textContent = "Please fill in all fields.";
        errorEl.classList.add('visible');
        console.log('Validation failed: empty fields');
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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        errorEl.textContent = "Please enter a valid email address.";
        errorEl.classList.add('visible');
        return;
    }

    try {
        console.log('Attempting registration:', { username, email }); // Debug
        
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
        console.log('Server response:', response.status, data); // Debug
        
        if (response.ok) {
            GAME_STATE.currentUser = data.user;
            localStorage.setItem('tictactoe_user', JSON.stringify(data.user));
            playSound('audio-click');
            showScreen('screen-mode-select');
        } else {
            // Show specific error message from backend
            const errorMessage = data.detail || 'Registration failed';
            errorEl.textContent = errorMessage;
            errorEl.classList.add('visible');
            console.error('Backend error:', data);
        }
    } catch (error) {
        console.error('Network error:', error);
        errorEl.textContent = "Connection error. Please try again.";
        errorEl.classList.add('visible');
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

    // Clear previous messages
    errorEl.textContent = '';
    errorEl.classList.remove('visible');
    successEl.textContent = '';
    successEl.classList.remove('visible');

    // Validate
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
        
        // Always show success for security (don't reveal if email exists)
        successEl.textContent = "If the email exists, a reset link has been sent. Check your inbox.";
        successEl.classList.add('visible');
        
        // Show reset token in development (REMOVE IN PRODUCTION!)
        if (data.data && data.data.reset_token) {
            console.log('Reset Token (DEV ONLY):', data.data.reset_token);
            console.log('Reset Link (DEV ONLY):', data.data.reset_link);
            
            // For development, offer to use token directly
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
    // In production, this would be a separate page: /reset-password?token=xxx
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
    // Reset board state
    GAME_STATE.board = Array(9).fill(null);
    GAME_STATE.currentPlayer = 'X';
    GAME_STATE.gameActive = true;
    GAME_STATE.isAITurn = false;

    // Clear board visually
    document.querySelectorAll('.cell').forEach(cell => {
        cell.textContent = '';
        cell.classList.remove('x', 'o', 'taken', 'winning');
    });

    // Hide AI explanation
    document.getElementById('ai-explanation').style.display = 'none';

    // Update display
    updateTurnIndicator();

    // If AI vs AI, start automatic play
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

    // Set mode display
    let modeText = GAME_STATE.currentMode.replace(/_/g, ' ').toUpperCase();
    if (GAME_STATE.currentDifficulty) {
        modeText += ` (${GAME_STATE.currentDifficulty.toUpperCase()})`;
    }
    modeDisplay.textContent = modeText;

    // Set player names
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

    // Update scores
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
    // Validate move
    if (!GAME_STATE.gameActive) return;
    if (GAME_STATE.board[index] !== null) return;
    if (GAME_STATE.isAITurn) return;

    // Make move
    await makeMove(index, GAME_STATE.currentPlayer);
}

async function makeMove(index, player) {
    // Update board state
    GAME_STATE.board[index] = player;

    // Update UI
    const cell = document.querySelector(`.cell[data-index="${index}"]`);
    cell.textContent = player;
    cell.classList.add(player.toLowerCase(), 'taken');

    playSound('audio-click');

    // Check for game end
    const result = checkGameEnd();
    
    if (result) {
        await handleRoundEnd(result);
    } else {
        // Switch player
        GAME_STATE.currentPlayer = player === 'X' ? 'O' : 'X';
        updateTurnIndicator();

        // If AI's turn in human vs AI mode
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
    // Show thinking animation
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

        // Hide thinking animation
        thinkingEl.classList.remove('visible');

        if (response.ok) {
            // Display AI explanation
            displayAIExplanation(data);

            // Make the move after a brief delay
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
                difficulty: 'hard', // Both AIs use hard difficulty
                player: GAME_STATE.currentPlayer
            })
        });

        const data = await response.json();
        thinkingEl.classList.remove('visible');

        if (response.ok) {
            displayAIExplanation(data);
            
            await makeMove(data.move, GAME_STATE.currentPlayer);

            // Continue AI vs AI if game is still active
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
    // Check for winner
    const winner = checkWinner();
    if (winner) {
        highlightWinningCells(winner.line);
        return { type: 'win', winner: winner.player };
    }

    // Check for draw
    if (GAME_STATE.board.every(cell => cell !== null)) {
        return { type: 'draw' };
    }

    return null;
}

function checkWinner() {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
        [0, 4, 8], [2, 4, 6]             // Diagonals
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

    // Update scores
    if (result.type === 'win') {
        if (result.winner === 'X') {
            GAME_STATE.player1Score++;
        } else {
            GAME_STATE.player2Score++;
        }
    }

    // Play appropriate sound
    if (result.type === 'win') {
        if (GAME_STATE.currentMode === 'human_vs_ai') {
            playSound(result.winner === 'X' ? 'audio-win' : 'audio-lose');
        } else {
            playSound('audio-win');
        }
    } else {
        playSound('audio-draw');
    }

    // Save round to backend
    await saveRound(result);

    // Show result modal after delay
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

    // Set content
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

    // Update score display
    document.getElementById('modal-player1-name').textContent = document.getElementById('player1-name').textContent;
    document.getElementById('modal-player2-name').textContent = document.getElementById('player2-name').textContent;
    document.getElementById('modal-player1-score').textContent = GAME_STATE.player1Score;
    document.getElementById('modal-player2-score').textContent = GAME_STATE.player2Score;

    // Check if match is over
    if (GAME_STATE.player1Score === 2 || GAME_STATE.player2Score === 2) {
        // Match over - show match result instead
        modal.classList.remove('active');
        setTimeout(() => showMatchResultModal(), 500);
    } else if (GAME_STATE.currentRound === 3) {
        // All 3 rounds played, determine winner or draw
        modal.classList.remove('active');
        setTimeout(() => showMatchResultModal(), 500);
    } else {
        // Show next round button
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

    // Determine match result
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

    // Update final scores
    document.getElementById('final-player1-name').textContent = document.getElementById('player1-name').textContent;
    document.getElementById('final-player2-name').textContent = document.getElementById('player2-name').textContent;
    document.getElementById('final-player1-score').textContent = GAME_STATE.player1Score;
    document.getElementById('final-player2-score').textContent = GAME_STATE.player2Score;

    // Save match result
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
// STATISTICS
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
        }
    } catch (error) {
        console.error('Load statistics error:', error);
    }
}

function displayStatistics(stats) {
    document.getElementById('stat-total-matches').textContent = stats.total_matches;
    document.getElementById('stat-matches-won').textContent = stats.matches_won;
    document.getElementById('stat-win-rate').textContent = `${stats.win_rate}%`;

    // Display match history
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
