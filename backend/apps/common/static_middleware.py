"""
Ultra-simple static file serving middleware.
Intercepts static requests before Django routing.
Works in development and production.
"""

from pathlib import Path
from django.http import FileResponse, HttpResponse
from django.conf import settings
import mimetypes


class SimpleStaticFilesMiddleware:
    """
    Ultra-simple middleware that serves static files directly.
    Much simpler and more reliable than URL routing.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        # Use STATIC_ROOT if STATIC_DIRS is not defined (more common in modern Django)
        static_dirs = getattr(settings, "STATIC_DIRS", [])
        if not static_dirs and hasattr(settings, "STATIC_ROOT"):
            static_dirs = [settings.STATIC_ROOT]
        self.static_dirs = [str(d) for d in static_dirs if d]
        self.static_url_prefix = settings.STATIC_URL.rstrip("/")
        media_root = getattr(settings, "MEDIA_ROOT", None)
        self.media_dirs = [str(media_root)] if media_root else []
        self.media_url_prefix = getattr(settings, "MEDIA_URL", "/media/").rstrip("/")

    def __call__(self, request):
        # Try to serve static/media files
        response = self.serve_static_or_media(request)
        if response:
            return response

        # Otherwise, process normally
        return self.get_response(request)

    def serve_static_or_media(self, request):
        """Try to serve static or media file if path matches"""
        path = request.path

        # Handle static files
        if path.startswith(self.static_url_prefix + "/"):
            relative_path = path[len(self.static_url_prefix) + 1 :]
            return self.serve_file(relative_path, self.static_dirs)

        # Handle media files
        if path.startswith(self.media_url_prefix + "/"):
            relative_path = path[len(self.media_url_prefix) + 1 :]
            return self.serve_file(relative_path, self.media_dirs)

        return None

    def serve_file(self, relative_path, search_dirs):
        """Serve a file from one of the search directories"""
        # Security: prevent directory traversal
        if ".." in relative_path or relative_path.startswith("/"):
            return HttpResponse("Bad request", status=400)

        # Try to find file in search directories
        for search_dir in search_dirs:
            file_path = Path(search_dir) / relative_path

            # Verify path is still within search_dir
            try:
                file_path.resolve().relative_to(Path(search_dir).resolve())
            except ValueError:
                continue

            if file_path.is_file():
                try:
                    # Get MIME type
                    mime_type, _ = mimetypes.guess_type(str(file_path))
                    if mime_type is None:
                        mime_type = "application/octet-stream"

                    return FileResponse(open(file_path, "rb"), content_type=mime_type)
                except (IOError, OSError):
                    pass

        # File not found
        return None
