"""
Frontend Views - Serve React SPA
Gère le serving du frontend React avec support complet du routing client-side
"""
from django.http import FileResponse, HttpResponse, Http404
from django.views import View
from django.conf import settings
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_control
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class FrontendView(View):
    """
    Sert le frontend React (Single Page Application)
    
    Fonctionnalités:
    - Serve index.html pour toutes les routes frontend
    - Support du routing client-side (React Router)
    - Cache control approprié
    - Messages d'erreur utiles en développement
    """
    
    @method_decorator(cache_control(max_age=0, no_cache=True, no_store=True, must_revalidate=True))
    def dispatch(self, *args, **kwargs):
        """Désactiver le cache pour index.html (permet hot reload en dev)"""
        return super().dispatch(*args, **kwargs)
    
    def get(self, request, *args, **kwargs):
        """
        Sert le fichier index.html du frontend React
        
        Les assets statiques (JS, CSS, images) sont gérés par WhiteNoise middleware
        Seul le fichier HTML principal est servi ici pour gérer le routing SPA
        """
        # Chemin vers index.html - d'abord dans STATIC_DIRS (dev), puis STATIC_ROOT (prod)
        frontend_index = None
        
        # Essayer STATIC_DIRS d'abord (développement)
        static_dirs = getattr(settings, 'STATIC_DIRS', [])
        logger.info(f"FrontendView: Looking for index.html in STATIC_DIRS: {static_dirs}")
        for static_dir in static_dirs:
            candidate = Path(static_dir) / 'frontend' / 'index.html'
            if candidate.exists() and candidate.is_file():
                frontend_index = candidate
                logger.info(f"FrontendView: Found index.html at {frontend_index}")
                break
        
        # Fallback vers STATIC_ROOT (production après collectstatic)
        if not frontend_index:
            static_root = getattr(settings, 'STATIC_ROOT', None)
            logger.info(f"FrontendView: Not found in STATIC_DIRS, checking STATIC_ROOT: {static_root}")
            if static_root:
                candidate = Path(static_root) / 'frontend' / 'index.html'
                if candidate.exists() and candidate.is_file():
                    frontend_index = candidate
                    logger.info(f"FrontendView: Found index.html at {frontend_index}")
        
        # Vérifier l'existence du fichier
        if not frontend_index:
            logger.error(f"FrontendView: Frontend index.html not found in STATIC_DIRS or STATIC_ROOT")
            
            if settings.DEBUG:
                return self._render_debug_page()
            
            # En production, lever une 404
            raise Http404("Frontend application not found")
        
        # Servir le fichier HTML
        try:
            logger.info(f"FrontendView: Serving frontend from: {frontend_index}")
            return FileResponse(
                open(frontend_index, 'rb'),
                content_type='text/html; charset=utf-8'
            )
        except IOError as e:
            logger.error(f"FrontendView: Error reading frontend index.html: {e}")
            raise Http404("Error loading frontend application")
    
    def _render_debug_page(self):
        """
        Page d'aide en développement quand le frontend n'est pas build
        """
        base_dir = settings.BASE_DIR
        project_root = base_dir.parent
        
        # Vérifier les chemins possibles
        checks = {
            'Frontend directory exists': (project_root / 'frontend').exists(),
            'package.json exists': (project_root / 'frontend' / 'package.json').exists(),
            'vite.config.ts exists': (project_root / 'frontend' / 'vite.config.ts').exists(),
            'dist/ exists': (project_root / 'frontend' / 'dist').exists(),
            'static/frontend/ exists': (base_dir / 'static' / 'frontend').exists(),
            'static/frontend/index.html exists': (base_dir / 'static' / 'frontend' / 'index.html').exists(),
        }
        
        checks_html = ''.join([
            f'<li style="color: {"green" if status else "red"}">{"✅" if status else "❌"} {check}</li>'
            for check, status in checks.items()
        ])
        
        html = f"""
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Frontend Not Built - SGDRA</title>
            <style>
                * {{
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }}
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 
                                'Helvetica Neue', Arial, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                }}
                .container {{
                    background: white;
                    max-width: 900px;
                    width: 100%;
                    border-radius: 12px;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                    overflow: hidden;
                }}
                .header {{
                    background: #E30613;
                    color: white;
                    padding: 30px;
                    text-align: center;
                }}
                .header h1 {{
                    font-size: 2rem;
                    margin-bottom: 10px;
                }}
                .header p {{
                    opacity: 0.9;
                    font-size: 1.1rem;
                }}
                .content {{
                    padding: 40px;
                }}
                .warning {{
                    background: #FFF3CD;
                    border-left: 4px solid #FFC107;
                    padding: 20px;
                    margin-bottom: 30px;
                    border-radius: 4px;
                }}
                .warning strong {{
                    display: block;
                    margin-bottom: 10px;
                    color: #856404;
                    font-size: 1.1rem;
                }}
                .section {{
                    margin-bottom: 30px;
                }}
                .section h2 {{
                    color: #E30613;
                    margin-bottom: 15px;
                    font-size: 1.5rem;
                }}
                pre {{
                    background: #f5f5f5;
                    padding: 20px;
                    border-radius: 6px;
                    overflow-x: auto;
                    border: 1px solid #ddd;
                    font-family: 'Monaco', 'Courier New', monospace;
                    font-size: 0.9rem;
                    line-height: 1.5;
                }}
                .checks {{
                    background: #f8f9fa;
                    padding: 20px;
                    border-radius: 6px;
                    margin-bottom: 20px;
                }}
                .checks ul {{
                    list-style: none;
                    padding: 0;
                }}
                .checks li {{
                    padding: 8px 0;
                    font-family: monospace;
                }}
                .links {{
                    display: flex;
                    gap: 15px;
                    flex-wrap: wrap;
                    margin-top: 30px;
                }}
                .link {{
                    display: inline-block;
                    padding: 12px 24px;
                    background: #E30613;
                    color: white;
                    text-decoration: none;
                    border-radius: 6px;
                    font-weight: 500;
                    transition: all 0.3s;
                }}
                .link:hover {{
                    background: #C40510;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(227, 6, 19, 0.3);
                }}
                .link.secondary {{
                    background: #6c757d;
                }}
                .link.secondary:hover {{
                    background: #5a6268;
                }}
                .paths {{
                    background: #e3f2fd;
                    padding: 15px;
                    border-radius: 6px;
                    font-family: monospace;
                    font-size: 0.85rem;
                    margin-top: 15px;
                }}
                .footer {{
                    background: #f8f9fa;
                    padding: 20px 40px;
                    border-top: 1px solid #dee2e6;
                    text-align: center;
                    color: #6c757d;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🏗️ Frontend Not Built</h1>
                    <p>Le frontend React n'a pas encore été compilé</p>
                </div>
                
                <div class="content">
                    <div class="warning">
                        <strong>⚠️ Action Requise</strong>
                        <p>Vous devez compiler le frontend React avant de pouvoir utiliser l'application.</p>
                    </div>
                    
                    <div class="checks">
                        <h3 style="margin-bottom: 15px;">État du Système</h3>
                        <ul>{checks_html}</ul>
                    </div>
                    
                    <div class="section">
                        <h2>🚀 Solution Rapide (Recommandée)</h2>
                        <p>Utilisez le script automatique de build :</p>
                        <pre>cd {project_root}
chmod +x build-and-deploy-frontend.sh
./build-and-deploy-frontend.sh</pre>
                    </div>
                    
                    <div class="section">
                        <h2>📦 Build Manuel</h2>
                        <p>Ou compilez manuellement le frontend :</p>
                        <pre>cd {project_root}/frontend
yarn install
yarn build

cd {base_dir}
python manage.py collectstatic --noinput</pre>
                    </div>
                    
                    <div class="section">
                        <h2>🔧 Structure Attendue</h2>
                        <p>Après le build, la structure doit être :</p>
                        <pre>{base_dir}/static/frontend/
├── index.html
└── assets/
    ├── index-[hash].js
    ├── vendor-[hash].js
    ├── ui-[hash].js
    └── index-[hash].css</pre>
                    </div>
                    
                    <div class="paths">
                        <strong>Chemins de Recherche :</strong><br>
                        • STATIC_ROOT: {settings.STATIC_ROOT}<br>
                        • BASE_DIR: {base_dir}<br>
                        • Frontend attendu: {base_dir}/static/frontend/index.html
                    </div>
                    
                    <div class="links">
                        <a href="/api/docs/" class="link">📚 API Documentation</a>
                        <a href="/admin/" class="link secondary">🔧 Django Admin</a>
                        <a href="/api/health/" class="link secondary">💚 Health Check</a>
                    </div>
                </div>
                
                <div class="footer">
                    <p>SGDRA - Système de Gestion Documentaire avec Routage Automatique</p>
                    <p style="margin-top: 5px; font-size: 0.85rem;">Environment: Development</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return HttpResponse(content=html, status=503, content_type='text/html; charset=utf-8')