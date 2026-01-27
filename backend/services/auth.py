"""
============================================
COMPLETE AUTHENTICATION SERVICE
With Registration, Login, and Password Reset
============================================
"""

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict
import os
from supabase import create_client, Client


class AuthService:
    """
    Complete authentication service with:
    - User registration
    - Login with password
    - Password reset via email
    - Token-based password reset
    """
    
    def __init__(self):
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_KEY")
        
        if not supabase_url or not supabase_key:
            raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set")
        
        self.client: Client = create_client(supabase_url, supabase_key)
    
    # ===========================
    # PASSWORD HASHING
    # ===========================
    
    def _hash_password(self, password: str, salt: str) -> str:
        """
        Hash password using PBKDF2 with SHA256.
        
        Args:
            password: Plain text password
            salt: Salt for hashing
            
        Returns:
            Hexadecimal hash string
        """
        return hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt.encode('utf-8'),
            100000  # 100,000 iterations
        ).hex()
    
    def _verify_password(self, password: str, password_hash: str, salt: str) -> bool:
        """
        Verify password against stored hash.
        
        Args:
            password: Plain text password to verify
            password_hash: Stored password hash
            salt: Salt used for hashing
            
        Returns:
            True if password matches, False otherwise
        """
        computed_hash = self._hash_password(password, salt)
        return computed_hash == password_hash
    
    # ===========================
    # USER REGISTRATION
    # ===========================
    
    async def register_user(self, username: str, email: str, password: str) -> Dict:
        """
        Register a new user with username, email, and password.
        
        Args:
            username: Unique username
            email: User's email address
            password: Plain text password (will be hashed)
            
        Returns:
            User dictionary (without password)
            
        Raises:
            ValueError: If username or email already exists
        """
        # Validate input
        if len(password) < 6:
            raise ValueError("Password must be at least 6 characters")
        
        if len(username) < 3:
            raise ValueError("Username must be at least 3 characters")
        
        # Check if username exists
        username_check = self.client.table('users').select('id').eq('username', username).execute()
        if username_check.data:
            raise ValueError("Username already taken")
        
        # Check if email exists
        email_check = self.client.table('users').select('id').eq('email', email).execute()
        if email_check.data:
            raise ValueError("Email already registered")
        
        # Generate salt and hash password
        salt = secrets.token_hex(16)
        password_hash = self._hash_password(password, salt)
        
        # Create user
        user_id = str(uuid.uuid4())
        user_data = {
            'id': user_id,
            'username': username,
            'email': email,
            'password_hash': password_hash,
            'password_salt': salt,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat(),
            'total_matches': 0,
            'matches_won': 0,
            'matches_lost': 0,
            'matches_drawn': 0
        }
        
        response = self.client.table('users').insert(user_data).execute()
        
        # Remove sensitive data before returning
        user_result = response.data[0]
        user_result.pop('password_hash', None)
        user_result.pop('password_salt', None)
        
        return user_result
    
    # ===========================
    # USER LOGIN
    # ===========================
    
    async def login_user(self, username_or_email: str, password: str) -> Dict:
        """
        Login user with username/email and password.
        
        Args:
            username_or_email: Username or email address
            password: Plain text password
            
        Returns:
            User dictionary (without password)
            
        Raises:
            ValueError: If credentials are invalid
        """
        # Try to find user by username or email
        if '@' in username_or_email:
            # Looks like email
            response = self.client.table('users').select('*').eq('email', username_or_email).execute()
        else:
            # Looks like username
            response = self.client.table('users').select('*').eq('username', username_or_email).execute()
        
        if not response.data:
            raise ValueError("Invalid username/email or password")
        
        user = response.data[0]
        
        # Verify password
        if not self._verify_password(password, user['password_hash'], user['password_salt']):
            raise ValueError("Invalid username/email or password")
        
        # Remove sensitive data
        user.pop('password_hash', None)
        user.pop('password_salt', None)
        user.pop('reset_token', None)
        user.pop('reset_token_expires', None)
        
        return user
    
    # ===========================
    # PASSWORD RESET REQUEST
    # ===========================
    
    async def request_password_reset(self, email: str) -> Dict:
        """
        Generate password reset token and send reset email.
        
        Args:
            email: User's email address
            
        Returns:
            Dictionary with reset_token (in real app, send via email)
            
        Raises:
            ValueError: If email not found
        """
        # Find user by email
        response = self.client.table('users').select('*').eq('email', email).execute()
        
        if not response.data:
            # For security, don't reveal if email exists
            # Return success either way
            return {
                "message": "If the email exists, a reset link has been sent",
                "reset_token": None
            }
        
        user = response.data[0]
        
        # Generate secure reset token
        reset_token = secrets.token_urlsafe(32)
        
        # Token expires in 1 hour
        expires_at = datetime.utcnow() + timedelta(hours=1)
        
        # Save token to database
        self.client.table('users').update({
            'reset_token': reset_token,
            'reset_token_expires': expires_at.isoformat()
        }).eq('id', user['id']).execute()
        
        # In production, send email here
        # For now, return token (would be in email link)
        
        # IMPORTANT: In production, use an email service like:
        # - SendGrid
        # - AWS SES
        # - Resend
        # - Mailgun
        
        # Example email content:
        reset_link = f"http://yourdomain.com/reset-password?token={reset_token}"
        
        # TODO: Send actual email
        # await send_email(
        #     to=email,
        #     subject="Password Reset Request",
        #     body=f"Click here to reset your password: {reset_link}"
        # )
        
        return {
            "message": "If the email exists, a reset link has been sent",
            "reset_token": reset_token,  # Remove this in production!
            "reset_link": reset_link      # Remove this in production!
        }
    
    # ===========================
    # PASSWORD RESET CONFIRMATION
    # ===========================
    
    async def reset_password(self, reset_token: str, new_password: str) -> Dict:
        """
        Reset password using reset token.
        
        Args:
            reset_token: Token from reset email
            new_password: New password
            
        Returns:
            Success message
            
        Raises:
            ValueError: If token is invalid or expired
        """
        # Validate new password
        if len(new_password) < 6:
            raise ValueError("Password must be at least 6 characters")
        
        # Find user with this reset token
        response = self.client.table('users').select('*').eq('reset_token', reset_token).execute()
        
        if not response.data:
            raise ValueError("Invalid or expired reset token")
        
        user = response.data[0]
        
        # Check if token is expired
        if user.get('reset_token_expires'):
            # Convert the string from DB to an AWARE datetime object
            expires_at = datetime.fromisoformat(user['reset_token_expires'])
            
            # If the DB string didn't have TZ info, force it to UTC
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)

            # Compare against current AWARE UTC time
            if datetime.now(timezone.utc) > expires_at:
                raise ValueError("Reset token has expired")
        else:
            raise ValueError("Invalid reset token")
        
        # Generate new salt and hash new password
        new_salt = secrets.token_hex(16)
        new_password_hash = self._hash_password(new_password, new_salt)
        
        # Update password and clear reset token
        self.client.table('users').update({
            'password_hash': new_password_hash,
            'password_salt': new_salt,
            'reset_token': None,
            'reset_token_expires': None,
            'updated_at': datetime.utcnow().isoformat()
        }).eq('id', user['id']).execute()
        
        return {
            "message": "Password has been reset successfully"
        }
    
    # ===========================
    # CHANGE PASSWORD (AUTHENTICATED)
    # ===========================
    
    async def change_password(self, user_id: str, old_password: str, new_password: str) -> Dict:
        """
        Change password for authenticated user.
        
        Args:
            user_id: User's ID
            old_password: Current password
            new_password: New password
            
        Returns:
            Success message
            
        Raises:
            ValueError: If old password is incorrect
        """
        # Validate new password
        if len(new_password) < 6:
            raise ValueError("Password must be at least 6 characters")
        
        # Get user
        response = self.client.table('users').select('*').eq('id', user_id).execute()
        
        if not response.data:
            raise ValueError("User not found")
        
        user = response.data[0]
        
        # Verify old password
        if not self._verify_password(old_password, user['password_hash'], user['password_salt']):
            raise ValueError("Current password is incorrect")
        
        # Generate new salt and hash new password
        new_salt = secrets.token_hex(16)
        new_password_hash = self._hash_password(new_password, new_salt)
        
        # Update password
        self.client.table('users').update({
            'password_hash': new_password_hash,
            'password_salt': new_salt,
            'updated_at': datetime.utcnow().isoformat()
        }).eq('id', user_id).execute()
        
        return {
            "message": "Password changed successfully"
        }
    
    # ===========================
    # USER INFO
    # ===========================
    
    async def get_user_by_id(self, user_id: str) -> Optional[Dict]:
        """Get user by ID (without password)"""
        response = self.client.table('users').select('*').eq('id', user_id).execute()
        
        if not response.data:
            return None
        
        user = response.data[0]
        user.pop('password_hash', None)
        user.pop('password_salt', None)
        user.pop('reset_token', None)
        user.pop('reset_token_expires', None)
        
        return user


# Singleton instance
auth_service = AuthService()
