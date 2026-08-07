from django.conf import settings


class APIVersionMiddleware:
    """Advertise the v1 successor on unversioned compatibility routes."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        path = request.path
        if path.startswith('/api/') and not path.startswith('/api/v1/'):
            successor = f"/api/v1/{path[len('/api/') :]}"
            response['Deprecation'] = 'true'
            response['Sunset'] = settings.API_V1_SUNSET
            response['Link'] = f'<{successor}>; rel="successor-version"'
        return response
