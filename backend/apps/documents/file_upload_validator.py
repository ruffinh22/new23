"""
Service de validation des fichiers selon les configurations.

Valide automatiquement les fichiers uploadés selon les règles
configurées par l'administrateur (taille, dimensions, contenu, etc.).
"""

import logging
from typing import Tuple, Optional, Dict, Any
from django.core.files.uploadedfile import UploadedFile
from django.core.exceptions import ValidationError
from .file_config_models import FileTypeConfiguration
from .file_metadata import FileMetadataExtractor

logger = logging.getLogger(__name__)


class FileValidationError(ValidationError):
    """Exception pour les erreurs de validation de fichiers."""

    def __init__(self, message: str, error_code: str = 'invalid_file'):
        super().__init__(message, code=error_code)


class FileTypeValidator:
    """Validateur de fichiers selon leurs configurations."""

    # Mapping des extensions vers les types de fichiers
    EXTENSION_MAPPING = {
        'pdf': 'pdf',
        'docx': 'docx',
        'doc': 'docx',
        'xlsx': 'xlsx',
        'xlsm': 'xlsm',
        'xls': 'xlsx',
        'csv': 'csv',
        'tsv': 'tsv',
        'ods': 'ods',
        'txt': 'txt',  # Ajouter support pour fichiers texte
        'jpg': 'image',
        'jpeg': 'image',
        'png': 'image',
        'gif': 'image',
        'webp': 'image',
        'bmp': 'image',
        'zip': 'zip',
    }

    @staticmethod
    def get_file_type(filename: str) -> Optional[str]:
        """Détermine le type de fichier à partir de l'extension."""
        if not filename:
            return None

        ext = filename.lower().split('.')[-1]
        return FileTypeValidator.EXTENSION_MAPPING.get(ext)

    @staticmethod
    def validate_file(file: UploadedFile, file_type: Optional[str] = None) -> Tuple[bool, Optional[str]]:
        """
        Valide un fichier selon sa configuration.

        Args:
            file: Fichier à valider
            file_type: Type de fichier (auto-détecté si non fourni)

        Returns:
            Tuple (is_valid, error_message)
        """
        try:
            # Déterminer le type si non fourni
            if not file_type:
                file_type = FileTypeValidator.get_file_type(file.name)

            if not file_type:
                return False, f"Type de fichier non supporté: {file.name}"

            # Obtenir la configuration
            try:
                config = FileTypeConfiguration.objects.get(
                    file_type=file_type,
                    is_enabled=True
                )
            except FileTypeConfiguration.DoesNotExist:
                return False, f"Type de fichier désactivé par l'administrateur: {file_type.upper()}"

            # Si validation auto n'est pas activée, accepter
            if not config.is_auto_validated:
                logger.info(f"Fichier {file.name} ({file_type}) accepté sans validation auto")
                return True, None

            # Valider selon le type
            error = FileTypeValidator._validate_file_type(file, config)
            if error:
                logger.warning(f"Validation échouée pour {file.name}: {error}")
                return False, error

            logger.info(f"Fichier {file.name} validé avec succès")
            return True, None

        except Exception as e:
            logger.error(f"Erreur validation fichier: {str(e)}")
            return False, f"Erreur lors de la validation: {str(e)}"

    @staticmethod
    def _validate_file_type(file: UploadedFile, config: FileTypeConfiguration) -> Optional[str]:
        """Valide les détails spécifiques selon le type de fichier."""

        # 1. Vérifier la taille
        file_size_mb = file.size / (1024 * 1024)

        if config.max_file_size_mb and file_size_mb > config.max_file_size_mb:
            return (
                f"Fichier trop volumineux: {file_size_mb:.1f} MB "
                f"(maximum: {config.max_file_size_mb} MB)"
            )

        if config.min_file_size_kb and file.size < config.min_file_size_kb * 1024:
            return (
                f"Fichier trop petit: {file.size / 1024:.1f} KB "
                f"(minimum: {config.min_file_size_kb} KB)"
            )

        # 2. Extraire les métadonnées
        metadata = FileMetadataExtractor.extract_metadata(file)

        # 3. Valider selon le type spécifique
        if config.file_type == 'pdf':
            return FileTypeValidator._validate_pdf(file, config, metadata)

        elif config.file_type in ['xlsx', 'xlsm']:
            return FileTypeValidator._validate_spreadsheet(file, config, metadata)

        elif config.file_type in ['csv', 'tsv']:
            return FileTypeValidator._validate_csv(file, config, metadata)

        elif config.file_type == 'ods':
            return FileTypeValidator._validate_ods(file, config, metadata)

        elif config.file_type == 'docx':
            return FileTypeValidator._validate_docx(file, config, metadata)

        elif config.file_type == 'image':
            return FileTypeValidator._validate_image(file, config, metadata)

        elif config.file_type == 'zip':
            return FileTypeValidator._validate_zip(file, config, metadata)

        return None

    @staticmethod
    def _validate_pdf(file: UploadedFile, config: FileTypeConfiguration, metadata: Dict) -> Optional[str]:
        """Valide les fichiers PDF."""
        pages = metadata.get('pages')

        if pages and config.max_pages and pages > config.max_pages:
            return f"PDF trop long: {pages} pages (maximum: {config.max_pages})"

        if config.require_no_password and metadata.get('is_encrypted'):
            return "Les fichiers PDF protégés par mot de passe ne sont pas autorisés"

        return None

    @staticmethod
    def _validate_spreadsheet(file: UploadedFile, config: FileTypeConfiguration, metadata: Dict) -> Optional[str]:
        """Valide les fichiers Excel (XLSX, XLSM)."""
        rows = metadata.get('rows')
        columns = metadata.get('columns')
        sheets = metadata.get('sheets')

        if rows and config.max_rows and rows > config.max_rows:
            return f"Feuille de calcul trop grande: {rows} lignes (maximum: {config.max_rows})"

        if columns and config.max_columns and columns > config.max_columns:
            return f"Trop de colonnes: {columns} (maximum: {config.max_columns})"

        if sheets and config.max_sheets and sheets > config.max_sheets:
            return f"Trop de feuilles: {sheets} (maximum: {config.max_sheets})"

        # Vérifier les restrictions de contenu
        if config.require_macros_disabled:
            if file.name.endswith('.xlsm'):
                return "Les fichiers avec macros ne sont pas autorisés"

        return None

    @staticmethod
    def _validate_csv(file: UploadedFile, config: FileTypeConfiguration, metadata: Dict) -> Optional[str]:
        """Valide les fichiers CSV."""
        rows = metadata.get('rows')
        columns = metadata.get('columns')

        if rows and config.max_rows and rows > config.max_rows:
            return f"Fichier trop grand: {rows} lignes (maximum: {config.max_rows})"

        if columns and config.max_columns and columns > config.max_columns:
            return f"Trop de colonnes: {columns} (maximum: {config.max_columns})"

        return None

    @staticmethod
    def _validate_ods(file: UploadedFile, config: FileTypeConfiguration, metadata: Dict) -> Optional[str]:
        """Valide les fichiers ODS."""
        return FileTypeValidator._validate_spreadsheet(file, config, metadata)

    @staticmethod
    def _validate_docx(file: UploadedFile, config: FileTypeConfiguration, metadata: Dict) -> Optional[str]:
        """Valide les fichiers DOCX."""
        estimated_pages = metadata.get('estimated_pages')

        if estimated_pages and config.max_pages and estimated_pages > config.max_pages:
            return (
                f"Document trop long: ~{estimated_pages} pages "
                f"(maximum: {config.max_pages})"
            )

        return None

    @staticmethod
    def _validate_image(file: UploadedFile, config: FileTypeConfiguration, metadata: Dict) -> Optional[str]:
        """Valide les fichiers images."""
        width = metadata.get('width')
        height = metadata.get('height')

        if width and config.max_width_px and width > config.max_width_px:
            return f"Image trop large: {width}px (maximum: {config.max_width_px}px)"

        if height and config.max_height_px and height > config.max_height_px:
            return f"Image trop haute: {height}px (maximum: {config.max_height_px}px)"

        if width and config.min_width_px and width < config.min_width_px:
            return f"Image trop étroite: {width}px (minimum: {config.min_width_px}px)"

        if height and config.min_height_px and height < config.min_height_px:
            return f"Image trop courte: {height}px (minimum: {config.min_height_px}px)"

        return None

    @staticmethod
    def _validate_zip(file: UploadedFile, config: FileTypeConfiguration, metadata: Dict) -> Optional[str]:
        """Valide les fichiers ZIP."""
        # ZIP ne fait généralement pas d'auto-validation
        # Il est recommandé pour validation manuelle

        return None

    @staticmethod
    def get_enabled_file_types() -> list:
        """Retourne la liste des types de fichiers activés."""
        return (
            FileTypeConfiguration.objects
            .filter(is_enabled=True)
            .values_list('file_type', flat=True)
        )

    @staticmethod
    def get_validation_summary(file: UploadedFile) -> Dict[str, Any]:
        """Retourne un résumé complet de validation d'un fichier."""
        file_type = FileTypeValidator.get_file_type(file.name)
        is_valid, error_message = FileTypeValidator.validate_file(file, file_type)
        metadata = FileMetadataExtractor.extract_metadata(file)

        return {
            'filename': file.name,
            'file_type': file_type,
            'is_valid': is_valid,
            'error_message': error_message,
            'metadata': metadata,
            'file_size_mb': metadata.get('file_size_mb', 0),
        }
