from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from apps.common.mixins import PermissionMixin
from .models import Folder
from .serializers import (
    FolderSerializer,
    FolderTreeSerializer,
    FolderCreateSerializer,
    FolderPoleSerializer,
    FolderBranchSerializer,
    FolderServiceSerializer,
)


class IsFolderAdminOrReadOnly(permissions.BasePermission):
    """Permission pour les administrateurs ou lecture seule."""

    def has_permission(self, request, view):
        # SAFE_METHODS (GET) → toujours autorisé pour les utilisateurs authentifiés
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated

        # Pour POST, PUT, DELETE: vérifier si l'utilisateur est ADMIN
        # ✅ UTILISE le rôle ADMIN du système, pas is_staff
        if not request.user:
            return False

        # Vérifier le rôle ADMIN (nouveau système)
        if getattr(request.user, "role", None) == "ADMIN":
            return True

        # Fallback au is_staff (ancienne vérification)
        return request.user.is_staff


class FolderViewSet(PermissionMixin, viewsets.ModelViewSet):
    """ViewSet pour gérer les dossiers.

    ✅ UTILISE PermissionMixin pour centralized admin checks.
    """

    queryset = Folder.objects.filter(is_active=True)

    def get_permissions(self):
        """Retourne les permissions selon l'action."""
        # Pour les actions read-only (list, retrieve, etc), autoriser les utilisateurs authentifiés
        if self.action in ["list", "retrieve", "tree", "root", "children"]:
            return [permissions.IsAuthenticated()]

        # Pour les actions write (create, update, destroy), faire une vérification custom
        # Utiliser notre permission personnalisée
        return [permissions.IsAuthenticated(), IsFolderAdminOrReadOnly()]

    def get_serializer_class(self):
        """Retourne le sérialiseur approprié selon l'action."""
        if self.action == "tree":
            return FolderTreeSerializer
        elif self.action == "create":
            return FolderCreateSerializer
        return FolderSerializer

    def perform_create(self, serializer):
        """Définit l'utilisateur qui crée le dossier."""
        serializer.save(created_by=self.request.user)

    def get_queryset(self):
        """Retourne les dossiers filtrés selon les permissions.

        ✅ UTILISE self.is_admin() pour centralized check.
        """
        queryset = Folder.objects.filter(is_active=True)
        user = self.request.user

        # ✅ UTILISE PermissionMixin.is_admin() - single source of truth
        if self.is_admin(user):
            return queryset

        # Les agents ne voient que:
        # 1. Leur filiale (dossier racine)
        # 2. Leur département sous leur filiale
        # 3. L'archive de leur filiale
        if hasattr(user, "branch") and user.branch:
            # user.branch EST directement un Folder de type 'filiale'
            branch = user.branch

            # Dossiers autorisés:
            # - Dossier de la branche
            # - Dossier du département de l'agent (sous sa branche)
            # - Autres dossiers sous sa branche
            authorized_folders = [branch.id]

            # Tous les enfants directs de la branche (Archive + Depts)
            authorized_folders.extend(
                list(branch.children.values_list("id", flat=True))
            )

            # Si l'agent a un département, ajouter les sous-dossiers du département
            if hasattr(user, "department") and user.department:
                # user.department EST directement un Folder de type 'service'
                dept_folder = user.department
                authorized_folders.extend(list(dept_folder.get_descendants_ids()))

            queryset = queryset.filter(id__in=authorized_folders)

        return queryset

    @action(detail=False, methods=["get"])
    def tree(self, request):
        """Retourne l'arborescence des dossiers accessibles.

        Pour les admins: retourne tous les dossiers groupés par filiale
        Pour les agents: retourne seulement le dossier de leur filiale
        """
        is_admin = request.user and (
            request.user.is_staff or getattr(request.user, "role", None) == "ADMIN"
        )

        if is_admin:
            # Les admins voient toutes les filiales + tous les depts
            root_folders = Folder.objects.filter(
                parent__isnull=True, is_active=True
            ).order_by("name")
        else:
            # Les agents ne voient que leur filiale (branch est directement un Folder, pas un objet avec .folder)
            if hasattr(request.user, "branch") and request.user.branch:
                # request.user.branch EST directement un Folder de type 'filiale'
                root_folders = Folder.objects.filter(
                    id=request.user.branch.id, is_active=True
                )
            else:
                # Si pas de branch assigné, montrer tous les dossiers
                root_folders = Folder.objects.filter(
                    parent__isnull=True, is_active=True
                ).order_by("name")

        serializer = FolderTreeSerializer(
            root_folders, many=True, context={"request": request}
        )
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def root(self, request):
        """Retourne les dossiers racine avec leur hiérarchie complète."""
        from .serializers import FolderTreeSerializer

        root_folders = Folder.objects.filter(
            parent__isnull=True, is_active=True
        ).order_by("name")
        serializer = FolderTreeSerializer(root_folders, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def get_received_folder(self, request):
        """Retourne ou crée le dossier 'Received' de l'utilisateur courant avec structure hiérarchique."""
        from .serializers import FolderTreeSerializer

        # Trouver/créer le dossier "Received" pour cet utilisateur
        received_folder_name = (
            f"Received - {request.user.get_full_name() or request.user.username}"
        )
        received_folder, created = Folder.objects.get_or_create(
            owner=request.user,
            folder_type="received_user",
            defaults={
                "name": received_folder_name,
                "is_system_folder": True,
                "description": f"Dossier de réception automatique pour {request.user.get_full_name() or request.user.username}",
                "parent": None,
            },
        )

        # Utiliser FolderTreeSerializer pour inclure les enfants (documents)
        serializer = FolderTreeSerializer(received_folder)
        return Response(
            {
                "folder": serializer.data,
                "created": created,
                "message": "Dossier créé" if created else "Dossier existant",
            }
        )

    @action(detail=True, methods=["get"])
    def children(self, request, pk=None):
        """Retourne les sous-dossiers d'un dossier."""
        folder = self.get_object()
        children = folder.children.filter(is_active=True)
        serializer = FolderSerializer(children, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def ancestors(self, request, pk=None):
        """Retourne les dossiers parents d'un dossier."""
        folder = self.get_object()
        ancestors = folder.get_ancestors()
        serializer = FolderSerializer(ancestors, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def descendants(self, request, pk=None):
        """Retourne tous les sous-dossiers récursivement."""
        folder = self.get_object()
        descendants = folder.get_descendants()
        serializer = FolderSerializer(descendants, many=True)
        return Response(serializer.data)


# ========================================
# PÔLES VIEWSET
# ========================================


class PoleViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet pour exposer les 8 Pôles (premier niveau hiérarchique).

    Les Pôles représentent les types de départements:
    - Administration, Commercial, Direction, Finance, Informatique, Logistique, Qualité, RH
    """

    permission_classes = [
        permissions.AllowAny
    ]  # Permettre l'accès sans authentification pour l'inscription
    serializer_class = FolderPoleSerializer
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["is_active"]
    search_fields = ["name", "code"]
    ordering_fields = ["name", "code", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        """Retourne les Pôles actifs.

        Pôles = folders de level 0 (sans parent) et de type 'pole'
        """
        return Folder.objects.filter(
            is_active=True, parent__isnull=True, folder_type="pole"
        ).order_by("name")

    @action(detail=True, methods=["get"])
    def filiales(self, request, pk=None):
        """Liste les 7 Filiales associées à ce Pôle."""
        pole = self.get_object()
        filiales = pole.children.filter(is_active=True, folder_type="filiale").order_by(
            "name"
        )
        serializer = FolderBranchSerializer(filiales, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def with_counts(self, request):
        """Affiche tous les Pôles avec leurs comptes.

        JSON:
        {
          "id": 1,
          "name": "Pôle Administration",
          "filiales_count": 7,
          "total_services": 7,
          "total_folders": 15
        }
        """
        poles = self.get_queryset()
        data = []
        for pole in poles:
            filiales = pole.children.filter(folder_type="filiale")
            services = Folder.objects.filter(
                parent__parent_id=pole.id, folder_type="service"
            )
            data.append(
                {
                    "id": pole.id,
                    "name": pole.name,
                    "code": pole.code,
                    "filiales_count": filiales.count(),
                    "total_services": services.count(),
                    "total_folders": 1 + filiales.count() + services.count(),
                }
            )
        return Response(data)


# ========================================
# FILIALES VIEWSET
# ========================================


class FilialeViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet pour exposer les 56 Filiales (deuxième niveau).

    Chaque Pôle contient 7 Filiales (pays):
    - Bénin, Cameroun, Congo, Côte d'Ivoire, Guinée, Guinée Équatoriale, Guinée-Bissau
    """

    permission_classes = [
        permissions.AllowAny
    ]  # Permettre l'accès sans authentification pour l'inscription
    serializer_class = FolderBranchSerializer
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["is_active", "parent"]
    search_fields = ["name", "code", "country_code"]
    ordering_fields = ["name", "code", "parent__name", "created_at"]
    ordering = ["parent__name", "name"]

    def get_queryset(self):
        """Retourne les Filiales (folders de niveau 1, type 'filiale').

        Filiales = children des Pôles avec folder_type='filiale'
        """
        return (
            Folder.objects.filter(
                is_active=True,
                parent__isnull=False,
                parent__folder_type="pole",
                folder_type="filiale",
            )
            .select_related("parent")
            .order_by("parent__name", "name")
        )

    @action(detail=True, methods=["get"])
    def services(self, request, pk=None):
        """Liste les Services (Départements) contenu dans cette Filiale."""
        filiale = self.get_object()
        services = filiale.children.filter(
            is_active=True, folder_type="service"
        ).order_by("name")
        serializer = FolderServiceSerializer(services, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def by_pole(self, request):
        """Affiche les Filiales groupées par Pôle.

        JSON:
        {
          "pole_name": "Pôle Administration",
          "filiales": [
            {"id": 1, "name": "Bénin", "code": "POL_ADM_BJ", ...},
            ...
          ]
        }
        """
        poles = Folder.objects.filter(folder_type="pole", is_active=True).order_by(
            "name"
        )

        data = []
        for pole in poles:
            filiales = pole.children.filter(
                is_active=True, folder_type="filiale"
            ).order_by("name")
            data.append(
                {
                    "pole_id": pole.id,
                    "pole_name": pole.name,
                    "pole_code": pole.code,
                    "filiales_count": filiales.count(),
                    "filiales": FolderBranchSerializer(filiales, many=True).data,
                }
            )
        return Response(data)

    @action(detail=False, methods=["get"])
    def by_country(self, request):
        """Affiche les Filiales groupées par pays.

        Utile pour voir toutes les branches d'un même pays.
        """
        country_code = request.query_params.get("country_code", None)

        if country_code:
            filiales = self.get_queryset().filter(country_code=country_code)
        else:
            filiales = self.get_queryset()

        if country_code:
            return Response(
                {
                    "country_code": country_code,
                    "filiales_count": filiales.count(),
                    "filiales": FolderBranchSerializer(filiales, many=True).data,
                }
            )
        else:
            # Affiche groupé par country_code
            country_groups = {}
            for filiale in filiales:
                cc = filiale.country_code or "UNKNOWN"
                if cc not in country_groups:
                    country_groups[cc] = []
                country_groups[cc].append(filiale)

            data = []
            for cc in sorted(country_groups.keys()):
                fils = country_groups[cc]
                data.append(
                    {
                        "country_code": cc,
                        "count": len(fils),
                        "filiales": FolderBranchSerializer(fils, many=True).data,
                    }
                )
            return Response(data)


# ========================================
# SERVICES VIEWSET
# ========================================


class ServiceViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet pour exposer les 56 Services/Départements (troisième niveau).

    Chaque Filiale contient 1 Service du type de son Pôle parent.
    """

    permission_classes = [
        permissions.AllowAny
    ]  # Permettre l'accès sans authentification pour l'inscription
    serializer_class = FolderServiceSerializer
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["is_active", "parent"]
    search_fields = ["name", "code"]
    ordering_fields = ["name", "code", "parent__name", "created_at"]
    ordering = ["parent__parent__name", "parent__name", "name"]

    def get_queryset(self):
        """Retourne les Services (folders de niveau 2, type 'service').

        Services = children des Filiales avec folder_type='service'
        """
        return (
            Folder.objects.filter(
                is_active=True,
                parent__isnull=False,
                parent__folder_type="filiale",
                folder_type="service",
            )
            .select_related("parent", "parent__parent")
            .order_by("parent__parent__name", "parent__name", "name")
        )

    @action(detail=True, methods=["get"])
    def sous_services(self, request, pk=None):
        """Liste les Sous-services contenu dans ce Service."""
        service = self.get_object()
        sous_services = service.children.filter(
            is_active=True, folder_type="sub_service"
        ).order_by("name")
        serializer = FolderSerializer(sous_services, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def by_filiale(self, request):
        """Affiche les Services groupés par Filiale."""
        filiale_id = request.query_params.get("filiale_id", None)

        if filiale_id:
            services = self.get_queryset().filter(parent_id=filiale_id)
            filiale = Folder.objects.filter(id=filiale_id).first()
            return Response(
                {
                    "filiale_id": filiale_id,
                    "filiale_name": filiale.name if filiale else None,
                    "services_count": services.count(),
                    "services": FolderServiceSerializer(services, many=True).data,
                }
            )
        else:
            # Groupé par filiale
            filiales = Folder.objects.filter(
                folder_type="filiale", is_active=True
            ).order_by("parent__name", "name")

            data = []
            for filiale in filiales:
                services = filiale.children.filter(
                    folder_type="service", is_active=True
                )
                data.append(
                    {
                        "filiale_id": filiale.id,
                        "filiale_name": filiale.name,
                        "pole_name": filiale.parent.name if filiale.parent else None,
                        "services_count": services.count(),
                        "services": FolderServiceSerializer(services, many=True).data,
                    }
                )
            return Response(data)

    @action(detail=False, methods=["get"])
    def by_type(self, request):
        """Affiche les Services groupés par Pôle/Type."""
        poles = Folder.objects.filter(folder_type="pole", is_active=True).order_by(
            "name"
        )

        data = []
        for pole in poles:
            # Filiales de ce Pôle
            filiales = pole.children.filter(folder_type="filiale", is_active=True)

            # Services sous ces filiales
            services = Folder.objects.filter(
                parent__parent_id=pole.id, folder_type="service", is_active=True
            )

            data.append(
                {
                    "pole_id": pole.id,
                    "pole_name": pole.name,
                    "pole_code": pole.code,
                    "filiales_count": filiales.count(),
                    "services_count": services.count(),
                    "services": FolderServiceSerializer(services, many=True).data,
                }
            )
        return Response(data)
