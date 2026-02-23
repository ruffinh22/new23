#!/usr/bin/env python
"""
Script de test pour démontrer le système de validation des documents Excel.

Usage:
    python manage.py shell < apps/documents/test_validation_system.py
"""

import os
import sys
from io import BytesIO
from django.core.files.uploadedfile import SimpleUploadedFile
import openpyxl
from apps.documents.models import Document, DocumentSpecification
from apps.documents.validators import ExcelAdvancedValidator, ValidationService
from apps.documents.checkers import DocumentChecker, DocumentValidationChecker, FileChecker
from apps.documents.services import DocumentService
from django.contrib.auth import get_user_model

User = get_user_model()

def create_test_excel_file(filename, include_errors=False):
    """Crée un fichier Excel de test."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Agents"
    
    # En-têtes
    headers = ["Matricule", "Nom", "Prénom", "Département"]
    ws.append(headers)
    
    # Données
    if include_errors:
        # Fichier avec erreurs
        ws.append(["A001", "Dupont", "Jean", "RH"])
        ws.append(["A002", None, "Marie", "IT"])  # Prénom manquant - erreur
        ws.append(["A003", "Martin", "Pierre"])  # Département manquant - erreur
    else:
        # Fichier valide
        for i in range(1, 11):
            ws.append([f"A{i:03d}", f"Agent{i}", f"Nom{i}", "IT"])
    
    # Sauvegarder en BytesIO
    output = BytesIO()
    wb.save(output)
    output.seek(0)
    
    return SimpleUploadedFile(filename, output.read(), content_type='application/vnd.ms-excel')

def test_1_excel_advanced_validator():
    """Test 1: Validateur Excel avancé"""
    print("\n" + "="*80)
    print("TEST 1: Validateur Excel Avancé")
    print("="*80)
    
    # Créer un fichier Excel
    excel_file = create_test_excel_file('test_valid.xlsx')
    
    # Obtenir la spécification
    try:
        spec = DocumentSpecification.objects.get(document_type='DONNEES_AGENTS')
    except:
        spec = None
    
    # Valider
    validator = ExcelAdvancedValidator(excel_file, spec)
    is_valid, errors, warnings, details = validator.validate()
    
    print(f"\n✓ Fichier valide: {is_valid}")
    print(f"✓ Erreurs: {len(errors)}")
    for error in errors:
        print(f"  - {error}")
    print(f"✓ Avertissements: {len(warnings)}")
    for warning in warnings:
        print(f"  - {warning}")
    print(f"✓ Détails: {details}")
    
    return is_valid

def test_2_file_with_errors():
    """Test 2: Fichier avec erreurs"""
    print("\n" + "="*80)
    print("TEST 2: Fichier avec Erreurs")
    print("="*80)
    
    # Créer un fichier Excel avec erreurs
    excel_file = create_test_excel_file('test_errors.xlsx', include_errors=True)
    
    # Obtenir la spécification
    try:
        spec = DocumentSpecification.objects.get(document_type='DONNEES_AGENTS')
    except:
        spec = None
    
    # Valider
    validator = ExcelAdvancedValidator(excel_file, spec)
    is_valid, errors, warnings, details = validator.validate()
    
    print(f"\n✗ Fichier valide: {is_valid}")
    print(f"✗ Erreurs: {len(errors)}")
    for error in errors:
        print(f"  - {error}")
    print(f"✗ Avertissements: {len(warnings)}")
    for warning in warnings:
        print(f"  - {warning}")
    
    return not is_valid  # Test pass si erreur détectée

def test_3_pre_validation():
    """Test 3: Prévalidation sans création de document"""
    print("\n" + "="*80)
    print("TEST 3: Prévalidation")
    print("="*80)
    
    # Créer un fichier Excel
    excel_file = create_test_excel_file('test_pre_validate.xlsx')
    
    # Obtenir la spécification
    try:
        spec = DocumentSpecification.objects.get(document_type='DONNEES_AGENTS')
    except:
        spec = None
    
    # Prévalider
    is_valid, validation_data = DocumentService.pre_validate_file(excel_file, spec)
    
    print(f"\n✓ Prévalidation - Valide: {is_valid}")
    print(f"✓ Statut: {validation_data['status']}")
    print(f"✓ Erreurs: {len(validation_data['errors'])}")
    print(f"✓ Avertissements: {len(validation_data['warnings'])}")
    print(f"✓ Détails: {validation_data['details']}")
    
    # Vérifier qu'aucun document n'a été créé
    count = Document.objects.count()
    print(f"✓ Documents créés: {count} (devrait être 0)")
    
    return is_valid

def test_4_file_checker():
    """Test 4: Checker de fichier"""
    print("\n" + "="*80)
    print("TEST 4: File Checker")
    print("="*80)
    
    # Créer un fichier Excel
    excel_file = create_test_excel_file('test_file_check.xlsx')
    
    # Vérifier le fichier
    check_result = FileChecker.check_file_validity(excel_file, 'DONNEES_AGENTS')
    
    print(f"\n✓ Fichier: {check_result['file_name']}")
    print(f"✓ Taille: {check_result['file_size']} bytes")
    print(f"✓ Format: {check_result['file_format']}")
    print(f"✓ Valide: {check_result['is_valid']}")
    print(f"✓ Excel Check: {check_result.get('excel_check', {})}")
    
    return check_result['is_valid']

def test_5_document_checker():
    """Test 5: Document Checker avant envoi"""
    print("\n" + "="*80)
    print("TEST 5: Document Checker (Vérification avant envoi)")
    print("="*80)
    
    # Obtenir l'utilisateur de test
    user = User.objects.first()
    if not user:
        print("❌ Aucun utilisateur trouvé. Créer un utilisateur d'abord.")
        return False
    
    # Créer un fichier et un document
    excel_file = create_test_excel_file('test_doc_check.xlsx')
    
    try:
        spec = DocumentSpecification.objects.get(document_type='DONNEES_AGENTS')
    except:
        spec = None
    
    # Créer un document
    document = Document.objects.create(
        title="Test Document",
        file=excel_file,
        document_type='DONNEES_AGENTS',
        agent=user,
        specification=spec,
        status='EN_ATTENTE',
        is_validated=True,
        file_size=excel_file.size,
        file_format='xlsx'
    )
    
    print(f"\n✓ Document créé: {document.id}")
    print(f"✓ Titre: {document.title}")
    print(f"✓ Statut: {document.status}")
    print(f"✓ Validé: {document.is_validated}")
    
    # Checker
    can_send, check_result = DocumentValidationChecker.full_check_before_send(document)
    
    print(f"\n✓ Peut être envoyé: {can_send}")
    print(f"✓ Vérifications:")
    for check_name, check_info in check_result['checks'].items():
        status = "✓" if check_info['status'] == 'PASSED' else "✗" if check_info['status'] == 'FAILED' else "⚠"
        print(f"  {status} {check_name}: {check_info['status']} - {check_info['message']}")
    
    if check_result['errors']:
        print(f"✓ Erreurs:")
        for error in check_result['errors']:
            print(f"  ✗ {error}")
    
    if check_result['warnings']:
        print(f"✓ Avertissements:")
        for warning in check_result['warnings']:
            print(f"  ⚠ {warning}")
    
    # Nettoyer
    document.delete()
    
    return can_send

def main():
    """Exécute tous les tests"""
    print("\n" + "█"*80)
    print("█" + " "*78 + "█")
    print("█" + " SYSTÈME DE VALIDATION DES DOCUMENTS EXCEL - TESTS ".center(78) + "█")
    print("█" + " "*78 + "█")
    print("█"*80)
    
    results = {
        "Test 1 - Excel Advanced Validator": test_1_excel_advanced_validator(),
        "Test 2 - File with Errors": test_2_file_with_errors(),
        "Test 3 - Pre-Validation": test_3_pre_validation(),
        "Test 4 - File Checker": test_4_file_checker(),
        "Test 5 - Document Checker": test_5_document_checker(),
    }
    
    print("\n" + "="*80)
    print("RÉSUMÉ DES TESTS")
    print("="*80)
    
    passed = 0
    failed = 0
    
    for test_name, result in results.items():
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status}: {test_name}")
        if result:
            passed += 1
        else:
            failed += 1
    
    print("\n" + "-"*80)
    print(f"Total: {passed} passés, {failed} échoués")
    print("="*80 + "\n")

if __name__ == '__main__':
    main()
