import json
import uuid
import pytest
from django.test import RequestFactory
from django.http import HttpResponse, JsonResponse
from soroscan.middleware import RequestIdMiddleware
from soroscan.log_context import get_log_extra

@pytest.fixture
def rf():
    return RequestFactory()

def test_request_id_middleware_generates_uuid_if_missing(rf):
    request = rf.get("/")
    def get_response(req):
        return HttpResponse("OK")
    
    middleware = RequestIdMiddleware(get_response)
    response = middleware(request)
    
    assert hasattr(request, "request_id")
    assert request.request_id is not None
    assert response["X-Request-ID"] == request.request_id
    assert get_log_extra().get("request_id") == request.request_id

def test_request_id_middleware_uses_provided_header(rf):
    test_id = str(uuid.uuid4())
    request = rf.get("/", HTTP_X_REQUEST_ID=test_id)
    def get_response(req):
        return HttpResponse("OK")
    
    middleware = RequestIdMiddleware(get_response)
    response = middleware(request)
    
    assert request.request_id == test_id
    assert response["X-Request-ID"] == test_id
    assert get_log_extra().get("request_id") == test_id

def test_request_id_middleware_injects_into_error_response(rf):
    request = rf.get("/")
    def get_response(req):
        return JsonResponse({"error": "Not found"}, status=404)
        
    middleware = RequestIdMiddleware(get_response)
    response = middleware(request)
    
    data = json.loads(response.content)
    assert response.status_code == 404
    assert "request_id" in data
    assert data["request_id"] == request.request_id
    
def test_request_id_middleware_ignores_non_json_error_responses(rf):
    request = rf.get("/")
    def get_response(req):
        return HttpResponse("Error!", status=500)
    
    middleware = RequestIdMiddleware(get_response)
    response = middleware(request)
    
    assert response.content == b"Error!"
    assert response["X-Request-ID"] == request.request_id
