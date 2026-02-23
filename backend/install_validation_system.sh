#!/bin/bash
# Script de mise en place du système de validation des documents

set -e

echo "================================"
echo "Installation du système de validation"
echo "================================"
echo ""

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "manage.py" ]; then
    echo "❌ Erreur: manage.py non trouvé. Assurez-vous d'être dans le répertoire backend."
    exit 1
fi

echo "1️⃣  Exécution des migrations Django..."
python manage.py migrate
echo "✅ Migrations effectuées"
echo ""

echo "2️⃣  Initialisation des spécifications de documents..."
python manage.py init_document_specs
echo "✅ Spécifications initialisées"
echo ""

echo "3️⃣  Collection des fichiers statiques..."
python manage.py collectstatic --noinput 2>/dev/null || true
echo "✅ Fichiers statiques collectés"
echo ""

echo "4️⃣  Vérification des installations..."
python -c "import openpyxl; print('✅ openpyxl installé')" 2>/dev/null || {
    echo "❌ openpyxl non installé. Installation en cours..."
    pip install openpyxl
}
echo ""

echo "5️⃣  Résumé de l'installation"
echo "================================"
echo "✅ Système de validation installé avec succès!"
echo ""
echo "Fichiers créés:"
echo "  - apps/documents/validators.py (Validateurs)"
echo "  - apps/documents/services.py (Services)"
echo "  - apps/documents/serializers.py (Sérialiseurs)"
echo "  - apps/documents/views.py (ViewSets API)"
echo "  - apps/documents/urls.py (Routes)"
echo "  - apps/documents/admin.py (Admin Django)"
echo "  - apps/documents/tests.py (Tests)"
echo "  - apps/documents/examples.py (Exemples)"
echo ""
echo "Documentation:"
echo "  - apps/documents/VALIDATION_GUIDE.md"
echo "  - API_DOCUMENTATION.md"
echo "  - CHANGES_SUMMARY.md"
echo "  - IMPLEMENTATION_CHECKLIST.md"
echo ""
echo "Prochaines étapes:"
echo "1. Configurer les URLs dans config/urls.py"
echo "2. Créer les spécifications personnalisées"
echo "3. Intégrer le frontend"
echo "4. Exécuter les tests: pytest apps/documents/tests.py"
echo ""
echo "Documentation complète:"
echo "  - Lire VALIDATION_GUIDE.md pour comprendre le système"
echo "  - Consulter API_DOCUMENTATION.md pour l'API REST"
echo "  - Voir examples.py pour des exemples de code"
echo ""
echo "================================"
echo "✅ Installation terminée!"
echo "================================"
