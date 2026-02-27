"""
Custom JWT Authentication Middleware for Django Channels WebSocket.

Extracts JWT token from query parameters and authenticates the WebSocket connection.
"""

import logging
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model
import jwt
from django.conf import settings

logger = logging.getLogger("apps.common")
User = get_user_model()


class JwtAuthMiddleware(BaseMiddleware):
    """
    JWT authentication middleware for WebSocket connections.

    Extracts JWT token from query parameters and authenticates the user.
    """

    async def __call__(self, scope, receive, send):
        """
        Middleware that processes WebSocket scope and authenticates user.
        """
        # Parse query string
        query_string = scope.get("query_string", b"").decode()

        # Extract token from query parameters
        token = self._extract_token_from_query(query_string)

        if token:
            # Authenticate user with JWT token
            user = await self._authenticate_user(token)
            scope["user"] = user
            if user.is_authenticated:
                print(
                    f"✅ [JwtAuthMiddleware] WebSocket authenticated for user: {user.matricule}"
                )
            else:
                print(
                    "⚠️ [JwtAuthMiddleware] Token validation failed, using AnonymousUser"
                )
        else:
            # No token provided
            scope["user"] = AnonymousUser()
            print("⚠️ [JwtAuthMiddleware] No token provided, using AnonymousUser")

        # Call the next middleware/consumer
        return await super().__call__(scope, receive, send)

    @staticmethod
    def _extract_token_from_query(query_string: str) -> str:
        """Extract JWT token from query string (e.g., 'token=abc123')"""
        try:
            if not query_string:
                return None

            # Parse query parameters
            params = {}
            for param in query_string.split("&"):
                if "=" in param:
                    key, value = param.split("=", 1)
                    params[key] = value

            token = params.get("token")

            if token:
                print(f"📝 [JwtAuthMiddleware] Extracted token: {token[:20]}...")

            return token
        except Exception as e:
            logger.error(f"❌ Error extracting token: {e}")
            return None

    @staticmethod
    @database_sync_to_async
    def _authenticate_user(token: str):
        """
        Authenticate user using JWT token.
        Falls back to Django session if JWT fails.
        """
        try:
            # Decode JWT token
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])

            user_id = payload.get("user_id")

            if user_id:
                user = User.objects.get(id=user_id)
                print(
                    f"✅ [JwtAuthMiddleware] User authenticated via JWT: {user.matricule}"
                )
                return user
            else:
                print("⚠️ [JwtAuthMiddleware] JWT payload missing user_id")
                return AnonymousUser()

        except jwt.ExpiredSignatureError:
            logger.warning("❌ JWT token expired")
            return AnonymousUser()
        except jwt.InvalidTokenError as e:
            logger.warning(f"❌ Invalid JWT token: {e}")
            return AnonymousUser()
        except User.DoesNotExist:
            logger.warning("❌ User not found for JWT token")
            return AnonymousUser()
        except Exception as e:
            logger.error(f"❌ JWT authentication error: {e}")
            return AnonymousUser()
