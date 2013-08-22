
var phlogiston = phlogiston || {};
phlogiston.events = phlogiston.events || {};

phlogiston.events.fetchComplete = 'fetch-complete';
phlogiston.events.fetchSuccess = 'fetch-success';
phlogiston.events.fetchError = 'fetch-error';

phlogiston.Fetcher = function(options){
	/*
	Create like so: new phlogiston.Fetcher({options}, ModelOrCollection, ModelOrCollection, ...)
	Fetches all of the Models or Collections and waits until they're all finished and triggers a fetchComplete on itself
	*/
	this.fetchables = []; // A 2D array of [Model/Collection, isFetched]
	for(var i=1; i < arguments.length; i++){
		var info = this.fetchables[i-1] = [arguments[i], false];
		arguments[i].once('sync', _.bind(function(){
			this[1] = true;
		}, info));
		arguments[i].once('sync', _.bind(function(){
			if(this.completed()) this.trigger(phlogiston.events.fetchComplete, this);
		}, this));
	}
    this.initialize.apply(this, arguments);
};
_.extend(phlogiston.Fetcher.prototype, Backbone.Events, {
	initialize: function(){ /* override as needed */},
	fetch: function(){
		for(var i=0; i < this.fetchables.length; i++){
			this.fetchables[i][0].fetch();
		}
	},
	completed: function(){
		for(var i=0; i < this.fetchables.length; i++){
			if(this.fetchables[i][1] == false) return false;
		}
		return true;
	}
});

phlogiston.TastyPieSchema = Backbone.Model.extend({
	initialize: function(attributes, options){
		_.bindAll(this);
		this.options = options;
		this.api = {}; // This is where we will put the Backbone Models and Collections populated from the tasty pie schema
		this.populated = false;
		if(!this.options.url){
			throw 'TastyPieSchema requires you to pass in a "url" option';
		}
		this.on('sync', this.populate);
	},
	url: function(){  this.options.url; },
	populate: function(){
		for(var name in this.attributes){
			var namespaceMap = this.api;
			var namespaces = phlogiston.parseResourceNameSpaces(name);
			for(var i=0; i < namespaces.length; i++){
				namespaceMap[namespaces[i]] = namespaceMap[namespaces[i]] || {};
				namespaceMap = namespaceMap[namespaces[i]];
			}

			var resourceClassName = phlogiston.javascriptifyResourceName(name);
			namespaceMap[resourceClassName] = phlogiston.AbstractTastyPieModel.extend({
				list_endpoint: this.attributes[name].list_endpoint,
			});
			namespaceMap[resourceClassName + 'Collection'] = phlogiston.AbstractTastyPieCollection.extend({
				list_endpoint: this.attributes[name].list_endpoint,
				model: namespaceMap[resourceClassName],
			});
		}
		this.populated = true;
		this.trigger('populated', this);
	}
});

phlogiston.initialCap = function(str){
	return str.substring(0, 1).toUpperCase() + str.substring(1)
}
phlogiston.parseResourceNameSpaces = function(resourceName){
	/*
	Given a name like 'banana/monkey/typewriter-ribbon' return an array of ['banana', 'monkey']
	*/
	if(resourceName.indexOf('/') == -1) return [];
	var tokens = resourceName.split('/');
	tokens.pop();
	return tokens;
}
phlogiston.javascriptifyResourceName = function(resourceName){
	if(resourceName.indexOf('/') != -1){
		resourceName = resourceName.split('/').pop();
	}

	var result = phlogiston.initialCap(resourceName);
	while(result.indexOf('-') != -1){
		var index = result.indexOf('-');
		result = result.substring(0, index) + phlogiston.initialCap(result.substring(index + 1));
	}
	return result;
}

phlogiston.hostNameFromURL = function(url){
	var splitURL = url.split('/');
	return splitURL[2];
}

phlogiston.getCookie = function(name) {
	var cookieValue = null;
	if (document.cookie && document.cookie != '') {
		var cookies = document.cookie.split(';');
		for (var i = 0; i < cookies.length; i++) {
			var cookie = jQuery.trim(cookies[i]);
			// Does this cookie string begin with the name we want?
			if (cookie.substring(0, name.length + 1) == (name + '=')) {
				cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
				break;
			}
		}
	}
	return cookieValue;
}

phlogiston.apiSync = function(method, model, options){
	var new_options =  _.extend({
		beforeSend: function(xhr) {
			xhr.setRequestHeader("X-CSRFToken", phlogiston.getCookie('csrftoken'));
		}
	}, options);
	Backbone.sync(method, model, new_options);
}

phlogiston.AbstractTastyPieModel = Backbone.Model.extend({
	url: function(){
		if(typeof this.get('id') == 'undefined') return this.list_endpoint;
		return this.list_endpoint + this.get('id') + '/';
	},

	schemaUrl: function(){
		return this.list_endpoint + 'schema';
	},
});
phlogiston.AbstractTastyPieModel.prototype.sync = phlogiston.apiSync;

phlogiston.AbstractTastyPieCollection = Backbone.Collection.extend({
	initialize: function(models, options){
		_.bindAll(this, 'url', 'pageUp', 'pageDown', 'page');
		this.options = options || {};
		this.limit = typeof this.options.limit != 'undefined' ? parseInt(this.options.limit) : 50;
		this.offset = typeof this.options.offset != 'undefined' ? parseInt(this.options.offset) : 0;
	},
	pageUp: function(){ this.page(-1); },
	pageDown: function(){ this.page(1); },
	page: function(delta){
		this.offset = this.offset + (delta * this.limit);
		if(this.offset < 0) this.offset = 0;
		this.fetch();
	},
	url: function(){
		result = this.list_endpoint + '?';
		result = result + 'limit=' + this.limit;
		if(this.offset > 0){
			result = result + '&offset=' + this.offset;
		}
		if(this.options.filters){
			for(var name in this.options.filters){
				result = result + '&' + encodeURIComponent(name) + '=' + encodeURIComponent(this.options.filters[name]);
			}
		}
		return result;
	}, 
});
phlogiston.AbstractTastyPieCollection.prototype.sync = phlogiston.apiSync;

phlogiston.parseJsonDate = function(jsonDate){
	// parse a datetime string like 2013-08-16T20:11:05
	var dateString = jsonDate.split('T')[0];
	var dateArray = dateString.split('-');
	var date = new Date(dateArray[1] + ' ' + dateArray[2] + ' ' + dateArray[0]);
	var timeArray = jsonDate.split('T')[1].split(':');
	return new Date(date.getFullYear(), date.getMonth(), date.getDate(), parseInt(timeArray[0], 10), parseInt(timeArray[1], 10), parseInt(timeArray[2], 10));
}

phlogiston.padString = function(val, len, padding){
	if(!val) val = '';
	val = val + '';
	if(!padding) padding = ' ';
	while(val.length < len){
		val = padding + val;
	}
	return val;
}

phlogiston.formatJsonDate = function(date){
	// return a datetime string like 2013-08-16T20:11:05
	var dateString = date.getFullYear() + '-' + phlogiston.padString(date.getMonth() + 1, 2, '0') + '-' + phlogiston.padString(date.getDate(), 2, '0');
	return dateString + 'T' + phlogiston.padString(date.getHours(), 2, '0') + ':' + phlogiston.padString(date.getMinutes(), 2, '0') + ':' + phlogiston.padString(date.getSeconds(), 2, '0');
}

phlogiston.formatDate = function(jsDate){
	return phlogiston.MONTH_STRINGS[jsDate.getMonth()] + ' ' + jsDate.getDate() + ', ' + jsDate.getFullYear();
}

phlogiston.MONTH_STRINGS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']


phlogiston.urls = {};

phlogiston.createUrlFuction = function(patternInfo, prefix){
    return function(){
        if(arguments.length != patternInfo.groups.length){
            throw "Expected arguments: (" + patternInfo.groups.join(',') + ")";
        }
        for(var i=0; i < arguments.length; i++){
            if(typeof arguments[i] == 'undefined'){
                console.log('Undefined arguments', arguments);
                throw 'Passed an undefined argument: ' + arguments;
            }
        }
        var tokens = phlogiston.splitRegex(patternInfo.regex);
        var url = '';
        var groupIndex = 0;
        for(var i=0; i < tokens.length; i++){
            if(tokens[i] == null){ // it's a group, add from args 
                url += arguments[groupIndex];
                groupIndex++;
            } else { // it's a token, add it to the URL
                url += tokens[i];
            }
        }
        if(!prefix) prefix = ''
        return prefix + url;
    }
};

phlogiston.splitRegex = function(regex){
    /*
    Takes a regex string like '^views/(?P<view>[^/]+)/$' and returns an array of elements like ["views/", null, "/"]
    */
    if(regex.charAt(0) == '^') regex = regex.slice(1);
    if(regex.charAt(regex.length - 1) == '$') regex = regex.slice(0, regex.length - 1);
    results = []
    line = ''
    for(var i =0; i < regex.length; i++){
        var c = regex.charAt(i);
        if(c == '('){
            results[results.length] = line;
            results[results.length] = null;
            line = '';
        } else if(c == ')'){
            line = '';
        } else {
            line = line + c;
        }
    }
    if(line.length > 0) results[results.length] = line
    return results
}

phlogiston.cleanPathElement = function(element){
    return element.replace('-', '_');
}

phlogiston.UrlLoader = Backbone.Model.extend({
    /*
    This object reads the URL resource from the server and populates phlogiston.urls with functions which return URLs.
    */
    initialize: function(attributes, options){
    	this.options = options;
    	if(!this.options.url) throw 'UrlLoader requires a "url" option'

    	this.urls = {}; // This is where we will put the URL functions derived from the URL JSON.

        this.on('change', this.populate);
    },
    url: function(){
    	return this.options.url;
    },
    populate: function(){
        var patterns = this.get('patterns');
        for(var i=0; i < patterns.length; i++){
            this.urls[phlogiston.cleanPathElement(patterns[i].name)] = phlogiston.createUrlFuction(patterns[i], '/');
        }
        var resolvers = this.get('resolvers');
        for(var i=0; i < resolvers.length; i++){
            var resolver_patterns = {};
            var resolverPrefix = phlogiston.createUrlFuction(resolvers[i], '/')()
            for(var j=0; j < resolvers[i].patterns.length; j++){
                var pattern = resolvers[i].patterns[j];
                resolver_patterns[phlogiston.cleanPathElement(pattern.name)] = phlogiston.createUrlFuction(pattern, resolverPrefix)
            }
            this.urls[phlogiston.cleanPathElement(resolvers[i].name)] = resolver_patterns;
        }
        this.trigger('populated');
    }
});

/* Copyright 2013 Trevor F. Smith (http://trevor.smith.name/)  Some rights reserved: http://opensource.org/licenses/MIT */