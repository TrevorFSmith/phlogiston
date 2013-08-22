import os
from setuptools import setup

README = open(os.path.join(os.path.dirname(__file__), 'README.md')).read()

# allow setup.py to be run from any path
os.chdir(os.path.normpath(os.path.join(os.path.abspath(__file__), os.pardir)))

setup(
	name = 'phlogiston',
	version = '0.1',
	packages = ['phlogiston'],
	install_requires='requests',
	include_package_data = True,
	license = 'MIT License', # example license
	description = 'A Django app which maps Tasty Pie APIs to Backbone.js Models and Collections',
	long_description = README,
	url = 'https://github.com/TrevorFSmith/phlogiston',
	author = 'Trevor F. Smith',
	author_email = 'trevor@trevor.smith.name',
	classifiers = [
		'Environment :: Web Environment',
		'Framework :: Django',
		'Intended Audience :: Developers',
		'License :: OSI Approved :: MIT License',
		'Operating System :: OS Independent',
		'Programming Language :: Python',
		'Programming Language :: Python :: 2.6',
		'Programming Language :: Python :: 2.7',
		'Topic :: Internet :: WWW/HTTP',
		'Topic :: Internet :: WWW/HTTP :: Dynamic Content',
	],
)