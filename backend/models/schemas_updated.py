"""
============================================
PYDANTIC MODELS - UPDATED WITH AUTH
Data Validation & API Contracts
============================================
"""

from pydantic import BaseModel, Field, validator, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum


class GameMode(str, Enum):
    """Game mode options"""
    HUMAN_VS_AI = "human_vs_ai"
    HUMAN_VS_HUMAN = "human_vs_human"
    AI_VS_AI = "ai_vs_ai"


class Difficulty(str, Enum):
    """AI difficulty levels"""
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class MatchResult(str, Enum):
    """Match outcome"""
    PLAYER1_WIN = "player1_win"
    PLAYER2_WIN = "player2_win"
    DRAW = "draw"


# ===========================
# AUTHENTICATION MODELS
# ===========================

class UserRegister(BaseModel):
    """Model for user registration"""
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)
    
    @validator('username')
    def username_alphanumeric(cls, v):
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Username must be alphanumeric (can include _ and -)')
        return v.lower()  # Store usernames in lowercase
    
    @validator('password')
    def password_strength(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters')
        return v


class UserLogin(BaseModel):
    """Model for user login"""
    username_or_email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=6)


class PasswordResetRequest(BaseModel):
    """Model for requesting password reset"""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Model for confirming password reset"""
    reset_token: str = Field(..., min_length=20)
    new_password: str = Field(..., min_length=6)
    
    @validator('new_password')
    def password_strength(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters')
        return v


class PasswordChange(BaseModel):
    """Model for changing password (authenticated user)"""
    old_password: str = Field(..., min_length=6)
    new_password: str = Field(..., min_length=6)
    
    @validator('new_password')
    def passwords_different(cls, v, values):
        if 'old_password' in values and v == values['old_password']:
            raise ValueError('New password must be different from old password')
        return v


# ===========================
# USER MODELS
# ===========================

class UserCreate(BaseModel):
    """Model for creating a new user (legacy - use UserRegister)"""
    username: str = Field(..., min_length=1, max_length=50)
    
    @validator('username')
    def username_alphanumeric(cls, v):
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Username must be alphanumeric (can include _ and -)')
        return v


class UserResponse(BaseModel):
    """User data response"""
    id: str
    username: str
    email: Optional[str] = None
    created_at: datetime
    total_matches: int = 0
    matches_won: int = 0
    matches_lost: int = 0
    matches_drawn: int = 0


class AuthResponse(BaseModel):
    """Authentication response with user data"""
    user: UserResponse
    message: str = "Authentication successful"


# ===========================
# MATCH MODELS
# ===========================

class MatchCreate(BaseModel):
    """Model for starting a new match"""
    user_id: str
    mode: GameMode
    difficulty: Optional[Difficulty] = None
    
    @validator('difficulty')
    def validate_difficulty(cls, v, values):
        if values.get('mode') == GameMode.HUMAN_VS_AI and v is None:
            raise ValueError('Difficulty is required for human_vs_ai mode')
        return v


class MatchResponse(BaseModel):
    """Match data response"""
    match_id: str
    user_id: str
    mode: GameMode
    difficulty: Optional[Difficulty]
    status: str  # 'in_progress', 'completed'
    current_round: int
    player1_score: int
    player2_score: int
    created_at: datetime


class RoundCreate(BaseModel):
    """Model for saving a round"""
    round_number: int = Field(..., ge=1, le=3)
    winner: Optional[str]  # 'X', 'O', or None for draw
    board_state: List[Optional[str]] = Field(..., min_length=9, max_length=9)
    player1_score: int
    player2_score: int


class MatchComplete(BaseModel):
    """Model for completing a match"""
    result: MatchResult
    final_score_p1: int
    final_score_p2: int


# ===========================
# AI MODELS
# ===========================

class AIMoveRequest(BaseModel):
    """Request for AI move"""
    board: List[Optional[str]] = Field(..., min_length=9, max_length=9)
    difficulty: Difficulty
    player: str = Field(..., pattern='^[XO]$')
    
    @validator('board')
    def validate_board(cls, v):
        # Check valid values
        for cell in v:
            if cell not in [None, 'X', 'O']:
                raise ValueError('Board cells must be None, X, or O')
        return v


class AIMoveResponse(BaseModel):
    """Response with AI move and explanation"""
    move: int = Field(..., ge=0, le=8)
    score: int
    nodes_evaluated: int
    branches_pruned: int
    explanation: str


# ===========================
# STATISTICS MODELS
# ===========================

class MatchHistoryItem(BaseModel):
    """Single match history entry"""
    date: datetime
    opponent: str
    mode: str
    difficulty: Optional[str]
    result: str
    score: str


class UserStatistics(BaseModel):
    """Complete user statistics"""
    user_id: str
    username: str
    total_matches: int
    matches_won: int
    matches_lost: int
    matches_drawn: int
    win_rate: float
    match_history: List[MatchHistoryItem]


# ===========================
# ERROR MODELS
# ===========================

class ErrorResponse(BaseModel):
    """Standard error response"""
    detail: str
    error_code: Optional[str] = None


class SuccessResponse(BaseModel):
    """Standard success response"""
    message: str
    data: Optional[dict] = None