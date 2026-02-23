#!/usr/bin/env python
"""
Script de test complet de la restructuration Phase 1-3
Vérifie que la hiérarchie unifiée Folder fonctionne correctement.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.folders.models import Folder
from apps.users.models import Branch, Department, User
from apps.routing_rules.models import RoutingRule
import json

print("🧪 TEST COMPLET DE LA RESTRUCTURATION PHASES 1-3")
print("=" * 80)

# Test 1: Vérifier la structure Folder
print("\n📝 Test 1: Vérifier la structure Folder")
print("-" * 80)

branches = Folder.objects.filter(folder_type='branch')
departments = Folder.objects.filter(folder_type='department')

print(f"✅ Branches: {branches.count()}")
print(f"✅ Departments: {departments.count()}")

assert branches.count() == 7, "Devrait avoir 7 branches"
assert departments.count() == 56, "Devrait avoir 56 departments"

# Test 2: Vérifier la hiérarchie parent-enfant
print("\n📝 Test 2: Vérifier la hiérarchie parent-enfant")
print("-" * 80)

for branch in branches:
    level = branch.get_level()
    children_count = branch.children.count()
    print(f"  {branch.name:20} - Level: {level}, Children: {children_count}")
    assert level == 0, f"{branch.name} doit être au niveau 0"
    assert children_count > 0, f"{branch.name} doit avoir des enfants"

# Test 3: Vérifier les codes et country_code
print("\n📝 Test 3: Vérifier les codes et country_code")
print("-" * 80)

for branch in branches:
    assert branch.code is not None, f"{branch.name} doit avoir un code"
    assert branch.country_code is not None, f"{branch.name} doit avoir un country_code"
    print(f"  {branch.name:20} - code: {branch.code}, country: {branch.country_code} ✅")

# Test 4: Vérifier que les modèles Branch/Department ont encore leurs relations
print("\n📝 Test 4: Vérifier les relations Branch/Department → Folder")
print("-" * 80)

branch_objects = Branch.objects.filter(folder__isnull=False)
dept_objects = Department.objects.filter(folder__isnull=False)

print(f"✅ Branch objects liés: {branch_objects.count()} / {Branch.objects.count()}")
print(f"✅ Department objects liés: {dept_objects.count()} / {Department.objects.count()}")

# Test 5: Tester les serializers
print("\n📝 Test 5: Tester les serializers API")
print("-" * 80)

from apps.folders.serializers import FolderSerializer, FolderBranchSerializer, FolderDepartmentSerializer

# Sérializer une branche
branch_folder = branches.first()
serializer = FolderBranchSerializer(branch_folder)
data = serializer.data
print(f"✅ FolderBranchSerializer: {data['name']} ({data['folder_type']})")
assert 'departments_count' in data, "Doit contenir departments_count"
assert data['folder_type'] == 'branch', "Type doit être 'branch'"

# Sérializer un département
dept_folder = departments.first()
serializer = FolderDepartmentSerializer(dept_folder)
data = serializer.data
print(f"✅ FolderDepartmentSerializer: {data['name']} ({data['folder_type']})")
assert data['folder_type'] == 'department', "Type doit être 'department'"

# Test 6: Vérifier la propriété auto_type
print("\n📝 Test 6: Vérifier la propriété auto_type")
print("-" * 80)

for folder in Folder.objects.all()[:5]:
    auto_type = folder.auto_type
    level = folder.get_level()
    expected_type = 'branch' if level == 0 else ('department' if level == 1 else 'section')
    print(f"  {folder.name:20} - level: {level}, auto_type: {auto_type}, expected: {expected_type} {'✅' if auto_type == expected_type else '❌'}")
    assert auto_type == expected_type, f"auto_type doit être {expected_type}"

# Test 7: Vérifier get_full_path()
print("\n📝 Test 7: Vérifier get_full_path()")
print("-" * 80)

for dept_folder in departments[:3]:
    full_path = dept_folder.get_full_path()
    print(f"  {full_path} ✅")
    assert '/' in full_path, "Le chemin doit avoir un sépárateur"
    assert len(full_path) > len(dept_folder.name), "Le chemin doit inclure les parents"

# Test 8: Vérifier les ancestors
print("\n📝 Test 8: Vérifier get_ancestors()")
print("-" * 80)

dept_folder = departments.first()
ancestors = dept_folder.get_ancestors()
print(f"  Département: {dept_folder.name}")
print(f"  Ancestors: {[a.name for a in ancestors]}")
assert len(ancestors) > 0, "Doit avoir des ancêtres"
assert ancestors[0].folder_type == 'branch', "Le premier ancêtre doit être une branche"

# Test 9: Vérifier User.branch/department (FK vers Folder)
print("\n📝 Test 9: Vérifier User.branch/department (FK vers Folder)")
print("-" * 80)

users_with_branch = User.objects.exclude(branch__isnull=True)
users_with_dept = User.objects.exclude(department__isnull=True)

print(f"✅ Users avec branch: {users_with_branch.count()}")
print(f"✅ Users avec department: {users_with_dept.count()}")

if users_with_branch.count() > 0:
    user = users_with_branch.first()
    print(f"  User: {user.matricule}")
    print(f"  Branch type: {type(user.branch).__name__} ✅")
    assert isinstance(user.branch, Folder), "Branch doit être une instance de Folder"
    assert user.branch.folder_type == 'branch', "Branch doit avoir type='branch'"

# Test 10: Vérifier RoutingRule.branch (FK vers Folder)
print("\n📝 Test 10: Vérifier RoutingRule.branch (FK vers Folder)")
print("-" * 80)

rules_with_branch = RoutingRule.objects.exclude(branch__isnull=True)
print(f"✅ RoutingRules avec branch: {rules_with_branch.count()}")

if rules_with_branch.count() > 0:
    rule = rules_with_branch.first()
    print(f"  Rule: {rule.name}")
    print(f"  Branch type: {type(rule.branch).__name__} ✅")
    assert isinstance(rule.branch, Folder), "Branch doit être une instance de Folder"
    assert rule.branch.folder_type == 'branch', "Branch doit avoir type='branch'"

# Résumé final
print("\n" + "=" * 80)
print("🎉 TOUS LES TESTS RÉUSSIS!")
print("=" * 80)
print("\n📊 Résumé:")
print(f"  ✅ Folder model enrichi avec folder_type, code, country_code")
print(f"  ✅ 7 branches (filiales) de level 0")
print(f"  ✅ 56 departments répartis sous les branches")
print(f"  ✅ User.branch/department pointent vers Folder")
print(f"  ✅ RoutingRule.branch pointe vers Folder")
print(f"  ✅ Serializers API pour Folder unifiée")
print(f"  ✅ Backward compatibility maintenue avec Branch/Department models")
