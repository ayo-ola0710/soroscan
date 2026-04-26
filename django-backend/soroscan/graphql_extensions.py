import functools
import inspect
import logging
import time
import traceback
from typing import Any, Callable, Dict, Optional

from strawberry.extensions import SchemaExtension
from strawberry.types import Info

logger = logging.getLogger("soroscan.graphql")

# Sensitive keys to mask in logs
SENSITIVE_KEYS = {"password", "secret", "token", "key", "authorization", "api_key"}


def sanitize_arguments(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Mask sensitive information in arguments recursively.
    """
    if not isinstance(args, dict):
        return args

    sanitized = {}
    for k, v in args.items():
        if any(sk in k.lower() for sk in SENSITIVE_KEYS):
            sanitized[k] = "********"
        elif isinstance(v, dict):
            sanitized[k] = sanitize_arguments(v)
        elif isinstance(v, list):
            sanitized[k] = [
                sanitize_arguments(item) if isinstance(item, dict) else item
                for item in v
            ]
        else:
            sanitized[k] = v
    return sanitized


def log_graphql_resolver(func: Callable) -> Callable:
    """
    Decorator to log a GraphQL resolver's execution.
    Can be used directly on resolver functions or via SchemaExtension.
    """

    @functools.wraps(func)
    def wrapper(root: Any, info: Info, *args: Any, **kwargs: Any) -> Any:
        query_name = info.field_name
        start_time = time.perf_counter()

        # Sanitize arguments before logging
        sanitized_kwargs = sanitize_arguments(kwargs)

        logger.info(
            f"GraphQL resolver started: {query_name}",
            extra={
                "query_name": query_name,
                "arguments": sanitized_kwargs,
            },
        )

        def _log_completion(status: str, error: Optional[Exception] = None):
            duration_ms = (time.perf_counter() - start_time) * 1000
            extra = {
                "query_name": query_name,
                "arguments": sanitized_kwargs,
                "duration_ms": round(duration_ms, 2),
                "status": status,
            }

            if error:
                extra["error"] = str(error)
                extra["stack_trace"] = traceback.format_exc()
                logger.error(
                    f"GraphQL resolver failed: {query_name} in {duration_ms:.2f}ms",
                    extra=extra,
                )
            else:
                logger.info(
                    f"GraphQL resolver completed: {query_name} in {duration_ms:.2f}ms",
                    extra=extra,
                )

        try:
            result = func(root, info, *args, **kwargs)

            # Handle async generators (Subscriptions)
            if inspect.isasyncgen(result):

                async def wrap_asyncgen(gen):
                    try:
                        async for item in gen:
                            yield item
                        _log_completion("Success")
                    except Exception as e:
                        _log_completion("Error", e)
                        raise e

                return wrap_asyncgen(result)

            # Handle async resolvers
            if inspect.isawaitable(result):

                async def wrap_awaitable(awaitable):
                    try:
                        res = await awaitable
                        _log_completion("Success")
                        return res
                    except Exception as e:
                        _log_completion("Error", e)
                        raise e

                return wrap_awaitable(result)

            _log_completion("Success")
            return result
        except Exception as e:
            _log_completion("Error", e)
            raise e

    return wrapper


class GraphQLResolverLoggingExtension(SchemaExtension):
    """
    Strawberry extension to log all GraphQL resolver calls.

    Logs query start, completion/duration, arguments (sanitized), and full stack traces for errors.
    By default, only logs top-level Query, Mutation, and Subscription fields.
    """

    def resolve(
        self,
        _next: Callable,
        root: Any,
        info: Info,
        *args: Any,
        **kwargs: Any,
    ) -> Any:
        # Only log top-level Query and Mutation resolvers.
        # Subscriptions are handled via manual decorators because Strawberry extensions
        # often bypass resolve() for subscription generators.
        if info.parent_type.name not in ("Query", "Mutation"):
            return _next(root, info, *args, **kwargs)

        # Use the shared logging wrapper
        return log_graphql_resolver(_next)(root, info, *args, **kwargs)
