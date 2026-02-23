"""
DOCUMENTATION - Système de Validation et Checking des Documents Excel

Ce document décrit le système complet de validation et de vérification des documents,
spécialement optimisé pour les fichiers Excel avec une validation avant envoi.

====================================
1. TYPES DE DOCUMENTS EXCEL SUPPORTÉS
====================================

Le système supporte maintenant les catégories suivantes de documents Excel:

DONNÉES:
  - DONNEES_AGENTS: Données des agents
  - DONNEES_PROJETS: Données des projets
  - DONNEES_HEURES: Données des heures
  - DONNEES_ABSENCES: Données des absences

EXPORTS ET RAPPORTS:
  - EXPORT_EXCEL: Export générique Excel
  - RAPPORT_EXCEL: Rapport Excel générique
  - RAPPORT_MENSUEL: Rapport mensuel Excel
  - RAPPORT_ANNUEL: Rapport annuel Excel
  - STATISTIQUES_EXCEL: Statistiques Excel

PAIES:
  - BULLETINS_PAIE: Bulletins de paie
  - FEUILLE_PAIE: Feuille de paie
  - CHARGES_SOCIALES: Charges sociales
  - DECLARATIONS_URSSAF: Déclarations URSSAF

BUDGETS ET FINANCES:
  - BUDGET_PREVISIONNEL: Budget prévisionnel
  - BUDGET_REALISE: Budget réalisé
  - FACTURES_EXCEL: Factures
  - DEVIS_EXCEL: Devis
  - DEPENSES_EXCEL: Dépenses

PLANIFICATION:
  - PLANNING_EXCEL: Planning
  - CALENDRIER_FORMATION: Calendrier de formation
  - CALENDRIER_CONGES: Calendrier des congés
  - CALENDRIER_PROJETS: Calendrier des projets

DIVERS:
  - INVENTAIRE_EXCEL: Inventaire
  - NOMENCLATURE: Nomenclature
  - REFERENTIELS: Référentiels
  - IMPORTS_DONNEES: Imports de données

==============================
2. FLUX DE VALIDATION COMPLET
==============================

ÉTAPE 1: PRÉVALIDATION (avant upload)
  - Endpoint: POST /api/documents/pre_validate/
  - Vérifie le fichier sans créer de document
  - Détecte les erreurs de format, structure, etc.
  - Retourne un rapport détaillé

ÉTAPE 2: CRÉATION DU DOCUMENT
  - Endpoint: POST /api/documents/
  - Le document est créé avec le statut VALIDATION_EN_COURS
  - Une validation automatique est lancée si une spécification existe

ÉTAPE 3: VALIDATION AUTOMATIQUE
  - Les validateurs analysent le fichier
  - Vérifications effectuées:
    * Format du fichier
    * Taille du fichier
    * Existence des feuilles requises
    * Colonnes obligatoires
    * Nombre de lignes
    * Intégrité des données
    * Formules (vérification des erreurs)
    * Cellules fusionnées, lignes cachées, etc.

ÉTAPE 4: CHECKING AVANT ENVOI
  - Endpoint: GET /api/documents/{id}/check_before_send/
  - Série de vérifications:
    * Existence du document
    * Existence physique du fichier
    * Statut valide
    * Statut de validation
    * Intégrité du fichier
    * Conformité aux spécifications
    * Vérification des permissions

ÉTAPE 5: ENVOI
  - Le document ne peut être envoyé que si toutes les checks passent
  - Statut passe à EN_ATTENTE ou EN_COURS

====================
3. CLASSES VALIDANT
====================

A. DocumentValidator
   - Validateur basique pour tous les fichiers
   - Vérifications: format, taille, existence

B. ExcelAdvancedValidator
   - Validateur avancé spécialisé pour Excel
   - Vérifications détaillées:
     * Structure du classeur
     * En-têtes de colonnes
     * Intégrité des données
     * Erreurs de formules
     * Métadonnées du fichier

C. ValidationService
   - Service orchestrant les validations
   - Choisit automatiquement le bon validateur selon le type de fichier

D. DocumentChecker
   - Checker complet avant envoi
   - Vérifie l'état global du document
   - Retourne des résultats détaillés par vérification

E. FileChecker
   - Vérification rapide des propriétés du fichier
   - Détecte les problèmes avant création de document

F. DocumentValidationChecker
   - Interface principale pour les vérifications
   - Méthodes: full_check_before_send(), quick_validation_check()

========================
4. ENDPOINTS API IMPORTANTS
========================

PRÉ-VALIDATION (AVANT UPLOAD)
  POST /api/documents/pre_validate/
  Body:
    {
      "file": <fichier>,
      "document_type": "DONNEES_AGENTS"
    }
  Response:
    {
      "is_valid": true/false,
      "status": "PASSED|WARNING|FAILED",
      "errors": [...],
      "warnings": [...],
      "details": {...}
    }

CRÉATION DE DOCUMENT
  POST /api/documents/
  Body:
    {
      "title": "Mon rapport",
      "file": <fichier>,
      "document_type": "RAPPORT_EXCEL",
      "description": "..."
    }
  Response:
    Document créé avec validation automatique

CHECK AVANT ENVOI
  GET /api/documents/{id}/check_before_send/
  Response:
    {
      "can_send": true/false,
      "checks": {
        "document_exists": {...},
        "file_exists": {...},
        "document_status": {...},
        "validation_status": {...},
        "file_integrity": {...},
        "specification_compliance": {...},
        "permissions": {...}
      },
      "errors": [...],
      "warnings": [...],
      "message": "..."
    }

VALIDATION D'UN DOCUMENT EXISTANT
  POST /api/documents/{id}/validate/
  Response:
    {
      "is_valid": true/false,
      "document": {...},
      "validation_result": {...}
    }

=========================
5. RÉSULTATS DE VALIDATION
=========================

Statuts possibles:
  - PASSED: Document complètement valide
  - WARNING: Document valide mais avec avertissements
  - FAILED: Document invalide

La structure de retour inclut:
  - Erreurs (bloquantes)
  - Avertissements (non-bloquants)
  - Détails:
    * Feuilles du classeur
    * En-têtes détectés
    * Nombre de lignes/colonnes
    * Intégrité des données
    * Métadonnées du fichier

========================
6. EXEMPLES DE VÉRIFICATIONS
========================

EXEMPLE 1: Fichier Excel vide
  Erreur: "Le classeur Excel est vide (pas de feuilles)."

EXEMPLE 2: Colonnes manquantes
  Erreur: "Colonnes requises manquantes: Date, Agent, Heures"

EXEMPLE 3: Fichier trop volumineux
  Erreur: "Le fichier contient 50000 lignes de données, mais le maximum autorisé est 10000."

EXEMPLE 4: Formule avec erreur
  Erreur: "Erreur de formule à A5: #REF!"

EXEMPLE 5: Cellules fusionnées
  Avertissement: "Le fichier contient 3 cellule(s) fusionnée(s)."

EXEMPLE 6: Lignes cachées
  Avertissement: "Le fichier contient 5 ligne(s) cachée(s)."

========================
7. WORKFLOW RECOMMANDÉ
========================

POUR L'UTILISATEUR:

1. Préparer le fichier Excel selon les spécifications
2. Faire une prévalidation via: POST /api/documents/pre_validate/
3. Corriger les erreurs si nécessaire (erreurs bloquantes)
4. Prendre note des avertissements (non-bloquants)
5. Créer le document: POST /api/documents/
6. Avant d'envoyer, vérifier: GET /api/documents/{id}/check_before_send/
7. Si OK: envoyer le document

POUR L'ADMIN:

1. Consulter les documents en attente de validation
2. Approuver les documents valides
3. Rejeter les documents invalides avec une raison
4. Consulter les statistiques de validation

========================
8. MESSAGES D'ERREUR DÉTAILLÉS
========================

Les messages d'erreur sont maintenant structurés et informatifs:

Au lieu de: "Erreur de validation"
Vous obtenez: "Colonnes requises manquantes: Date, Agent, Heures. Colonnes trouvées: Date, Agent"

Chaque erreur inclut:
- La nature du problème
- Les valeurs attendues
- Les valeurs trouvées
- Comment corriger

========================
9. CONFIGURATION DES SPÉCIFICATIONS
========================

Pour chaque type de document, configurer:

Document Type:
  - DONNEES_AGENTS

Display Name:
  - Données des agents

Allowed Formats:
  - xlsx,xls

Requires Excel:
  - True

Excel Sheet Name (optionnel):
  - Agents

Required Columns:
  - ["Matricule", "Nom", "Prénom", "Département"]

Max File Size MB:
  - 50

Max Rows:
  - 10000

Requires Validation:
  - True

========================
10. TROUBLESHOOTING
========================

Q: Le fichier est valide mais le checking échoue
R: Vérifier le statut du document. Doit être EN_ATTENTE ou VALIDE.

Q: Pourquoi les avertissements bloquent l'envoi?
R: Les avertissements ne bloquent pas. Les erreurs bloquent.

Q: Comment savoir si mon fichier Excel est correct?
R: Utiliser la prévalidation: POST /api/documents/pre_validate/

Q: Peut-on envoyer sans validation?
R: Dépend de la spécification du type de document.

Q: Les formules sont acceptées?
R: Oui, à condition qu'elles ne contiennent pas d'erreurs.

========================
11. MISE EN ŒUVRE
========================

Importer les classes:
  from apps.documents.checkers import DocumentChecker, DocumentValidationChecker
  from apps.documents.validators import ExcelAdvancedValidator, ValidationService

Exemple d'utilisation:
  
  # Prévalidation
  is_valid, result = DocumentService.pre_validate_file(file, specification)
  
  # Checking avant envoi
  can_send, checks = DocumentValidationChecker.full_check_before_send(document)
  
  # Validation complète d'un Excel
  validator = ExcelAdvancedValidator(file, specification)
  is_valid, errors, warnings, details = validator.validate()

========================
"""
