"""
Log context for structured logging: request_id (HTTP) and task_id (Celery).
Ingest code should pass contract_id, ledger_sequence in logger extra=.
"""
import logging
from contextvars import ContextVar

# Correlation ID for the current request or Celery task (no PII).
log_context_var: ContextVar[dict] = ContextVar("log_context", default={})


def set_request_id(request_id: str) -> None:
    """Set request_id in context (e.g. from middleware)."""
    ctx = dict(log_context_var.get())
    ctx["request_id"] = request_id
    log_context_var.set(ctx)


def set_task_id(task_id: str) -> None:
    """Set task_id in context (e.g. from Celery task)."""
    ctx = dict(log_context_var.get())
    ctx["task_id"] = task_id
    log_context_var.set(ctx)


def get_log_extra() -> dict:
    """Return current context for logger extra= (no PII)."""
    ctx = log_context_var.get()
    return dict(ctx) if ctx else {}


class LogContextFilter(logging.Filter):
    """Add request_id and task_id from context to each LogRecord."""

    def filter(self, record: logging.LogRecord) -> bool:
        if not hasattr(record, "request_id"):
            record.request_id = ""
        if not hasattr(record, "task_id"):
            record.task_id = ""
            
        ctx = log_context_var.get()
        if ctx:
            for key, value in ctx.items():
                if value is not None:
                    setattr(record, key, value)
        return True
