from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("integrations", views.IntegrationViewSet, basename="integration")

urlpatterns = [
    path("", include(router.urls)),
]
