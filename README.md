# bayes.js

A small toy javascript MCMC framework that can be used fit Bayesian models in the browser. The two major files are:

* __mcmc.js__ Implements a MCMC framework which can be used to fit Bayesian model with both discrete and continuous parameters. Currently the only algorithm that is implemented is a version of the *adaptive Metropolis within Gibbs* algorithm presented by [Roberts and Rosenthal (2009) ](http://probability.ca/jeff/ftpdir/adaptex.pdf)
* __distributions.js__ A collection of log density functions that can be used to construct Bayesian models. Follows the naming scheme `ld*` (for example, `ldnorm` and `ldpois`) and uses the same parameters as the `d*` density function in R.

Currently these two files just pollutes the global name space, which should probably be changed... In addition to this the whole thing is wrapped within an [Rstudio](https://www.rstudio.com/) project as I've use R and JAGS to write some tests.

In __mcmc.js__ the currently sole sampler is `AmwgSampler`. Here is how to make an instance of `AmwgSampler` and to produce a number of samples:
```
var sampler =  new AmwgSampler(params, norm_post, data);
var samples = sampler.sample(1000)
```

The four arguments to `AmwgSampler` are:

**`params`**: This is an object that describes the parameters in the model by giving the parameter names as keys and the parameter properties as objects. The following would define the parameters of a Normal distribution:

```
var params = {
  mu:    {type: "real", dim: [ 1 ], lower: -Infinity, upper: Infinity, init: 0.5 }, 
  sigma: {type: "real", dim: [ 1 ], lower: 0,         upper: Infinity, init: 0.5 }};
```

Not all parameter properties need to be filled in and when left out will be replaced by defaults, for example, the following will result in the same parameter definition as above: `var params = {mu: {}, sigma: {lower:0}}`. Possible `type`s are `real`, `int` and `binary`. `dim` sets the dimension of the parameter, for examples, `dim: [5]` would define a five element vector, while `dim: [5, 5, 5]` would define 5x5x5 3d array. 

**`log_post`**: A function were the first argument is the state of the parameters and the second is an optional data argument. The function should return a number proportional to the log posterior. The state will be an object according to the parameter definition, for example, the parameter definition above would result in the state object `{mu: 0.5, sigma: 0.5}` (but the numbers would, of course, differ). Scalar parameters (that is, `dim: [1]`) are represented as numbers, while multidimensional parameter are represented as (possibly nested) arrays. 

**`data`** (optional): An optional argument, whatever you pass in here will just be passed on to the `log_post` function.

**`options`** (optional): An object defining options to the sampler

Given that **mcmc.js** and **distributions.js** has been imported, here is how to fit a Normal model to some data:

*You can find an interactive version of this script [here](http://codepen.io/rasmusab/pen/LpaKep?editors=001)*

```
var data = [3, 14, 11, 20, 10, 1, 14, 15, 5, 13];

var params = {
  mu: {type: "real"},
  sigma: {type: "real", lower: 0, init: 1}};

var norm_post = function(par, data) {
  var log_post = 0;
  // Priors
  log_post += ldnorm(par.mu, 0, 100);
  log_post += ldunif(par.sigma, 0, 100);
  // Likelihood
  for(var i = 0; i < data.length; i++) {
    log_post += ldnorm(data[i], par.mu, par.sigma);
  }
  return log_post;
};

// Below is just the code to run the sampler

// Initializing the sampler
var sampler =  new AmwgSampler(params, norm_post, data);
// Burning some samples to the MCMC gods, 
sampler.burn(1000)
var samples = sampler.sample(10000)
```


References
--------------------

Roberts, G. O., & Rosenthal, J. S. (2009). Examples of adaptive MCMC. *Journal of Computational and Graphical Statistics*, 18(2), 349-367. [pdf]((http://probability.ca/jeff/ftpdir/adaptex.pdf)
