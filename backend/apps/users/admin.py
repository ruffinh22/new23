from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


# ✅ LEGACY: Department and Branch admin removed - use FolderAdmin in folders app instead


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin pour le modèle User personnalisé."""
    
    list_display = ('matricule', 'email', 'first_name', 'last_name', 'department', 'role', 'is_active', 'is_staff')
    list_filter = ('is_active', 'is_staff', 'is_superuser', 'role', 'department', 'date_joined')
    search_fields = ('matricule', 'email', 'first_name', 'last_name')
    
    fieldsets = (
        (None, {'fields': ('matricule', 'password')}),
        ('Informations personnelles', {
            'fields': ('first_name', 'last_name', 'email', 'phone', 'avatar')
        }),
        ('Hiérarchie organisationnelle', {
            'fields': ('pole', 'branch', 'department', 'role'),
            'description': 'Pole/Branch/Department pointent maintenant vers des Folders unifiés'
        }),
        ('Permissions', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')
        }),
        ('Dates importantes', {
            'fields': ('date_joined', 'last_login'),
            'classes': ('collapse',)
        }),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('matricule', 'email', 'password1', 'password2'),
        }),
        ('Informations personnelles', {
            'classes': ('wide',),
            'fields': ('first_name', 'last_name', 'phone'),
        }),
        ('Hiérarchie organisationnelle', {
            'classes': ('wide',),
            'fields': ('pole', 'branch', 'department', 'role'),
        }),
        ('Permissions', {
            'classes': ('wide',),
            'fields': ('is_active', 'is_staff', 'is_superuser'),
        }),
    )
    
    ordering = ('matricule',)
    filter_horizontal = ('groups', 'user_permissions')
