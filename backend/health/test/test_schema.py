from django.test import SimpleTestCase


class ApiSchemaTests(SimpleTestCase):
    def test_the_schema_lists_the_health_endpoint(self):
        response = self.client.get("/api/schema/")

        self.assertEqual(response.status_code, 200)
        self.assertIn("/api/health/", response.content.decode())

    def test_swagger_ui_is_available(self):
        response = self.client.get("/api/schema/swagger-ui/")

        self.assertEqual(response.status_code, 200)
        self.assertIn("swagger", response.content.decode().lower())
