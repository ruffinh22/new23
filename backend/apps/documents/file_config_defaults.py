# FILE: backend/apps/documents/file_config_defaults.py
"""
Configurations par défaut pour les types de fichiers
"""

from .file_config_models import FileTypeConfiguration


def initialize_default_configurations():
    """Initialiser les configurations par défaut"""

    defaults = [
        # PDF
        {
            "file_type": "pdf",
            "display_name": "PDF",
            "description": "Fichiers PDF",
            "max_file_size_mb": 100,
            "min_file_size_kb": 10,
            "max_pages": 1000,
            "require_no_password": True,
            "is_enabled": True,
            "is_auto_validated": True,
        },
        # Word
        {
            "file_type": "docx",
            "display_name": "Word (.docx)",
            "description": "Documents Word moderne",
            "max_file_size_mb": 50,
            "min_file_size_kb": 5,
            "max_pages": 500,
            "require_macros_disabled": True,
            "require_no_password": False,
            "is_enabled": True,
            "is_auto_validated": True,
        },
        # Excel Modern
        {
            "file_type": "xlsx",
            "display_name": "Excel (.xlsx)",
            "description": "Classeurs Excel moderne",
            "max_file_size_mb": 100,
            "min_file_size_kb": 5,
            "max_rows": 1000000,
            "max_columns": 1000,
            "max_sheets": 100,
            "require_macros_disabled": False,
            "is_enabled": True,
            "is_auto_validated": True,
        },
        # Excel Macro
        {
            "file_type": "xlsm",
            "display_name": "Excel Macro (.xlsm)",
            "description": "Classeurs Excel avec macros",
            "max_file_size_mb": 100,
            "min_file_size_kb": 5,
            "max_rows": 1000000,
            "max_columns": 1000,
            "max_sheets": 100,
            "require_macros_disabled": False,
            "is_enabled": True,
            "is_auto_validated": True,
        },
        # CSV
        {
            "file_type": "csv",
            "display_name": "CSV",
            "description": "Fichiers CSV (délimités par virgules)",
            "max_file_size_mb": 200,
            "min_file_size_kb": 1,
            "max_rows": 1000000,
            "max_columns": 1000,
            "require_utf8_encoding": False,
            "is_enabled": True,
            "is_auto_validated": True,
        },
        # TSV
        {
            "file_type": "tsv",
            "display_name": "TSV",
            "description": "Fichiers TSV (délimités par tabulations)",
            "max_file_size_mb": 200,
            "min_file_size_kb": 1,
            "max_rows": 1000000,
            "max_columns": 1000,
            "is_enabled": True,
            "is_auto_validated": True,
        },
        # OpenDocument
        {
            "file_type": "ods",
            "display_name": "OpenDocument Spreadsheet",
            "description": "Feuilles de calcul OpenDocument",
            "max_file_size_mb": 100,
            "min_file_size_kb": 5,
            "max_rows": 1000000,
            "max_columns": 1000,
            "max_sheets": 100,
            "is_enabled": True,
            "is_auto_validated": True,
        },
        # Images
        {
            "file_type": "image",
            "display_name": "Images",
            "description": "Fichiers image (JPG, PNG, etc.)",
            "max_file_size_mb": 50,
            "min_file_size_kb": 10,
            "max_width_px": 10000,
            "max_height_px": 10000,
            "min_width_px": 100,
            "min_height_px": 100,
            "is_enabled": True,
            "is_auto_validated": True,
        },
        # ZIP
        {
            "file_type": "zip",
            "display_name": "Archives ZIP",
            "description": "Fichiers compressés ZIP",
            "max_file_size_mb": 500,
            "min_file_size_kb": 100,
            "is_enabled": True,
            "is_auto_validated": False,  # Les archives nécessitent une validation manuelle
        },
    ]

    for config_data in defaults:
        FileTypeConfiguration.objects.get_or_create(
            file_type=config_data["file_type"], defaults=config_data
        )

    print("✅ Configurations par défaut initialisées")
