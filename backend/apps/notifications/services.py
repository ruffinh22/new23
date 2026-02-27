"""
Service centralisé pour gérer les notifications dans le système.

Ce service assure que les notifications sont envoyées aux bonnes personnes
dans les bons contextes.
"""

from django.db import models
from django.contrib.auth import get_user_model
from apps.notifications.models import Notification

User = get_user_model()


class NotificationService:
    """Service pour gérer les notifications du système."""

    @staticmethod
    def notify_on_document_uploaded(document, agent):
        """
        Notifie lors de l'upload d'un document.

        Args:
            document: Le document uploadé
            agent: L'agent qui a uploadé le document

        Notifications créées :
        - Agent : "Votre document a été uploadé avec succès"
        - Tous les admins : "L'agent X a uploadé un document"
        """

        agent_full_name = f"{agent.first_name} {agent.last_name}".strip()

        # 1. Notifier l'agent
        Notification.objects.create(
            recipient=agent,
            notification_type="DOCUMENT_UPLOADED",
            title="[SUCCES] Document uploadé",
            message=f"Votre document '{document.title}' a été uploadé avec succès et est en attente de validation.",
            document=document,
        )

        # 2. Notifier tous les admins
        admins = User.objects.filter(
            models.Q(is_staff=True) | models.Q(role="ADMIN"), is_active=True
        ).exclude(id=agent.id)  # Exclure l'agent lui-même

        for admin in admins:
            Notification.objects.create(
                recipient=admin,
                notification_type="DOCUMENT_UPLOADED",
                title="[NOUVEAU] Document reçu",
                message=f"L'agent {agent_full_name} a uploadé un nouveau document: '{document.title}'",
                document=document,
            )

    @staticmethod
    def notify_on_document_opened(document, admin):
        """
        Notifie quand un admin ouvre un document pour révision.

        Args:
            document: Le document ouvert
            admin: L'admin qui ouvre le document

        Notifications créées :
        - Agent : "Un administrateur a ouvert votre document"
        """
        admin_full_name = f"{admin.first_name} {admin.last_name}".strip()

        # Notifier l'agent
        Notification.objects.create(
            recipient=document.agent,
            notification_type="DOCUMENT_OPENED",
            title="[OUVERTURE] Document en révision",
            message=f"L'administrateur {admin_full_name} a ouvert votre document '{document.title}' pour révision.",
            document=document,
        )

    @staticmethod
    def notify_on_document_approved(document, approving_admin):
        """
        Notifie lors de l'approbation d'un document.

        Args:
            document: Le document approuvé
            approving_admin: L'admin qui a approuvé le document

        Notifications créées :
        - Admin qui a approuvé : "Vous avez approuvé le document X"
        - Autres admins : "L'admin X a approuvé le document Y de l'agent Z"
        - Agent : "Votre document a été approuvé par l'admin X"
        """
        admin_full_name = (
            f"{approving_admin.first_name} {approving_admin.last_name}".strip()
        )
        agent_full_name = (
            f"{document.agent.first_name} {document.agent.last_name}".strip()
        )

        # 1. Notifier l'admin qui a effectué l'action
        Notification.objects.create(
            recipient=approving_admin,
            notification_type="DOCUMENT_APPROVED",
            title="[SUCCES] Document approuvé",
            message=f"Vous avez approuvé le document '{document.title}' de l'agent {agent_full_name}.",
            document=document,
        )

        # 2. Notifier les autres admins
        other_admins = User.objects.filter(
            models.Q(is_staff=True) | models.Q(role="ADMIN"), is_active=True
        ).exclude(id=approving_admin.id)

        for admin in other_admins:
            Notification.objects.create(
                recipient=admin,
                notification_type="DOCUMENT_APPROVED",
                title="[ACTION] Document approuvé",
                message=f"L'administrateur {admin_full_name} a approuvé le document '{document.title}' de l'agent {agent_full_name}.",
                document=document,
            )

        # 3. Notifier l'agent
        Notification.objects.create(
            recipient=document.agent,
            notification_type="DOCUMENT_APPROVED",
            title="[VALIDEE] Document approuvé",
            message=f"Votre document '{document.title}' a été approuvé par l'administrateur {admin_full_name}.",
            document=document,
        )

    @staticmethod
    def notify_on_document_rejected(document, rejecting_admin, reason=None):
        """
        Notifie lors du rejet d'un document.

        Args:
            document: Le document rejeté
            rejecting_admin: L'admin qui a rejeté le document
            reason: La raison du rejet

        Notifications créées :
        - Admin qui a rejeté : "Vous avez rejeté le document X"
        - Autres admins : "L'admin X a rejeté le document Y de l'agent Z"
        - Agent : "Votre document a été rejeté par l'admin X. Raison: ..."
        """
        admin_full_name = (
            f"{rejecting_admin.first_name} {rejecting_admin.last_name}".strip()
        )
        agent_full_name = (
            f"{document.agent.first_name} {document.agent.last_name}".strip()
        )

        reason_msg = f" Raison: {reason}" if reason else ""

        # 1. Notifier l'admin qui a effectué l'action
        Notification.objects.create(
            recipient=rejecting_admin,
            notification_type="DOCUMENT_REJECTED",
            title="[REJET] Document rejeté",
            message=f"Vous avez rejeté le document '{document.title}' de l'agent {agent_full_name}.{reason_msg}",
            document=document,
        )

        # 2. Notifier les autres admins
        other_admins = User.objects.filter(
            models.Q(is_staff=True) | models.Q(role="ADMIN"), is_active=True
        ).exclude(id=rejecting_admin.id)

        for admin in other_admins:
            Notification.objects.create(
                recipient=admin,
                notification_type="DOCUMENT_REJECTED",
                title="[ACTION] Document rejeté",
                message=f"L'administrateur {admin_full_name} a rejeté le document '{document.title}' de l'agent {agent_full_name}.{reason_msg}",
                document=document,
            )

        # 3. Notifier l'agent
        Notification.objects.create(
            recipient=document.agent,
            notification_type="DOCUMENT_REJECTED",
            title="[ATTENTION] Document rejeté",
            message=f"Votre document '{document.title}' a été rejeté par l'administrateur {admin_full_name}.{reason_msg}",
            document=document,
        )

    @staticmethod
    def notify_on_document_deleted(document_title, agent, deleting_admin):
        """
        Notifie lors de la suppression d'un document.

        Args:
            document_title: Le titre du document supprimé
            agent: L'agent propriétaire du document
            deleting_admin: L'admin qui a supprimé le document

        Notifications créées :
        - Admin qui a supprimé : "Vous avez supprimé le document X"
        - Autres admins : "L'admin X a supprimé le document Y de l'agent Z"
        - Agent : "Votre document X a été supprimé par l'admin Y"
        """
        admin_full_name = (
            f"{deleting_admin.first_name} {deleting_admin.last_name}".strip()
        )
        agent_full_name = f"{agent.first_name} {agent.last_name}".strip()

        # 1. Notifier l'admin qui a effectué l'action
        Notification.objects.create(
            recipient=deleting_admin,
            notification_type="DOCUMENT_DELETED",
            title="[SUPPRESSION] Document supprimé",
            message=f"Vous avez supprimé le document '{document_title}' de l'agent {agent_full_name}.",
        )

        # 2. Notifier les autres admins
        other_admins = User.objects.filter(
            models.Q(is_staff=True) | models.Q(role="ADMIN"), is_active=True
        ).exclude(id=deleting_admin.id)

        for admin in other_admins:
            Notification.objects.create(
                recipient=admin,
                notification_type="DOCUMENT_DELETED",
                title="[ACTION] Document supprimé",
                message=f"L'administrateur {admin_full_name} a supprimé le document '{document_title}' de l'agent {agent_full_name}.",
            )

        # 3. Notifier l'agent
        Notification.objects.create(
            recipient=agent,
            notification_type="DOCUMENT_DELETED",
            title="[SUPPRESSION] Document supprimé",
            message=f"Votre document '{document_title}' a été supprimé par l'administrateur {admin_full_name}.",
        )

    @staticmethod
    def notify_on_document_downloaded(document, admin):
        """
        Notifie l'agent qu'un admin a téléchargé son document.

        Args:
            document: Le document téléchargé
            admin: L'admin qui a téléchargé le document

        Notifications créées :
        - Agent : "Un administrateur a téléchargé votre document"
        """
        admin_full_name = f"{admin.first_name} {admin.last_name}".strip()

        # Notifier l'agent
        Notification.objects.create(
            recipient=document.agent,
            notification_type="DOCUMENT_OPENED",  # Réutiliser le même type que "opened by admin"
            title="[DOWNLOAD] Document telecharge",
            message=f"L'administrateur {admin_full_name} a telecharge votre document '{document.title}'.",
            document=document,
        )

    @staticmethod
    def notify_on_validation_completed(document, passed, issues=None):
        """
        Notifie la fin de la validation d'un document.

        Args:
            document: Le document validé
            passed: True si la validation a réussi, False sinon
            issues: Liste des problèmes (si validation échouée)

        Notifications créées :
        - Agent : "Votre document a été validé avec succès" ou "Votre document a échoué la validation"
        - Admins : Notification que le document est validé
        """
        issues_msg = ""
        if not passed and issues:
            issues_msg = "\n\nProblèmes détectés:\n" + "\n".join(
                f"- {issue}" for issue in issues[:3]
            )

        agent_full_name = (
            f"{document.agent.first_name} {document.agent.last_name}".strip()
        )

        # Notifier l'agent
        if passed:
            Notification.objects.create(
                recipient=document.agent,
                notification_type="VALIDATION",
                title="[SUCCES] Validation réussie",
                message=f"Votre document '{document.title}' a été validé avec succès et attend l'approbation d'un administrateur.",
                document=document,
            )

            # Notifier les admins
            admins = User.objects.filter(
                models.Q(is_staff=True) | models.Q(role="ADMIN"), is_active=True
            )

            for admin in admins:
                Notification.objects.create(
                    recipient=admin,
                    notification_type="VALIDATION",
                    title="[VALIDATION] Document validé",
                    message=f"Le document '{document.title}' de l'agent {agent_full_name} a été validé avec succès et attend votre approbation.",
                    document=document,
                )
        else:
            Notification.objects.create(
                recipient=document.agent,
                notification_type="VALIDATION",
                title="[ECHEC] Validation échouée",
                message=f"Votre document '{document.title}' n'a pas passé la validation.{issues_msg}",
                document=document,
            )
