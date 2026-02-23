# Système de Validation des Documents Excel - Guide Utilisateur

## 🎯 Objectif

Ce système permet de **valider automatiquement les documents Excel avant leur envoi** pour s'assurer qu'ils respectent les spécifications requises. Les documents invalides ne peuvent pas être envoyés.

## 📋 Types de Documents Excel Supportés

Le système gère maintenant **40+ types de documents Excel** différents, organisés par catégories :

### 📊 Données
- `DONNEES_AGENTS` - Données des agents
- `DONNEES_PROJETS` - Données des projets
- `DONNEES_HEURES` - Données des heures
- `DONNEES_ABSENCES` - Données des absences

### 📈 Exports et Rapports
- `RAPPORT_EXCEL` - Rapport Excel générique
- `RAPPORT_MENSUEL` - Rapport mensuel
- `RAPPORT_ANNUEL` - Rapport annuel
- `STATISTIQUES_EXCEL` - Statistiques

### 💰 Paies et Finances
- `BULLETINS_PAIE` - Bulletins de paie
- `FEUILLE_PAIE` - Feuille de paie
- `BUDGET_PREVISIONNEL` - Budget prévisionnel
- `FACTURES_EXCEL` - Factures

### 📅 Planification
- `PLANNING_EXCEL` - Planning
- `CALENDRIER_FORMATION` - Calendrier de formation
- `CALENDRIER_CONGES` - Calendrier des congés

Et bien d'autres...

## ✅ Comment Ça Marche

### Étape 1 : Prévalidation (Avant Upload)

Avant de créer un document, vous pouvez **vérifier votre fichier sans le créer** :

```bash
curl -X POST http://localhost:8000/api/documents/pre_validate/ \
  -F "file=@mon_rapport.xlsx" \
  -F "document_type=DONNEES_AGENTS" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Réponse :**
```json
{
  "is_valid": true,
  "status": "PASSED",
  "errors": [],
  "warnings": [],
  "details": {
    "sheet_names": ["Agents"],
    "headers": ["Matricule", "Nom", "Prénom", "Département"],
    "data_row_count": 150,
    "column_count": 4
  },
  "message": "Fichier valide et prêt pour l'upload"
}
```

### Étape 2 : Créer le Document

Une fois validé, créer le document :

```bash
curl -X POST http://localhost:8000/api/documents/ \
  -F "title=Rapport des agents" \
  -F "file=@mon_rapport.xlsx" \
  -F "document_type=DONNEES_AGENTS" \
  -F "description=Rapport mensuel des agents" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Le document est **automatiquement validé** lors de la création. Statut = `VALIDATION_EN_COURS`

### Étape 3 : Vérifier Avant Envoi

Avant d'envoyer, vérifier que **tout est OK** :

```bash
curl -X GET http://localhost:8000/api/documents/123/check_before_send/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Réponse :**
```json
{
  "can_send": true,
  "document_id": 123,
  "document_title": "Rapport des agents",
  "document_status": "EN_ATTENTE",
  "is_validated": true,
  "checks": {
    "document_exists": {
      "status": "PASSED",
      "message": "Document existe"
    },
    "file_exists": {
      "status": "PASSED",
      "message": "Fichier présent (0.45 MB)"
    },
    "document_status": {
      "status": "PASSED",
      "message": "Statut valide: EN_ATTENTE"
    },
    "validation_status": {
      "status": "PASSED",
      "message": "Document validé"
    },
    "file_integrity": {
      "status": "PASSED",
      "message": "Fichier intact"
    },
    "specification_compliance": {
      "status": "PASSED",
      "message": "Conforme aux spécifications"
    },
    "permissions": {
      "status": "PASSED",
      "message": "Aucune restriction"
    }
  },
  "errors": [],
  "warnings": [],
  "message": "Le document est prêt à être envoyé"
}
```

## 🔍 Exemples de Contrôles

### ✓ Détection de Colonnes Manquantes

Erreur détectée :
```
Colonnes requises manquantes: Date, Agent, Heures
Colonnes trouvées: Date, Projet, Statut
```

**Solution:** Ajouter les colonnes manquantes à votre fichier Excel.

### ✓ Fichier Trop Volumineux

Erreur détectée :
```
Le fichier contient 50000 lignes de données, 
mais le maximum autorisé est 10000.
```

**Solution:** Diviser le fichier en plusieurs fichiers plus petits.

### ✓ Erreurs de Formule

Erreur détectée :
```
Erreur de formule à A5: #REF!
Erreur de formule à B12: #VALUE!
```

**Solution:** Corriger les formules erronées dans Excel.

### ⚠️ Cellules Fusionnées (Avertissement)

Avertissement :
```
Le fichier contient 3 cellule(s) fusionnée(s).
```

**Action:** Non-bloquant, le fichier peut être envoyé.

## 🛡️ Vérifications Effectuées

Le système vérifie automatiquement :

### Format et Taille
- ✓ Format de fichier valide (xlsx, xls, xlsm)
- ✓ Taille du fichier (max 50 MB par défaut)
- ✓ Fichier pas vide

### Structure
- ✓ Classeur contient des feuilles
- ✓ Feuille requise existe (si spécifiée)
- ✓ Première ligne = en-têtes de colonnes

### Colonnes et Données
- ✓ Colonnes obligatoires présentes
- ✓ Nombre de lignes respectable
- ✓ Pas de lignes complètement vides

### Intégrité
- ✓ Pas d'erreurs de formule (#REF!, #VALUE!, etc.)
- ✓ Détection des cellules fusionnées
- ✓ Détection des lignes/colonnes cachées
- ✓ Cohérence entre taille enregistrée et réelle

## 🚨 Messages d'Erreur et Solutions

| Erreur | Cause | Solution |
|--------|-------|----------|
| "Le fichier est vide" | Fichier 0 byte | Vérifier le fichier source |
| "Format non autorisé: docx" | Mauvais format | Utiliser .xlsx ou .xls |
| "Colonnes manquantes: X, Y" | En-têtes incorrects | Ajouter les colonnes requises |
| "Fichier trop volumineux" | Fichier > limite | Diviser en fichiers plus petits |
| "Erreur de formule à C5: #REF!" | Formule cassée | Corriger la formule dans Excel |
| "Document non validé" | Validation échouée | Corriger les erreurs signalées |
| "Document archivé" | Document archivé | Impossible à envoyer |
| "Document rejeté" | Document rejeté par admin | Créer une nouvelle version |

## 📱 Flux Complet - Étape par Étape

```
1. PRÉPARATION
   └─ Ouvrir votre fichier Excel
   └─ Vérifier les colonnes
   └─ Corriger les formules

2. PRÉVALIDATION
   └─ POST /documents/pre_validate/
   └─ Vérifier les erreurs
   └─ Corriger si nécessaire

3. CRÉATION
   └─ POST /documents/
   └─ Validation automatique
   └─ Attendre les résultats

4. VÉRIFICATION
   └─ GET /documents/{id}/check_before_send/
   └─ Vérifier can_send = true
   └─ Résoudre les problèmes si nécessaire

5. ENVOI
   └─ Document prêt à traiter
   └─ Statut = EN_ATTENTE
```

## 💡 Conseils

1. **Toujours faire une prévalidation en premier** - Économise du temps
2. **Consulter les avertissements** - Ils peuvent indiquer des problèmes futurs
3. **Garder les colonnes dans le bon ordre** - Si spécifié
4. **Éviter les caractères spéciaux** - Dans les en-têtes et données
5. **Tester avec un petit fichier** - Avant d'envoyer un gros fichier
6. **Ne pas fusionner de cellules** - Sauf si absolument nécessaire
7. **Documenter vos exports** - Ajouter une description

## 🔐 Permissions

| Action | Permissions |
|--------|------------|
| Créer un document | Utilisateur authentifié |
| Prévalider | Utilisateur authentifié |
| Checker avant envoi | Propriétaire ou admin |
| Valider (admin) | Administrateur |
| Approuver | Administrateur |
| Rejeter | Administrateur |

## 📊 Statistiques et Monitoring

Pour les administrateurs :

```bash
# Voir les documents en attente de validation
curl http://localhost:8000/api/documents/pending_validation/ \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Voir les statistiques
curl http://localhost:8000/api/documents/validation_stats/ \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

## ❓ FAQ

**Q: Pourquoi ma validation échoue ?**
R: Vérifiez les erreurs signalées. Habituellement: colonnes manquantes, mauvais format, ou fichier vide.

**Q: Les avertissements bloquent l'envoi ?**
R: Non, seules les erreurs bloquent. Les avertissements sont informatifs.

**Q: Puis-je envoyer sans validation ?**
R: Dépend du type de document. Certains types requièrent une validation, d'autres non.

**Q: Qu'est-ce qui prend du temps ?**
R: La prévalidation avec la classe `ExcelAdvancedValidator` qui scrute tout le fichier.

**Q: Puis-je envoyer un fichier qui n'existe pas dans la spec ?**
R: Oui, mais sans validation. Créer la spécification pour que la validation fonctionne.

## 📚 Documentation Complète

Voir `SYSTEM_VALIDATION_EXCEL.md` pour la documentation technique complète.

---

**Besoin d'aide ?** Contactez l'équipe admin ou consultez la documentation complète.
