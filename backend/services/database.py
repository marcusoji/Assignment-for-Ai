"""
============================================
SUPABASE DATABASE SERVICE
All database operations
============================================
"""

import os
from supabase import create_client, Client
from typing import Optional, List, Dict
from datetime import datetime
import uuid


class SupabaseService:
    """
    Service for all Supabase database operations.
    
    Handles:
    - User management
    - Match tracking
    - Round history
    - Statistics retrieval
    """
    
    def __init__(self):
        """Initialize Supabase client"""
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_KEY")
        
        if not supabase_url or not supabase_key:
            raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set")
        
        self.client: Client = create_client(supabase_url, supabase_key)
    
    # ===========================
    # USER OPERATIONS
    # ===========================
    
    async def get_or_create_user(self, username: str) -> Dict:
        """
        Get existing user or create new one.
        
        Args:
            username: User's chosen username
            
        Returns:
            User dictionary with id, username, and stats
        """
        try:
            # Check if user exists
            response = self.client.table('users').select('*').eq('username', username).execute()
            
            if response.data and len(response.data) > 0:
                # User exists, return their data
                return response.data[0]
            
            # Create new user
            user_id = str(uuid.uuid4())
            new_user = {
                'id': user_id,
                'username': username,
                'created_at': datetime.utcnow().isoformat(),
                'total_matches': 0,
                'matches_won': 0,
                'matches_lost': 0,
                'matches_drawn': 0
            }
            
            response = self.client.table('users').insert(new_user).execute()
            return response.data[0]
            
        except Exception as e:
            raise Exception(f"Database error: {str(e)}")
    
    async def get_user_by_id(self, user_id: str) -> Optional[Dict]:
        """Get user by ID"""
        try:
            response = self.client.table('users').select('*').eq('id', user_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            raise Exception(f"Database error: {str(e)}")
    
    async def update_user_stats(
        self, 
        user_id: str, 
        matches_won: int = 0,
        matches_lost: int = 0,
        matches_drawn: int = 0
    ):
        """Update user statistics after match completion"""
        try:
            # Get current stats
            user = await self.get_user_by_id(user_id)
            if not user:
                raise ValueError("User not found")
            
            # Update stats
            new_stats = {
                'total_matches': user['total_matches'] + 1,
                'matches_won': user['matches_won'] + matches_won,
                'matches_lost': user['matches_lost'] + matches_lost,
                'matches_drawn': user['matches_drawn'] + matches_drawn
            }
            
            self.client.table('users').update(new_stats).eq('id', user_id).execute()
            
        except Exception as e:
            raise Exception(f"Database error: {str(e)}")
    
    # ===========================
    # MATCH OPERATIONS
    # ===========================
    
    async def create_match(
        self, 
        user_id: str, 
        mode: str, 
        difficulty: Optional[str]
    ) -> Dict:
        """
        Create a new match.
        
        Args:
            user_id: User's ID
            mode: Game mode
            difficulty: AI difficulty (if applicable)
            
        Returns:
            Match dictionary with match_id and initial state
        """
        try:
            match_id = str(uuid.uuid4())
            match_data = {
                'id': match_id,
                'user_id': user_id,
                'mode': mode,
                'difficulty': difficulty,
                'status': 'in_progress',
                'current_round': 1,
                'player1_score': 0,
                'player2_score': 0,
                'created_at': datetime.utcnow().isoformat(),
                'completed_at': None,
                'final_result': None
            }
            
            response = self.client.table('matches').insert(match_data).execute()
            return response.data[0]
            
        except Exception as e:
            raise Exception(f"Database error: {str(e)}")
    
    async def get_match(self, match_id: str) -> Optional[Dict]:
        """Get match by ID"""
        try:
            response = self.client.table('matches').select('*').eq('id', match_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            raise Exception(f"Database error: {str(e)}")
    
    async def update_match(self, match_id: str, updates: Dict):
        """Update match data"""
        try:
            self.client.table('matches').update(updates).eq('id', match_id).execute()
        except Exception as e:
            raise Exception(f"Database error: {str(e)}")
    
    async def complete_match(
        self, 
        match_id: str, 
        result: str,
        final_score_p1: int,
        final_score_p2: int
    ):
        """
        Mark match as completed and update user stats.
        
        Args:
            match_id: Match ID
            result: Match result ('player1_win', 'player2_win', 'draw')
            final_score_p1: Final score for player 1
            final_score_p2: Final score for player 2
        """
        try:
            # Get match data
            match = await self.get_match(match_id)
            if not match:
                raise ValueError("Match not found")
            
            # Update match
            updates = {
                'status': 'completed',
                'completed_at': datetime.utcnow().isoformat(),
                'final_result': result,
                'player1_score': final_score_p1,
                'player2_score': final_score_p2
            }
            await self.update_match(match_id, updates)
            
            # Update user stats
            if result == 'player1_win':
                await self.update_user_stats(match['user_id'], matches_won=1)
            elif result == 'player2_win':
                await self.update_user_stats(match['user_id'], matches_lost=1)
            else:
                await self.update_user_stats(match['user_id'], matches_drawn=1)
                
        except Exception as e:
            raise Exception(f"Database error: {str(e)}")
    
    # ===========================
    # ROUND OPERATIONS
    # ===========================
    
    async def save_round(
        self,
        match_id: str,
        round_number: int,
        winner: Optional[str],
        board_state: List,
        player1_score: int,
        player2_score: int
    ):
        """
        Save a round's data.
        
        Args:
            match_id: Match ID
            round_number: Round number (1-3)
            winner: Winner ('X', 'O', or None for draw)
            board_state: Final board state
            player1_score: Score for player 1 after this round
            player2_score: Score for player 2 after this round
        """
        try:
            round_data = {
                'id': str(uuid.uuid4()),
                'match_id': match_id,
                'round_number': round_number,
                'winner': winner,
                'board_state': board_state,
                'player1_score': player1_score,
                'player2_score': player2_score,
                'created_at': datetime.utcnow().isoformat()
            }
            
            self.client.table('rounds').insert(round_data).execute()
            
            # Update match's current round
            await self.update_match(match_id, {
                'current_round': round_number,
                'player1_score': player1_score,
                'player2_score': player2_score
            })
            
        except Exception as e:
            raise Exception(f"Database error: {str(e)}")
    
    async def get_match_rounds(self, match_id: str) -> List[Dict]:
        """Get all rounds for a match"""
        try:
            response = self.client.table('rounds').select('*').eq('match_id', match_id).order('round_number').execute()
            return response.data
        except Exception as e:
            raise Exception(f"Database error: {str(e)}")
    
    # ===========================
    # STATISTICS OPERATIONS
    # ===========================
    
    async def get_user_statistics(self, user_id: str) -> Dict:
        """
        Get comprehensive user statistics.
        
        Returns:
            Dictionary containing:
            - Total matches
            - Win/loss/draw counts
            - Win rate
            - Match history
        """
        try:
            # Get user data
            user = await self.get_user_by_id(user_id)
            if not user:
                raise ValueError("User not found")
            
            # Calculate win rate
            total = user['total_matches']
            win_rate = (user['matches_won'] / total * 100) if total > 0 else 0
            
            # Get match history
            response = self.client.table('matches')\
                .select('*')\
                .eq('user_id', user_id)\
                .eq('status', 'completed')\
                .order('completed_at', desc=True)\
                .limit(50)\
                .execute()
            
            matches = response.data
            
            # Format match history
            match_history = []
            for match in matches:
                opponent = self._get_opponent_name(match)
                result = self._format_result(match['final_result'])
                score = f"{match['player1_score']}-{match['player2_score']}"
                
                match_history.append({
                    'date': match['completed_at'],
                    'opponent': opponent,
                    'mode': match['mode'],
                    'difficulty': match.get('difficulty'),
                    'result': result,
                    'score': score
                })
            
            return {
                'user_id': user_id,
                'username': user['username'],
                'total_matches': total,
                'matches_won': user['matches_won'],
                'matches_lost': user['matches_lost'],
                'matches_drawn': user['matches_drawn'],
                'win_rate': round(win_rate, 1),
                'match_history': match_history
            }
            
        except Exception as e:
            raise Exception(f"Database error: {str(e)}")
    
    def _get_opponent_name(self, match: Dict) -> str:
        """Get opponent name based on mode"""
        mode = match['mode']
        difficulty = match.get('difficulty')
        
        if mode == 'human_vs_ai':
            return f"AI ({difficulty})" if difficulty else "AI"
        elif mode == 'human_vs_human':
            return "Human"
        else:
            return "AI vs AI"
    
    def _format_result(self, result: str) -> str:
        """Format result for display"""
        if result == 'player1_win':
            return 'Win'
        elif result == 'player2_win':
            return 'Loss'
        else:
            return 'Draw'


# Singleton instance
supabase_service = SupabaseService()