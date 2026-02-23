from apps.routing_rules.models import DepartmentDocumentType

# Configuration initiale
config = [
    # RH
    ('RH', 'CONGE', 'Demande de congé'),
    ('RH', 'MEDICAL', 'Certificat médical'),
    ('RH', 'ATTESTATION', 'Attestation de travail'),
    ('RH', 'NOTE_FRAIS', 'Note de frais RH'),
    
    # Finance
    ('FINANCE', 'NOTE_FRAIS', 'Justificatif de dépense'),
    ('FINANCE', 'BUDGET', 'Préparation budget'),
    ('FINANCE', 'RAPPORT', 'Rapport financier'),
    
    # IT
    ('IT', 'RAPPORT', 'Rapport technique'),
    ('IT', 'DEMANDE', 'Demande informatique'),
    
    # Ventes
    ('VENTES', 'RAPPORT', 'Rapport de ventes'),
    ('VENTES', 'CONTRAT', 'Contrat client'),
    
    # Opérations
    ('OPERATIONS', 'RAPPORT', 'Rapport opérationnel'),
    ('OPERATIONS', 'DEMANDE', 'Demande opérationnelle'),
    
    # Juridique
    ('LEGAL', 'CONTRAT', 'Contrat'),
    ('LEGAL', 'JUSTIFICATIF', 'Document juridique'),
]

for dept, doc_type, description in config:
    DepartmentDocumentType.objects.get_or_create(
        department=dept,
        document_type=doc_type,
        defaults={'description': description, 'is_available': True}
    )

print("✅ Données chargées avec succès!")