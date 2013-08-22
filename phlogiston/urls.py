from django.conf.urls import patterns, include, url

import phlogiston

urlpatterns = patterns('',
	(r'^url/$', 'phlogiston.views.urls'),
)

if phlogiston.IS_TEST:
	from phlogiston.tests import TEST_API
	urlpatterns += patterns('',
		url(r'^test-api/', include(TEST_API.urls)),
	)

# Copyright 2013 Trevor F. Smith (http://trevor.smith.name/)  Some rights reserved: http://opensource.org/licenses/MIT 