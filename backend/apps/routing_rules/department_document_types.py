from django.db import models
from django.conf import settings


class DepartmentDocumentType(models.Model):
    """Modèle pour définir les types de documents disponibles par département."""
    
    DEPARTMENTS = [
        ('RH', 'Ressources Humaines'),
        ('IT', 'Informatique'),
        ('FINANCE', 'Finance'),
        ('VENTES', 'Ventes'),
        ('OPERATIONS', 'Opérations'),
        ('LEGAL', 'Juridique'),
    ]
    
    DOCUMENT_TYPES = [
        ('CONGE', 'Congé'),
        ('NOTE_FRAIS', 'Note de Frais'),
        ('RAPPORT', 'Rapport'),
        ('BUDGET', 'Budget'),
        ('CONTRAT', 'Contrat'),
        ('DEMANDE', 'Demande'),
        ('ATTESTATION', 'Attestation'),
        ('JUSTIFICATIF', 'Justificatif'),
    ]
    
    department = models.CharField(
        max_length=50,
        choices=DEPARTMENTS,
        help_text="Département responsable"
    )
    
    document_type = models.CharField(
        max_length=50,
        choices=DOCUMENT_TYPES,
        help_text="Type de document disponible"
    )
    
    is_available = models.BooleanField(
        default=True,
        help_text="Ce type de document est-il disponible pour ce département?"
    )
    
    description = models.TextField(
        blank=True,
        help_text="Description du type de document pour ce département"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'department_document_types'
        verbose_name = 'Type de document par département'
        verbose_name_plural = 'Types de documents par département'
        unique_together = ('department', 'document_type')
        ordering = ('department', 'document_type')
    
    def __str__(self):
        return f"{self.get_department_display()} - {self.get_document_type_display()}"

    @staticmethod
    def get_types_for_department(department):
        """Récupère les types de documents disponibles pour un département."""
        return DepartmentDocumentType.objects.filter(
            department=department,
            is_available=True
        ).values_list('document_type', 'get_document_type_display')
