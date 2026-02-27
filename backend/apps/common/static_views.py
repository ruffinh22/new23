"""
Professional static file serving view.
Handles both development and production correctly.
"""

from django.http import FileResponse
from django.views import View
from django.conf import settings
from pathlib import Path


class StaticFileServer(View):
    """
    Production-grade static file server.
    Searches in STATIC_DIRS in order, returns first match.
    """

    def get(self, request, path):
        """Serve static file from configured STATIC_DIRS"""
        # Security: prevent directory traversal
        if ".." in path or path.startswith("/"):
            return self.http404_response(f"Invalid path: {path}")

        # Search for file in STATIC_DIRS
        for static_dir in settings.STATIC_DIRS:
            file_path = Path(static_dir) / path

            # Verify the resolved path is still within STATIC_DIRS
            try:
                file_path.resolve().relative_to(Path(static_dir).resolve())
            except ValueError:
                # Path is outside STATIC_DIRS (directory traversal attempt)
                continue

            if file_path.is_file():
                try:
                    return FileResponse(
                        open(file_path, "rb"), content_type=self.get_content_type(path)
                    )
                except IOError:
                    return self.http404_response(f"Could not read file: {path}")

        # File not found in any STATIC_DIRS
        return self.http404_response(f"Static file not found: {path}")

    def head(self, request, path):
        """Handle HEAD requests (used by curl -I)"""
        # Same logic but without file content
        for static_dir in settings.STATIC_DIRS:
            file_path = Path(static_dir) / path
            if file_path.is_file():
                return FileResponse(
                    open(file_path, "rb"), content_type=self.get_content_type(path)
                )
        return self.http404_response(f"Static file not found: {path}")

    @staticmethod
    def http404_response(message):
        """Return proper 404 response without raising exception"""
        from django.http import HttpResponse

        return HttpResponse(
            f"<html><body><h1>404 Not Found</h1><p>{message}</p></body></html>",
            status=404,
            content_type="text/html",
        )

    @staticmethod
    def get_content_type(path):
        """Determine MIME type based on file extension"""
        content_types = {
            ".js": "application/javascript",
            ".css": "text/css",
            ".html": "text/html",
            ".svg": "image/svg+xml",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".gif": "image/gif",
            ".ico": "image/x-icon",
            ".woff": "font/woff",
            ".woff2": "font/woff2",
            ".ttf": "font/ttf",
            ".eot": "application/vnd.ms-fontobject",
            ".json": "application/json",
            ".txt": "text/plain",
        }

        ext = Path(path).suffix.lower()
        return content_types.get(ext, "application/octet-stream")
