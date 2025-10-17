from django.http import JsonResponse
from django.shortcuts import render
from django.template.exceptions import TemplateDoesNotExist
from rest_framework import status


def index(request):
    try:
        return render(request, "index.html")
    except TemplateDoesNotExist:
        return render(request, "core/index-placeholder.html", status=status.HTTP_404_NOT_FOUND)


def health_check(request):
    """Health check endpoint for load balancer"""
    return JsonResponse({"status": "healthy", "service": "tn-agent-launcher"})
