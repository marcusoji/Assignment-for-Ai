"""
============================================
MINIMAX ALGORITHM IMPLEMENTATION
Core AI Engine for Tic-Tac-Toe
============================================

This module implements the Minimax algorithm with:
- Complete decision tree search
- Alpha-beta pruning optimization
- Multiple difficulty levels
- Explainable AI decision-making
- Performance metrics tracking

ALGORITHM EXPLANATION:
----------------------
Minimax is a recursive algorithm used in game theory and decision-making.
It assumes both players play optimally:
- Maximizer (AI) tries to get the highest score
- Minimizer (opponent) tries to get the lowest score

The algorithm:
1. Explores all possible future game states (decision tree)
2. Evaluates terminal states (win/loss/draw)
3. Propagates scores back up the tree
4. Selects the move with the best guaranteed outcome

Alpha-Beta Pruning:
- Optimization technique that eliminates branches
- Doesn't affect the final decision
- Reduces nodes evaluated by ~50-90%
- Makes the algorithm much faster
"""

import copy
from typing import List, Optional, Tuple, Dict
from enum import Enum


class Player(Enum):
    """Player representation"""
    X = 'X'
    O = 'O'
    EMPTY = None


class Difficulty(Enum):
    """AI difficulty levels"""
    EASY = 'easy'      # Random moves
    MEDIUM = 'medium'  # Limited depth minimax
    HARD = 'hard'      # Full minimax with pruning

class GameResult(Enum):
    O_WIN = 10    # Change from -10 to 10
    X_WIN = -10   # Change from 10 to -10
    DRAW = 0
    ONGOING = None


class MinimaxEngine:
    """
    Complete Minimax AI Engine
    
    This class implements the Minimax algorithm with alpha-beta pruning
    and provides explainable AI capabilities.
    """
    
    def __init__(self):
        # Winning combinations (indices on 3x3 board)
        self.winning_combinations = [
            [0, 1, 2],  # Top row
            [3, 4, 5],  # Middle row
            [6, 7, 8],  # Bottom row
            [0, 3, 6],  # Left column
            [1, 4, 7],  # Middle column
            [2, 5, 8],  # Right column
            [0, 4, 8],  # Diagonal \
            [2, 4, 6],  # Diagonal /
        ]
        
        # Performance metrics
        self.nodes_evaluated = 0
        self.branches_pruned = 0
        self.max_depth_reached = 0
   def get_best_move(self, board, player, difficulty='hard'):
    # Force lowercase to prevent matching errors
    diff = difficulty.lower() 
    
    if diff == 'easy':
        return self._get_random_move(board, player)
    elif diff == 'medium':
        return self._get_medium_move(board, player)
    else:
        # This ensures that even if the string is weird, it defaults to Hard
        return self._get_optimal_move(board, player)
     
      
    def _get_random_move(
        self, 
        board: List[Optional[str]], 
        player: str
    ) -> Dict:
        """
        EASY MODE: Select a random valid move.
        
        No strategy or lookahead. Perfect for beginners.
        """
        import random
        
     # Instead of only checking for None, check for empty strings too
available_moves = [i for i, cell in enumerate(board) if cell is None or cell == ""]
        
        if not available_moves:
            return None
        
        # Pick random move
        move = random.choice(available_moves)
        
        return {
            'move': move,
            'score': 0,
            'nodes_evaluated': 1,
            'branches_pruned': 0,
            'explanation': f"Random move selected from {len(available_moves)} available positions. No strategy applied."
        }
    
    def _get_medium_move(
        self, 
        board: List[Optional[str]], 
        player: str
    ) -> Dict:
        """
        MEDIUM MODE: Limited depth minimax with some randomness.
        
        - Uses minimax with depth limit of 4
        - Adds 20% chance of random move for unpredictability
        - Good balance between challenge and winnability
        """
        import random
        
       if random.random() < 0.2: # 20% chance to just play randomly
        return self._get_random_move(board, player)
    return self._run_search(board, player, max_depth=2) # Only look 2 moves ahead
        
        # Use minimax with limited depth
        best_move = None
        best_score = float('-inf') if player == 'O' else float('inf')
        
        available_moves = [i for i, cell in enumerate(board) if cell is None]
        
        for move in available_moves:
            # Make move
            test_board = board.copy()
            test_board[move] = player
            
            # Evaluate with limited depth
            score = self._minimax_limited(
                test_board, 
                0, 
                False if player == 'O' else True,
                max_depth=4
            )
            
            # Update best move
            if player == 'O':  # Maximizing player
                if score > best_score:
                    best_score = score
                    best_move = move
            else:  # Minimizing player
                if score < best_score:
                    best_score = score
                    best_move = move
        
        return {
            'move': best_move,
            'score': best_score,
            'nodes_evaluated': self.nodes_evaluated,
            'branches_pruned': 0,
            'explanation': f"Minimax search with depth limit of 4 plies. Evaluated {self.nodes_evaluated} positions. Selected position {best_move} with score {best_score}."
        }
    
    def _get_optimal_move(
        self, 
        board: List[Optional[str]], 
        player: str
    ) -> Dict:
        """
        HARD MODE: Full minimax with alpha-beta pruning.
        
        - Explores complete game tree
        - Uses alpha-beta pruning for optimization
        - Guarantees optimal play (unbeatable)
        - AI will never lose, only win or draw
        """
        best_move = None
        best_score = float('-inf') if player == 'O' else float('inf')
        alpha = float('-inf')
        beta = float('inf')
        
        available_moves = [i for i, cell in enumerate(board) if cell is None]
        move_scores = {}
        
        # Evaluate each possible move
        for move in available_moves:
            # Make move
            test_board = board.copy()
            test_board[move] = player
            
            # Run minimax with alpha-beta pruning
            score = self._minimax_alpha_beta(
                test_board,
                0,
                False if player == 'O' else True,
                alpha,
                beta
            )
            
            move_scores[move] = score
            
            # Update best move
            if player == 'O':  # Maximizing player
                if score > best_score:
                    best_score = score
                    best_move = move
                alpha = max(alpha, score)
            else:  # Minimizing player  
                if score < best_score:
                    best_score = score
                    best_move = move
                beta = min(beta, score)
        
        # Generate explanation
        explanation = self._generate_explanation(
            best_move, 
            best_score, 
            move_scores, 
            player
        )
        
        return {
            'move': best_move,
            'score': best_score,
            'nodes_evaluated': self.nodes_evaluated,
            'branches_pruned': self.branches_pruned,
            'explanation': explanation
        }
    
    def _minimax_limited(
        self,
        board: List[Optional[str]],
        depth: int,
        is_maximizing: bool,
        max_depth: int
    ) -> int:
        """
        Minimax algorithm with depth limit.
        
        Used for MEDIUM difficulty.
        """
        self.nodes_evaluated += 1
        
        # Check terminal state or depth limit
        result = self._evaluate_board(board)
        if result != GameResult.ONGOING or depth >= max_depth:
            return result.value if result != GameResult.ONGOING else 0
        
        # Get available moves
        available_moves = [i for i, cell in enumerate(board) if cell is None]
        
        if is_maximizing:
            max_eval = float('-inf')
            for move in available_moves:
                test_board = board.copy()
                test_board[move] = 'O'
                eval_score = self._minimax_limited(test_board, depth + 1, False, max_depth)
                max_eval = max(max_eval, eval_score)
            return max_eval
        else:
            min_eval = float('inf')
            for move in available_moves:
                test_board = board.copy()
                test_board[move] = 'X'
                eval_score = self._minimax_limited(test_board, depth + 1, True, max_depth)
                min_eval = min(min_eval, eval_score)
            return min_eval
    
    def _minimax_alpha_beta(
        self,
        board: List[Optional[str]],
        depth: int,
        is_maximizing: bool,
        alpha: float,
        beta: float
    ) -> int:
        """
        Complete Minimax algorithm with Alpha-Beta pruning.
        
        ALGORITHM EXPLANATION:
        ----------------------
        1. BASE CASE: If game is over, return the evaluation score
        2. RECURSIVE CASE:
           - If maximizing: try to maximize the score
           - If minimizing: try to minimize the score
        3. ALPHA-BETA PRUNING:
           - Alpha: best score maximizer can guarantee
           - Beta: best score minimizer can guarantee
           - If beta <= alpha, prune remaining branches
        
        This is the core of the AI's decision-making process.
        """
        self.nodes_evaluated += 1
        self.max_depth_reached = max(self.max_depth_reached, depth)
        
        # BASE CASE: Check if game is over
        result = self._evaluate_board(board)
        if result != GameResult.ONGOING or depth >= max_limit:
    if result == GameResult.O_WIN:
        return result.value - depth  # Subtract depth: Win in 2 moves = 8, Win in 4 moves = 6
    if result == GameResult.X_WIN:
        return result.value + depth  # Add depth: Loss in 2 moves = -8, Loss in 4 moves = -6
    return 0
        
        # Get available moves
        available_moves = [i for i, cell in enumerate(board) if cell is None]
        
        # RECURSIVE CASE: Maximizing player (O - AI)
       if is_maximizing:
            max_eval = float('-inf')
            for move in available_moves:
                board[move] = 'O'
                eval_score = self._minimax_alpha_beta(board, depth + 1, False, alpha, beta, max_limit)
                board[move] = None
                max_eval = max(max_eval, eval_score)
                alpha = max(alpha, max_eval)
                if beta <= alpha:
                    self.branches_pruned += 1
                    break
            return max_eval
        else:
            min_eval = float('inf')
            for move in available_moves:
                board[move] = 'X'
                eval_score = self._minimax_alpha_beta(board, depth + 1, True, alpha, beta, max_limit)
                board[move] = None
                min_eval = min(min_eval, eval_score)
                beta = min(beta, min_eval)
                if beta <= alpha:
                    self.branches_pruned += 1
                    break
            return min_eval
    
    def _evaluate_board(self, board: List[Optional[str]]) -> GameResult:
        """
        Evaluate the current board state.
        
        Returns:
            GameResult.X_WIN: X has won
            GameResult.O_WIN: O has won
            GameResult.DRAW: Board is full, no winner
            GameResult.ONGOING: Game is still in progress
        """
        # Check for winner
       for combo in self.winning_combinations:
            if board[combo[0]] is not None and board[combo[0]] == board[combo[1]] == board[combo[2]]:
                return GameResult.X_WIN if board[combo[0]] == 'X' else GameResult.O_WIN
        
        if all(cell is not None for cell in board):
            return GameResult.DRAW
        return GameResult.ONGOING
    
    def _generate_explanation(
        self,
        move: int,
        score: int,
        all_scores: Dict[int, int],
        player: str
    ) -> str:
        """
        Generate human-readable explanation of AI decision.
        
        This makes the AI's thinking process transparent and educational.
        """
      pos_names = ["top-left", "top-center", "top-right", "middle-left", "center", "middle-right", "bottom-left", "bottom-center", "bottom-right"]
        if move is None: return "Game Over."
        
        msg = f"AI chooses {pos_names[move]} with score {score}. "
        if score >= 8: msg += "Guaranteed win found."
        elif score <= -8: msg += "Forced to play defensively."
        else: msg += "Playing for a draw/control."
        return msg
# ===========================
# HELPER FUNCTIONS
# ===========================

def is_valid_move(board: List[Optional[str]], move: int) -> bool:
    """Check if a move is valid."""
    return 0 <= move < 9 and board[move] is None


def make_move(
    board: List[Optional[str]], 
    move: int, 
    player: str
) -> List[Optional[str]]:
    """Make a move on the board (returns new board)."""
    new_board = board.copy()
    new_board[move] = player
    return new_board


def get_winner(board: List[Optional[str]]) -> Optional[str]:
    """Get the winner of the current board, if any."""
    engine = MinimaxEngine()
    result = engine._evaluate_board(board)
    
    if result == GameResult.X_WIN:
        return 'X'
    elif result == GameResult.O_WIN:
        return 'O'
    elif result == GameResult.DRAW:
        return 'DRAW'
    else:
        return None
