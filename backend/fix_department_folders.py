#!/usr/bin/env python
"""
Script pour corriger les dossiers de départements orphelins.
Certains dossiers créés avant le fix ont parent_id=NULL.
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, '/home/lidruf/sgdra-project/backend')
django.setup()

from apps.users.models import Department
from apps.folders.models import Folder

def fix_department_folders():
    """Corriger tous les dossiers de départements avec parent_id incorrect."""
    
    print("\n" + "=" * 70)
    print("🔧 CORRECTION DES DOSSIERS DE DÉPARTEMENTS")
    print("=" * 70)
    
    fixed_count = 0
    errors = []
    
    # Lister tous les départements
    all_departments = Department.objects.select_related('branch', 'branch__folder', 'folder').all()
    
    for dept in all_departments:
        if not dept.folder:
            print(f"\n⚠️  {dept.name} (ID: {dept.id}, Branch: {dept.branch.name if dept.branch else 'N/A'})")
            print(f"   Pas de dossier associé!")
            continue
        
        # Vérifier si le dossier a le bon parent
        expected_parent = dept.branch.folder if dept.branch else None
        actual_parent = dept.folder.parent
        
        if actual_parent != expected_parent:
            print(f"\n🔴 {dept.name} (ID: {dept.id}, Code: {dept.code})")
            print(f"   Branch: {dept.branch.name if dept.branch else 'N/A'}")
            print(f"   Dossier: {dept.folder.name} (ID: {dept.folder.id})")
            print(f"   Parent actuel: {actual_parent.name if actual_parent else 'NULL (RACINE)'}")
            print(f"   Parent attendu: {expected_parent.name if expected_parent else 'NULL'}")
            
            # Corriger
            if expected_parent:
                dept.folder.parent = expected_parent
                dept.folder.save()
                print(f"   ✅ Parent mis à jour à: {expected_parent.name}")
                fixed_count += 1
            else:
                errors.append(f"{dept.name} - pas de filiale associée")
                print(f"   ❌ ERREUR: Pas de filiale associée")
        else:
            print(f"\n✅ {dept.name} - OK (dossier: {dept.folder.name})")
    
    # Résumé
    print("\n" + "=" * 70)
    print(f"📊 RÉSUMÉ: {fixed_count} dossier(s) corrigé(s)")
    if errors:
        print(f"❌ {len(errors)} erreur(s):")
        for err in errors:
            print(f"   - {err}")
    print("=" * 70 + "\n")

if __name__ == '__main__':
    fix_department_folders()
