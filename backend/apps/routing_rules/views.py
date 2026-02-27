from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.common.mixins import PermissionMixin
from .models import RoutingRule, DepartmentDocumentType
from .serializers import (
    RoutingRuleSerializer,
    RoutingRuleCreateSerializer,
    RoutingRuleListSerializer,
    DepartmentDocumentTypeSerializer,
)


class IsAdminOrReadOnly(permissions.BasePermission):
    """Permission pour les administrateurs ou lecture seule."""

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        # Allow write access for staff or users with ADMIN role
        return request.user and (
            request.user.is_staff or getattr(request.user, "role", None) == "ADMIN"
        )


class DepartmentDocumentTypeViewSet(PermissionMixin, viewsets.ModelViewSet):
    """ViewSet pour gérer les types de documents par département.

    ✅ UTILISE PermissionMixin pour centralized admin checks.
    """

    queryset = DepartmentDocumentType.objects.all()
    serializer_class = DepartmentDocumentTypeSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrReadOnly]

    def get_queryset(self):
        """Filtre par département si fourni."""
        department = self.request.query_params.get("department")
        queryset = DepartmentDocumentType.objects.all().order_by(
            "department", "document_type"
        )

        if department:
            queryset = queryset.filter(department=department, is_available=True)

        return queryset

    @action(detail=False, methods=["get"], permission_classes=[permissions.AllowAny])
    def by_department(self, request):
        """Retourne les types de documents disponibles pour un département."""
        department = request.query_params.get("department")

        if not department:
            return Response(
                {"error": "Le paramètre department est obligatoire"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        types = DepartmentDocumentType.objects.filter(
            department=department, is_available=True
        )

        serializer = DepartmentDocumentTypeSerializer(types, many=True)

        return Response({"department": department, "document_types": serializer.data})

    @action(detail=False, methods=["get"], permission_classes=[permissions.AllowAny])
    def all_types(self, request):
        """Retourne TOUS les types de documents disponibles (pour les admins)."""
        # Récupère tous les types distincts (le premier de chaque type_document)
        types_queryset = DepartmentDocumentType.objects.filter(
            is_available=True
        ).order_by("document_type")

        # Utiliser une combinaison d'IDs uniques par type (MySQL ne supporte pas DISTINCT ON)
        seen_types = set()
        unique_types = []
        for t in types_queryset:
            if t.document_type not in seen_types:
                unique_types.append(t)
                seen_types.add(t.document_type)

        serializer = DepartmentDocumentTypeSerializer(unique_types, many=True)

        return Response({"document_types": serializer.data})

    @action(detail=False, methods=["get"], permission_classes=[permissions.AllowAny])
    def departments_list(self, request):
        """Retourne la liste de tous les départements disponibles."""
        # Récupérer tous les départements uniques avec leurs labels
        departments = (
            DepartmentDocumentType.objects.values_list("department")
            .distinct()
            .order_by("department")
        )

        # Créer la liste avec les labels
        department_list = [
            {
                "value": dept[0],
                "label": DepartmentDocumentType.objects.filter(department=dept[0])
                .first()
                .get_department_display(),
            }
            for dept in departments
        ]

        return Response({"departments": department_list, "total": len(department_list)})


class RoutingRuleViewSet(PermissionMixin, viewsets.ModelViewSet):
    """ViewSet pour gérer les règles de routage.

    ✅ UTILISE PermissionMixin pour centralized admin checks.
    """

    queryset = RoutingRule.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsAdminOrReadOnly]

    def get_serializer_class(self):
        """Retourne le sérialiseur approprié selon l'action."""
        if self.action == "create":
            return RoutingRuleCreateSerializer
        elif self.action == "list":
            return RoutingRuleListSerializer
        return RoutingRuleSerializer

    def get_queryset(self):
        """Retourne les règles triées par priorité, filtrées par branche.

        ✅ UTILISE self.is_admin() pour centralized check.
        """
        user = self.request.user
        queryset = RoutingRule.objects.all().order_by("-priority", "-created_at")

        # ✅ UTILISE PermissionMixin.is_admin() - single source of truth
        if self.is_admin(user):
            return queryset

        # Les agents avec une branche voient seulement les règles de leur branche + globales
        if user.branch:
            queryset = queryset.filter(branch__in=[user.branch, None])

        return queryset

    def perform_create(self, serializer):
        """Définit l'utilisateur qui crée la règle."""
        import logging

        logger = logging.getLogger(__name__)

        logger.info("[RoutingRuleViewSet.perform_create] Received data:")
        logger.info(f"  - Data: {self.request.data}")
        logger.info(f"  - Validated data: {serializer.validated_data}")

        # Save the rule
        rule = serializer.save(created_by=self.request.user)

        logger.info("[RoutingRuleViewSet.perform_create] Rule saved:")
        logger.info(f"  - ID: {rule.id}")
        logger.info(f"  - Name: {rule.name}")
        logger.info(f"  - Conditions (raw): {rule.conditions}")
        logger.info(f"  - Conditions (type): {type(rule.conditions)}")

        # Verify by re-fetching from DB
        fresh_rule = RoutingRule.objects.get(id=rule.id)
        logger.info("[RoutingRuleViewSet.perform_create] Re-fetched from DB:")
        logger.info(f"  - Conditions: {fresh_rule.conditions}")

        # Serialize and check output
        output_serializer = self.get_serializer(rule)
        logger.info("[RoutingRuleViewSet.perform_create] Serialized output:")
        logger.info(f"  - Data: {output_serializer.data}")
        logger.info(
            f"  - Conditions in output: {output_serializer.data.get('conditions')}"
        )

    def create(self, request, *args, **kwargs):
        """Override create to return full RoutingRuleSerializer response."""
        import logging

        logger = logging.getLogger(__name__)
        logger.info("[RoutingRuleViewSet.create] Starting creation")

        # Use RoutingRuleCreateSerializer for validation/saving
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        # But return response with RoutingRuleSerializer (full data)
        created_rule = RoutingRule.objects.get(id=serializer.instance.id)
        response_serializer = RoutingRuleSerializer(created_rule)

        logger.info("[RoutingRuleViewSet.create] Returning response with:")
        logger.info(f"  - Data keys: {response_serializer.data.keys()}")
        logger.info(f"  - Conditions: {response_serializer.data.get('conditions')}")

        from rest_framework.response import Response
        from rest_framework import status

        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"])
    def active(self, request):
        """Retourne uniquement les règles actives."""
        rules = RoutingRule.objects.filter(is_active=True).order_by("-priority")
        serializer = self.get_serializer(rules, many=True)
        return Response(
            {
                "count": len(serializer.data),
                "next": None,
                "previous": None,
                "results": serializer.data,
            }
        )

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAdminUser])
    def activate(self, request, pk=None):
        """Active une règle de routage."""
        rule = self.get_object()
        rule.is_active = True
        rule.save()
        serializer = self.get_serializer(rule)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAdminUser])
    def deactivate(self, request, pk=None):
        """Désactive une règle de routage."""
        rule = self.get_object()
        rule.is_active = False
        rule.save()
        serializer = self.get_serializer(rule)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def statistics(self, request):
        """Retourne les statistiques des règles de routage."""
        rules = RoutingRule.objects.all()
        total_applied = sum(rule.times_applied for rule in rules)

        stats = {
            "total_rules": rules.count(),
            "active_rules": rules.filter(is_active=True).count(),
            "total_applications": total_applied,
            "top_rules": [],
        }

        # Top 5 des règles les plus utilisées
        top_rules = rules.order_by("-times_applied")[:5]
        for rule in top_rules:
            stats["top_rules"].append(
                {
                    "id": rule.id,
                    "name": rule.name,
                    "times_applied": rule.times_applied,
                    "destination": rule.destination_folder.name,
                }
            )

        return Response(stats)
