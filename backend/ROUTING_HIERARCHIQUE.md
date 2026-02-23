# 🚀 PHASE 10: ROUTAGE HIÉRARCHIQUE DYNAMIQUE - GUIDE COMPLET

## 📋 Vue d'Ensemble

Le système de routage a été complètement restructuré pour supporter la **hiérarchie complète (Pôle > Filiale > Service > Sub-Service > Type de Document)**.

| Version | Description | Status |
|---------|-------------|--------|
| **V1** | Destination fixe | ✅ Existant |
| **V2** | Hiérarchie dynamique | ✅ **NOUVEAU** |

---

## ✨ Nouveaux Champs du Modèle RoutingRule

### 1. `pole` (ForeignKey)
- **Type**: Folder (limit_choices_to: folder_type = 'pole')
- **Null/Blank**: Oui
- **Utilisation**: Limiter la règle à un Pôle spécifique
- **Exemple**: Pole "RH" - règles de routage pour tous les RH de toutes filiales

### 2. `routing_path` (JSONField)
- **Type**: JSON dict
- **Null/Blank**: Oui
- **Utilisation**: Définir le chemin hiérarchique dynamique
- **Format**:
```json
{
    "include_pole": false,
    "include_filiale": true,
    "include_service": true,
    "include_sub_service": false,
    "include_document_type": true,
    "custom_folders": {}
}
```

### 3. `auto_create_hierarchy` (BooleanField)
- **Default**: True
- **Utilisation**: Créer automatiquement les dossiers manquants
- **Exemple**: Si le chemin spécifie Service + Type, et que le Service n'existe pas, le créer

### 4. `destination_folder` (Mode Classique)
- **Type**: Folder (facultatif si routing_path spécifié)
- **Utilisation**: Destination fixe (backward compatible)

---

## 🎯 Flux de Routage Complète

### Étape 1: Upload Document
```
Agent Ali (Bénin/RH) upload Congé
  ↓
Signal post_save triggered
```

### Étape 2: Chercher Règles Applicables
```
SELECT RoutingRule 
WHERE is_active = True
  AND (pole = Pôle_RH OR pole IS NULL)
  AND (branch = Filiale_Bénin OR branch IS NULL)
ORDER BY -priority, -created_at
```

### Étape 3: Évaluer Conditions
```
Pour chaque règle (priorité haute → basse):
  ├─ Vérifier pole (si spécifié)
  ├─ Vérifier branch/filiale (si spécifié)
  ├─ Vérifier conditions additionnelles
  │   ├─ document_type
  │   ├─ department
  │   ├─ matricule_prefix
  │   └─ champs personnalisés
  │
  └─ Si MATCH:
      ├─ Si routing_path → build_routing_destination()
      ├─ Sinon → utiliser destination_folder
      └─ Assigner + mettre à jour statut + incrémenter stats
```

### Étape 4: Construire Destination (Si routing_path)
```
Avec routing_path = {
  "include_filiale": true,
  "include_service": true,
  "include_document_type": true
}

Résultat obtenu:
  1. Récupérer: Filiale = Agent.branch (Bénin)
  2. Créer/Récupérer: Service = Agent.department (RH)
     └─ parent = Filiale Bénin
  3. Créer/Récupérer: Type Folder = Document.document_type (Congé)
     └─ parent = Service RH

Chemin final: Bénin > RH > Congé
```

### Étape 5: Assigner + Notifier
```
✅ Document.folder = Chemin final
✅ Document.status = EN_COURS
✅ RoutingRule.times_applied += 1
✅ Notification envoyée au créateur de la règle
```

---

## 📝 Exemples de Configuration

### Exemple 1: Simple - Type de Document Uniquement

```python
# Tous documents CONGE routés vers: Filiale / Congé
rule = RoutingRule.objects.create(
    name="Tous - Demandes de Congé",
    description="Routage automatique des congés",
    conditions={
        "document_type": {
            "value": "CONGE",
            "operator": "equals"
        }
    },
    routing_path={
        "include_filiale": True,
        "include_document_type": True
    },
    priority=50,
    is_active=True
)
```

**Résultat pour Ali (Bénin/RH)**:
```
Bénin
  └─ Congé  ← Document placeé ici
```

---

### Exemple 2: Intermédiaire - Filiale > Service > Type

```python
# Documents RH routés vers: Filiale / RH / Congé
rule = RoutingRule.objects.create(
    name="RH - Demandes de Congé",
    description="Routage des congés RH par filiale",
    conditions={
        "department": {
            "value": "RH",
            "operator": "equals"
        },
        "document_type": {
            "value": "CONGE",
            "operator": "equals"
        }
    },
    routing_path={
        "include_filiale": True,
        "include_service": True,
        "include_document_type": True
    },
    priority=100,  # Plus haute priorité
    is_active=True
)
```

**Résultat pour Ali (Bénin/RH)**:
```
Bénin
  └─ RH (Service)
      └─ Congé  ← Document placé ici
```

---

### Exemple 3: Avancée - Filiale > Service > Validation > Type

```python
# Ajouter un niveau "Validation" avant le type
rule = RoutingRule.objects.create(
    name="Finance - Notes de Frais Validées",
    description="Routage des notes de frais vers validation",
    conditions={
        "department": {
            "value": "Finance",
            "operator": "equals"
        },
        "document_type": {
            "value": "NOTE_FRAIS",
            "operator": "equals"
        }
    },
    routing_path={
        "include_filiale": True,
        "include_service": True,
        "include_sub_service": True,
        "custom_folders": {
            "sub_service": "Validation"
        },
        "include_document_type": True
    },
    priority=100,
    auto_create_hierarchy=True,  # Créer "Validation" si absent
    is_active=True
)
```

**Résultat pour Marie (Cameroun/Finance)**:
```
Cameroun
  └─ Finance (Service)
      └─ Validation (Sub-Service) ← créé automatiquement
          └─ Note de Frais  ← Document placé ici
```

---

### Exemple 4: Classique - Destination Fixe

```python
# Mode backward-compatible
rule = RoutingRule.objects.create(
    name="Tous - Contrats vers Juridique",
    conditions={
        "document_type": {
            "value": "CONTRAT",
            "operator": "equals"
        }
    },
    # Pas de routing_path → utilise destination_folder
    destination_folder=juridique_folder,  # Dossier fixe en racine
    priority=50,
    is_active=True
)
```

**Résultat**:
```
Juridique (Dossier racine)
└─ Tous les contrats convergent ici
```

---

## 🔧 Cas d'Usage Avancés

### Cas 1: Règles Spécifiques par Pôle

```python
# Cas: RH Bénin vs RH Cameroun ont besoins différents
# Bénin: Congés → RH / Attente
# Cameroun: Congés → RH / Urgent

# Règle 1: Bénin RH
rule_benin = RoutingRule.objects.create(
    name="Bénin RH - Congés",
    pole=pole_rh,
    branch=filiale_benin,  # Limiter à Bénin
    conditions={"document_type": {"value": "CONGE", "operator": "equals"}},
    routing_path={...},
    priority=100
)

# Règle 2: Cameroun RH
rule_cameroun = RoutingRule.objects.create(
    name="Cameroun RH - Congés",
    pole=pole_rh,
    branch=filiale_cameroun,  # Limiter à Cameroun
    conditions={"document_type": {"value": "CONGE", "operator": "equals"}},
    routing_path={...},  #Peut être différent!
    priority=100
)
```

### Cas 2: Règles par Préfixe Matricule

```python
# Exemple: Managers (prefix "MGR") routés vers "Approbations"
rule = RoutingRule.objects.create(
    name="Managers - Congés vers Approbations",
    conditions={
        "matricule_prefix": {
            "value": "MGR",
            "operator": "in"
        },
        "document_type": {
            "value": "CONGE",
            "operator": "equals"
        }
    },
    routing_path={
        "include_filiale": True,
        "include_sub_service": True,
        "custom_folders": {"sub_service": "Approbations"}
    },
    priority=200,  # Priorité élevée
    is_active=True
)
```

---

## 📊 Tableau Comparatif des Modes

| Aspect | Mode Fixe | Mode Hiérarchique |
|--------|-----------|-------------------|
| **Destination** | Dossier unique fixe | Construite dynamiquement |
| **Flexibilité** | Basse | Très haute |
| **Auto-création Dossiers** | Non | Oui (si enabled) |
| **Cas d'Usage** | Workflow simple | Workflow complexe |
| **Performance** | Moyenne | Bonne (dossiers en cache) |
| **Maintenance** | Facile | Moyenne (règles plus claires) |

---

## 🔍 Débogage et Monitoring

### Voir les Règles Appliquées

```python
from apps.routing_rules.models import RoutingRule
from apps.documents.models import Document

doc = Document.objects.get(id=123)
rule = doc.routing_rule_applied

print(f"Document: {doc.title}")
print(f"Règle: {rule.name}")
print(f"Destination: {doc.folder.get_full_path()}")
print(f"Times Applied: {rule.times_applied}")
print(f"Last Applied: {rule.last_applied}")
```

### Voir les Règles Actives par Pôle

```python
pole_rh = Folder.objects.get(name__icontains="RH", folder_type="pole")
rules = RoutingRule.objects.filter(
    is_active=True,
    pole=pole_rh
).order_by('-priority')

for rule in rules:
    print(f"✓ {rule.name} (priorité: {rule.priority}, usage: {rule.times_applied})")
```

### Tester une Règle Manuellement

```python
from apps.objects.serializers import DocumentSerializer

doc = Document.objects.get(id=123)
rule = RoutingRule.objects.get(id=456)

# Vérifier si la règle match
if rule.matches(doc):
    print("✓ La règle correspond!")
    destination = rule.build_routing_destination(doc)
    print(f"✓ Destination calculée: {destination.get_full_path()}")
else:
    print("✗ La règle ne correspond pas")
```

---

## 📖 Définition du Format routing_path

```python
routing_path = {
    # Inclure le Pôle dans le chemin?
    "include_pole": False,                # Par défaut: ne pas inclure
    
    # Inclure la Filiale?
    "include_filiale": True,              # Par défaut: toujours
    
    # Inclure le Service (department)?
    "include_service": False,
    
    # Inclure un Sub-Service personnalisé?
    "include_sub_service": False,
    
    # Inclure le Type de Document?
    "include_document_type": True,        # Par défaut: toujours
    
    # Noms personnalisés pour les dossiers
    "custom_folders": {
        "sub_service": "Approbations",    # Créer ce dossier si absent
        "service": "Overrides"            # Override le nom du service
    }
}
```

---

## 🎯 Checklist de Mise en Place

- [ ] Vérifier que les migrations sont appliquées (routing_rules 0002)
- [ ] Tester rule.matches() avec quelques documents
- [ ] Tester rule.build_routing_destination()
- [ ] Tester rule.apply_routing()
- [ ] Créer 3-5 règles d'exemple
- [ ] Upload document de test
- [ ] Vérifier que le document est routé correctement
- [ ] Monitorer times_applied et last_applied
- [ ] Documenter les règles en prod

---

**Status**: ✅ **PHASE 10 COMPLÈTE**  
**Date**: 2026-02-23  
**Migration**: routing_rules 0002_add_pole_routing_path ✅  
**Modèle**: RoutingRule avec pole + routing_path ✅  
**Signal**: auto_route_document utilise apply_routing() ✅
