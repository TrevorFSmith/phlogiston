'''
A python client for accessing Phlogiston served Tastypie APIs
'''
import json
import urlparse
import requests

class Client(object):
	'''
	A network client for Phlogiston served Tastypie APIs.
	In __init__ it will fetch api_url (which should point to the main API endpoint),
	and then it will parse the API schema and dynamically generate CRUD methods for each resource.
	'''

	def __init__(self, api_url):
		self.api_url = api_url
		self.resources = None

		self.split_url = urlparse.urlsplit(self.api_url)
		self.base_url = '%s://%s' % (self.split_url.scheme, self.split_url.netloc)

	def __getattribute__(self, *args, **kwargs):
		# Check for native attributes
		try:
			return super(Client, self).__getattribute__(*args, **kwargs)
		except AttributeError:
			pass

		# Ok, there are no native attributes, check for Resources which will answer the call
		attribute_name = args[0]
		for resource in self.resources:
			resource_method = resource.get_method_for_attribute_name(attribute_name)
			if resource_method: return resource_method

		raise AttributeError				

	def populate(self):
		'''
		GET the API schema and set up the resulting API methods.
		Returns an error code of 0 is all is well, otherwise the status code of the request
		'''
		api_schema, error = self._get_json(self.api_url)
		if error: return error

		self.resources = []
		for key, data in api_schema.items():
			resource = Resource(name=key, data=data, client=self)
			error = resource._populate()
			if error: return error
			self.resources.append(resource)
		return 0

	def _get_json(self, url):
		'''
		GET the URL, returning the body after JSON deserialization.
		Returns (data, error)
		Error is 0 if all is well or the status_code if it is not.
		'''
		if '://' not in url: url = self.base_url + url
		response = requests.get(url)
		if response.status_code != requests.codes.ok:
			return (None, response.status_code)
		return (json.loads(response.text), 0)

	def _post_json(self, url, data):
		'''
		JSON serialize the data and POST it to the URL.
		Returns (data, error)
		Error is 0 if all is well or the status_code if it is not.
		'''
		print data
		if '://' not in url: url = self.base_url + url
		response = requests.post(url, data=json.dumps(data))
		if response.status_code != requests.codes.ok:
			print response.content
			return (None, response.status_code)
		return (json.loads(response.text), 0)

	def _put_json(self, url, data):
		'''
		JSON serialize the data and PUT it to the URL.
		Returns (data, error)
		Error is 0 if all is well or the status_code if it is not.
		'''
		print data
		if '://' not in url: url = self.base_url + url
		response = requests.put(url, data=json.dumps(data))
		if response.status_code != requests.codes.ok:
			print response.content
			return (None, response.status_code)
		return (json.loads(response.text), 0)

class Resource(object):
	'''A representation of a Tastypie API Resource'''

	HTTP_METHODS = ['get', 'post', 'put', 'delete']
	
	def __init__(self, name, data, client):
		self.name = name
		self.list_endpoint = data['list_endpoint']
		self.schema_endpoint = data['schema']
		self.schema = None
		self.client = client

	def _populate(self):
		schema_data, error = self.client._get_json(self.schema_endpoint)
		if error: return error
		self.schema = ResourceSchema(schema_data)
		# Now populate servicable methods
		self.method_base_name = '_'.join([token for token in self.name.split('/')])
		self.service_methods = {}
		for http_method in self.schema.detail_http_methods:
			self.service_methods['%s_%s' % (http_method, self.method_base_name)] = getattr(self, '%s_detail' % http_method)
		for http_method in self.schema.list_http_methods:
			self.service_methods['%s_%s_list' % (http_method, self.method_base_name)] = getattr(self, '%s_list' % http_method)

	def construct_detail_url(self, path_elements):
		'''
		URL construction is a bit naive, simply appending each arg onto the end of the list endpoint URL, separated by /
		This is usually what you want when you make a call like client.get_app_resource(id)
		'''
		return join_url_path(self.list_endpoint, path_elements)

	def get_list(self):
		'''
		Returns ([resource data, ...], error)
		A 0 error means there was no error, otherwise the error is the HTTP status code.
		'''
		list_data, error = self.client._get_json(self.list_endpoint)
		if error: raise IOError('Bad status %s' % error)
		return list_data['objects']

	def get_detail(self, *args, **kwargs):
		'''
		Fetches an individual resource's data.  Returns (data, error)
		A 0 error means there was no error, otherwise the error is the HTTP status code.
		'''
		data, error = self.client._get_json(self.construct_detail_url(args))
		if error: raise IOError('Bad status %s at %s' % (error, self.construct_detail_url(args)))
		return data

	def post_detail(self, post_data):
		'''
		Create a new resource by POSTing data to the resource list
		'''
		data, error = self.client._post_json(self.list_endpoint, post_data)
		if error: raise IOError('Bad status %s at %s' % (error, self.construct_detail_url(args)))
		return data
		
	def put_detail(self, *args, **kwargs):
		'''
		Update an existing resource by PUTting data to the resource URL
		'''
		post_data = kwargs.get('data', None)
		data, error = self.client._put_json(self.construct_detail_url(args), post_data)
		if error: raise IOError('Bad status %s at %s' % (error, self.construct_detail_url(args)))
		return data
		
	def delete_detail(self, *args, **kwargs): pass

	def post_list(self, data): raise NotImplementedError

	def put_list(self, data): raise NotImplementedError

	def delete_list(self, data): raise NotImplementedError

	def get_method_for_attribute_name(self, attribute_name):
		'''
		For an attribute name like get_apiname_resourcename_list,
		return either the method which will service it or None if
		this Resource will not service it.
		'''
		return self.service_methods.get(attribute_name, None)

	def __str__(self): return self.name

def join_url_path(root, path_elements):
	if root.endswith('/'): root = root[:-1]
	tokens = [root]
	for element in list(path_elements):
		tokens.append(str(element))
	results = '/'.join(tokens)
	if not results.endswith('/'): results += '/'
	return results

class ResourceSchema(object):
	def __init__(self, schema_data):
		self.schema_data = schema_data

	@property
	def detail_http_methods(self):
		return self.schema_data['allowed_detail_http_methods']

	@property
	def list_http_methods(self):
		return self.schema_data['allowed_list_http_methods']