"""
Centralized logging utilities for SGDRA backend.
All modules should use these helpers instead of print() or basic logging.
"""

import logging


# Get loggers for different contexts
def get_logger(name: str) -> logging.Logger:
    """Get a logger instance for the given name."""
    return logging.getLogger(name)


# Pre-configured loggers for different parts of the system
logger = logging.getLogger("apps")  # General app logger
documents_logger = logging.getLogger("apps.documents")  # Documents operations
users_logger = logging.getLogger("apps.users")  # User operations
auth_logger = logging.getLogger("apps.users.auth")  # Auth operations
notifications_logger = logging.getLogger("apps.notifications")  # Notifications
routing_logger = logging.getLogger("apps.routing_rules")  # Routing operations
audit_logger = logging.getLogger("apps.audit")  # Audit trail


def log_info(message: str, logger_instance=None, **kwargs):
    """Log info message with optional extra context."""
    lg = logger_instance or logger
    lg.info(message, extra={"context": kwargs} if kwargs else None)


def log_error(message: str, exception=None, logger_instance=None, **kwargs):
    """Log error with exception traceback."""
    lg = logger_instance or logger
    if exception:
        lg.error(
            message,
            exc_info=True,
            extra={"context": kwargs, "exception": str(exception)}
            if kwargs
            else {"exception": str(exception)},
        )
    else:
        lg.error(message, extra={"context": kwargs} if kwargs else None)


def log_warning(message: str, logger_instance=None, **kwargs):
    """Log warning message."""
    lg = logger_instance or logger
    lg.warning(message, extra={"context": kwargs} if kwargs else None)


def log_debug(message: str, logger_instance=None, **kwargs):
    """Log debug message (only shown in DEBUG=True)."""
    lg = logger_instance or logger
    lg.debug(message, extra={"context": kwargs} if kwargs else None)


def log_audit(
    action: str,
    user_id=None,
    resource_type=None,
    resource_id=None,
    changes=None,
    **kwargs,
):
    """Log audit event with structured data."""
    audit_data = {
        "action": action,
        "user_id": user_id,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "changes": changes,
        **kwargs,
    }
    audit_logger.info(f"AUDIT: {action}", extra={"audit": audit_data})


def log_database_operation(
    operation: str, model_name: str, count=None, duration_ms=None
):
    """Log database operations."""
    msg = f"DB {operation}: {model_name}"
    if count is not None:
        msg += f" (count={count})"
    if duration_ms is not None:
        msg += f" ({duration_ms}ms)"
    logger.debug(msg)


def log_api_request(
    method: str, path: str, user_id=None, status_code=None, duration_ms=None
):
    """Log API request."""
    msg = f"API {method} {path}"
    if user_id:
        msg += f" (user={user_id})"
    if status_code:
        msg += f" [{status_code}]"
    if duration_ms:
        msg += f" ({duration_ms}ms)"
    logger.info(msg)


def log_task_execution(task_name: str, status: str, duration_ms=None, error=None):
    """Log celery task execution."""
    msg = f"TASK {task_name}: {status}"
    if duration_ms:
        msg += f" ({duration_ms}ms)"
    if error:
        log_error(msg, exception=error, logger_instance=logger)
    else:
        logger.info(msg)


def log_external_call(
    service_name: str, endpoint: str, status_code=None, duration_ms=None, error=None
):
    """Log calls to external services."""
    msg = f"EXTERNAL {service_name} {endpoint}"
    if status_code:
        msg += f" [{status_code}]"
    if duration_ms:
        msg += f" ({duration_ms}ms)"
    if error:
        log_error(msg, exception=error, logger_instance=logger)
    else:
        logger.info(msg)
