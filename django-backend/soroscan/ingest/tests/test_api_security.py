from django.test import TestCase, Client, override_settings
from django.urls import reverse
from django.contrib.auth import get_user_model
import json

User = get_user_model()

class ApiSecurityTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username='testuser', password='password')

    @override_settings(MAX_REQUEST_BODY_SIZE=100)
    def test_request_size_limit(self):
        """Verify that requests exceeding the limit return 413."""
        url = reverse("record-event")
        large_data = json.dumps({"contract_id": "x" * 150})
        
        self.client.force_login(self.user)
        
        response = self.client.post(
            url, 
            data=large_data, 
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 413)
        self.assertEqual(response.json().get("error"), "Payload Too Large")

    @override_settings(DEPRECATED_ENDPOINTS={"api/ingest/audit-trail": {"sunset": "2026-12-31", "replacement": "/graphql/"}})
    def test_deprecation_headers(self):
        """Verify that deprecated endpoints include correct headers."""
        self.client.force_login(self.user)
        url = reverse("audit-trail")
        response = self.client.get(url)
        
        self.assertEqual(response.headers.get("Deprecation"), "true")
        self.assertEqual(response.headers.get("Sunset"), "2026-12-31")
        self.assertIn('rel="replacement"', response.headers.get("Link", ""))