# ============================================================
# FILE: backend/apps/common/routers.py
# Professional custom router that prevents format_suffix_patterns
# from registering the same converter multiple times
# ============================================================

from rest_framework.routers import DefaultRouter
from rest_framework import urlpatterns as drf_urlpatterns
import logging

logger = logging.getLogger(__name__)

# Store the original format_suffix_patterns function
_original_format_suffix_patterns = drf_urlpatterns.format_suffix_patterns
_format_suffix_applied_count = 0


def safe_format_suffix_patterns(urlpatterns, suffix_pattern=None, default=None):
    """
    Wrapper around format_suffix_patterns that handles "already registered" errors gracefully.
    
    When called multiple times (e.g., by multiple routers), it catches the converter
    registration error and continues. Only the first call registers the converter globally.
    """
    global _format_suffix_applied_count
    
    try:
        result = _original_format_suffix_patterns(urlpatterns, suffix_pattern, default)
        _format_suffix_applied_count += 1
        logger.debug(f"format_suffix_patterns applied successfully (call #{_format_suffix_applied_count})")
        return result
    except ValueError as e:
        if "already registered" in str(e):
            # The converter is already registered globally - this is fine
            # Just return the urlpatterns without suffix patterns
            logger.debug(f"DRF format_suffix converter already registered (call #{_format_suffix_applied_count + 1}), skipping")
            return urlpatterns
        else:
            # Re-raise if it's a different error
            raise


# Monkey-patch the DRF module to use our safe version
drf_urlpatterns.format_suffix_patterns = safe_format_suffix_patterns


class SafeDefaultRouter(DefaultRouter):
    """
    Custom DefaultRouter that uses the safe_format_suffix_patterns wrapper.
    
    This prevents ValueError: Converter 'drf_format_suffix' is already registered
    when multiple routers are used in the same URL configuration.
    
    Professional solution: Monkey-patches format_suffix_patterns at module import time.
    """
    pass
