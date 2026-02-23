from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Department


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    """Admin pour le modèle Department."""
    
    list_display = ('name', 'code', 'folder', 'is_active', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('name', 'code', 'description')
    readonly_fields = ('folder', 'created_at', 'updated_at')
    
    fieldsets = (
        (None, {'fields': ('name', 'code')}),
        ('Informations', {
            'fields': ('description', 'folder')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Dates', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    ordering = ('name',)
    
    def save_model(self, request, obj, form, change):
        """Enregistrer le modèle."""
        super().save_model(request, obj, form, change)
        if not change:  # Si création
            print(f"✓ Département créé: {obj.name}")


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
        ('Informations professionnelles', {
            'fields': ('department', 'role')
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
        ('Informations professionnelles', {
            'classes': ('wide',),
            'fields': ('department', 'role'),
        }),
        ('Permissions', {
            'classes': ('wide',),
            'fields': ('is_active', 'is_staff', 'is_superuser'),
        }),
    )
    
    ordering = ('matricule',)
    filter_horizontal = ('groups', 'user_permissions')
