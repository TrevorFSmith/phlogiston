# Phlogiston

NOTE: The Django world has moved mostly to [Django REST Framework](http://www.django-rest-framework.org/) instead of Tasty Pie so you should probably use that instead of this code.

A [Django](https://www.djangoproject.com/) app which maps [Tasty Pie](http://tastypieapi.org/) APIs to [Backbone.js](http://backbonejs.org/) Models and Collections

Quick start
-----------

1. Add "phlogiston" to your INSTALLED_APPS setting like this:

	INSTALLED_APPS = (
		...
		'phlogiston',
	)

2. Include the phlogiston URLconf in your project urls.py like this:

	url(r'^phlogiston/', include('phlogiston.urls')),
