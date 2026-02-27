#!/usr/bin/env python
"""
Script pour charger les départements et créer les règles de routage automatiques.
Utilisation: python manage.py shell < load_departments_and_routing.py
"""

from apps.routing_rules.models import DepartmentDocumentType
import os
import django

# Configuration Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

# Départements et leurs types de documents
DEPARTMENT_DOCUMENT_CONFIG = {
    "RH": [
        ("CONGE", "Demande de congé"),
        ("MEDICAL", "Certificat médical"),
        ("ATTESTATION", "Attestation de travail"),
        ("NOTE_FRAIS", "Note de frais RH"),
    ],
    "IT": [
        ("DEMANDE", "Demande informatique"),
        ("RAPPORT", "Rapport technique"),
        ("CONTRAT", "Contrat logiciel"),
    ],
    "FINANCE": [
        ("NOTE_FRAIS", "Justificatif de dépense"),
        ("BUDGET", "Préparation budget"),
        ("RAPPORT", "Rapport financier"),
        ("FACTURE", "Facture"),
    ],
    "VENTES": [
        ("CONTRAT", "Contrat client"),
        ("RAPPORT", "Rapport de ventes"),
        ("DEMANDE", "Demande client"),
    ],
    "OPERATIONS": [
        ("RAPPORT", "Rapport opérationnel"),
        ("DEMANDE", "Demande opérationnelle"),
        ("BUDGET", "Budget opérationnel"),
    ],
    "LEGAL": [
        ("CONTRAT", "Contrat légal"),
        ("RAPPORT", "Rapport légal"),
        ("ATTESTATION", "Attestation légale"),
    ],
    "MARKETING": [
        ("RAPPORT", "Rapport marketing"),
        ("DEMANDE", "Demande marketing"),
        ("CONTRAT", "Contrat marketing"),
    ],
    "LOGISTIQUE": [
        ("RAPPORT", "Rapport logistique"),
        ("DEMANDE", "Demande logistique"),
        ("JUSTIFICATIF", "Justificatif de livraison"),
    ],
    "QUALITE": [
        ("RAPPORT", "Rapport de qualité"),
        ("ATTESTATION", "Attestation de conformité"),
        ("DEMANDE", "Demande de qualité"),
    ],
    "PRODUCTION": [
        ("RAPPORT", "Rapport de production"),
        ("DEMANDE", "Demande de production"),
        ("BUDGET", "Budget de production"),
    ],
    "ACHATS": [
        ("CONTRAT", "Contrat d'achat"),
        ("DEMANDE", "Demande d'achat"),
        ("RAPPORT", "Rapport d'achats"),
    ],
    "COMMUNICATION": [
        ("RAPPORT", "Rapport de communication"),
        ("DEMANDE", "Demande de communication"),
        ("CONTRAT", "Contrat de communication"),
    ],
}


def load_departments_and_types():
    """Charge les départements et leurs types de documents."""
    print("🚀 Démarrage du chargement des départements et types de documents...")

    created_count = 0
    skipped_count = 0

    for department, document_types in DEPARTMENT_DOCUMENT_CONFIG.items():
        print(f"\n📂 Traitement du département: {department}")

        for doc_type, description in document_types:
            try:
                # Créer ou récupérer
                obj, created = DepartmentDocumentType.objects.get_or_create(
                    department=department,
                    document_type=doc_type,
                    defaults={
                        "description": description,
                        "is_available": True,
                    },
                )

                if created:
                    print(f"  ✅ Créé: {department} - {doc_type}")
                    created_count += 1
                else:
                    print(f"  ⏭️  Existe déjà: {department} - {doc_type}")
                    skipped_count += 1

            except Exception as e:
                print(f"  ❌ Erreur: {department} - {doc_type}: {str(e)}")

    print("\n\n✨ Résumé du chargement:")
    print(f"  ✅ Créés: {created_count}")
    print(f"  ⏭️  Existants: {skipped_count}")
    print(f"  📊 Total: {created_count + skipped_count}")
    print("\n🎉 Chargement terminé avec succès!")


if __name__ == "__main__":
    load_departments_and_types()
