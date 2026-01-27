import random
import copy
from typing import List, Optional, Tuple, Dict
from enum import Enum

# ===========================
# ENUMS
# ===========================

class Player(Enum):
    X = 'X'
    O = 'O'
    EMPTY = None

class Difficulty(Enum):
    EASY = 'easy'
    MEDIUM = 'medium'
    HARD = 'hard'

class GameResult(Enum):
    O_WIN = 10    # AI Victory (Maximizer)
    X_WIN = -10   # Human Victory (Minimizer)
    DRAW = 0
    ONGOING = None

# ===========================
# CORE AI ENGINE
# ===========================

class MinimaxEngine:
    def __init__(self):
        self.winning_combinations = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], # Rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], # Columns
            [0, 4, 8], [2, 4, 6],             # Diagonals
        ]
        self.nodes_evaluated = 0
        self.branches_pruned = 0
        self.max_depth_reached = 0

    def get_best_move(self, board, player, difficulty='hard'):
        self.nodes_evaluated = 0
        self.branches_pruned = 0
        self.max_depth_reached = 0
        
        # Sanitize board: convert empty strings to None
        clean_board = [None if cell == "" or cell is None else cell for cell in board]
        diff = difficulty.lower() 
    
        if diff == 'easy':
            return self._get_random_move(clean_board, player)
        elif diff == 'medium':
            return self._get_medium_move(clean_board, player)
        else:
            return self._get_optimal_move(clean_board, player)

    # --------------------------
    # STRATEGY LOGIC
    # --------------------------

    def _get_random_move(self, board, player) -> Dict:
        available_moves = [i for i, cell in enumerate(board) if cell is None]
        if not available_moves: return {'move': None, 'score': 0}
        
        move = random.choice(available_moves)
        return {
            'move': move,
            'score': 0,
            'nodes_evaluated': 1,
            'branches_pruned': 0,
            'explanation': "Easy Mode: Random selection."
        }

    def _get_medium_move(self, board, player) -> Dict:
        # 20% blunder chance + shallow lookahead
        if random.random() < 0.2:
            return self._get_random_move(board, player)
        return self._run_search(board, player, max_depth=2)

    def _get_optimal_move(self, board, player) -> Dict:
        # Full depth lookahead (9 moves is the max for Tic-Tac-Toe)
        return self._run_search(board, player, max_depth=9)

    # --------------------------
    # MINIMAX CORE
    # --------------------------

    def _run_search(self, board, player, max_depth) -> Dict:
        best_move = None
        best_score = float('-inf') if player == 'O' else float('inf')
        alpha, beta = float('-inf'), float('inf')
        
        available_moves = [i for i, cell in enumerate(board) if cell is None]
        move_scores = {}
        
        for move in available_moves:
            board[move] = player
            # If AI moves as O, next recursion turn is Minimizing (False)
            is_next_max = (player == 'X')
            score = self._minimax_alpha_beta(board, 0, is_next_max, alpha, beta, max_depth)
            board[move] = None
            
            move_scores[move] = score
            if player == 'O':
                if score > best_score:
                    best_score, best_move = score, move
                alpha = max(alpha, best_score)
            else:
                if score < best_score:
                    best_score, best_move = score, move
                beta = min(beta, best_score)

        return {
            'move': best_move,
            'score': best_score,
            'nodes_evaluated': self.nodes_evaluated,
            'branches_pruned': self.branches_pruned,
            'explanation': self._generate_explanation(best_move, best_score, move_scores, player)
        }

    def _minimax_alpha_beta(self, board, depth, is_maximizing, alpha, beta, max_limit) -> int:
        self.nodes_evaluated += 1
        self.max_depth_reached = max(self.max_depth_reached, depth)
        
        result = self._evaluate_board(board)
        if result != GameResult.ONGOING or depth >= max_limit:
            if result == GameResult.O_WIN: return result.value - depth
            if result == GameResult.X_WIN: return result.value + depth
            return 0
        
        available_moves = [i for i, cell in enumerate(board) if cell is None]
        
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
        for combo in self.winning_combinations:
            if board[combo[0]] is not None and board[combo[0]] == board[combo[1]] == board[combo[2]]:
                return GameResult.X_WIN if board[combo[0]] == 'X' else GameResult.O_WIN
        if all(cell is not None for cell in board):
            return GameResult.DRAW
        return GameResult.ONGOING

    def _generate_explanation(self, move, score, all_scores, player) -> str:
        pos_names = ["top-left", "top-center", "top-right", "middle-left", "center", "middle-right", "bottom-left", "bottom-center", "bottom-right"]
        if move is None: return "Game Over."
        
        explanation = f"AI selects {pos_names[move]} (Score: {score}). "
        if score >= 7: explanation += "A guaranteed win path has been identified."
        elif score <= -7: explanation += "Playing defensively to block a human victory."
        else: explanation += "Position evaluated as a likely draw with optimal play."
        return explanation

# ===========================
# HELPER FUNCTIONS
# ===========================

def is_valid_move(board, move: int) -> bool:
    return 0 <= move < 9 and (board[move] is None or board[move] == "")

def get_winner(board: List[Optional[str]]) -> Optional[str]:
    engine = MinimaxEngine()
    result = engine._evaluate_board(board)
    if result == GameResult.X_WIN: return 'X'
    if result == GameResult.O_WIN: return 'O'
    if result == GameResult.DRAW: return 'DRAW'
    return None
