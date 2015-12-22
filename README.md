# bayes.js

A small toy javascript MCMC framework that can be used fit Bayesian models in the browser. The two major files are:

* __mcmc.js__ Implements a MCMC framework which can be used to fit Bayesian model with both discrete and continuous parameters. Currently the only algorithm that is implemented is a version of the *adaptive Metropolis within Gibbs* (AMWG) algorithm presented by [Roberts and Rosenthal (2009) ](http://probability.ca/jeff/ftpdir/adaptex.pdf). Importing this file creates the global object `mcmc`.
* __distributions.js__ A collection of log density functions that can be used to construct Bayesian models. Follows the naming scheme `ld.*` (for example, `ld.norm` and `ld.pois`) and uses the same parameters as the `d*` density functions in R. Importing this file creates the global object `ld`.

In addition to this the whole thing is wrapped within an [Rstudio](https://www.rstudio.com/) project as I've use R and JAGS to write some tests.

Minimal example of fitting a Normal distribution
--------------------

Given that **mcmc.js** and **distributions.js** have been imported, here is how to define a Normal distribution, and fit it to some data and produce a sample of 5000 draws from the posterior:


```JavaScript
var data = [3, 14, 11, 20, 10, 1, 14, 15, 5, 13];

var params = {
  mu: {type: "real"},
  sigma: {type: "real", lower: 0} };

var norm_post = function(state, data) {
  var log_post = 0;
  // Priors
  log_post += ld.norm(state.mu, 0, 100);
  log_post += ld.unif(state.sigma, 0, 100);
  // Likelihood
  for(var i = 0; i < data.length; i++) {
    log_post += ld.norm(data[i], state.mu, state.sigma);
  }
  return log_post;
};

// Initializing the sampler
var sampler =  new mcmc.AmwgSampler(params, norm_post, data);
// Burning some samples to the MCMC gods and sampling 5000 draws.
sampler.burn(1000)
var samples = sampler.sample(5000)
```
*You can find an interactive version of this script [here](http://codepen.io/rasmusab/pen/LpaKep?editors=001)*

And here is a plot of the resulting sample made in Javascript using the plotly.js library:

![Normal model posterior](media/normal_model_plotly.png?raw=true)





*** Below is not up to date yet! ***

How to fit a Bayesian model
-----------------------------

In __mcmc.js__ the currently sole sampler is `AmwgSampler`. Here is how to make an instance of `AmwgSampler` and to produce a number of samples:
```
var sampler = new mcmc.AmwgSampler(params, log_post, data);
var samples = sampler.sample(1000)
```

The four arguments to `AmwgSampler` are:

**`params`**: This is an object that describes the parameters in the model by giving the parameter names as keys and the parameter properties as objects. The following would define the parameters of a Normal distribution:

```
var params = {
  mu:    {type: "real", dim: [ 1 ], lower: -Infinity, upper: Infinity, init: 0.5 }, 
  sigma: {type: "real", dim: [ 1 ], lower: 0,         upper: Infinity, init: 0.5 }};
```

Not all parameter properties need to be filled in and when left out will be replaced by defaults, for example, the following will result in the same parameter definition as above: `var params = {mu: {}, sigma: {lower:0}}`. Possible `type`s are `"real"`, `"int"` and `"binary"`. `dim` sets the dimension of the parameter, for example, `dim: [5]` would define a five element vector, while `dim: [5, 5, 5]` would define a 5x5x5 3d array. 

**`log_post`**: A function were the first argument is the state of the parameters and the second is an optional data argument. The function should return a number proportional to the log posterior. The state will be an object according to the parameter definition, for example, the parameter definition above would result in the state object `{mu: 0.5, sigma: 0.5}` (but the numbers would, of course, differ). Scalar parameters (that is, `dim: [1]`) are represented as numbers, while multidimensional parameter are represented as (possibly nested) arrays. 

**`data`** (optional): An optional argument, whatever you pass in here will just be passed on to the `log_post` function.

**`options`** (optional): An object defining options to the sampler




References
--------------------

Roberts, G. O., & Rosenthal, J. S. (2009). Examples of adaptive MCMC. *Journal of Computational and Graphical Statistics*, 18(2), 349-367. [pdf]((http://probability.ca/jeff/ftpdir/adaptex.pdf)
