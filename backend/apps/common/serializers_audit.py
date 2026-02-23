"""
Sérializers pour les audit logs.
"""

from rest_framework import serializers
from apps.common.audit import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    """Serializer pour les logs d'audit."""
    
    actor_name = serializers.SerializerMethodField()
    ip_address = serializers.CharField(read_only=True)
    created_at_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = AuditLog
        fields = [
            'id',
            'actor',
            'actor_name',
            'action',
            'severity',
            'description',
            'success',
            'ip_address',
            'created_at',
            'created_at_formatted',
        ]
        read_only_fields = fields
    
    def get_actor_name(self, obj):
        """Retourne le nom formaté de l'acteur."""
        if obj.actor:
            return f"{obj.actor.first_name} {obj.actor.last_name} ({obj.actor.matricule})"
        return "Système"
    
    def get_created_at_formatted(self, obj):
        """Retourne la date formatée."""
        if obj.created_at:
            return obj.created_at.strftime('%d/%m/%Y %H:%M:%S')
        return ""
