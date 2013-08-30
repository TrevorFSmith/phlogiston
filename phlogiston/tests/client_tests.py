
from django.contrib.auth.models import User
from django.core.urlresolvers import reverse
from django.test.client import Client as WebClient
from django.test import TestCase, LiveServerTestCase

from phlogiston.client import Client as PhlogistonClient
from phlogiston.tests import Planet, Moon, create_solar_system

class ClientTests(LiveServerTestCase):

	def setUp(self):
		create_solar_system()
		self.api_url = '%s%s' % (self.live_server_url, reverse('api_test_top_level', kwargs={"api_name":"test"}))

	def test_models(self):
		client = PhlogistonClient(self.api_url)
		error = client.populate()
		self.assertFalse(error)
		self.assertFalse(hasattr(client, 'get_dinky_doo_list'))
		self.assertFalse(hasattr(client, 'get_space_doo_list'))
		self.assertFalse(hasattr(client, 'get_space_detail'))
		self.assertTrue(hasattr(client, 'get_space_moon_list'))
		self.assertTrue(hasattr(client, 'get_space_moon'))
		self.assertTrue(hasattr(client, 'get_space_planet_list'))
		self.assertTrue(hasattr(client, 'get_space_planet'))

		planets = client.get_space_planet_list()
		self.assertEqual(len(planets), Planet.objects.count())
		moons = client.get_space_moon_list()
		self.assertEqual(len(moons), Moon.objects.count())

		mercury = client.get_space_planet(planets[0]['id'])
		self.assertEqual(mercury['name'], 'Mercury')
		mercury['name'] = 'Tiny Fast Hot One'
		mercury = client.put_space_planet(mercury['id'], data=mercury)
		self.assertEqual(mercury['name'], 'Tiny Fast Hot One')
		mercury = client.get_space_planet(planets[0]['id'])
		self.assertEqual(mercury['name'], 'Tiny Fast Hot One')
