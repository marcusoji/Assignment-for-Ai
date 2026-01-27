"""
============================================
FASTAPI MAIN APPLICATION - WITH FULL AUTH
Complete REST API with Authentication
============================================
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Optional
import uvicorn

from models.schemas_updated import (
    UserRegister, UserLogin, UserResponse, AuthResponse,
    PasswordResetRequest, PasswordResetConfirm, PasswordChange,
    MatchCreate, MatchResponse, RoundCreate, MatchComplete,
    AIMoveRequest, AIMoveResponse, UserStatistics, 
    ErrorResponse, SuccessResponse
)
from services.database import supabase_service
from services.auth import auth_service
from core.minimax import MinimaxEngine

# ===========================
# APP INITIALIZATION
# ===========================

app = FastAPI(
    title="AI Tic-Tac-Toe API",
    description="Complete REST API with Authentication for Minimax-powered Tic-Tac-Toe game",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize AI engine
ai_engine = MinimaxEngine()


# ===========================
# ERROR HANDLERS
# ===========================

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Custom HTTP exception handler"""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """General exception handler"""
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)}
    )


# ===========================
# HEALTH CHECK
# ===========================

@app.get("/")
async def root():
    """API root endpoint"""
    return {
        "message": "AI Tic-Tac-Toe API with Authentication",
        "version": "2.0.0",
        "status": "operational",
        "endpoints": {
            "auth": "/api/auth",
            "users": "/api/users",
            "matches": "/api/matches",
            "ai": "/api/ai",
            "docs": "/docs"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": "2026-01-27T00:00:00Z"}


# ===========================
# AUTHENTICATION ENDPOINTS
# ===========================

@app.post("/api/auth/register", response_model=AuthResponse)
async def register(user_data: UserRegister):
    """
    Register a new user.
    
    Requires:
    - Unique username (3+ characters)
    - Valid email address
    - Password (6+ characters)
    
    Returns:
    - User data (without password)
    """
    try:
        user = await auth_service.register_user(
            username=user_data.username,
            email=user_data.email,
            password=user_data.password
        )
        
        return AuthResponse(
            user=UserResponse(**user),
            message="Registration successful"
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/auth/login", response_model=AuthResponse)
async def login(login_data: UserLogin):
    """
    Login with username/email and password.
    
    Accepts:
    - Username OR email
    - Password
    
    Returns:
    - User data (without password)
    """
    try:
        user = await auth_service.login_user(
            username_or_email=login_data.username_or_email,
            password=login_data.password
        )
        
        return AuthResponse(
            user=UserResponse(**user),
            message="Login successful"
        )
        
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/auth/forgot-password", response_model=SuccessResponse)
async def forgot_password(request_data: PasswordResetRequest):
    """
    Request password reset.
    
    Sends reset email with token (in production).
    For security, always returns success even if email doesn't exist.
    
    Returns:
    - Success message
    - Reset token (REMOVE IN PRODUCTION!)
    """
    try:
        result = await auth_service.request_password_reset(
            email=request_data.email
        )
        
        return SuccessResponse(
            message=result["message"],
            data={
                "reset_token": result.get("reset_token"),  # Remove in production
                "reset_link": result.get("reset_link")      # Remove in production
            }
        )
        
    except Exception as e:
        # Don't reveal errors for security
        return SuccessResponse(
            message="If the email exists, a reset link has been sent"
        )


@app.post("/api/auth/reset-password", response_model=SuccessResponse)
async def reset_password(reset_data: PasswordResetConfirm):
    """
    Reset password using reset token.
    
    Requires:
    - Valid reset token (from email)
    - New password (6+ characters)
    
    Returns:
    - Success message
    """
    try:
        result = await auth_service.reset_password(
            reset_token=reset_data.reset_token,
            new_password=reset_data.new_password
        )
        
        return SuccessResponse(message=result["message"])
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/auth/change-password", response_model=SuccessResponse)
async def change_password(user_id: str, password_data: PasswordChange):
    """
    Change password for authenticated user.
    
    Requires:
    - User ID
    - Current password
    - New password (6+ characters)
    
    Returns:
    - Success message
    """
    try:
        result = await auth_service.change_password(
            user_id=user_id,
            old_password=password_data.old_password,
            new_password=password_data.new_password
        )
        
        return SuccessResponse(message=result["message"])
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===========================
# USER ENDPOINTS
# ===========================

@app.get("/api/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: str):
    """Get user by ID"""
    try:
        user = await auth_service.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return UserResponse(**user)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/users/{user_id}/stats", response_model=UserStatistics)
async def get_user_statistics(user_id: str):
    """
    Get comprehensive user statistics.
    
    Returns:
    - Total matches, wins, losses, draws
    - Win rate percentage
    - Match history (last 50 matches)
    """
    try:
        stats = await supabase_service.get_user_statistics(user_id)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===========================
# MATCH ENDPOINTS
# ===========================

@app.post("/api/matches/start")
async def start_match(match_data: MatchCreate):
    """
    Start a new match.
    
    - Creates match record in database
    - Initializes Best-of-3 scoring
    - Returns match ID for tracking
    """
    try:
        match = await supabase_service.create_match(
            user_id=match_data.user_id,
            mode=match_data.mode.value,
            difficulty=match_data.difficulty.value if match_data.difficulty else None
        )
        
        return {
            "match_id": match['id'],
            "mode": match['mode'],
            "difficulty": match.get('difficulty'),
            "status": "Match started successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/matches/{match_id}", response_model=MatchResponse)
async def get_match(match_id: str):
    """Get match details"""
    try:
        match = await supabase_service.get_match(match_id)
        if not match:
            raise HTTPException(status_code=404, detail="Match not found")
        return match
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/matches/{match_id}/round")
async def save_round(match_id: str, round_data: RoundCreate):
    """
    Save a completed round.
    
    - Records round outcome
    - Updates match scores
    - Tracks board state for analysis
    """
    try:
        # Verify match exists
        match = await supabase_service.get_match(match_id)
        if not match:
            raise HTTPException(status_code=404, detail="Match not found")
        
        # Save round
        await supabase_service.save_round(
            match_id=match_id,
            round_number=round_data.round_number,
            winner=round_data.winner,
            board_state=round_data.board_state,
            player1_score=round_data.player1_score,
            player2_score=round_data.player2_score
        )
        
        return {"status": "Round saved successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/matches/{match_id}/complete")
async def complete_match(match_id: str, result_data: MatchComplete):
    """
    Complete a match.
    
    - Marks match as finished
    - Updates user statistics
    - Records final outcome
    
    BEST-OF-3 RULES ENFORCED:
    - Match ends when a player reaches 2 wins
    - If all 3 rounds are draws, match is a draw
    - No infinite rounds
    """
    try:
        await supabase_service.complete_match(
            match_id=match_id,
            result=result_data.result.value,
            final_score_p1=result_data.final_score_p1,
            final_score_p2=result_data.final_score_p2
        )
        
        return {"status": "Match completed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/matches/{match_id}/rounds")
async def get_match_rounds(match_id: str):
    """Get all rounds for a match"""
    try:
        rounds = await supabase_service.get_match_rounds(match_id)
        return {"rounds": rounds}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===========================
# AI ENDPOINTS
# ===========================

@app.post("/api/ai/move", response_model=AIMoveResponse)
async def get_ai_move(move_request: AIMoveRequest):
    """
    Get AI's best move.
    FIXED: Added board sanitization to ensure empty strings are treated as None.
    """
    try:
        # 1. SANITIZE BOARD: Ensure ["X", "", ""] becomes ["X", None, None]
        # This prevents the AI from thinking the board is full.
        clean_board = [None if cell == "" or cell is None else cell for cell in move_request.board]
        
        # 2. GET DIFFICULTY: Ensure it's a string and lowercase
        diff_str = move_request.difficulty.value.lower() if hasattr(move_request.difficulty, 'value') else str(move_request.difficulty).lower()

        # 3. CALL ENGINE
        result = ai_engine.get_best_move(
            board=clean_board,
            player=move_request.player,
            difficulty=diff_str
        )
        
        if result is None or result.get('move') is None:
            raise HTTPException(status_code=400, detail="No valid moves available")
        
        return AIMoveResponse(
            move=result['move'],
            score=result['score'],
            nodes_evaluated=result['nodes_evaluated'],
            branches_pruned=result['branches_pruned'],
            explanation=result['explanation']
        )
        
    except Exception as e:
        print(f"AI Error: {e}") # Log this to your console
        raise HTTPException(status_code=500, detail=f"AI Engine Error: {str(e)}")

@app.post("/api/ai/evaluate")
async def evaluate_position(move_request: AIMoveRequest):
    """Detailed position analysis."""
    try:
        clean_board = [None if cell == "" or cell is None else cell for cell in move_request.board]
        
        result = ai_engine.get_best_move(
            board=clean_board,
            player=move_request.player,
            difficulty='hard'
        )
        
        return {
            "best_move": result['move'],
            "evaluation": result['score'],
            "analysis": result['explanation'],
            "performance": {
                "nodes_evaluated": result['nodes_evaluated'],
                "branches_pruned": result['branches_pruned']
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/ai/algorithm")
async def get_algorithm_explanation():
    """
    Get detailed explanation of the Minimax algorithm.
    """
    return {
        "algorithm": "Minimax with Alpha-Beta Pruning",
        "description": "A recursive decision-making algorithm that assumes both players play optimally",
        "how_it_works": {
            "step_1": "Generate all possible moves from current position",
            "step_2": "Recursively evaluate each move by simulating future game states",
            "step_3": "Assign scores to terminal states (win: +10, loss: -10, draw: 0)",
            "step_4": "Propagate scores back up the tree",
            "step_5": "Maximizing player chooses highest score, minimizing player chooses lowest",
            "step_6": "Alpha-beta pruning eliminates branches that won't affect final decision"
        },
        "complexity": {
            "time": "O(b^d) without pruning, where b=branching factor, d=depth",
            "space": "O(d) for recursive call stack",
            "optimization": "Alpha-beta pruning reduces nodes by 50-90%"
        },
        "guarantees": {
            "hard_mode": "Always finds optimal move - AI never loses",
            "medium_mode": "Good moves with some randomness - beatable",
            "easy_mode": "Random moves - easily beatable"
        }
    }


# ===========================
# RUN SERVER
# ===========================

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
