import os
import re
import importlib

from django.conf import settings
from django.core.urlresolvers import reverse
from django.core.urlresolvers import RegexURLPattern, RegexURLResolver

def generate_url_resource():
	root_urlconf = importlib.import_module(settings.ROOT_URLCONF)
	result = {
		'patterns':[], 
		'resolvers':[]
	}
	for item in root_urlconf.urlpatterns:
		if item.__class__ == RegexURLResolver:
			result['resolvers'].append(flatten_url_resolver(item))
		elif item.__class__ == RegexURLPattern:
			result['patterns'].append(flatten_url_pattern(item))
		else:
			print 'Unknown', item
	return result

def flatten_url_resolver(resolver):
	if hasattr(resolver, 'app_name') and resolver.app_name:
		name = resolver.app_name
	else:
		name = clean_regex(resolver.regex)
	result = {
		'name':name,
		'regex':resolver.regex.pattern,
		'groups':regex_groups(resolver.regex),
		'patterns':[flatten_url_pattern(pattern) for pattern in resolver.url_patterns]
	}
	return result

def flatten_url_pattern(url_pattern):
	if hasattr(url_pattern, 'name') and url_pattern.name:
		name = url_pattern.name
	else:
		name = clean_regex(url_pattern.regex)
	groups = regex_groups(url_pattern.regex)
	return {
		'regex':url_pattern.regex.pattern,
		'groups':groups,
		'name':name
	}

def clean_regex(regex):
	if regex.pattern == '^': return 'index'
	result = regex.pattern
	groups = regex_groups(regex)
	if len(groups) > 0:
		tokens = re.split('[\|(\)]', result)
		result = ''
		group_index = 0
		for token in tokens:
			if token.startswith('?'):
				result += groups[group_index]
				group_index += 1
			else:
				result += token

	result = result.replace('/', '_').replace('^', '').replace('$', '')
	if result.endswith('_'): result = result[:-1]
	if not result: return 'index'
	return result

def regex_groups(regex):
	return [item[0] for item in sorted(regex.groupindex.items(), key=lambda item: item[1])]

# Copyright 2013 Trevor F. Smith (http://trevor.smith.name/)  Some rights reserved: http://opensource.org/licenses/MIT 