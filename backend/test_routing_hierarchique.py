#!/usr/bin/env python
"""
🧪 TEST DU ROUTAGE HIÉRARCHIQUE DYNAMIQUE
==========================================

Script de test montrant comment le nouveau système routing_path fonctionne.

Exécution:
    python manage.py shell < test_routing_hierarchique.py
"""

import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.routing_rules.models import RoutingRule
from apps.folders.models import Folder
from apps.users.models import User, Branch, Department
from apps.documents.models import Document

# Couleurs optionnelles (colorama)
try:
    from colorama import Fore, Style, init
    init(autoreset=True)
    HAS_COLOR = True
except ImportError:
    # Pas de colorama, utiliser du texte simple
    class Fore:
        CYAN = ""
        BLUE = ""
        GREEN = ""
        RED = ""
        YELLOW = ""
    class Style:
        RESET_ALL = ""
    HAS_COLOR = False

print("\n" + Fore.CYAN + "="*90)
print("🧪 TEST DU ROUTAGE HIÉRARCHIQUE DYNAMIQUE")
print("="*90 + Style.RESET_ALL + "\n")

# ============================================================================
# 1. VÉRIFIER LA HIÉRARCHIE
# ============================================================================
print(Fore.BLUE + "📁 Vérification de la hiérarchie..." + Style.RESET_ALL)

poles = Folder.objects.filter(parent__isnull=True, folder_type='pole')
filiales = Folder.objects.filter(folder_type='filiale')
services = Folder.objects.filter(folder_type='service')

print(f"   ✅ Pôles: {poles.count()}")
print(f"   ✅ Filiales: {filiales.count()}")
print(f"   ✅ Services: {services.count()}\n")

# ============================================================================
# 2. CRÉER DES RÈGLES DE TEST
# ============================================================================
print(Fore.BLUE + "📋 Création de règles de test..." + Style.RESET_ALL + "\n")

# Nettoyage des anciennes règles de test
RoutingRule.objects.filter(name__startswith="TEST ").delete()

# Récupérer un utilisateur admin pour created_by
admin = User.objects.filter(is_superuser=True).first()

rules_to_create = [
    {
        'name': 'TEST 1: Mode Simple - Filiale > Type',
        'conditions': {
            'document_type': {'value': 'CONGE', 'operator': 'equals'}
        },
        'routing_path': {
            'include_filiale': True,
            'include_document_type': True
        },
        'priority': 50
    },
    {
        'name': 'TEST 2: Mode Intermédiaire - Filiale > Service > Type',
        'conditions': {
            'department': {'value': 'RH', 'operator': 'equals'},
            'document_type': {'value': 'NOTE_FRAIS', 'operator': 'equals'}
        },
        'routing_path': {
            'include_filiale': True,
            'include_service': True,
            'include_document_type': True
        },
        'priority': 100
    },
    {
        'name': 'TEST 3: Mode Avancée - Filiale > Service > Sub > Type',
        'conditions': {
            'document_type': {'value': 'RAPPORT', 'operator': 'equals'}
        },
        'routing_path': {
            'include_filiale': True,
            'include_service': True,
            'include_sub_service': True,
            'custom_folders': {'sub_service': 'Approbations'},
            'include_document_type': True
        },
        'priority': 100,
        'auto_create_hierarchy': True
    }
]

created_rules = []

for rule_config in rules_to_create:
    try:
        # Récupérer une destination par défaut (fallback)
        destination = Folder.objects.filter(folder_type='service').first()
        
        if not destination:
            print(Fore.RED + f"   ❌ Pas de dossier destination trouvé" + Style.RESET_ALL)
            continue
        
        rule = RoutingRule.objects.create(
            name=rule_config['name'],
            conditions=rule_config['conditions'],
            routing_path=rule_config['routing_path'],
            priority=rule_config['priority'],
            destination_folder=destination,
            auto_create_hierarchy=rule_config.get('auto_create_hierarchy', True),
            is_active=True,
            created_by=admin
        )
        
        created_rules.append(rule)
        
        print(Fore.GREEN + f"✅ {rule.name}" + Style.RESET_ALL)
        print(f"   Priorité: {rule.priority}")
        print(f"   Chemin: {rule.routing_path}")
        print()
        
    except Exception as e:
        print(Fore.RED + f"❌ Erreur lors de la création: {str(e)}" + Style.RESET_ALL)

# ============================================================================
# 3. TESTER LES RÈGLES
# ============================================================================
print(Fore.BLUE + "\n🧪 Test des règles créées...\n" + Style.RESET_ALL)

class MockAgent:
    """Simule un agent pour les tests"""
    def __init__(self, branch_name, department_name, matricule="TEST001"):
        self.matricule = matricule
        
        # Récupérer ou créer la filiale
        self.branch = Folder.objects.filter(
            name__icontains=branch_name,
            folder_type='filiale'
        ).first()
        
        # Récupérer ou créer le département
        if self.branch:
            self.department = self.branch.children.filter(
                name__icontains=department_name,
                folder_type='service'
            ).first()
        else:
            self.department = None

class MockDocument:
    """Simule un document pour les tests"""
    DOCUMENT_TYPE_CHOICES = [
        ('CONGE', 'Congé'),
        ('NOTE_FRAIS', 'Note de Frais'),
        ('RAPPORT', 'Rapport'),
        ('BUDGET', 'Budget'),
        ('CONTRAT', 'Contrat'),
    ]
    
    def __init__(self, agent, document_type):
        self.agent = agent
        self.document_type = document_type
        self.title = f"Document {document_type}"
        self.folder = None
        self.status = 'EN_ATTENTE'
        self.routed_automatically = False
        self.routing_rule_applied = None

# Test avec différents agents et documents
test_cases = [
    (MockAgent('Bénin', 'RH'), 'CONGE', 'TEST 1'),
    (MockAgent('Cameroun', 'RH'), 'NOTE_FRAIS', 'TEST 2'),
    (MockAgent('Congo', 'Finance'), 'RAPPORT', 'TEST 3'),
]

for agent, doc_type, expected_rule in test_cases:
    doc = MockDocument(agent, doc_type)
    
    print(Fore.YELLOW + f"\n📄 Test Document: {doc_type}" + Style.RESET_ALL)
    print(f"   Agent: {agent.matricule}")
    print(f"   Filiale: {agent.branch.name if agent.branch else 'AUCUNE'}")
    print(f"   Département: {agent.department.name if agent.department else 'AUCUN'}")
    
    # Chercher et appliquer les règles
    for rule in created_rules:
        if rule.matches(doc):
            print(f"\n   ✅ Règle matching: {Fore.GREEN}{rule.name}{Style.RESET_ALL}")
            
            # Tester la construction du chemin
            destination = rule.build_routing_destination(doc)
            
            if destination:
                print(f"   📂 Destination calculée: {destination.get_full_path()}")
                print(f"   📊 Stats: {rule.times_applied} utilisations")
            else:
                print(f"   ⚠️  Destination non trouvée")
            
            break
    else:
        print(f"   ⚠️  Aucune règle ne correspond")

# ============================================================================
# 4. AFFICHER LES STATISTIQUES
# ============================================================================
print(Fore.BLUE + "\n\n📊 Résumé des Règles" + Style.RESET_ALL)
print("-" * 90)

for rule in RoutingRule.objects.filter(name__startswith="TEST ").order_by('-priority'):
    print(f"\n{rule.name}")
    print(f"   Priorité: {rule.priority}")
    print(f"   Statut: {'✅ Actif' if rule.is_active else '❌ Inactif'}")
    print(f"   Utilisée: {rule.times_applied} fois")
    print(f"   Conditions: {rule.conditions}")
    print(f"   Chemin: {rule.routing_path}")

# ============================================================================
# 5. CLEANUP
# ============================================================================
print(f"\n\n{Fore.YELLOW}🧹 Nettoyage des tests...{Style.RESET_ALL}")

# Garder les règles pour inspection manuelle
print(f"   {Fore.GREEN}✓{Style.RESET_ALL} Règles de test conservées pour inspection")
print(f"   ℹ️  Utiliser cette requête pour les nettoyer:")
print(f"   {Fore.CYAN}RoutingRule.objects.filter(name__startswith='TEST ').delete(){Style.RESET_ALL}")

# ============================================================================
# 6. PROCHAINES ÉTAPES
# ============================================================================
print(f"\n\n{Fore.BLUE}💡 Prochaines étapes:{Style.RESET_ALL}")
print("""
1. Créer des documents réels et vérifier le routage automatique:
   - Upload un Congé avec agent RH
   - Vérifier que le document est routé

2. Afficher le chemin complet d'un document routé:
   python manage.py shell << EOF
   from apps.documents.models import Document
   doc = Document.objects.first()
   print(doc.folder.get_full_path())
   EOF

3. Auditer les règles appliquées:
   python manage.py shell < audit_routing_rules.py

4. Nettoyer les règles de test:
   python manage.py shell << EOF
   from apps.routing_rules.models import RoutingRule
   RoutingRule.objects.filter(name__startswith="TEST ").delete()
   EOF
""")

print(Fore.CYAN + "="*90)
print("✅ TEST TERMINÉ")
print("="*90 + Style.RESET_ALL + "\n")
