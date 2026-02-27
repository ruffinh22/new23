"""
Vues API pour les audit logs.
"""

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import OrderingFilter, SearchFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Count
from datetime import timedelta

from apps.common.audit import AuditLog
from apps.common.serializers_audit import AuditLogSerializer


class AuditLogViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour gérer les logs d'audit.

    Endpoints:
    - GET /api/audit-logs/ : Liste les logs d'audit
    - GET /api/audit-logs/{id}/ : Détail d'un log
    - GET /api/audit-logs/stats/summary/ : Statistiques des logs
    - GET /api/audit-logs/export/csv/ : Exporter en CSV
    """

    queryset = AuditLog.objects.all().order_by("-created_at")
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]  # Simplified: just require auth
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["action", "severity", "success", "actor"]
    search_fields = [
        "description",
        "actor__matricule",
        "actor__first_name",
        "actor__last_name",
    ]
    ordering_fields = ["-created_at", "actor", "action", "severity"]
    ordering = ["-created_at"]
    pagination_class = None  # Pas de pagination pour les logs (optionnel)

    def list(self, request, *args, **kwargs):
        """Récupère la liste des logs d'audit avec filtres optionnels."""
        # Filtres optionnels
        days_back = request.query_params.get("days", 30)
        try:
            days_back = int(days_back)
        except (ValueError, TypeError):
            days_back = 30

        cutoff_date = timezone.now() - timedelta(days=days_back)
        queryset = self.get_queryset().filter(created_at__gte=cutoff_date)

        # Appliquer les autres filtres
        queryset = self.filter_queryset(queryset)

        serializer = self.get_serializer(queryset, many=True)

        return Response({"count": queryset.count(), "results": serializer.data})

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """Retourne les statistiques des logs d'audit."""
        # Statistiques générales
        total_logs = AuditLog.objects.count()
        failed_logs = AuditLog.objects.filter(success=False).count()

        # Logs des 24 dernières heures
        yesterday = timezone.now() - timedelta(days=1)
        logs_24h = AuditLog.objects.filter(created_at__gte=yesterday).count()

        # Actions les plus fréquentes
        top_actions = list(
            AuditLog.objects.values("action")
            .annotate(count=Count("id"))
            .order_by("-count")[:5]
        )

        # Acteurs les plus actifs
        top_actors = list(
            AuditLog.objects.filter(actor__isnull=False)
            .values("actor__matricule", "actor__first_name", "actor__last_name")
            .annotate(count=Count("id"))
            .order_by("-count")[:5]
        )

        # Sévérités
        severity_stats = {}
        for severity in ["INFO", "WARNING", "ERROR", "CRITICAL"]:
            count = AuditLog.objects.filter(severity=severity).count()
            severity_stats[severity] = count

        return Response(
            {
                "total_logs": total_logs,
                "failed_logs": failed_logs,
                "success_rate": int((total_logs - failed_logs) / total_logs * 100)
                if total_logs > 0
                else 0,
                "logs_24h": logs_24h,
                "top_actions": top_actions,
                "top_actors": top_actors,
                "severity_stats": severity_stats,
            }
        )

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """Retourne un résumé des logs d'audit."""
        days = int(request.query_params.get("days", 7))
        cutoff_date = timezone.now() - timedelta(days=days)

        logs = AuditLog.objects.filter(created_at__gte=cutoff_date)

        # Grouper par jour
        daily_stats = []
        for i in range(days):
            date = timezone.now().date() - timedelta(days=i)
            count = logs.filter(created_at__date=date).count()
            daily_stats.append({"date": date.strftime("%Y-%m-%d"), "count": count})

        daily_stats.reverse()

        return Response(
            {
                "period_days": days,
                "total_logs": logs.count(),
                "daily_stats": daily_stats,
            }
        )

    @action(detail=False, methods=["get"])
    def export(self, request):
        """Exporte les logs en CSV."""
        import csv
        from django.http import HttpResponse

        # Récupérer les logs
        days = int(request.query_params.get("days", 30))
        cutoff_date = timezone.now() - timedelta(days=days)
        queryset = self.get_queryset().filter(created_at__gte=cutoff_date)

        # Créer la réponse CSV
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="audit_logs.csv"'

        writer = csv.writer(response)
        writer.writerow(
            [
                "Date/Heure",
                "Acteur",
                "Action",
                "Sévérité",
                "Description",
                "Succès",
                "IP",
                "Objet Affecté",
            ]
        )

        for log in queryset:
            writer.writerow(
                [
                    log.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                    log.get_actor_name(),
                    log.get_action_display(),
                    log.get_severity_display(),
                    log.description,
                    "Oui" if log.success else "Non",
                    log.ip_address or "N/A",
                    log.get_object_display(),
                ]
            )

        return response

    @action(detail=False, methods=["get"])
    def by_action(self, request):
        """Retourne les logs groupés par action."""
        action_type = request.query_params.get("action")

        if not action_type:
            return Response(
                {"error": "action paramètre est requis"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        days = int(request.query_params.get("days", 30))
        cutoff_date = timezone.now() - timedelta(days=days)

        queryset = (
            self.get_queryset()
            .filter(action=action_type, created_at__gte=cutoff_date)
            .order_by("-created_at")
        )

        serializer = self.get_serializer(queryset, many=True)

        return Response(
            {
                "action": action_type,
                "count": queryset.count(),
                "results": serializer.data,
            }
        )

    @action(detail=False, methods=["get"])
    def by_actor(self, request):
        """Retourne les logs d'un acteur spécifique."""
        actor_id = request.query_params.get("actor_id")

        if not actor_id:
            return Response(
                {"error": "actor_id paramètre est requis"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        days = int(request.query_params.get("days", 30))
        cutoff_date = timezone.now() - timedelta(days=days)

        queryset = (
            self.get_queryset()
            .filter(actor_id=actor_id, created_at__gte=cutoff_date)
            .order_by("-created_at")
        )

        serializer = self.get_serializer(queryset, many=True)

        return Response(
            {
                "actor_id": actor_id,
                "count": queryset.count(),
                "results": serializer.data,
            }
        )
