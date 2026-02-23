# 🔍 PHASE 9: AUDIT DES RÈGLES DE ROUTAGE

## 📊 Résultat de l'Audit

### Statistiques Générales
| Métrique | Valeur | Status |
|----------|--------|--------|
| **Total de règles** | 0 | ⚠️ Aucune |
| **Règles actives** | 0 | ⚠️ Aucune |
| **Règles inactives** | 0 | ⚠️ Aucune |

### ✅ Verdict
✅ **AUCUNE MIGRATION REQUISE** - La base est vierge de règles antigas incompatibles avec la nouvelle hiérarchie.

---

## 🎯 État Actuel du Routage

### Flux de Documents Sans Règles
Actuellement, **tous les documents** suivent ce flux automatique:

```
Document Upload
    ↓
[Signal: create_department_folders_on_upload]
    ├─ Crée: Filiale → Service → Type (structure auto)
    ├─ Assigne document au dossier Type
    └─ Statut: EN_ATTENTE
    
[Signal: auto_route_document] 
    ├─ Cherche RoutingRules actives
    ├─ Résultat: AUCUNE RÈGLE
    └─ Document reste dans dossier Type (attente manuelle)

[Optionnel: archive_rejected_documents]
    └─ Si rejeté → déplace vers Archive/
```

**Impact**: Les documents sont bien créés dans la hiérarchie, mais pas automatiquement routés vers départ/approbation.

---

## 🔧 Hiérarchie Vérifiée

| Niveau | Attendu | Vérifié | Status |
|--------|---------|---------|--------|
| **Pôles** | 8 | 8 | ✅ |
| **Filiales** | 56 | 56 | ✅ |
| **Services** | 56 | 56 | ✅ |
| **Sub-services** | 0+ | 0 | ✅ |
| **Total** | 120 | 120 | ✅ |

---

## 💡 Options pour Initialiser les Règles

### ✨ NOUVEAU: Mode Hiérarchique Dynamique (Recommandé!)

**Créer des règles qui construisent automatiquement la hiérarchie de dossiers**

#### Mode 1: Filiale > Type de Document
```python
RoutingRule.objects.create(
    name="Tous documents - par type",
    conditions={"document_type": {"value": "CONGE", "operator": "equals"}},
    routing_path={
        "include_pole": False,
        "include_filiale": True,
        "include_service": False,
        "include_document_type": True
    },
    priority=100
)
# Résultat: Filiale[Bénin] / Type[Congé]
```

#### Mode 2: Filiale > Service > Type de Document
```python
RoutingRule.objects.create(
    name="Documents RH par type",
    conditions={
        "department": {"value": "RH", "operator": "equals"},
        "document_type": {"value": "CONGE", "operator": "equals"}
    },
    routing_path={
        "include_filiale": True,
        "include_service": True,
        "include_document_type": True
    },
    priority=100
)
# Résultat: Filiale[Bénin] / Service[RH] / Type[Congé]
```

#### Mode 3: Filiale > Service > Sub-Service > Type
```python
RoutingRule.objects.create(
    name="Documents approuvés RH",
    conditions={"document_type": {"value": "CONGE", "operator": "equals"}},
    routing_path={
        "include_filiale": True,
        "include_service": True,
        "include_sub_service": True,
        "custom_folders": {"sub_service": "Approbations"},
        "include_document_type": True
    },
    priority=100
)
# Résultat: Filiale[Bénin] / Service[RH] / Sub-Service[Approbations] / Type[Congé]
```

### Mode Classique: Dossier Fixe

**Si vous préférez une destination statique:**
```python
RoutingRule.objects.create(
    name="Tous contrats vers Legal",
    branch=filiale_benin,  # Optionnel: limiter à une filiale
    pole=pole_rh,          # Optionnel: limiter à un Pôle
    conditions={"document_type": {"value": "CONTRAT", "operator": "equals"}},
    destination_folder=legal_folder,  # Destination fixe
    priority=100
)
```

---

## 🚀 Prochain Étapes Recommandées

### Phase 10: Créer Règles d'Exemple
Créer script `load_routing_rules.py` avec:
- 8 règles basiques (1 par Pôle)
- Routage par type de document
- Destinations vers Services principaux

### Phase 11: Tester le Routage
- Upload documents de test par Filiale
- Vérifier assignation automatique
- Vérifier comptage de stats (`times_applied`)

### Phase 12: Ajouter Support Pôles (Optionnel)
Si besoin de routage au niveau Pôle:
- Ajouter champ `pole` à RoutingRule
- Ajouter `limit_choices_to={'folder_type': 'pole'}`
- Mettre à jour `matches()` pour vérifier `pole`

---

## 📋 Checklist de Validation

- ✅ Votre hiérarchie (8×7×56) = 120 dossiers existants
- ✅ Aucune règle antigas incompatible
- ✅ Modèle RoutingRule ready pour nouvelles règles
- ✅ Signaux document fonctionnels
- ✅ Branche FK mappée à `folder_type='filiale'` ✓
- ✅ Destination FK accepte tous types de dossiers ✓

---

## 📝 Script d'Audit Utilisé

Créé: `audit_routing_rules.py`
- Vérifie total de règles
- Analyse compatibilité
- Validate hiérarchie
- Liste les branching patterns

**Utilisation:**
```bash
python manage.py shell < audit_routing_rules.py
```

---

**Status**: ✅ **AUDIT COMPLETÉ**  
**Date**: 2026-02-23  
**Recommandation**: Passer à Phase 10 - Créer règles d'initialisation




┌─────────────────────────────────────────┐
│  Agent upload Document                  │
└───────────────┬─────────────────────────┘
                ↓
        Extraire Agent.branch
        (Filiale avec Pôle parent)
                ↓
┌─────────────────────────────────────────┐
│ Chercher Règles par PRIORITÉ DESC       │
├─────────────────────────────────────────┤
│                                         │
│ Niveau 1: Règles avec Pôle spécifique   │
│ ─ WHERE pole_id = Agent.filiale.parent  │
│ ─ WHERE is_active = True                │
│ ─ ORDER BY -priority, -created_at       │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│ Niveau 2: Règles avec Filiale spécifique│
│ ─ WHERE branch_id = Agent.branch        │
│ ─ WHERE is_active = True                │
│ ─ ORDER BY -priority, -created_at       │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│ Niveau 3: Règles GLOBALES               │
│ ─ WHERE pole_id IS NULL                 │
│ ─ WHERE branch_id IS NULL               │
│ ─ WHERE is_active = True                │
│ ─ ORDER BY -priority, -created_at       │
│                                         │
└─────────────────────────────────────────┘
                ↓
    Pour chaque règle (priorité haute → basse):
        rule.matches(document)?
                ├─ OUI → Appliquer + STOP
                └─ NON → Continuer à règle suivante
                ↓
    Si aucune règle ne match
        → Document reste où il est (attente manuelle)