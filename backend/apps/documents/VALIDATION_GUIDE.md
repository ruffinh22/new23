# Système de Validation des Documents

## Vue d'ensemble

Le nouveau système de validation des documents permet de valider automatiquement les fichiers uploadés selon des spécifications définies avant qu'ils ne soient traités. Il supporte les fichiers Excel, CSV, PDF, Word et autres formats.

## Fonctionnalités

### 1. Validation automatique
- Les documents sont validés automatiquement lors de l'upload
- La validation se base sur les spécifications du type de document
- Les documents invalides sont rejetés avec des messages d'erreur détaillés

### 2. Support des fichiers Excel
- Validation des formats .xlsx, .xls, .xlsm
- Vérification des feuilles de calcul requises
- Validation des colonnes obligatoires
- Vérification du nombre de lignes
- Extraction des métadonnées du fichier

### 3. Support CSV
- Validation des fichiers CSV
- Vérification de l'encodage UTF-8
- Validation des colonnes requises
- Vérification du nombre de lignes

### 4. Gestion des statuts
- `NOUVEAU`: Document créé, en attente de validation
- `VALIDATION_EN_COURS`: Validation en cours
- `EN_ATTENTE`: En attente de traitement après validation positive
- `EN_COURS`: Document en cours de traitement
- `VALIDE`: Document validé et approuvé
- `REJETE`: Document rejeté par la validation
- `ARCHIVE`: Document archivé

### 5. Traçabilité
- Historique complet des validations
- Stockage des erreurs et avertissements
- Détails de la validation (colonnes détectées, nombre de lignes, etc.)

## Modèles de données

### DocumentSpecification
Définit les spécifications de validation pour chaque type de document.

**Champs clés:**
- `document_type`: Type unique du document
- `display_name`: Nom affiché
- `allowed_formats`: Formats autorisés (csv: pdf,xlsx,docx)
- `requires_excel`: Indique si c'est un fichier Excel
- `excel_sheet_name`: Nom de la feuille requise (optionnel)
- `required_columns`: Colonnes obligatoires en JSON
- `max_file_size_mb`: Taille maximale du fichier
- `max_rows`: Nombre maximal de lignes (pour Excel/CSV)
- `requires_validation`: Si la validation est obligatoire

### Document
Modèle pour les documents uploadés.

**Nouveaux champs:**
- `specification`: Référence vers la spécification
- `is_validated`: Booléen indiquant si validé
- `file_format`: Format du fichier (xlsx, pdf, etc.)
- `excel_sheet_name`: Nom de la feuille Excel
- `excel_row_count`: Nombre de lignes du fichier Excel
- `excel_column_count`: Nombre de colonnes du fichier Excel

### DocumentValidationResult
Résultats de la validation d'un document.

**Champs:**
- `status`: PASSED, WARNING, ou FAILED
- `errors`: Liste des erreurs
- `warnings`: Liste des avertissements
- `validation_details`: Détails techniques (JSON)

## Utilisation

### Initialiser les spécifications

```bash
python manage.py init_document_specs
```

Cela crée les spécifications par défaut pour les types de documents courants.

### Créer une spécification personnalisée

Via l'interface d'administration Django:
1. Aller à "Document Specifications"
2. Cliquer sur "Add Document Specification"
3. Remplir les champs:
   - Type: `RAPPORT_EXCEL`
   - Nom: `Rapport Excel`
   - Formats: `xlsx,xls`
   - Feuille Excel: `Rapport`
   - Colonnes requises: `["Date", "Agent", "Heures"]`
   - Taille max: 50 MB
   - Lignes max: 10000

### Valider un document

Les documents sont validés automatiquement lors de l'upload via l'API:

```bash
curl -X POST http://localhost:8000/api/documents/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "title=Mon Rapport" \
  -F "file=@rapport.xlsx" \
  -F "document_type=RAPPORT_EXCEL" \
  -F "description=Rapport d'activité"
```

Réponse avec résultats de validation:
```json
{
  "id": 1,
  "title": "Mon Rapport",
  "status": "EN_ATTENTE",
  "is_validated": true,
  "validation_result": {
    "status": "PASSED",
    "errors": [],
    "warnings": [],
    "validation_details": {
      "file_format": "xlsx",
      "sheet_names": ["Rapport", "Données"],
      "row_count": 150,
      "headers": ["Date", "Agent", "Heures", "Description"]
    }
  }
}
```

### Re-valider un document

```bash
POST /api/documents/{id}/validate/
```

### Approuver un document (admin)

```bash
POST /api/documents/{id}/approve/
```

### Rejeter un document (admin)

```bash
POST /api/documents/{id}/reject/
Content-Type: application/json

{
  "reason": "Format invalide, colonnes manquantes"
}
```

## API Endpoints

### Documents
- `GET /api/documents/` - Liste des documents
- `POST /api/documents/` - Créer un document (avec validation)
- `GET /api/documents/{id}/` - Détails d'un document
- `GET /api/documents/my_documents/` - Mes documents
- `POST /api/documents/{id}/validate/` - Re-valider
- `POST /api/documents/{id}/approve/` - Approuver (admin)
- `POST /api/documents/{id}/reject/` - Rejeter (admin)
- `GET /api/documents/pending_validation/` - Documents en attente (admin)
- `GET /api/documents/validation_stats/` - Statistiques (admin)

### Spécifications
- `GET /api/document-specifications/` - Liste des spécifications
- `GET /api/document-specifications/{id}/` - Détails
- `GET /api/document-specifications/by_type/` - Par type

### Résultats de validation
- `GET /api/validation-results/` - Résultats de validation
- `GET /api/validation-results/{id}/` - Détails

## Classe DocumentValidator

La classe `DocumentValidator` vérifie:

1. **Existence du fichier**: Le fichier doit exister et ne pas être vide
2. **Taille du fichier**: Respecte la limite maximale
3. **Format du fichier**: Correspond aux formats autorisés
4. **Fichiers Excel**:
   - Existence de la feuille requise
   - Nombre de lignes <= limite
   - Présence des colonnes requises
5. **Fichiers CSV**:
   - Encodage UTF-8
   - Colonnes requises présentes
   - Nombre de lignes acceptable

## Classe DocumentService

Le service gère le cycle de vie complet:
- Création avec validation automatique
- Re-validation des documents
- Approbation des documents
- Rejet avec raison

## Signaux et Notifications

Automatiquement:
- Notification d'upload au client
- Notification de validation échouée
- Notification de rejet
- Notification d'approbation
- Routage automatique après validation positive

## Exemple: Spécification Excel personnalisée

```python
from apps.documents.models import DocumentSpecification

spec = DocumentSpecification.objects.create(
    document_type='EXPORT_PAYROLL',
    display_name='Export Paie',
    description='Export mensuel de la paie',
    allowed_formats='xlsx,xls',
    requires_excel=True,
    excel_sheet_name='Paie',
    required_columns=['Date Debut', 'Date Fin', 'Agent', 'Salaire', 'Retenues'],
    max_file_size_mb=100,
    max_rows=5000,
    requires_validation=True,
)
```

## Erreurs courantes et solutions

### "La feuille Excel 'X' n'existe pas"
- Vérifier le nom exact de la feuille dans le fichier
- Les noms sont sensibles à la casse

### "Colonnes manquantes"
- Vérifier l'orthographe exacte des colonnes
- Vérifier la casse

### "Fichier corrompu"
- Télécharger le fichier à nouveau
- Vérifier qu'il n'est pas ouvert dans Excel

### "Taille dépassée"
- Réduire la taille du fichier
- Splitter en plusieurs fichiers
- Demander l'augmentation de la limite

## Configuration avancée

### Désactiver la validation pour un type

```python
spec = DocumentSpecification.objects.get(document_type='RAPPORT')
spec.requires_validation = False
spec.save()
```

### Permettre des formats supplémentaires

```python
spec.allowed_formats = 'xlsx,xls,xlsm,csv'
spec.save()
```

## Performance

- Les fichiers Excel sont chargés en mémoire (optimisé avec `data_only=True`)
- Les fichiers CSV sont traités par streaming
- Les métadonnées sont extraites une seule fois
- Les résultats de validation sont mis en cache

## Dépendances

- `openpyxl>=3.1.2`: Lecture des fichiers Excel
- Django ORM: Stockage des résultats
- REST Framework: API

## Prochaines améliorations

- [ ] Validation asynchrone pour les gros fichiers
- [ ] Support des autres formats (XLSB, ODS)
- [ ] Règles de validation personnalisées par colonne
- [ ] Export des résultats de validation
- [ ] Historique complet des validations
