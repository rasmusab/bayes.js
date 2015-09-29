////////// Helper Functions //////////

// Returns a random number between min and max;
var runif = function(min, max) {
  return Math.random() * (max - min) + min;
};

// Returns a random integer between min and max
var runif_discrete = function(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
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

// Traverses a possibly nested array a and applies fun to all "leaf nodes" / values that are not arrays.
var nested_array_apply = function(a, fun) {
  if(Array.isArray(a)) {
    var result = new Array(a.length);
    for(var i = 0; i < a.length; i++) {
      result[i] = nested_array_apply(a[i], fun);
    }
    return result;
  } else {
    return fun(a);
  }
};

// Randomize array element order in-place.
// Using Durstenfeld shuffle algorithm.
// Adapted from here: http://stackoverflow.com/a/12646864/1001848
function shuffle_array(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}

// Like nested_array_apply but traversing the nested array branching randomly.
var nested_array_random_apply = function(a, fun) {
  if(Array.isArray(a)) {
    var len = a.length;
    var i;
    var array_is = new Array(len);
    for(i = 0; i < len; i++) {
      array_is[i] = i;
    }
    shuffle_array(array_is);
    var result = new Array(len);
    
    for(i = 0; i < len; i++) {
      var array_i = array_is[i];
      result[array_i] = nested_array_apply(a[array_i], fun);
    }
    return result;
  } else {
    return fun(a);
  }
};

// Pretty way of setting default options where the defaults can be overridden
// by an options object. For example:
// var pi = get_option("pi", my_options, 3.14)
var get_option = function(option_name, options, defaul_value) {
  options = options || {};
  return options.hasOwnProperty(option_name) ? options[option_name] : defaul_value;
};

// Version of get_option where the result should be a possibly mulidimensional array
// and where the default can be overridden either by a scalar or by an array.
var get_multidim_option = function(option_name, options, dim, defaul_value) {
  var value = get_option(option_name, options, defaul_value);
   if(! Array.isArray(value)) {
     value = create_array(dim, value);
   } 
   if(! array_equal( array_dim(value), dim)) {
     throw "The option " + option_name + " is of dimension [" + array_dim(value) + "] but should be [" + dim + "].";
  }
   return value;
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


////////// Stepper interface ///////////

var Stepper = function(parameters, state, posterior) {
  this.parameters = parameters;
  this.state = state;
  this.posterior = posterior;
};

Stepper.prototype.step = function() {
  throw "Every Stepper need to implement next";
};

Stepper.prototype.start_adaptation = function() {
  // Optional, some steppers might not be adaptive. */ 
};

Stepper.prototype.stop_adaptation = function() {
  // Optional, some steppers might not be adaptive. */ 
};

Stepper.prototype.info = function() {
  // Returns an object with info about the state of the stepper.
  return {};
};

////////// UnivariateBatchAdaptationMetropolisStepper ///////////

// Constructor for an object that implements the metropolis step in
// the Adaptive Metropolis-Within-Gibbs algorithm in "Examples of Adaptive MCMC"
// by Roberts and Rosenthal (2008).
// parameters: an object containing a single parameter definition
// state: A reference to the state object that this sampler will affect.
// posterior: A function returning the log likelihood that takes no arguments but
//            that should depend on state.
// options: An optional object containing options to the sampler. 
var UnivariateBatchAdaptationMetropolisStepper = function(parameters, state, posterior, options, generate_proposal) {
  Stepper.call(this, parameters, state, posterior);
  
  param_names = Object.keys(this.parameters);
  if(param_names.length  == 1) {
    this.param_name = param_names[0];
    var parameter = this.parameters[this.param_name];
    this.lower = parameter.lower;
    this.upper = parameter.upper;
  } else {
    throw "UnivariateBatchAdaptationMetropolisStepper can't handle more than one parameter.";
  }
  
  this.prop_log_scale     = get_option("prop_log_scale", options, 0);
  this.batch_size         = get_option("batch_size", options, 50);
  this.max_adaptation     = get_option("max_adaptation", options, 0.01);
  this.target_accept_rate = get_option("target_accept_rate", options, 0.44);
  this.is_adapting        = get_option("is_adapting", options, true);
  
  this.generate_proposal = generate_proposal;
  
  this.acceptance_count = 0;
  this.batch_count = 0;
  this.iterations_since_adaption = 0;  
};

UnivariateBatchAdaptationMetropolisStepper.prototype = Object.create(Stepper.prototype); 
UnivariateBatchAdaptationMetropolisStepper.prototype.constructor = UnivariateBatchAdaptationMetropolisStepper;

UnivariateBatchAdaptationMetropolisStepper.prototype.generate_proposal = function(param_state, prop_log_scale) {
  throw "generate_proposal needs to be implemented by instances of UnivariateBatchAdaptationMetropolisStepper";
};

UnivariateBatchAdaptationMetropolisStepper.prototype.step = function() {
    var param_state = this.state[this.param_name];
    var param_proposal = this.generate_proposal(param_state, this.prop_log_scale);
    if(param_proposal < this.lower || param_proposal > this.upper) {
      // Outside of limits of the parameter, reject the proposal 
      // and stay at the current state.
    } else { // make a Metropolis step
      var curr_log_dens = this.posterior();
      this.state[this.param_name] = param_proposal;
      var prop_log_dens = this.posterior();
      var accept_prob = Math.exp(prop_log_dens - curr_log_dens);
      if(accept_prob > Math.random()) {
        // We do nothing as the state of param has already been changed to the proposal
        if(this.is_adapting) this.acceptance_count++ ;
      } else {
        // revert state back to the old state of param
        this.state[this.param_name] = param_state;
      }
    }
    if(this.is_adapting) {
      this.iterations_since_adaption ++;
      if(this.iterations_since_adaption >= this.batch_size) { // then adapt
        this.batch_count ++;
        var log_sd_adjustment = Math.min(this.max_adaptation, 1 / Math.sqrt(this.batch_count));
        if(this.acceptance_count / this.batch_size > this.target_accept_rate) {
          this.prop_log_scale += log_sd_adjustment;
        } else {
          this.prop_log_scale -= log_sd_adjustment;
        }
        this.acceptance_count = 0;
        this.iterations_since_adaption = 0;
      }
    }
    return this.state[this.param_name];
};

UnivariateBatchAdaptationMetropolisStepper.prototype.start_adaptation = function() {
  this.is_adapting = true;
};

UnivariateBatchAdaptationMetropolisStepper.prototype.stop_adaptation = function() {
  this.is_adapting = false;
};

UnivariateBatchAdaptationMetropolisStepper.prototype.info_adaptation = function() {
  return {
    prop_log_scale: this.prop_log_scale,
    is_adapting: this.is_adapting,
    acceptance_count: this.acceptance_count,
    iterations_since_adaption: this.iterations_since_adaption,
    batch_count: this.batch_count
  };
};


////////// RealBatchAdaptationMetropolisStepper ///////////

var normal_proposal = function(param_state, prop_log_scale) {
  return rnorm(param_state , Math.exp(prop_log_scale));
}

var RealBatchAdaptationMetropolisStepper = function(parameters, state, posterior, options) {
  UnivariateBatchAdaptationMetropolisStepper.call(this, parameters, state, posterior, options, normal_proposal);
};

RealBatchAdaptationMetropolisStepper.prototype = Object.create(UnivariateBatchAdaptationMetropolisStepper.prototype); 
RealBatchAdaptationMetropolisStepper.prototype.constructor = RealBatchAdaptationMetropolisStepper;

////////// IntBatchAdaptationMetropolisStepper ///////////

var discrete_normal_proposal = function(param_state, prop_log_scale) {
  return Math.round(rnorm(param_state , Math.exp(prop_log_scale)));
}

var IntBatchAdaptationMetropolisStepper = function(parameters, state, posterior, options) {
  UnivariateBatchAdaptationMetropolisStepper.call(this, parameters, state, posterior, options, discrete_normal_proposal);
};

IntBatchAdaptationMetropolisStepper.prototype = Object.create(UnivariateBatchAdaptationMetropolisStepper.prototype); 
IntBatchAdaptationMetropolisStepper.prototype.constructor = IntBatchAdaptationMetropolisStepper;


////////// MultivariateBatchAdaptationMetropolisStepper //////////

var MultivariateBatchAdaptationMetropolisStepper = function(parameters, state, posterior, options, SubSampler) {
  Stepper.call(this, parameters, state, posterior);
  
  param_names = Object.keys(this.parameters);
  if(param_names.length  == 1) {
    this.param_name = param_names[0];
    var parameter = this.parameters[this.param_name];
    this.lower = parameter.lower;
    this.upper = parameter.upper;
    this.dim = parameter.dim;
  } else {
    throw "MultivariateBatchAdaptationMetropolisStepper can't handle more than one parameter.";
  }
  
  this.prop_log_scale     = get_multidim_option("prop_log_scale", options, this.dim, 0);
  this.batch_size         = get_multidim_option("batch_size", options, this.dim, 50);
  this.max_adaptation     = get_multidim_option("max_adaptation", options, this.dim, 0.01);
  this.target_accept_rate = get_multidim_option("target_accept_rate", options, this.dim, 0.44);
  this.is_adapting        = get_multidim_option("is_adapting", options, this.dim, true);
  
  var create_subsamplers = 
    function(dim, substate, posterior, prop_log_scale, batch_size, max_adaptation, target_accept_rate, is_adapting) {
    var subsamplers = [];
    if(dim.length === 1) {
      for(var i = 0; i < dim[0]; i++) {
        var suboptions = {prop_log_scale: prop_log_scale[i], batch_size: batch_size[i],
          max_adaptation: max_adaptation[i], target_accept_rate: target_accept_rate[i],
          is_adapting: is_adapting[i]};
          var subparameters = {};
          subparameters[i] = parameter;
        subsamplers[i] = new SubSampler(subparameters, substate, posterior, suboptions);
      }
    } else {
      for(var i = 0; i < dim[0]; i++) {
        subsamplers[i] = create_subsamplers(dim.slice(1), substate[i], posterior, prop_log_scale[i], 
          batch_size[i], max_adaptation[i], target_accept_rate[i], is_adapting[i]);
      }
    }
    return subsamplers;
  };
  
  this.subsamplers = create_subsamplers(this.dim, this.state[this.param_name], this.posterior,
    this.prop_log_scale, this.batch_size, this.max_adaptation, this.target_accept_rate, 
    this.is_adapting);
  
};

MultivariateBatchAdaptationMetropolisStepper.prototype = Object.create(Stepper.prototype); 
UnivariateBatchAdaptationMetropolisStepper.prototype.constructor = UnivariateBatchAdaptationMetropolisStepper;

MultivariateBatchAdaptationMetropolisStepper.prototype.step = function() {
  // Go through the subsamplers in a random order and call step() on them.
  return nested_array_random_apply(this.subsamplers, function(subsampler) {return subsampler.step(); });
};

MultivariateBatchAdaptationMetropolisStepper.prototype.start_adaptation = function() {
  nested_array_apply(this.subsamplers, function(subsampler) {subsampler.start_adaptation(); });
};

MultivariateBatchAdaptationMetropolisStepper.prototype.stop_adaptation = function() {
  nested_array_apply(this.subsamplers, function(subsampler) {subsampler.stop_adaptation(); });
};

MultivariateBatchAdaptationMetropolisStepper.prototype.info = function() {
  return nested_array_apply(this.subsamplers, function(subsampler) {
    return subsampler.info(); 
  });
};

////////// MultiRealBatchAdaptationMetropolisStepper //////////

var MultiRealBatchAdaptationMetropolisStepper = function(parameters, state, posterior, options) {
  MultivariateBatchAdaptationMetropolisStepper.call(this, parameters, state, posterior, options, RealBatchAdaptationMetropolisStepper);
};

MultiRealBatchAdaptationMetropolisStepper.prototype = Object.create(MultivariateBatchAdaptationMetropolisStepper.prototype); 
MultiRealBatchAdaptationMetropolisStepper.prototype.constructor = MultiRealBatchAdaptationMetropolisStepper;

////////// MultiIntBatchAdaptationMetropolisStepper //////////

var MultiIntBatchAdaptationMetropolisStepper = function(parameters, state, posterior, options) {
  MultivariateBatchAdaptationMetropolisStepper.call(this, parameters, state, posterior, options, RealBatchAdaptationMetropolisStepper);
};

MultiIntBatchAdaptationMetropolisStepper.prototype = Object.create(MultivariateBatchAdaptationMetropolisStepper.prototype); 
MultiIntBatchAdaptationMetropolisStepper.prototype.constructor = MultiIntBatchAdaptationMetropolisStepper;

/*

var binary_exact_sampler = function(param, state, posterior) {
  var sampler = sampler_interface();
  
  sampler.next = function() {
    state[param] = 0;
    var zero_log_dens = posterior();
    state[param] = 1;
    var one_log_dens = posterior();
    one_prop <- one_dens / (zero_dens + one_dens)
      
      state[param] = param_proposal;
      //set_nested(state, param, param_proposal);
      var prop_log_dens = posterior();
      var accept_prob = Math.exp(prop_log_dens - curr_log_dens)
      if(accept_prob > Math.random()) {
        // We do nothing as the state of param has already been changed to the proposal
        if(is_adapting) acceptance_count++ ;
      } else {
        // revert state back to the old state of param
        state[param] = param_state;
      }
    }
    if(is_adapting) {
      iterations_since_adaption++;
      if(iterations_since_adaption >= batch_size) { // then adapt
        batch_count ++;
        var log_sd_adjustment = Math.min(max_adaptation, 1 / Math.sqrt(batch_count));
        if(acceptance_count / batch_size > target_accept_rate) {
          prop_log_scale += log_sd_adjustment;
        } else {
          prop_log_scale -= log_sd_adjustment;
        }
        acceptance_count = 0;
        iterations_since_adaption = 0;
      }
    }
    return state[param];
  };
  
  return sampler;
}

*/

// TODO binary samplers

// TODO Randomize gibbs order?



/////////// The sampler //////////
/*

// TODO, gör den här vad jag vill att den ska göra?
var populate_param_object = function(params, value_fun) {
  var property = {};
  for (var param_name in params) { if (!params.hasOwnProperty(param_name)) continue;
    if( array_equal(param.dim, [1]) ) {
      property[param_name] = value_fun(params, param_name);
    } else { 
      property[param_name] = create_array(param.dim, value_fun(params, param_name));
    }
  }
  return property;
};

// Checks a model definition and throws informative errors
// when things seem off.
var check_model = function(model) {
  //TODO
  // A model is an object that contain the following obligatory objects:
  // "posterior": A function that returns the non-normalized log posterior
  //   density. The first argument is an object with parameter values like
  //   {"mu": 2.3, "sigma": 1.2}. The second argument is an (optional)
  //   data object.
  // "parameters": An object with parameter definitions. 
  // In addition, the model can include the following optional objects:
  // "data": Any type of object that, if it exists, will be passed in
  //   as the second argument to posterior.
  // "options": An object with options for the sampling algorithm.
};

var amwg_plus = function(parameter_definitions, posterior, data, options) {
  var params = deep_clone(parameter_definitions);
  var batch_size = get_option("batch_size", options, 50);
  var max_adaptation = get_option("max_adaptation", options, 0.01);
  var target_accept_rate = get_option("target_accept_rate", options, 0.44);
  
  
  
  
  
  var default_prop_log_scale = 0.0;
  var prop_log_scale = get_option("prop_log_scale", options, default_prop_log_scale);
  for (var param_name in params) { if (!params.hasOwnProperty(param_name)) continue;
    var param = params[param_name];
    if(is_number(prop_log_scale)) {
      param.prop_log_scale
    }
    param.prop_log_scale = get_option("prop_log_scale", choosen_prop_log_scale, 0);
        
  };
  
  
  ///// TODO funkar inte. smartare sätta att skicka in optdefault_prop_log_scaleions? Generellt sätt..?
  if(is_number(choosen_prop_log_scale)) {
    var prop_log_scale =  populate_param_object(params, function() { return choosen_prop_log_scale; } );
  } else {
    var prop_log_scale =  populate_param_object(params, function(params, param_name) {
      if(choosen_prop_log_scale.hasOwnProperty(param_name)) {
        return choosen_prop_log_scale[param_name];
      } else {
        return default_prop_log_scale;
      }
    });
  }
    
    param.acceptance_count = 
  }

  
  var is_adapting        = get_option("is_adapting", options, true);
  
  var acceptance_count = 0;
  var batch_count = 0;
  var iterations_since_adaption = 0;
};

*/

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