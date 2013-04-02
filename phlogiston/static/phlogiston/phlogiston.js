
var phlogiston = phlogiston || {};

phlogiston.TastyPieSchema = Backbone.Model.extend({
	initialize: function(attributes, options){
		_.bindAll(this);
		this.options = options;
		this.populated = false;
		if(!this.options.url){
			throw 'TastyPieSchema requires you to pass in a "url" option';
		}
	},
	url: function(){  this.options.url; },
	populate: function(){
		for(var name in this.attributes){
			var resourceClassName = phlogiston.javascriptifyResourceName(name);
			phlogiston[resourceClassName] = phlogiston.AbstractTastyPieModel.extend({
				list_endpoint: this.attributes[name].list_endpoint,
			});
			phlogiston[resourceClassName + 'Collection'] = phlogiston.AbstractTastyPieCollection.extend({
				list_endpoint: this.attributes[name].list_endpoint,
				model: phlogiston[resourceClassName],
			});
		}
		this.populated = true;
		this.trigger('populated', this);
	}
});

phlogiston.initialCap = function(str){
	return str.substring(0, 1).toUpperCase() + str.substring(1)
}

phlogiston.javascriptifyResourceName = function(resourceName){
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
		return this.list_endpoint + this.get('id');
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
		this.limit = this.options.limit ? parseInt(this.options.limit) : 50;
		this.offset = this.options.offset ? parseInt(this.options.offset) : 0;
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
				result = result + '&' + name + '=' + this.options.filters[name];
			}
		}
		return result;
	}, 
});
phlogiston.AbstractTastyPieCollection.prototype.sync = phlogiston.apiSync;

phlogiston.parseJsonDate = function(jsonDate){
	var dateString = jsonDate.split('T')[0];
	var dateArray = dateString.split('-');
	var date = new Date(dateArray[1] + ' ' + dateArray[2] + ' ' + dateArray[0]);
	var timeArray = jsonDate.split('T')[1].split(':');
	return new Date(date.getFullYear(), date.getMonth(), date.getDate(), parseInt(timeArray[0], 10), parseInt(timeArray[1], 10), parseInt(timeArray[2], 10));
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
        this.on('change', this.populate);
    },
    url: function(){
    	return this.options.url;
    },
    populate: function(){
        var patterns = this.get('patterns');
        for(var i=0; i < patterns.length; i++){
            phlogiston.urls[phlogiston.cleanPathElement(patterns[i].name)] = phlogiston.createUrlFuction(patterns[i], '/');
        }
        var resolvers = this.get('resolvers');
        for(var i=0; i < resolvers.length; i++){
            var resolver_patterns = {};
            var resolverPrefix = phlogiston.createUrlFuction(resolvers[i], '/')()
            for(var j=0; j < resolvers[i].patterns.length; j++){
                var pattern = resolvers[i].patterns[j];
                resolver_patterns[phlogiston.cleanPathElement(pattern.name)] = phlogiston.createUrlFuction(pattern, resolverPrefix)
            }
            phlogiston.urls[phlogiston.cleanPathElement(resolvers[i].name)] = resolver_patterns;
        }
        this.trigger('populated');
    }
});

/* Copyright 2013 Trevor F. Smith (http://trevor.smith.name/)  Some rights reserved: http://opensource.org/licenses/MIT */