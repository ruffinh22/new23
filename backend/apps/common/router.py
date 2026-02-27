"""
Custom Router for production environments.

Solves: ValueError: Converter 'drf_format_suffix' already registered
Cause: Multiple routers calling format_suffix_patterns in different URLconfs
Solution: Inherit from SimpleRouter (no format suffixes) but keep API browsable root
"""

from rest_framework.routers import SimpleRouter


class AppRouter(SimpleRouter):
    """
    Production router combining best of both worlds:
    - SimpleRouter's clean URL patterns without format suffix conflicts
    - DefaultRouter's API root endpoints for browsable API
    """

    include_root_view = True
