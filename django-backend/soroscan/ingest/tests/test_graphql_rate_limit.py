import pytest
from unittest.mock import patch, MagicMock
from soroscan.ingest.schema import schema

@pytest.mark.django_db
class TestGraphQLRateLimit:
    @patch("soroscan.graphql_extensions.cache")
    def test_rate_limit_not_exceeded(self, mock_cache):
        # Mock cache to return 0 first, then 1
        mock_cache.get.side_effect = [0, 1]
        # First call to add returns True (new key), second returns False (existing key)
        mock_cache.add.side_effect = [True, False]
        
        query = "{ contracts { id } }"
        # We need a context with a request mock
        request = MagicMock()
        request.META = {"REMOTE_ADDR": "127.0.0.1"}
        context = {"request": request}
        
        # First request should succeed
        with patch("soroscan.graphql_extensions.settings") as mock_settings:
            mock_settings.RATE_LIMIT_GRAPHQL = "2/minute"
            result = schema.execute_sync(query, context_value=context)
            assert result.errors is None
            # cache.add should be called for the first request
            mock_cache.add.assert_called_with("gql_ratelimit:127.0.0.1", 1, timeout=60)
        
        # Second request should succeed
        with patch("soroscan.graphql_extensions.settings") as mock_settings:
            mock_settings.RATE_LIMIT_GRAPHQL = "2/minute"
            result = schema.execute_sync(query, context_value=context)
            assert result.errors is None
            # cache.incr should be called for subsequent requests
            mock_cache.incr.assert_called_with("gql_ratelimit:127.0.0.1")

    @patch("soroscan.graphql_extensions.cache")
    def test_rate_limit_exceeded(self, mock_cache):
        # Mock cache to return 5 (limit reached)
        mock_cache.get.return_value = 5
        
        query = "{ contracts { id } }"
        request = MagicMock()
        request.META = {"REMOTE_ADDR": "192.168.1.1"}
        context = {"request": request}
        
        # Request should fail
        with patch("soroscan.graphql_extensions.settings") as mock_settings:
            mock_settings.RATE_LIMIT_GRAPHQL = "5/minute"
            result = schema.execute_sync(query, context_value=context)
            
            assert result.errors is not None
            assert "Rate limit exceeded" in result.errors[0].message
            
            # Ensure count wasn't incremented
            assert mock_cache.add.call_count == 0
            assert mock_cache.incr.call_count == 0

    @patch("soroscan.graphql_extensions.cache")
    def test_rate_limit_different_ips(self, mock_cache):
        # IP1 has reached limit, IP2 hasn't
        def mock_get(key, default=None):
            if "1.1.1.1" in key:
                return 10
            return 0
        
        mock_cache.get.side_effect = mock_get
        mock_cache.add.return_value = True
        
        query = "{ contracts { id } }"
        
        with patch("soroscan.graphql_extensions.settings") as mock_settings:
            mock_settings.RATE_LIMIT_GRAPHQL = "10/minute"
            
            # IP1 fails
            req1 = MagicMock()
            req1.META = {"REMOTE_ADDR": "1.1.1.1"}
            result1 = schema.execute_sync(query, context_value={"request": req1})
            assert result1.errors is not None
            assert "Rate limit exceeded" in result1.errors[0].message
            
            # IP2 succeeds
            req2 = MagicMock()
            req2.META = {"REMOTE_ADDR": "2.2.2.2"}
            result2 = schema.execute_sync(query, context_value={"request": req2})
            assert result2.errors is None

    @patch("soroscan.graphql_extensions.cache")
    def test_invalid_rate_setting_fails_safe(self, mock_cache):
        # If settings are malformed, it should just skip rate limiting (fail-safe)
        query = "{ contracts { id } }"
        request = MagicMock()
        request.META = {"REMOTE_ADDR": "127.0.0.1"}
        context = {"request": request}
        
        with patch("soroscan.graphql_extensions.settings") as mock_settings:
            mock_settings.RATE_LIMIT_GRAPHQL = "invalid-rate"
            result = schema.execute_sync(query, context_value=context)
            
            assert result.errors is None
            assert mock_cache.get.call_count == 0
