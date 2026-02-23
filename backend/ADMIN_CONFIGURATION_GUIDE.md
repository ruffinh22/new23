# Guide de Configuration Administrateur - Gestion des Documents

## Vue d'ensemble

L'interface administrateur Django vous permet de configurer complètement le système de gestion des documents, y compris:
- **L'arborescence des dossiers** (structure des répertoires)
- **Les types de documents** (avec formats autorisés et validations)
- **Les validations** (colonnes Excel, taille des fichiers, etc.)

---

## 1. Gestion de l'Arborescence des Dossiers

### Accès
**Admin → Folders → Folders**

### Fonctionnalités

#### Créer une structure hiérarchique
- **Dossier parent**: Définissez la hiérarchie en sélectionnant un parent
- **Exemple**:
  ```
  📂 RH (Racine)
    📂 Congés
    📂 Formations
    📂 Évaluations
  📂 Finance (Racine)
    📂 Factures
    📂 Rapports
  ```

#### Vue d'arborescence
L'interface affiche automatiquement:
- L'indentation pour montrer la hiérarchie
- L'icône 📂 pour les dossiers actifs, 📁 pour les inactifs
- Le chemin complet du dossier

#### Activation/Désactivation
Vous pouvez activer ou désactiver un dossier pour contrôler qui peut uploader des documents dedans.

---

## 2. Configuration des Types de Documents et Validations

### Accès
**Admin → Documents → Document Specifications**

### Configuration Complète d'un Type de Document

#### Exemple: Demande de Congé

```
Informations générales
├─ Type de document: CONGE
├─ Nom affichage: "Demande de Congé"
├─ Description: "Formulaire officiel de demande de congé"
├─ Validation requise: ✓ Oui
└─ Statut: ✓ Actif

Formats et fichiers autorisés
└─ Formats: pdf,docx

Validation Excel: (Non applicable pour ce type)

Limites de taille
└─ Taille maximale: 10 MB
```

#### Exemple: Données Excel (Feuille de Paie)

```
Informations générales
├─ Type de document: FEUILLE_PAIE
├─ Nom affichage: "Feuille de Paie Excel"
├─ Description: "Données de paie au format Excel"
├─ Validation requise: ✓ Oui
└─ Statut: ✓ Actif

Formats et fichiers autorisés
└─ Formats: xlsx,xls

Validation Excel: ✓ Cocher
├─ Feuille Excel requise: "Paie" (ou laisser vide pour 1ère feuille)
├─ Colonnes requises: ["Matricule", "Nom", "Salaire", "Charges"]
└─ Nombre max de lignes: 1000

Limites de taille
└─ Taille maximale: 50 MB
```

### Formats Supportés

```
pdf      - Fichiers PDF
doc      - Documents Word .doc
docx     - Documents Word .docx
xls      - Fichiers Excel anciens
xlsx     - Fichiers Excel modernes
xlsm     - Fichiers Excel avec macros
csv      - Fichiers de données CSV
txt      - Fichiers texte
image    - Images (JPG, PNG, etc.)
zip      - Archives compressées
```

### Configuration des Colonnes Excel

**Format JSON** (les colonnes doivent apparaître dans la première ligne):

```json
["Matricule", "Nom", "Email", "Département", "Salaire"]
```

Les colonnes sont vérifiées en**respectant la casse** (ATTENTION: "Nom" ≠ "nom")

---

## 3. Processus de Validation à l'Upload

### Flux Automatique

Quand un utilisateur upload un fichier:

```
1. UPLOAD DU FICHIER
   │
   ├─ Vérification du fichier
   │  ├─ Existe? (non vide)
   │  ├─ Taille correcte?
   │  └─ Format autorisé?
   │
   ├─ VALIDATION SPÉCIFIQUE AU FORMAT
   │  │
   │  ├─ Si PDF/DOCX: Vérifie le type MIME
   │  │
   │  └─ Si XLSX/XLS:
   │     ├─ Feuille Excel correcte?
   │     ├─ Colonnes requises présentes?
   │     ├─ Nombre de lignes acceptable?
   │     └─ Intégrité des données (formules, cellules)
   │
   └─ RÉSULTAT
      ├─ ✓ VALIDE (status=EN_ATTENTE)
      │  → Document accepté, en attente de traitement
      │
      └─ ✗ REJETÉ (status=REJETE)
         → Erreurs affichées à l'utilisateur
         → Fichier stocké avec raison du rejet
```

### Types de Contrôles

#### Contrôles Généraux (tous les fichiers)
- ✓ Fichier non vide
- ✓ Taille dans les limites
- ✓ Format autorisé
- ✓ Type MIME correct

#### Contrôles Excel Spécifiques
- ✓ Feuille Excel existe
- ✓ Colonnes requises présentes
- ✓ Pas de colonnes manquantes
- ✓ Nombre de lignes dans les limites
- ✓ Pas d'erreurs de formule (#DIV/0!, etc.)
- ⚠️ Avertissements pour:
  - Cellules fusionnées
  - Lignes cachées
  - Colonnes vides

---

## 4. Suivi et Gestion des Validations

### Accès
**Admin → Documents → Document Validation Results**

### Affichage des Résultats

Chaque résultat affiche:
- **Document**: Titre du document validé
- **Statut**: 
  - 🟢 **PASSED** - Validé sans problème
  - 🟠 **WARNING** - Validé avec avertissements
  - 🔴 **FAILED** - Rejeté
- **Erreurs**: Liste des problèmes bloquants
- **Avertissements**: Problèmes non bloquants
- **Détails**: Métadonnées complètes de validation

### Gestion des Documents

**Admin → Documents → Documents**

Chaque document affiche:
- **Titre**: Nom du document
- **Agent**: Qui a uploadé
- **Type**: Type de document
- **Statut**: État actuel (NOUVEAU, EN_ATTENTE, REJETE, VALIDE, etc.)
- **Validation**: ✓ ou ✗

Vous pouvez:
- Approver/Rejeter un document en attente
- Ajouter une raison de rejet
- Voir tous les détails de validation
- Consulter l'historique des validations

---

## 5. Gestion des Utilisateurs et Permissions

### Rôles

#### Agents (Utilisateurs Standards)
- Peuvent uploader des documents
- Voient leurs propres documents
- Reçoivent des notifications sur les rejets

#### Administrateurs
- Accès complet à l'admin
- Configurent les types de documents
- Gèrent l'arborescence
- Approuvent/Rejettent les documents
- Voient tous les documents du système

---

## 6. Cas d'Usage Pratiques

### Cas 1: Mise en place d'une Demande de Congé

**À faire:**
1. Créer un dossier "Congés" dans l'arborescence
2. Créer une spécification "CONGE":
   - Formats: `pdf,docx`
   - Taille max: `5 MB`
   - Validation: Oui
3. Les utilisateurs peuvent maintenant uploader leurs demandes
4. Le système valide automatiquement le format

### Cas 2: Import de Données d'Employés

**À faire:**
1. Créer un dossier "Imports" → "Employés"
2. Créer une spécification "DONNEES_AGENTS":
   - Format: `xlsx,xls`
   - Feuille requise: `"Employés"`
   - Colonnes: `["Matricule", "Nom", "Email", "Département"]`
   - Taille max: `50 MB`
   - Max lignes: `10000`
3. Les utilisateurs uploadent le fichier Excel
4. Le système valide:
   - ✓ C'est bien un Excel
   - ✓ Il a une feuille "Employés"
   - ✓ Elle a les bonnes colonnes
   - ✓ Elle a moins de 10000 lignes
5. Si tout est bon → Document accepté
6. Si erreur → Document rejeté avec raison détaillée

### Cas 3: Documents PDF Simples

**À faire:**
1. Créer une spécification simple:
   - Format: `pdf`
   - Taille max: `20 MB`
   - Validation: Oui
2. Aucune configuration Excel requise
3. Le système valide juste le type MIME et la taille

---

## 7. API pour les Développeurs

### Endpoint: Pré-valider un fichier (avant upload)

```bash
POST /api/documents/pre_validate/

Content-Type: multipart/form-data

{
  "file": <fichier>,
  "document_type": "CONGE"
}
```

**Réponse si valide:**
```json
{
  "is_valid": true,
  "status": "PASSED",
  "message": "Fichier valide et prêt pour l'upload",
  "errors": [],
  "warnings": [],
  "details": {}
}
```

**Réponse si invalide:**
```json
{
  "is_valid": false,
  "status": "FAILED",
  "message": "Le fichier contient des erreurs",
  "errors": [
    "Format de fichier 'txt' non autorisé. Formats acceptés: pdf, docx"
  ],
  "warnings": [],
  "details": {
    "file_format": "txt"
  }
}
```

### Endpoint: Créer un document (avec validation automatique)

```bash
POST /api/documents/

Content-Type: multipart/form-data

{
  "title": "Ma demande de congé",
  "file": <fichier>,
  "document_type": "CONGE",
  "description": "Congés du 1er au 10 juillet",
  "folder": 123
}
```

**Réponse si valide:**
```json
{
  "id": 456,
  "title": "Ma demande de congé",
  "status": "EN_ATTENTE",
  "is_validated": true,
  "validation_errors": [],
  "validation_warnings": [],
  "validation_details": {},
  "...": "..."
}
```

**Réponse si rejeté:**
```json
{
  "id": 457,
  "title": "Mauvais document",
  "status": "REJETE",
  "is_validated": false,
  "validation_errors": [
    "La taille du fichier (65 MB) dépasse la limite maximale (50 MB)."
  ],
  "validation_warnings": [],
  "validation_details": {"file_format": "xlsx"},
  "...": "..."
}
```

---

## 8. Dépannage

### Les uploads sont tous rejetés

**Vérifier:**
1. La spécification existe-t-elle? (Admin → Document Specifications)
2. Est-elle active? (Statut: ✓ Actif)
3. Les formats sont-ils corrects? (Ex: `pdf,xlsx` pas `PDF, XLSX`)

### Les colonnes Excel ne sont pas reconnues

**Problèmes courants:**
1. **Casse différente**: `"Nom"` ≠ `"nom"` ≠ `"NOM"`
   → Utiliser exactement comme dans le fichier
2. **Espaces extra**: `"Nom "` ≠ `"Nom"`
   → Vérifier s'il n'y a pas d'espaces
3. **Format JSON invalide**: Utiliser `["Col1", "Col2"]` pas `"Col1, Col2"`

### Un utilisateur peut voir les documents des autres

**Vérifier les permissions:**
1. Admin → Users → Modifier l'utilisateur
2. Vérifier que `is_staff` = Non (sauf admins)
3. Vérifier les groupes et permissions assignées

---

## 9. Bonnes Pratiques

### ✓ À FAIRE
- Créer une structure claire et logique des dossiers
- Utiliser des noms explicites pour les types de documents
- Valider les colonnes Excel avec la casse exacte
- Tester les spécifications avant de les mettre en production
- Documenter vos configurations pour l'équipe
- Réviser régulièrement les types de documents actifs

### ✗ À ÉVITER
- Accepter trop de formats pour un même type
- Mettre des limites de taille trop petites (causes frustration)
- Avoir des colonnes obligatoires trop nombreuses
- Oublier de désactiver les anciens types de documents
- Modifier les spécifications sans tester d'abord

---

## Support

Pour toute question ou problème:
1. Consulter les logs: `Admin → Documents → Document Validation Results`
2. Vérifier la documentation des validations
3. Contacter l'équipe IT

