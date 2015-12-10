"use strict";

// TODO
// * If a log_post function returns an object it should contain the element log_post, 
// all other elements gets added to the generated samples, this allows generated
// quantities to be defined in the log_post function, e.g. 
// `return {log_post: log_post, y_pred: y_pred}`

var mcmc = (function(){
  ////////// Helper Functions //////////
  
  // Returns a random real number between min and max;
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
  // Example: create_array([2,3], 1) -> [[1,1],[1,1],[1,1]]
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
  
  // Return the dimensions of a possibly nested array as an array, for example:
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
  
  // Traverses a possibly nested array a and applies fun to all "leaf nodes", that is, 
  // values that are not arrays.
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
      var array_is = [];
      for(i = 0; i < len; i++) {
        array_is[i] = i;
      }
      shuffle_array(array_is);
      var result = [];
      
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
    return options.hasOwnProperty(option_name) && 
           options[option_name] !== undefined  && 
           options[option_name] !== null ? options[option_name] : defaul_value;
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
  var param_init_fixed = function(type, lower, upper) {
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
  //           "lower": -Infinity, "init": 0.5 }}
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
      if(param.type == "binary") {
        param.upper = 1;
        param.lower = 0;
      }
      if(!param.hasOwnProperty("upper")) {
        param.upper = Infinity;
      }
      if(!param.hasOwnProperty("lower")) {
        param.lower = -Infinity;
      }
      
      if(param.hasOwnProperty("init")) {
        // If this is just a number or a nested array we leave it alone, but if...
        if(array_equal(param.dim, [1]) && typeof param.init === "function") {
          // param.init is a function, use that to initialize the parameter.
          param.init = param.init();
        } else if(!array_equal(param.dim, [1]) && !Array.isArray(param.init)) {
        // We have a multidimensional parameter where the param.init exist but
        // is not an array. Then assume it is a number or a function and use
        // it to initialize the parameter.
        param.init = create_array(param.dim, param.init);
        }
      } else { // We use the default initialization function.
        if(array_equal(param.dim, [1])) {
          param.init = param_init(param.type, param.lower, param.upper);
        } else {
          param.init = create_array(param.dim, function() {
            return param_init(param.type, param.lower, param.upper);
          });
        }
      }
    }
    return params;
  };
  
  
  ////////// Stepper interface ///////////
  
  
  // A Stepper is an object responsible for pushing around one
  // or more parameter values in a state according to the distribution
  // defined by the log posterior.
  // params: An object with parameter definitions, for example:
  //             {x:{ type: real }}
  // state     : An object with containing the state of each parameter 
  //             as either a scalar or an array. For example:
  //            {sigma:5, beta: [1, 2.5]}
  // log_post : A function *taking no parameters* that returns the
  //             current log density. That is, the value of posterior()
  //             needs to change if the values in state changes.
  var Stepper = function(params, state, log_post) {
    this.params = params;
    this.state = state;
    this.log_post = log_post;
  };
  
  Stepper.prototype.step = function() {
    throw "Every Stepper need to implement step()";
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
  
  ////////// OnedimMetropolisStepper ///////////
  
  // Constructor for an object that implements the metropolis step in
  // the Adaptive Metropolis-Within-Gibbs algorithm in "Examples of Adaptive MCMC"
  // by Roberts and Rosenthal (2008).
  // params: an object containing a single parameter definition of 
  //         a one dimensional parameter.
  // state: A reference to the state object that this stepper will affect.
  // log_post: A function returning the log likelihood that takes no arguments but
  //            that should depend on state.
  // options: An optional object containing options to the stepper. 
  var OnedimMetropolisStepper = function(params, state, log_post, options, generate_proposal) {
    Stepper.call(this, params, state, log_post);
    
    var param_names = Object.keys(this.params);
    if(param_names.length  != 1) {
      throw "OnedimMetropolisStepper can only handle one parameter.";
    }
    this.param_name = param_names[0];
    var param = this.params[this.param_name];
    if(!array_equal(param.dim, [1])) {
      throw "OnedimMetropolisStepper can only handle one one-dimensional parameter.";
    }
    this.lower = param.lower;
    this.upper = param.upper;
    
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
  
  OnedimMetropolisStepper.prototype = Object.create(Stepper.prototype); 
  OnedimMetropolisStepper.prototype.constructor = OnedimMetropolisStepper;
  
  OnedimMetropolisStepper.prototype.step = function() {
      var param_state = this.state[this.param_name];
      var param_proposal = this.generate_proposal(param_state, this.prop_log_scale);
      if(param_proposal < this.lower || param_proposal > this.upper) {
        // Outside of limits of the parameter, reject the proposal 
        // and stay at the current state.
      } else { // make a Metropolis step
        var curr_log_dens = this.log_post();
        this.state[this.param_name] = param_proposal;
        var prop_log_dens = this.log_post();
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
  
  OnedimMetropolisStepper.prototype.start_adaptation = function() {
    this.is_adapting = true;
  };
  
  OnedimMetropolisStepper.prototype.stop_adaptation = function() {
    this.is_adapting = false;
  };
  
  OnedimMetropolisStepper.prototype.info = function() {
    return {
      prop_log_scale: this.prop_log_scale,
      is_adapting: this.is_adapting,
      acceptance_count: this.acceptance_count,
      iterations_since_adaption: this.iterations_since_adaption,
      batch_count: this.batch_count
    };
  };
  
  
  ////////// RealMetropolisStepper ///////////
  // A subclass of OnedimMetropolisStepper making continous Normal proposals
  
  var normal_proposal = function(param_state, prop_log_scale) {
    return rnorm(param_state , Math.exp(prop_log_scale));
  };
  
  var RealMetropolisStepper = function(params, state, log_post, options) {
    OnedimMetropolisStepper.call(this, params, state, log_post, options, normal_proposal);
  };
  
  RealMetropolisStepper.prototype = Object.create(OnedimMetropolisStepper.prototype); 
  RealMetropolisStepper.prototype.constructor = RealMetropolisStepper;
  
  ////////// IntMetropolisStepper ///////////
  // A subclass of OnedimMetropolisStepper taking discrete Normal proposals
  
  var discrete_normal_proposal = function(param_state, prop_log_scale) {
    return Math.round(rnorm(param_state , Math.exp(prop_log_scale)));
  };
  
  var IntMetropolisStepper = function(params, state, log_post, options) {
    OnedimMetropolisStepper.call(this, params, state, log_post, options, discrete_normal_proposal);
  };
  
  IntMetropolisStepper.prototype = Object.create(OnedimMetropolisStepper.prototype); 
  IntMetropolisStepper.prototype.constructor = IntMetropolisStepper;
  
  
  ////////// MultidimAdaptiveMetropolisStepper //////////
  
  // subparams should probabily be called subparams and should have dim be set correctly
  
  var MultidimComponentMetropolisStepper = function(params, state, log_post, options, SubStepper) {
    Stepper.call(this, params, state, log_post);
    
    var param_names = Object.keys(this.params);
    if(param_names.length  != 1) {
      throw "MultidimComponentMetropolisStepper can't handle more than one parameter.";
    }
    this.param_name = param_names[0];
    var param = this.params[this.param_name];
    this.lower = param.lower;
    this.upper = param.upper;
    this.dim = param.dim;
  
    this.prop_log_scale     = get_multidim_option("prop_log_scale", options, this.dim, 0);
    this.batch_size         = get_multidim_option("batch_size", options, this.dim, 50);
    this.max_adaptation     = get_multidim_option("max_adaptation", options, this.dim, 0.01);
    this.target_accept_rate = get_multidim_option("target_accept_rate", options, this.dim, 0.44);
    this.is_adapting        = get_multidim_option("is_adapting", options, this.dim, true);
    
    var create_substeppers = 
      function(dim, substate, log_post, prop_log_scale, batch_size, max_adaptation, target_accept_rate, is_adapting) {
      var substeppers = [];
      if(dim.length === 1) {
        for(var i = 0; i < dim[0]; i++) {
          var suboptions = {prop_log_scale: prop_log_scale[i], batch_size: batch_size[i],
            max_adaptation: max_adaptation[i], target_accept_rate: target_accept_rate[i],
            is_adapting: is_adapting[i]};
            var subparam = {};
            subparam[i] = deep_clone(param);
            subparam[i].dim = [1]; // As this should now be a one-dim parameter
            delete subparam[i].init; // As it sould not be needed
          substeppers[i] = new SubStepper(subparam, substate, log_post, suboptions);
        }
      } else {
        for(var i = 0; i < dim[0]; i++) {
          substeppers[i] = create_substeppers(dim.slice(1), substate[i], log_post, prop_log_scale[i], 
            batch_size[i], max_adaptation[i], target_accept_rate[i], is_adapting[i]);
        }
      }
      return substeppers;
    };
    
    this.substeppers = create_substeppers(this.dim, this.state[this.param_name], this.log_post,
      this.prop_log_scale, this.batch_size, this.max_adaptation, this.target_accept_rate, 
      this.is_adapting);
    
  };
  
  MultidimComponentMetropolisStepper.prototype = Object.create(Stepper.prototype); 
  MultidimComponentMetropolisStepper.prototype.constructor = MultidimComponentMetropolisStepper;
  
  MultidimComponentMetropolisStepper.prototype.step = function() {
    // Go through the substeppers in a random order and call step() on them.
    return nested_array_random_apply(this.substeppers, function(substepper) {return substepper.step(); });
  };
  
  MultidimComponentMetropolisStepper.prototype.start_adaptation = function() {
    nested_array_apply(this.substeppers, function(substepper) {substepper.start_adaptation(); });
  };
  
  MultidimComponentMetropolisStepper.prototype.stop_adaptation = function() {
    nested_array_apply(this.substeppers, function(substepper) {substepper.stop_adaptation(); });
  };
  
  MultidimComponentMetropolisStepper.prototype.info = function() {
    return nested_array_apply(this.substeppers, function(substepper) {
      return substepper.info(); 
    });
  };
  
  ////////// MultiRealComponentMetropolisStepper //////////
  
  var MultiRealComponentMetropolisStepper = function(params, state, log_post, options) {
    MultidimComponentMetropolisStepper.call(this, params, state, log_post, options, RealMetropolisStepper);
  };
  
  MultiRealComponentMetropolisStepper.prototype = Object.create(MultidimComponentMetropolisStepper.prototype); 
  MultiRealComponentMetropolisStepper.prototype.constructor = MultiRealComponentMetropolisStepper;
  
  ////////// MultiIntComponentMetropolisStepper //////////
  
  var MultiIntComponentMetropolisStepper = function(params, state, log_post, options) {
    MultidimComponentMetropolisStepper.call(this, params, state, log_post, options, IntMetropolisStepper);
  };
  
  MultiIntComponentMetropolisStepper.prototype = Object.create(MultidimComponentMetropolisStepper.prototype); 
  MultiIntComponentMetropolisStepper.prototype.constructor = MultiIntComponentMetropolisStepper;
  
  ////////// BinaryStepper //////////
  
  var BinaryStepper = function(params, state, log_post, options) {
    Stepper.call(this, params, state, log_post);
    var param_names = Object.keys(this.params);
    if(param_names.length  == 1) {
      this.param_name = param_names[0];
    } else {
      throw "BinaryStepper can't handle more than one parameter.";
    }
  };
  
  BinaryStepper.prototype = Object.create(Stepper.prototype); 
  BinaryStepper.prototype.constructor = BinaryStepper;
  
  BinaryStepper.prototype.step = function() {
    this.state[this.param_name] = 0;
    var zero_log_dens = this.log_post();
    this.state[this.param_name] = 1;
    var one_log_dens = this.log_post();
    var max_log_dens = Math.max(zero_log_dens, one_log_dens);
    zero_log_dens -= max_log_dens;
    one_log_dens -= max_log_dens;
    var zero_prob = Math.exp(zero_log_dens - Math.log( Math.exp(zero_log_dens) + Math.exp(one_log_dens) ) );
    if(Math.random() < zero_prob) {
      this.state[this.param_name] = 0;
      return 0;
    } // else keep the param at 1 .
    return 1;
  };
  
  ////////// BinaryComponentStepper //////////
  
  var BinaryComponentStepper = function(params, state, log_post, options) {
    Stepper.call(this, params, state, log_post);
    
    var param_names = Object.keys(this.params);
    if(param_names.length  == 1) {
      this.param_name = param_names[0];
      var param = this.params[this.param_name];
      this.dim = param.dim;
    } else {
      throw "BinaryComponentStepper can't handle more than one parameter.";
    }
    
    var create_substeppers = 
      function(dim, substate, log_post) {
      var substeppers = [];
      var i;
      if(dim.length === 1) {
        for(i = 0; i < dim[0]; i++) {
          var subparams = {};
          subparams[i] = param;
          substeppers[i] = new BinaryStepper(subparams, substate, log_post);
        }
      } else {
        for(i = 0; i < dim[0]; i++) {
          substeppers[i] = create_substeppers(dim.slice(1), substate[i], log_post);
        }
      }
      return substeppers;
    };
    
    this.substeppers = create_substeppers(this.dim, this.state[this.param_name], this.log_post);
  };
  
  BinaryComponentStepper.prototype = Object.create(Stepper.prototype); 
  BinaryComponentStepper.prototype.constructor = BinaryComponentStepper;
  
  BinaryComponentStepper.prototype.step = function() {
    // Go through the substeppers in a random order and call step() on them.
    return nested_array_random_apply(this.substeppers, function(substepper) {return substepper.step(); });
  };
  
  ////////// AmwgStepper (Adaptive Metropolis With Gibbs) //////////
  
  var AmwgStepper = function(params, state, log_post, options) {
    Stepper.call(this, params, state, log_post);
    this.param_names = Object.keys(this.params);
    this.substeppers = [];
    this.stepper_indices = [];
    for(var i = 0; i < this.param_names.length; i++) {
      var param = params[this.param_names[i]];
      var SelectStepper;
      switch (param.type) {
        case "real":
          if(array_equal(param.dim, [1])) {
            SelectStepper = RealMetropolisStepper;
          } else {
            SelectStepper = MultiRealComponentMetropolisStepper;
          }
          break;
        case "int":
          if(array_equal(param.dim, [1])) {
            SelectStepper = IntMetropolisStepper;
          } else {
            SelectStepper = MultiIntComponentMetropolisStepper;
          }
          break;
        case "binary":
          if(array_equal(param.dim, [1])) {
            SelectStepper = BinaryStepper;
          } else {
            SelectStepper = BinaryComponentStepper;
          }
          break;
        default:
          throw "AmwgStepper can't handle parameter " + this.param_names[i]  +" with type " + param.type; 
      }
      var param_object_wrap = {};
      param_object_wrap[this.param_names[i]] = param;
      options = options || {};
      var param_options = options.params && options.params[this.param_names[i]] || {};
      param_options.prop_log_scale     = param_options.prop_log_scale     || options.prop_log_scale; 
      param_options.batch_size         = param_options.batch_size         || options.batch_size; 
      param_options.max_adaptation     = param_options.max_adaptation     || options.max_adaptation; 
      param_options.target_accept_rate = param_options.target_accept_rate || options.target_accept_rate; 
      param_options.is_adapting        = param_options.is_adapting        || options.is_adapting; 
      this.substeppers[i] = new SelectStepper(param_object_wrap, state, log_post, param_options);
      this.stepper_indices[i] = i;
    }
  };
  
  AmwgStepper.prototype = Object.create(Stepper.prototype); 
  AmwgStepper.prototype.constructor = AmwgStepper;
  
  AmwgStepper.prototype.step = function() {
    shuffle_array(this.stepper_indices);
    for(var i = 0; i < this.stepper_indices.length; i++) {
      this.substeppers[this.stepper_indices[i]].step();
    }
    return this.state;
  };
  
  AmwgStepper.prototype.start_adaptation = function() {
    for(var i = 0; i < this.substeppers.length; i++) {
      this.substeppers[i].start_adaptation();
    }
  };
  
  AmwgStepper.prototype.stop_adaptation = function() {
    for(var i = 0; i < this.substeppers.length; i++) {
      this.substeppers[i].stop_adaptation();
    } 
  };
  
  AmwgStepper.prototype.info = function() {
    var info = {};
    for(var i = 0; i < this.substeppers.length; i++) {
      info[this.param_names[i]] = this.substeppers[i].info();
    }
    return info;
  };
  
  
  
  /////////// Sampler Interface //////////
  // While you could fit a model using the Steppers above, the
  // Sampler is a convenience class where an instance of Sampler
  // sets up the steppers, checks the parameter definition,
  // and manages the sampling.
  var Sampler = function(params, log_post, data, options) {
    this.params = params;
    this.data = data;
    this.param_names = Object.keys(this.params);
    
    
    // Setting default options if not passed through the options object
    this.param_init_fun   = get_option("param_init_fun", options, param_init_fixed);
    var thinning_interval = get_option("thin", options, 1);
    var params_to_monitor = get_option("monitor", options, null);
    this.thin(thinning_interval);
    this.monitor(params_to_monitor);
    this.options = options;
    // Completing the params and initializing the state.
    this.params = complete_params(this.params, this.param_init_fun);
    var state = {};
    for(var i = 0; i < this.param_names.length; i++ ) {
      state[this.param_names[i]] = this.params[this.param_names[i]].init;
    }
    this.log_post = function() { 
      return log_post(state, data);
    };
    this.state = state;
    this.steppers = this.create_stepper_ensamble(this.params, this.state, this.log_post, this.options);
  };
  
  // Creates an vector of steppers that when called 
  // should take a step in the parameterspace.
  Sampler.prototype.create_stepper_ensamble = function(state, log_post){
    throw "Every Sampler needs to implement create_stepper_ensamble()";
  };
  
  // Returns an object with info about the state of the Sampler.
  Sampler.prototype.info = function() {
    return {state: this.state, thin: this.thin, monitor: this.monitor,
            steppers: this.steppers};
  };
  
  Sampler.prototype.step = function() {
    for(var i = 0; i < this.steppers.length; i++) {
      this.steppers[i].step();
    }
  };
  
  Sampler.prototype.sample = function(n_iterations) {
    if(this.monitored_params.length === 0) {
      this.burn(n_iterations);
      return {};
    } else {
      // Initializing curr_sample where the sample is going to be saved
      // as an object containing one array per parameter to be monitored.
      var curr_sample = {};
      var i, j;
      for(j = 0; j < this.monitored_params.length; j++) {
        curr_sample[this.monitored_params[j]] = [];
      }
      
      for(i = 0; i < n_iterations; i++) {
        if(i % this.thinning_interval === 0) {
          for(j = 0; j < this.monitored_params.length; j++) {
            var param = this.monitored_params[j];
            curr_sample[param].push(this.state[param]);
          }
        }
        this.step();
      }
      return curr_sample;
    }
  };
  
  Sampler.prototype.burn = function(n_iterations) {
    for(var i = 0; i < n_iterations; i++) {
      this.step();
    }
  };
  
  Sampler.prototype.monitor = function(params_to_monitor) {
  // sets what parameters to monitor, overwrites last monitor
    if(params_to_monitor === null) {
      this.monitored_params = this.param_names;
    } else {
      this.monitored_params = params_to_monitor;  
    }
  };
  
  Sampler.prototype.thin = function(thinning_interval) {
    this.thinning_interval = thinning_interval;
  };
  
  Sampler.prototype.start_adaptation = function() {
    for(var i = 0; i < this.steppers.length; i++) {
      this.steppers[i].start_adaptation();
    }
  };
  
  Sampler.prototype.stop_adaptation = function() {
    for(var i = 0; i < this.steppers.length; i++) {
      this.steppers[i].stop_adaptation();
    }
  };
  
  ////////// AmwgSampler /////////
  
  var AmwgSampler = function(params, log_post, data, options) {
    Sampler.call(this, params, log_post, data, options);
  };
  
  AmwgSampler.prototype = Object.create(Sampler.prototype); 
  AmwgSampler.prototype.constructor = AmwgSampler;
  
  AmwgSampler.prototype.create_stepper_ensamble = function(params, state, log_post, options){
    return [ new AmwgStepper(params, state, log_post, options) ];
  };
  
  return {
    runif: runif,
    runif_discrete: runif_discrete,
    rnorm: rnorm,
    param_init_fixed: param_init_fixed, 
    complete_params: complete_params, 
    RealMetropolisStepper: RealMetropolisStepper, 
    IntMetropolisStepper: IntMetropolisStepper, 
    MultiRealComponentMetropolisStepper: MultiRealComponentMetropolisStepper, 
    MultiIntComponentMetropolisStepper: MultiIntComponentMetropolisStepper, 
    BinaryStepper: BinaryStepper, 
    BinaryComponentStepper: BinaryComponentStepper, 
    AmwgStepper: AmwgStepper, 
    AmwgSampler: AmwgSampler
  };
}());
