#!/usr/bin/env python
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.documents.models import Document

doc = Document.objects.get(id=199)
print('📄 Document ID 199:', doc.title)
print('📝 Type:', doc.document_type)
if doc.agent:
    print('👤 Agent:', doc.agent.matricule)
    print('  Pôle Agent:', doc.agent.pole.name if doc.agent.pole else 'NONE')
    print('  Filiale Agent:', doc.agent.branch.name if doc.agent.branch else 'NONE')
    print('  Service Agent:', doc.agent.department.name if doc.agent.department else 'NONE')

print()
if doc.folder:
    f = doc.folder
    path = []
    while f:
        path.insert(0, f'{f.name} (ID:{f.id})')
        f = f.parent
    print('📁 Chemin du dossier:')
    print(' → '.join(path))
else:
    print('❌ Pas de folder!')
