from django.db import models
from django.conf import settings
from django.utils import timezone
from apps.folders.models import Folder
from apps.users.models import Branch


class DepartmentDocumentType(models.Model):
    """Modèle pour définir les types de documents disponibles par département."""
    
    DEPARTMENTS = [
        ('RH', 'Ressources Humaines'),
        ('IT', 'Informatique'),
        ('FINANCE', 'Finance'),
        ('VENTES', 'Ventes'),
        ('OPERATIONS', 'Opérations'),
        ('LEGAL', 'Juridique'),
        ('MARKETING', 'Marketing'),
        ('LOGISTIQUE', 'Logistique'),
        ('QUALITE', 'Qualité'),
        ('PRODUCTION', 'Production'),
        ('ACHATS', 'Achats'),
        ('COMMUNICATION', 'Communication'),
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
    
    # Mapping vers dossier de classement
    target_folder = models.ForeignKey(
        Folder,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='document_type_mappings',
        help_text="Dossier de destination pour ce type de document"
    )

    # Configuration de type de fichier associée
    file_type_configuration = models.ForeignKey(
        'documents.FileTypeConfiguration',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='department_document_types',
        help_text="Configuration de validation des fichiers pour ce type de document"
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


class RoutingRule(models.Model):
    """Modèle pour les règles de routage automatique."""
    
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    
    # Conditions (stockées en JSON)
    conditions = models.JSONField(
        help_text="Format: {'field': 'value', 'operator': 'equals/contains/in'}"
    )
    # Exemple: {
    #   "department": {"value": "RH", "operator": "equals"},
    #   "document_type": {"value": "CONGE", "operator": "equals"}
    # }
    
    # Hiérarchie de routage: Pôle > Filiale > Destination
    # ✨ NOUVEAU: Support des règles par Pôle
    pole = models.ForeignKey(
        Folder,
        on_delete=models.CASCADE,
        related_name='routing_rules_by_pole',
        null=True,
        blank=True,
        limit_choices_to={'folder_type': 'pole'},
        help_text="Pôle concerné par cette règle (null = s'applique à tous les Pôles)"
    )
    
    # Destination - Mode 1: Dossier fixe
    branch = models.ForeignKey(
        Folder,
        on_delete=models.CASCADE,
        related_name='routing_rules',
        null=True,
        blank=True,
        limit_choices_to={'folder_type': 'filiale'},
        help_text="Filiale concernée par cette règle (null = s'applique à toutes les filiales)"
    )
    
    destination_folder = models.ForeignKey(
        Folder,
        on_delete=models.CASCADE,
        related_name='routing_destination_rules',
        null=True,
        blank=True,
        help_text="Dossier fixe de destination (si routing_path non spécifié)"
    )
    
    # Destination - Mode 2: Chemin hiérarchique dynamique
    # ✨ NOUVEAU: Routage basé sur la structure Pôle > Filiale > Service > Type
    routing_path = models.JSONField(
        null=True,
        blank=True,
        default=None,
        help_text="""
        Chemin dynamique de routage. Format:
        {
            "include_pole": true/false,
            "include_filiale": true/false,
            "include_service": true/false,
            "include_sub_service": true/false,
            "include_document_type": true/false,
            "custom_folders": {"name": "Dossier", ...}
        }
        
        Exemple 1: Pôle > Filiale > Type
        {"include_pole": false, "include_filiale": true, "include_service": false, "include_document_type": true}
        
        Exemple 2: Pôle > Filiale > Service > Type
        {"include_pole": false, "include_filiale": true, "include_service": true, "include_document_type": true}
        """
    )
    
    auto_create_hierarchy = models.BooleanField(
        default=True,
        help_text="Créer automatiquement les dossiers manquants selon le routing_path"
    )
    
    # Priorité (plus le nombre est élevé, plus la règle est prioritaire)
    priority = models.IntegerField(default=0)
    
    # Status
    is_active = models.BooleanField(default=True)
    
    # Statistiques
    times_applied = models.IntegerField(default=0)
    last_applied = models.DateTimeField(null=True, blank=True)
    
    # Métadonnées
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_rules'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'routing_rules'
        verbose_name = 'Règle de routage'
        verbose_name_plural = 'Règles de routage'
        ordering = ['-priority', '-created_at']
    
    def __str__(self):
        return f"{self.name} → {self.destination_folder.name}"
    
    def matches(self, document):
        """
        Vérifie si le document correspond aux conditions de la règle.
        
        Hiérarchie de sélection:
        1. Vérifier le Pôle (si spécifié)
        2. Vérifier la Branche/Filiale (si spécifiée)
        3. Vérifier les conditions additionnelles
        """
        if not self.is_active:
            return False
        
        # ✨ NOUVEAU: Vérifier le Pôle si spécifié
        if self.pole:
            if not document.agent.branch:
                return False
            
            # Récupérer le parent de la filiale (doit être le Pôle)
            filiale_parent = document.agent.branch.parent
            if not filiale_parent or filiale_parent != self.pole:
                return False
        
        # Vérifier la branche si elle est spécifiée
        if self.branch and document.agent.branch != self.branch:
            return False
        
        for field, condition in self.conditions.items():
            operator = condition.get('operator', 'equals')
            expected_value = condition.get('value')
            
            # Récupérer la valeur du champ dans le document
            if field == 'branch':
                actual_value = document.agent.branch.code if document.agent.branch else None
            elif field == 'department':
                actual_value = document.agent.department
            elif field == 'document_type':
                actual_value = document.document_type
            elif field == 'matricule_prefix':
                actual_value = document.agent.matricule[:len(expected_value)]
            else:
                actual_value = getattr(document, field, None)
            
            # Appliquer l'opérateur
            if operator == 'equals':
                if actual_value != expected_value:
                    return False
            elif operator == 'contains':
                if expected_value not in str(actual_value):
                    return False
            elif operator == 'in':
                if actual_value not in expected_value:
                    return False
        
        return True
    
    def increment_usage(self):
        """Incrémente le compteur d'utilisation."""
        self.times_applied += 1
        self.last_applied = timezone.now()
        self.save(update_fields=['times_applied', 'last_applied'])
    
    def build_routing_destination(self, document):
        """
        🎯 Construit le chemin de destination selon routing_path.
        
        Crée la hiérarchie de dossiers si nécessaire:
        Pôle > Filiale > Service > Type de Document
        
        Retourne le dossier final où placer le document.
        """
        import logging
        logger = logging.getLogger(__name__)
        
        # Mode 1: Utiliser le dossier fixe à la destination
        if not self.routing_path and self.destination_folder:
            logger.info(f"🎯 Mode FIXE: Utiliser {self.destination_folder.get_full_path()}")
            return self.destination_folder
        
        # Mode 2: Construire dynamiquement selon routing_path
        if not self.routing_path:
            logger.warning(f"⚠️ Aucun chemin spécifié pour règle {self.name}")
            return self.destination_folder
        
        path_config = self.routing_path
        logger.info(f"🎯 Mode DYNAMIQUE: Construction chemin pour {document.agent.matricule}")
        
        try:
            # Récupérer les composants
            current_folder = None
            path_parts = []
            
            # 1️⃣ Pôle (récupéré via Filiale)
            if document.agent.branch:
                pole = document.agent.branch.parent  # Filiale.parent = Pôle
                if pole:
                    if path_config.get('include_pole', False):
                        current_folder = pole
                        path_parts.append(f"Pôle: {pole.name}")
                        logger.info(f"   1. Pôle: {pole.name} (ID: {pole.id})")
                    
                    # 2️⃣ Filiale
                    if path_config.get('include_filiale', True):
                        current_folder = document.agent.branch
                        path_parts.append(f"Filiale: {document.agent.branch.name}")
                        logger.info(f"   2. Filiale: {document.agent.branch.name} (ID: {document.agent.branch.id})")
                    
                    # 3️⃣ Service
                    if path_config.get('include_service', False) and document.agent.department:
                        # Chercher ou créer le Service
                        service_name = document.agent.department.name if hasattr(document.agent.department, 'name') else str(document.agent.department)
                        
                        if current_folder:
                            service, created = Folder.objects.get_or_create(
                                name=service_name,
                                parent=current_folder,
                                defaults={'is_active': True}
                            )
                            current_folder = service
                            path_parts.append(f"Service: {service.name}")
                            logger.info(f"   3. Service: {service.name} (ID: {service.id}) - {'CRÉÉ' if created else 'EXISTANT'}")
                    
                    # 4️⃣ Sub-Service (optionnel, si spécifié dans custom_folders)
                    if path_config.get('include_sub_service', False):
                        custom_name = path_config.get('custom_folders', {}).get('sub_service', 'Classement')
                        
                        if current_folder:
                            sub_service, created = Folder.objects.get_or_create(
                                name=custom_name,
                                parent=current_folder,
                                defaults={'is_active': True}
                            )
                            current_folder = sub_service
                            path_parts.append(f"Sub-Service: {sub_service.name}")
                            logger.info(f"   4. Sub-Service: {sub_service.name} (ID: {sub_service.id}) - {'CRÉÉ' if created else 'EXISTANT'}")
                    
                    # 5️⃣ Type de Document
                    if path_config.get('include_document_type', True) and document.document_type:
                        # Récupérer le libellé du type
                        type_label = dict(document.DOCUMENT_TYPE_CHOICES if hasattr(document, 'DOCUMENT_TYPE_CHOICES') else []).get(document.document_type, document.document_type)
                        
                        if current_folder:
                            type_folder, created = Folder.objects.get_or_create(
                                name=type_label,
                                parent=current_folder,
                                defaults={'is_active': True}
                            )
                            current_folder = type_folder
                            path_parts.append(f"Type: {type_folder.name}")
                            logger.info(f"   5. Type Document: {type_folder.name} (ID: {type_folder.id}) - {'CRÉÉ' if created else 'EXISTANT'}")
            
            # Chemin complet
            if current_folder:
                full_path = " → ".join(path_parts)
                logger.info(f"✅ Chemin calculé: {full_path}")
                return current_folder
            else:
                logger.warning(f"⚠️ Impossible de construire le chemin, utilisant destination_folder")
                return self.destination_folder
                
        except Exception as e:
            logger.error(f"❌ Erreur dans build_routing_destination: {str(e)}", exc_info=True)
            return self.destination_folder
    
    def apply_routing(self, document):
        """
        ✅ Applique cette règle au document.
        
        Effectue:
        1. Déterminer la destination (fixe ou dynamique)
        2. Assigner le document
        3. Mettre à jour le statut
        4. Incrémenter les stats
        5. Créer notification
        """
        import logging
        from apps.notifications.models import Notification
        logger = logging.getLogger(__name__)
        
        try:
            # Déterminer la destination
            destination = self.build_routing_destination(document)
            
            if not destination:
                logger.error(f"❌ Impossible de déterminer destination pour règle {self.name}")
                return False
            
            # Assigner au document
            document.folder = destination
            document.routed_automatically = True
            document.routing_rule_applied = self
            document.status = 'EN_COURS'
            document.save(update_fields=['folder', 'routed_automatically', 'routing_rule_applied', 'status'])
            
            # Incrémenter stats
            self.increment_usage()
            
            # Notification
            if self.created_by:
                Notification.objects.create(
                    recipient=self.created_by,
                    notification_type='ROUTING',
                    title='Document routé automatiquement',
                    message=f"Document '{document.title}' routé vers '{destination.name}' par règle '{self.name}'",
                    document=document
                )
            
            logger.info(f"✅ Document {document.id} routé par règle '{self.name}' vers {destination.get_full_path()}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de l'application de routage: {str(e)}", exc_info=True)
            return False
