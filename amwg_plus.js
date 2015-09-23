////////// Helper Functions //////////

// Returns a random number between min and max;
var runif = function(min, max) {
  return Math.random() * (max - min) + min;
};

// Returns a random integer between min and max
var runif_discrete = function(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

var json_clone = function(object) {
  return JSON.parse(JSON.stringify(object));
};

// Clones an object. From http://davidwalsh.name/javascript-clone
// Should probably use https://github.com/pvorb/node-clone instead...
var deep_clone = function(src) {
	function mixin(dest, source, copyFunc) {
		var name, s, i, empty = {};
		for(name in source){
			// the (!(name in empty) || empty[name] !== s) condition avoids copying properties in "source"
			// inherited from Object.prototype.	 For example, if dest has a custom toString() method,
			// don't overwrite it with the toString() method that source inherited from Object.prototype
			s = source[name];
			if(!(name in dest) || (dest[name] !== s && (!(name in empty) || empty[name] !== s))){
				dest[name] = copyFunc ? copyFunc(s) : s;
			}
		}
		return dest;
	}
	if(!src || typeof src != "object" || Object.prototype.toString.call(src) === "[object Function]"){
		// null, undefined, any non-object, or function
		return src;	// anything
	}
	if(src.nodeType && "cloneNode" in src){
		// DOM Node
		return src.cloneNode(true); // Node
	}
	if(src instanceof Date){
		// Date
		return new Date(src.getTime());	// Date
	}
	if(src instanceof RegExp){
		// RegExp
		return new RegExp(src);   // RegExp
	}
	var r, i, l;
	if(src instanceof Array){
		// array
		r = [];
		for(i = 0, l = src.length; i < l; ++i){
			if(i in src){
				r.push(deep_clone(src[i]));
			}
		}
	} else {
		// generic objects
		r = src.constructor ? new src.constructor() : {};
	}
	return mixin(r, src, deep_clone);
};


var is_number = function(object) {
    return typeof object == "number" || (typeof object == "object" && object.constructor === Number);
};

// create a multidimensional array. Adapted from http://stackoverflow.com/a/966938/1001848
var create_array = function(dim, init) {
    var arr = new Array(dim[0]);
    var i;
    if(dim.length == 1) { // Fill it up with init
      if(typeof init === "function") {
        for(i = 0; i < dim[0]; i++) {
          arr[i] = init();
        }  
      } else {
        for(i = 0; i < dim[0]; i++) {
          arr[i] = init;
        } 
      }
    } else if(dim.length > 1) {
      for(i = 0; i < dim[0]; i++) {
        arr[i] = create_array(dim.slice(1), init);
      }
    } else {
      throw "create_array can't create a dimensionless array";
    }
    return arr;
};

// return the dimensions of a possibly nested array as an array, for example:
// array_dim(create_array([4, 2, 1], 0)) -> [4, 2, 1]
// This assumes that all arrays inside another array are of the same length.
var array_dim = function(a) {
  if(Array.isArray(a[0])) {
    return [a.length].concat(array_dim(a[0]));
  } else {
    return [a.length];
  }
};

// Checks if two arrays are equal. Adapted from http://stackoverflow.com/a/14853974/1001848
var array_equal = function (a1, a2) {
    if (a1.length != a2.length) return false;
    for (var i = 0; i < a1.length; i++) {
        // Check if we have nested arrays
        if (Array.isArray(a1[i]) && Array.isArray(a2[i])) {
            // recurse into the nested arrays
            if (!array_equal(a1[i], a2[i])) return false;       
        }           
        else if (a1[i] != a2[i]) { 
            // Warning - two different object instances will never be equal: {x:20} != {x:20}
            return false;   
        }           
    }       
    return true;
};  


////////// Functions for handling parameter objects //////////

// Returns a number that can be used to initialize a parameter
var param_init = function(type, lower, upper) {
  if(type === "real") {
    if(lower === -Infinity && upper === Infinity) {
      return 0.5;
    } else if(lower === -Infinity) {
      return upper - 0.5;
    } else if(upper === Infinity) {
      return lower + 0.5;
    } else if(lower <= upper) {
      return (lower + upper) / 2;
    }
  } else if(type === "int") {
    if(lower === -Infinity && upper === Infinity) {
      return 1;
    } else if(lower === -Infinity) {
      return upper - 1;
    } else if(upper === Infinity) {
      return lower + 1;
    } else if(lower <= upper){
      return Math.round((lower + upper) / 2);
    }
  } else if(type === "binary") {
    return 1;
  }
  throw "Could not initialize parameter of type " + type + "[" + lower + ", " + upper + "]";
};

// Completes an object containing parameter descriptions and initializes
// non-initialized parameters. For example, this:
//  { "mu": {"type": "real"} }
// gets completed into this:
//  {"mu": { "type": "real", "dim": [1], "upper": Infinity,
//           "lower": -Infinity, "init": [0.5], "state": [0.5] }}
var complete_params  = function(params_to_complete, param_init) {
  var params = deep_clone(params_to_complete);
  for (var param_name in params) { if (!params.hasOwnProperty(param_name)) continue;
    var param = params[param_name];
    if( !param.hasOwnProperty("type")) {
      param.type = "real";
    }
    if(!param.hasOwnProperty("dim")) {
      param.dim = [1];
    }
    if(is_number(param.dim)) {
      param.dim = [param.dim];
    }
    if(!param.hasOwnProperty("upper")) {
      param.upper = Infinity;
    }
    if(!param.hasOwnProperty("lower")) {
      param.lower = -Infinity;
    }
    if(!param.hasOwnProperty("init")) {
      param.init = create_array(param.dim, 
                                param_init(param.type, param.lower, param.upper));
    } else if(! Array.isArray(param.init)) {
      param.init = create_array(param.dim, param.init);
    }
    if(!param.hasOwnProperty("state")) {
      param.state = param.init;
    }
  }
  return params;
};

// Checks a model definition and throws informative errors
// when things seems off.
var check_model = function(params, posterior) {
  
};

/*

params = {"mu":{"type":"real"}};
param = params["mu"]
JSON.stringify(complete_params(params, param_init), null, 2)

js$source("amwg_plus.js")
{"mu": { "type": "real", "dim": [1], "upper": Infinity, "lower": -Infinity, "init": [0.5], "state": [0.5] }}

*/