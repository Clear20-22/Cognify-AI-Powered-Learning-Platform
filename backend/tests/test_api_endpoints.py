"""
Integration tests for FastAPI endpoints using TestClient.
"""

def test_root_endpoint(test_client):
    response = test_client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Cognify AI Learning Platform"
    assert data["status"] == "active"


def test_health_check_endpoint(test_client):
    response = test_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "ai_service" in data
    assert "database" in data
    assert "X-Process-Time" in response.headers
    assert "X-Request-ID" in response.headers
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["X-XSS-Protection"] == "1; mode=block"
