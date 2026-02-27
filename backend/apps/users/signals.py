"""
✅ LEGACY SIGNALS REMOVED

Previously this module contained signals for automatically creating folders
when Branch and Department models were created.

Now that we've converged to a unified Folder hierarchy, these signals are no longer needed.
The Folder model is now the single source of truth for the organizational hierarchy:

- Pole (Level 0)
- Filiale/Branch (Level 1)
- Service/Department (Level 2)
- Sub-service (Level 3+)

Signals for Folder creation/updates can be added here if needed in the future.
"""

# Signals for Branch and Department have been removed as these models are now legacy.
# All organizational hierarchy is managed through the Folder model.
