from dynamicresponse.json_response import JsonResponse

from django.views.decorators.cache import cache_control

from url_resource import generate_url_resource

@cache_control(public=True,max_age=10000)
def urls(request):
	resource = generate_url_resource()
	return JsonResponse(resource)

# Copyright 2013 Trevor F. Smith (http://trevor.smith.name/)  Some rights reserved: http://opensource.org/licenses/MIT 