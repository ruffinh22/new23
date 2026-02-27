from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db.models import Q
from .models import Document, DocumentValidationResult
from apps.routing_rules.models import RoutingRule
from apps.notifications.models import Notification
from apps.folders.models import Folder
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Document)
def create_department_folders_on_upload(sender, instance, created, **kwargs):
    """
    🚫 DÉSACTIVÉ: Le nouveau système 'organize_with_hierarchy' gère déjà:
    - Créer les dossiers Service/Type automatiquement
    - Respecter la hiérarchie Pôle > Filiale > Service > Type

    Ce signal était une ancienne implémentation et interfère avec le nouveau système.

    ✅ NOUVEAU SYSTÈME:
    - DocumentService.organize_with_hierarchy() → crée la structure complète
    - Le document est déjà assigné au bon dossier lors de create()
    - Les signaux post_save ne doivent pas modifier le folder
    """
    # ✅ Ne rien faire - la structure est déjà correcte grâce à organize_with_hierarchy()
    return  # EXIT FUNCTION - don't execute old code below

    # ⚠️ L'agent et son département sont OBLIGATOIRES
    if not instance.agent or not instance.agent.department:
        logger.error(f"❌ Document {instance.id}: Agent ou département manquant!")
        return

    try:
        logger.info(f"🔄 Signal: Traitement du document {instance.id}")

        # ==================== ÉTAPE 1: VALIDATION DE LA BRANCHE ====================
        agent_branch = instance.agent.branch
        agent_department = instance.agent.department

        logger.info(f"📋 Agent: {instance.agent.matricule}")
        logger.info(f"🏢 Branche: {agent_branch.name if agent_branch else 'AUCUNE'}")
        logger.info(f"📁 Département: {agent_department.name}")

        # 🔒 VALIDATION CRITIQUE 1: L'agent DOIT avoir une branche
        if not agent_branch:
            logger.error(
                f"❌ CRITIQUE: Agent {instance.agent.matricule} sans branche assignée!"
            )
            logger.error(
                f"❌ Document {instance.id} NON ROUTÉ - Assigner une branche à l'agent d'abord"
            )
            return

        # 🔒 VALIDATION CRITIQUE 2: La branche DOIT avoir un dossier racine
        branch_folder = agent_branch.folder
        if not branch_folder:
            logger.error(
                f"❌ CRITIQUE: Branche {agent_branch.name} sans dossier racine!"
            )
            logger.error(
                f"❌ Document {instance.id} NON ROUTÉ - Créer le dossier racine de la branche d'abord"
            )
            return

        # 🔒 VALIDATION CRITIQUE 3: Le dossier branche DOIT être à la racine (parent=None)
        if branch_folder.parent is not None:
            logger.error(
                f"❌ CRITIQUE: Dossier branche {branch_folder.id} ({branch_folder.name}) a un parent!"
            )
            logger.error(
                f"❌ Structure corrompue détectée - parent_id={branch_folder.parent_id}"
            )
            logger.error(f"❌ Document {instance.id} NON ROUTÉ pour éviter corruption")
            return

        logger.info(
            f"✅ Dossier branche valide: {branch_folder.id} ({branch_folder.name}) [parent=None]"
        )

        # ==================== ÉTAPE 2: CRÉATION DOSSIER DÉPARTEMENT ====================

        logger.info(
            f"🔍 Recherche/création dossier département: '{agent_department.name}' sous branche {branch_folder.id}"
        )

        # Créer ou récupérer le dossier département SOUS la branche
        dept_folder, created_dept = Folder.objects.get_or_create(
            name=agent_department.name,
            parent=branch_folder,  # ⚠️ CRITIQUE: Parent = dossier branche
            defaults={
                "description": f"Dossier pour le département {agent_department.name}",
                "is_active": True,
            },
        )

        if created_dept:
            logger.info(
                f"✅ Dossier département CRÉÉ: {dept_folder.id} ({dept_folder.name})"
            )
        else:
            logger.info(
                f"✅ Dossier département existant: {dept_folder.id} ({dept_folder.name})"
            )

        # 🔒 VALIDATION POST-CRÉATION: Vérifier que le dossier département a bien le bon parent
        if dept_folder.parent != branch_folder:
            logger.warning(
                f"⚠️ CORRECTION: Dossier département avait parent={dept_folder.parent_id}, correction à {branch_folder.id}"
            )
            dept_folder.parent = branch_folder
            dept_folder.save(update_fields=["parent"])

        # Lier le département au dossier si pas déjà lié
        if agent_department.folder != dept_folder:
            agent_department.folder = dept_folder
            agent_department.save(update_fields=["folder"])
            logger.info(
                f"✅ Département {agent_department.name} lié au dossier {dept_folder.id}"
            )

        # ==================== ÉTAPE 3: DÉTERMINATION DU SOUS-DOSSIER ====================

        subfolder_name = "Defaut"

        if instance.document_type:
            logger.info(f"📄 Type de document: {instance.document_type}")

            # Toujours utiliser le libellé du type de document comme sous-dossier
            # (Ignorer les mappings DepartmentDocumentType qui peuvent mal pointer)
            # document_type est maintenant une ForeignKey à DocumentType
            subfolder_name = (
                instance.document_type.display_name
                if instance.document_type
                else "Unknown"
            )
            logger.info(f"📂 Sous-dossier selon type de document: '{subfolder_name}'")

        logger.info(f"📂 Nom du sous-dossier final: '{subfolder_name}'")

        # ==================== ÉTAPE 4: CRÉATION SOUS-DOSSIER TYPE ====================

        # 🔒 SAFETY CHECK FINAL: S'assurer que dept_folder a un parent valide
        if not dept_folder.parent:
            logger.error(f"❌ ABANDON: dept_folder {dept_folder.id} n'a PAS de parent!")
            logger.error(
                "❌ Ne pas créer de sous-dossier pour éviter orphelins à la racine"
            )
            return

        logger.info(
            f"🔍 Création sous-dossier '{subfolder_name}' sous département {dept_folder.id}"
        )

        # Créer ou récupérer le sous-dossier SOUS le département
        sub_folder, created_sub = Folder.objects.get_or_create(
            name=subfolder_name,
            parent=dept_folder,  # ⚠️ CRITIQUE: Parent = dossier département
            defaults={
                "description": f"Dossier pour les documents de type {subfolder_name}",
                "is_active": True,
            },
        )

        if created_sub:
            logger.info(f"✅ Sous-dossier CRÉÉ: {sub_folder.id} ({sub_folder.name})")
        else:
            logger.info(
                f"✅ Sous-dossier existant: {sub_folder.id} ({sub_folder.name})"
            )

        # 🔒 VALIDATION POST-CRÉATION: Vérifier que le sous-dossier a bien le bon parent
        if sub_folder.parent != dept_folder:
            logger.warning(
                f"⚠️ CORRECTION: Sous-dossier avait parent={sub_folder.parent_id}, correction à {dept_folder.id}"
            )
            sub_folder.parent = dept_folder
            sub_folder.save(update_fields=["parent"])

        # ==================== ÉTAPE 5: ASSIGNATION AU DOCUMENT ====================
        #
        # ⚠️ IMPORTANT: SI LE DOCUMENT A UN FOLDER, C'ÉTAIT ASSIGNÉ VIA folder_id DU FRONTEND
        # ⚠️ NE PAS OVERRIDER - LaisseR le frontend décider de la structure!
        # Le signal crée les dossiers département/type MAIS n'assigne JAMAIS le document
        # si un folder a déjà été défini via organize_with_hierarchy()

        if not instance.folder:
            instance.folder = sub_folder
            instance.save(update_fields=["folder"])
            logger.info(
                f"✅ Document {instance.id} assigné au dossier {sub_folder.id} (fallback signal)"
            )
            logger.info(
                f"✅ Chemin complet: {branch_folder.name} → {dept_folder.name} → {sub_folder.name}"
            )
        else:
            logger.info(
                f"✅ Document {instance.id} a déjà un dossier assigné: {instance.folder.id} (respecté du frontend)"
            )

        logger.info(f"✅ SUCCÈS: Document {instance.id} traité avec succès")

    except Exception as e:
        logger.error(
            f"❌ ERREUR lors du traitement du document {instance.id}: {str(e)}",
            exc_info=True,
        )


@receiver(post_save, sender=Document)
def auto_route_document(sender, instance, created, **kwargs):
    """
    Applique automatiquement les règles de routage lors de la création d'un document validé.

    ⚠️ Ce signal ne s'applique QUE si:
    - Le document a un résultat de validation avec statut PASSED
    - Le statut du document est EN_ATTENTE
    - Le document n'a pas encore de dossier assigné
    """

    # Vérifier les conditions d'application
    if not (
        hasattr(instance, "validation_result")
        and instance.validation_result
        and instance.validation_result.status == "PASSED"
        and instance.status == "EN_ATTENTE"
        and not instance.folder
    ):
        return

    try:
        agent_branch = instance.agent.branch

        # ✨ NOUVEAU: Récupérer le Pôle parent si branche existe
        agent_pole = None
        if agent_branch and agent_branch.parent:
            agent_pole = agent_branch.parent

        # Récupérer les règles de routage actives
        # Hiérarchie: Pôle > Branche > Globale
        rules_query = (
            Q(pole=agent_pole)  # ✨ Règles du Pôle de l'agent
            | Q(pole__isnull=True, branch=agent_branch)  # Règles de la branche
            | Q(pole__isnull=True, branch__isnull=True)  # Règles globales
        )
        rules = RoutingRule.objects.filter(rules_query, is_active=True).order_by(
            "-priority", "-created_at"
        )

        logger.info(f"🔍 Recherche règles de routage pour document {instance.id}")
        if agent_pole:
            logger.info(
                f"   Pôle: {agent_pole.name} | Filiale: {agent_branch.name if agent_branch else 'None'}"
            )

        for rule in rules:
            if rule.matches(instance):
                # ✨ NOUVEAU: Utiliser la nouvelle méthode apply_routing()
                # qui gère:
                # - Mode fixe vs dynamique
                # - Création d'hiérarchie
                # - Stats et notifications
                if rule.apply_routing(instance):
                    logger.info(
                        f"✅ Document {instance.id} routé par règle '{rule.name}'"
                    )
                    break
                else:
                    logger.warning(f"⚠️ Échec du routage avec règle '{rule.name}'")
                    # Continuer à la règle suivante en cas d'erreur

    except Exception as e:
        logger.error(
            f"❌ Erreur lors du routage automatique du document {instance.id}: {str(e)}",
            exc_info=True,
        )


@receiver(post_save, sender=Document)
def archive_rejected_documents(sender, instance, created, **kwargs):
    """
    Archive automatiquement les documents rejetés dans le dossier Archive de la filiale.

    ⚠️ S'exécute uniquement quand le statut passe à REJETE (pas à la création)
    """

    # Ne traiter que les changements de statut vers REJETE
    if created or instance.status != "REJETE":
        return

    try:
        # Validation de l'agent et de sa branche
        if not instance.agent or not instance.agent.branch:
            logger.warning(f"⚠️ Document {instance.id} rejeté mais agent sans branche")
            return

        agent_branch = instance.agent.branch
        logger.info(
            f"🗄️ Archivage document {instance.id} rejeté pour branche {agent_branch.name}"
        )

        # Vérifier que la branche a un dossier racine
        if not agent_branch.folder:
            logger.warning(f"⚠️ Branche {agent_branch.name} sans dossier racine")
            return

        # Trouver le dossier Archive
        archive_folder = agent_branch.folder.children.filter(name="Archive").first()

        if not archive_folder:
            logger.warning(
                f"⚠️ Dossier Archive introuvable pour branche {agent_branch.name}"
            )
            return

        # Archiver le document
        instance.folder = archive_folder
        instance.save(update_fields=["folder"])
        logger.info(
            f"✅ Document {instance.id} archivé dans {archive_folder.get_full_path()}"
        )

    except Exception as e:
        logger.error(
            f"❌ Erreur lors de l'archivage du document {instance.id}: {str(e)}",
            exc_info=True,
        )


@receiver(post_save, sender=Document)
def notify_document_status_change(sender, instance, created, **kwargs):
    """
    DÉSACTIVÉ - Les notifications sont maintenant gérées par les vues/services directement
    pour un meilleur contrôle du contexte.
    """
    pass


@receiver(post_save, sender=DocumentValidationResult)
def notify_validation_result(sender, instance, created, **kwargs):
    """Notifie l'agent des résultats de validation."""

    if not created or not instance.document:
        return

    try:
        from apps.notifications.services import NotificationService

        document = instance.document

        if instance.status == "PASSED":
            # Notification de succès - le document est prêt pour approbation
            NotificationService.notify_on_validation_completed(
                document, passed=True, issues=None
            )
        elif instance.status == "FAILED":
            # Notification d'échec avec les erreurs
            NotificationService.notify_on_validation_completed(
                document, passed=False, issues=instance.errors or []
            )
        elif instance.status == "WARNING":
            # Pour les avertissements, notifier seulement l'agent avec les avertissements
            warnings_msg = (
                "; ".join(instance.warnings) if instance.warnings else "Avertissement"
            )
            from django.contrib.auth import get_user_model

            User = get_user_model()

            Notification.objects.create(
                recipient=document.agent,
                notification_type="VALIDATION",
                title="⚠️ Validation avec avertissements",
                message=f"Votre document '{document.title}' a été validé avec des avertissements: {warnings_msg}",
                document=document,
            )

    except Exception as e:
        logger.error(
            f"❌ Erreur lors de la notification de validation: {str(e)}", exc_info=True
        )


# ==================== SIGNAL POUR CRÉATION AUTOMATIQUE DE DOSSIERS TYPE ====================


def create_folders_on_document_type_added(sender, instance, created, **kwargs):
    """
    ✅ Signal pour créer automatiquement les dossiers quand un nouveau type de document
    est ajouté à un département.

    Structure: Branche → Département → Type de document
    """

    if not created:
        return

    try:
        from apps.routing_rules.models import DepartmentDocumentType
        from apps.folders.models import Folder

        if sender != DepartmentDocumentType:
            return

        # instance.department pointe vers Folder(type='service') maintenant
        logger.info(
            f"🔄 Signal: Nouveau type de document ajouté: {instance.document_type}"
        )

        # DepartmentDocumentType.target_folder pointe directement vers Folder
        target_folder = instance.target_folder
        if not target_folder:
            logger.warning("⚠️ DepartmentDocumentType sans target_folder associé")
            return

        logger.info(f"📁 Dossier cible: {target_folder.id} ({target_folder.name})")

        # Déterminer le nom du sous-dossier
        # document_type est maintenant une ForeignKey à DocumentType
        subfolder_name = (
            instance.document_type.display_name if instance.document_type else "Unknown"
        )

        logger.info(f"🔍 Création du sous-dossier: '{subfolder_name}'")

        # Créer ou récupérer le sous-dossier
        sub_folder, created_sub = Folder.objects.get_or_create(
            name=subfolder_name,
            parent=target_folder,
            defaults={
                "description": f"Dossier pour les documents de type {subfolder_name}",
                "is_active": True,
            },
        )

        if created_sub:
            logger.info(f"✅ Sous-dossier CRÉÉ: {sub_folder.id} ({sub_folder.name})")
        else:
            logger.info(
                f"✅ Sous-dossier existant: {sub_folder.id} ({sub_folder.name})"
            )

        # Associer le sous-dossier au mapping si nécessaire
        if not instance.target_folder:
            instance.target_folder = sub_folder
            instance.save(update_fields=["target_folder"])
            logger.info(f"✅ Mapping lié au sous-dossier {sub_folder.id}")

    except Exception as e:
        logger.error(
            f"❌ Erreur lors de la création du sous-dossier: {str(e)}", exc_info=True
        )
