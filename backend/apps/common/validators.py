"""
Validateurs pour les requêtes API.
Centralise la validation des données entrantes.
"""

from typing import Any, Dict, List, Optional
from rest_framework.exceptions import ValidationError as DRFValidationError


class RequestValidator:
    """✅ VALIDATEUR: Centralise la validation des requêtes API.
    
    Fournit des méthodes réutilisables pour valider:
    - Types de données
    - Valeurs obligatoires
    - Plages de valeurs
    - Énumérations
    """
    
    @staticmethod
    def validate_required(data: Dict, fields: List[str]) -> None:
        """Vérifie que les champs obligatoires sont présents.
        
        Args:
            data: Dict de données
            fields: Liste des noms de champs obligatoires
            
        Raises:
            DRFValidationError: Si un champ manque
        """
        missing = [f for f in fields if f not in data or data[f] is None]
        if missing:
            raise DRFValidationError({
                'required_fields': f"Missing required fields: {missing}"
            })
    
    @staticmethod
    def validate_type(value: Any, expected_type: type, field_name: str) -> None:
        """Vérifie le type d'une valeur.
        
        Args:
            value: Valeur à vérifier
            expected_type: Type attendu (int, str, list, etc)
            field_name: Nom du champ (pour erreur)
            
        Raises:
            DRFValidationError: Si le type ne correspond pas
        """
        if value is not None and not isinstance(value, expected_type):
            raise DRFValidationError({
                field_name: f"Expected {expected_type.__name__}, got {type(value).__name__}"
            })
    
    @staticmethod
    def validate_choice(value: str, choices: List[str], field_name: str) -> None:
        """Vérifie qu'une valeur fait partie d'une liste de choix.
        
        Args:
            value: Valeur à vérifier
            choices: Liste des choix valides
            field_name: Nom du champ
            
        Raises:
            DRFValidationError: Si valeur non valide
        """
        if value and value not in choices:
            raise DRFValidationError({
                field_name: f"Invalid choice. Valid options: {choices}"
            })
    
    @staticmethod
    def validate_range(value: int, min_val: int = None, max_val: int = None, 
                      field_name: str = "value") -> None:
        """Vérifie qu'une valeur est dans une plage.
        
        Args:
            value: Valeur numérique
            min_val: Valeur minimale (inclusive)
            max_val: Valeur maximale (inclusive)
            field_name: Nom du champ
            
        Raises:
            DRFValidationError: Si hors limites
        """
        if value is None:
            return
        
        if min_val is not None and value < min_val:
            raise DRFValidationError({
                field_name: f"Value must be >= {min_val}"
            })
        
        if max_val is not None and value > max_val:
            raise DRFValidationError({
                field_name: f"Value must be <= {max_val}"
            })
    
    @staticmethod
    def validate_length(text: str, min_len: int = None, max_len: int = None,
                       field_name: str = "text") -> None:
        """Vérifie la longueur d'une chaîne.
        
        Args:
            text: Chaîne à vérifier
            min_len: Longueur minimale
            max_len: Longueur maximale
            field_name: Nom du champ
            
        Raises:
            DRFValidationError: Si longueur invalide
        """
        if text is None:
            return
        
        length = len(text)
        
        if min_len is not None and length < min_len:
            raise DRFValidationError({
                field_name: f"Length must be at least {min_len} characters"
            })
        
        if max_len is not None and length > max_len:
            raise DRFValidationError({
                field_name: f"Length must not exceed {max_len} characters"
            })
    
    @staticmethod
    def validate_date_format(date_str: str, field_name: str = "date") -> None:
        """Vérifie qu'une chaîne est au format YYYY-MM-DD.
        
        Args:
            date_str: Chaîne de date
            field_name: Nom du champ
            
        Raises:
            DRFValidationError: Si format invalide
        """
        from datetime import datetime
        if date_str is None:
            return
        
        try:
            datetime.strptime(date_str, '%Y-%m-%d')
        except ValueError:
            raise DRFValidationError({
                field_name: "Invalid date format. Use YYYY-MM-DD"
            })


class DocumentValidator(RequestValidator):
    """✅ VALIDATEUR: Spécifique aux Documents.
    
    Étend RequestValidator avec validation métier pour Documents.
    """
    
    VALID_STATUSES = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'ARCHIVED']
    # ✅ FIXED: Utilise les vrais types du Document model au lieu de REPORT/CONTRACT/INVOICE/OTHER
    VALID_DOCUMENT_TYPES = [
        'FACTURE', 'BON_COMMANDE', 'CONTRAT', 'RAPPORT',
        'CONGE', 'NOTE_FRAIS', 'MEDICAL',
        'DEVIS', 'LETTRES', 'ATTESTATION',
        'JUSTIFICATIF', 'BUDGET', 'DEMANDE', 'SYNTHESE', 'AUTRE'
    ]
    
    @classmethod
    def validate_document_create(cls, data: Dict) -> None:
        """Valide les données pour créer un document.
        
        Args:
            data: Données du document
            
        Raises:
            DRFValidationError: Si données invalides
        """
        # Champs obligatoires (agent_id est auto-rempli par l'utilisateur connecté)
        cls.validate_required(data, ['document_type', 'title'])
        
        # Types
        cls.validate_type(data.get('document_type'), str, 'document_type')
        cls.validate_type(data.get('title'), str, 'title')
        # agent_id est optionnel - validé seulement s'il est fourni
        if data.get('agent_id'):
            cls.validate_type(data.get('agent_id'), int, 'agent_id')
        
        # Énumérations
        cls.validate_choice(data.get('document_type'), cls.VALID_DOCUMENT_TYPES, 'document_type')
        
        # Longueur
        cls.validate_length(data.get('title'), min_len=3, max_len=255, field_name='title')
    
    @classmethod
    def validate_document_update(cls, data: Dict, partial: bool = True) -> None:
        """Valide les données pour mettre à jour un document.
        
        Args:
            data: Données partielles du document
            partial: Si True, champs optionnels (PATCH)
            
        Raises:
            DRFValidationError: Si données invalides
        """
        # Status si fourni
        if 'status' in data:
            cls.validate_choice(data['status'], cls.VALID_STATUSES, 'status')
        
        # Title si fourni
        if 'title' in data:
            cls.validate_type(data['title'], str, 'title')
            cls.validate_length(data['title'], min_len=3, max_len=255, field_name='title')
        
        # Document type si fourni
        if 'document_type' in data:
            cls.validate_choice(data['document_type'], cls.VALID_DOCUMENT_TYPES, 'document_type')


class FolderValidator(RequestValidator):
    """✅ VALIDATEUR: Spécifique aux Folders."""
    
    VALID_FOLDER_TYPES = ['pole', 'filiale', 'service', 'sub_service']
    
    @classmethod
    def validate_folder_create(cls, data: Dict) -> None:
        """Valide les données pour créer un dossier.
        
        Args:
            data: Données du dossier
            
        Raises:
            DRFValidationError: Si données invalides
        """
        # Champs obligatoires
        cls.validate_required(data, ['name', 'folder_type'])
        
        # Types
        cls.validate_type(data.get('name'), str, 'name')
        cls.validate_type(data.get('folder_type'), str, 'folder_type')
        
        # Énuméracion
        cls.validate_choice(data.get('folder_type'), cls.VALID_FOLDER_TYPES, 'folder_type')
        
        # Longueur
        cls.validate_length(data.get('name'), min_len=2, max_len=255, field_name='name')
