import os
import json
import logging
import traceback
from datetime import datetime, timedelta, date

from django import forms
from django.db import models
from django.conf import settings
from django.db.models import signals
from django.dispatch import dispatcher
from django.contrib.auth.models import User
from django.contrib.sites.models import Site
from django.core.urlresolvers import reverse
from django.test import TestCase, LiveServerTestCase

from tastypie import fields
from tastypie.bundle import Bundle
from tastypie.utils import trailing_slash
from tastypie.api import NamespacedApi, Api
from tastypie.validation import FormValidation
from tastypie.authorization import DjangoAuthorization, Authorization
from tastypie.authentication import Authentication, SessionAuthentication
from tastypie.resources import Resource, ModelResource, ALL, ALL_WITH_RELATIONS

class Planet(models.Model):
	name = models.CharField(max_length=128)

class Moon(models.Model):
	name = models.CharField(max_length=128)
	planet = models.ForeignKey(Planet)

def create_solar_system():
	mercury = Planet.objects.create(name='Mercury')
	venus = Planet.objects.create(name='Venus')
	earth = Planet.objects.create(name='Earth')
	Moon.objects.create(name='Luna', planet=earth)
	mars = Planet.objects.create(name='Mars')
	jupiter = Planet.objects.create(name='Jupiter')
	saturn = Planet.objects.create(name='Saturn')
	uranus = Planet.objects.create(name='Uranus')
	neptune = Planet.objects.create(name='Neptune')


TEST_API = Api(api_name='test')

class PlanetForm(forms.ModelForm):
	def __init__(self, *args, **kwargs):
		print 'initing'
		return super(PlanetForm, self).__init__(*args, **kwargs)

	def is_valid(self, *args, **kwargs):
		print 'pf', self.data
		return super(PlanetForm, self).is_valid(*args, **kwargs)

	class Meta:
		model = Planet
		fields = ('name', 'id')

class PlanetResource(ModelResource):
	class Meta:
		queryset = Planet.objects.all()
		resource_name = 'space/planet'
		validation = FormValidation(form_class=PlanetForm)
		fields = ['name', 'id']
		allowed_methods = ['get', 'put', 'post', 'delete']
		filtering = { 'name': ALL }
TEST_API.register(PlanetResource())

class MoonResource(ModelResource):
	planet = fields.ForeignKey(PlanetResource, 'planet')
	class Meta:
		queryset = Moon.objects.all()
		resource_name = 'space/moon'
		fields = ['name', 'id', 'planet']
		allowed_methods = ['get', 'put', 'post', 'delete']
		filtering = { 'name': ALL, 'planet': ALL }
TEST_API.register(MoonResource())

class APITest(TestCase):
	def setUp(self):
		self.api_url = reverse('api_test_top_level', kwargs={"api_name":"test"})
		create_solar_system()

	def test_basics(self):
		response_data = self.get_json(self.api_url)
		self.assertTrue(PlanetResource.Meta.resource_name in response_data)
		self.assertTrue(MoonResource.Meta.resource_name in response_data)
		moon_resource_data = response_data[MoonResource.Meta.resource_name]
		moon_data = self.get_json(moon_resource_data['list_endpoint'])
		self.assertTrue(len(moon_data) > 0)

		planet_resource_data = response_data[PlanetResource.Meta.resource_name]
		planet_data = self.get_json(planet_resource_data['list_endpoint'])
		self.assertTrue(len(planet_data) > 0)
		
	def get_json(self, url):
		response = self.client.get(url)
		self.assertEqual(response.status_code, 200, 'Wrong error code %s: %s' % (response.status_code, response.content))
		return json.loads(response.content)

from client_tests import ClientTests