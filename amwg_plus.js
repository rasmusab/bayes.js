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

// Normal random number generator
// Adapted from https://github.com/jstat/jstat/blob/master/src/special.js
var rnorm = function(mean, sd) {
  var u, v, x, y, q;
  do {
    u = Math.random();
    v = 1.7156 * (Math.random() - 0.5);
    x = u - 0.449871;
    y = Math.abs(v) + 0.386595;
    q = x * x + y * (0.19600 * y - 0.25472 * x);
  } while (q > 0.27597 && (q > 0.27846 || v * v > -4 * Math.log(u) * u * u));
  
  return (v / u) * sd + mean;
};

// Pretty way of setting default options where the defaults can be overridden
// by an options object. For example:
// var pi = get_option("pi", my_options, 3.14)
var get_option = function(option_name, options, defaul_value) {
  options = options || {};
  return options.hasOwnProperty(option_name) ? options[option_name] : defaul_value;
};

// Get a value in a nested object using an array to define the path. For example:
// obj = [[1,2],[3,4],[ 5, [6, 7]]];
// get_nested(obj, [2, 1, 0]) -> 7
// Also works if path is a scalar.
var get_nested = function(o, path) {
  if(!Array.isArray(path)) {
    return o[path];
  }
  var length = path.length;
  var i = 0;
  while(i < length ) {
    o = o[path[i]];
    i++;
  }
  return o;
};

// Indexes an object like get_nested, but set the indexed value to val.
var set_nested = function(o, path, val) {
  if(!Array.isArray(path)) {
    o[path]= val;
    return o[path];
  }
  var length = path.length;
  var i = 0;
  while(i < (length - 1)) {
    o = o[path[i]];
    i++;
  }
  o[path[i]] = val;
  return o[path[i]];
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
//           "lower": -Infinity, "init": [0.5] }}
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
  }
  return params;
};

// Checks a model definition and throws informative errors
// when things seem off.
var check_model = function(model) {
  //TODO
  // A model is an object that contain the following obligatory objects:
  // "posterior": A function that returns the non-normalized log posterior
  //   density. The fist argument is an object with parameter values like
  //   {"mu": 2.3, "sigma": 1.2}. The second argument will be an (optional)
  //   data object.
  // "parameters": An object with parameter definitions. 
  // In addition, the model can include the following optional objects:
  // "data": Any type of object that, if it exists, will be passed in
  //   as the second argument to posterior.
  // "options": An object with options for the sampling algorithm.
};

var sampler_interface = function() {
  return {
    // Returns the next draw from the sampler for the parameter with name param which has 
    // support between lower and upper. This method should not change state. 
    next: function(param, lower, upper, state, posterior) { throw "Every sampler need to implement next"; },
    // Starts and stops the adaptation.
    start_adaptation: function() { /* Optional, some samples might not be adaptive. */ },
    stop_adaptation: function()  { /* Again Optional */ },
    // Returns info about the state of the sampler.
    info: function() { return {};  }
  };
};


// This returns an object that implements the metropolis step in
// the Adaptive Metropolis-Within-Gibbs algorithm in "Examples of Adaptive MCMC"
// by Roberts and Rosenthal (2008)
var batch_adaptation_metropolis_sampler = function(param, lower, upper, generate_proposal, options) {
  var sampler = sampler_interface();
  var prop_log_scale     = get_option("prop_log_scale", options, 0);
  var batch_size         = get_option("batch_size", options, 50);
  var min_adaptation     = get_option("min_adaptation", options, 0.01);
  var target_accept_rate = get_option("target_accept_rate", options, 0.44);
  var is_adapting        = get_option("is_adapting", options, true);
  
  var acceptance_count = 0;
  var batch_count = 0;
  var iterations_since_adaption = 0;
  
  sampler.next = function(state, posterior) {
    var param_state = get_nested(state, param)
    
    var param_proposal = generate_proposal(param_state, prop_log_scale);
    if(param_proposal < lower || param_proposal > upper) {
      // Outside of limits of the parameter, reject the proposal 
      // and stay at the current state
      var next_param_state = param_state;
    } else { // make a Metropolis step
      var curr_log_dens = posterior(state);
      set_nested(state, param, param_proposal);
      var prop_log_dens = posterior(state);
      // Here we revert state back so that this method leaves it untouched.
      // It would be safer to first make a copy of state, but that feels costly...
      set_nested(state, param, param_state);
      
      var accept_prob = Math.exp(prop_log_dens - curr_log_dens)
      if(accept_prob > Math.random()) {
        var next_param_state = param_proposal;
        if(is_adapting) acceptance_count++ ;
      } else {
        var next_param_state = param_state;
      }
    }
    if(is_adapting) {
      iterations_since_adaption++;
      if(iterations_since_adaption >= batch_size) { // then adapt
        batch_count ++;
        var log_sd_adjustment = Math.min(min_adaptation, 1 / Math.sqrt(batch_count));
        if(acceptance_count / batch_size > target_accept_rate) {
          prop_log_scale += log_sd_adjustment;
        } else {
          prop_log_scale -= log_sd_adjustment;
        }
        acceptance_count = 0;
        iterations_since_adaption = 0;
      }
    }
    return next_param_state;
  };
  
  sampler.start_adaptation = function() {
    is_adapting = true;
  };
  
  sampler.stop_adaptation = function() {
    is_adapting = false;
  };

  sampler.info = function() {
    return {
      prop_log_scale: prop_log_scale,
      is_adapting: is_adapting,
      acceptance_count: acceptance_count,
      iterations_since_adaption: iterations_since_adaption,
      batch_count: batch_count
    };
  };
  return sampler;
};

// Returns an instance of batch_adaptation_metropolis_sampler that takes
// Normally distributed steps
var real_adaptive_metropolis_sampler = function(param, lower, upper, options) {
  var normal_proposal = function(param_state, prop_log_sd) {
    return rnorm(param_state , Math.exp(prop_log_sd));
  };
  return batch_adaptation_metropolis_sampler(param, lower, upper, normal_proposal, options);
}

// Returns an instance of batch_adaptation_metropolis_sampler that takes
// discretized Normally distributed steps
var int_adaptive_metropolis_sampler = function(param, lower, upper, options) {
  var discrete_normal_proposal = function(param_state, prop_log_sd) {
    return Math.round(rnorm(param_state , Math.exp(prop_log_sd)));
  };
  return batch_adaptation_metropolis_sampler(param, lower, upper, discrete_normal_proposal, options);
}

var real_multivariate_adaptive_metropolis_sampler = function(options) {
  var sampler = sampler_interface();
  
  var normal_proposal = function(param_state, prop_log_sd) {
    return rnorm(param_state , Math.exp(prop_log_sd));
  };
  return batch_adaptation_metropolis_sampler(normal_proposal, options);
}




/*

var state = {mu:0};
var a = real_adaptive_metropolis_sampler("mu", -Infinity, Infinity, {batch_size : 5})
state.mu = a.next(state, function(par) { return Math.log(Math.random()) })

param = "mu"
lower = -Infinity
upper = Infinity
state = {mu: 1}
a.next("mu", -Infinity, Infinity, {mu: 1}, function(par) { return Math.log(Math.random()) })

params = {"mu":{"type":"real"}};
param = params["mu"]
JSON.stringify(complete_params(params, param_init), null, 2)

js$source("amwg_plus.js")
{"mu": { "type": "real", "dim": [1], "upper": Infinity, "lower": -Infinity, "init": [0.5], "state": [0.5] }}
https://john-dugan.com/object-oriented-javascript-pattern-comparison/
*/