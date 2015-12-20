"use strict";


// A number of log probability density functions (PDF). Naming and parameterization
// should match R's, except for that all functions reside in an ld object (
// as in "log density"), so to get a normal log density you would write
// ld.norm(...).
// Most of the code below is directly taken from the great Jstat project
// (https://github.com/jstat/) which includes PDF for many common probability
// distributions. What I have done is only to convert these to log PDFs.

/*
Original work Copyright (c) 2013 jStat
Modified work Copyright (c) 2015 Rasmus Bååth 

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/

var ld = (function() {
  // Object to hold the functions to be exported.
  var ld  = {};
  
  ////////// Helper functions //////////
  //////////////////////////////////////
  
  var gammaln = function(x) {
    var j = 0;
    var cof = [
      76.18009172947146, -86.50532032941677, 24.01409824083091,
      -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5
    ];
    var ser = 1.000000000190015;
    var xx, y, tmp;
    tmp = (y = xx = x) + 5.5;
    tmp -= (xx + 0.5) * log(tmp);
    for (; j < 6; j++)
      ser += cof[j] / ++y;
    return log(2.5066282746310005 * ser / xx) - tmp;
  };
  ld.gammaln = gammaln;
  
  var factorialln = function(n) {
    return n < 0 ? NaN : gammaln(n + 1);
  };
  ld.factorialln = factorialln;
  
  var combinationln = function(n, m){
    return factorialln(n) - factorialln(m) - factorialln(n - m);
  };
  ld.combinationln = combinationln;
  
  var betaln = function(x, y) {
    return gammaln(x) + gammaln(y) - gammaln(x + y);
  };
  ld.combinationln = combinationln;
  
  var log = Math.log;
  var pow = Math.pow;
  var sqrt = Math.sqrt;
  var pi = Math.PI;
  
  ////////// Continous distributions //////////
  /////////////////////////////////////////////
  
  ld.beta = function(x, shape1, shape2) {
    if (x > 1 || x < 0) {
        return -Infinity;
    }
    if(shape1 === 1 && shape2 === 1) {
      return 0;
    } else {
      return (shape1 - 1) * log(x) + (shape2 - 1) * log(1 - x) - betaln(shape1, shape2);  
    }
  };
  
  ld.cauchy = function(x, location, scale) {
    return log(scale) - log(pow(x - location, 2) + pow(scale, 2))  - log(pi);
  };
  
  ld.norm = function(x, mean, sd) {
      return -0.5 * log(2 * pi) -log(sd) - pow(x - mean, 2) / (2 * sd * sd);
  };
  
  ld.gamma = function(x, shape, scale) {
    if (x < 0) {
      return -Infinity;
    }
    if((x === 0 && shape === 1) ) {
      return -log(scale);
    } else {
      return (shape - 1) * log(x) - x / scale - gammaln(shape) - shape * log(scale);
    }
  };
  
  ld.invgamma = function(x, shape, scale) {
      if (x <= 0) {
        return -Infinity;
      }
      return -(shape + 1) * log(x) - scale / x - gammaln(shape) + shape * log(scale);
    };
  
  ld.lnorm =  function(x, meanlog, sdlog) {
    if (x <= 0) {
      return -Infinity;
    }
    return -log(x) - 0.5 * log(2 * pi) - log(sdlog) - 
            pow(log(x) - meanlog, 2) / (2 * sdlog * sdlog);
  };
  
  ld.pareto = function(x, scale, shape) {
    if (x < scale) {
      return -Infinity;
    }
    return log(shape) + shape * log(scale) - (shape + 1) * log(x);
  };
  
  ld.t  =  function(x, mu, sigma, nu) {
    nu = nu > 1e100 ? 1e100 : nu;
    return gammaln((nu + 1)/2) - gammaln(nu/2) - log(sqrt(pi * nu) * sigma) +
           log(pow(1 + (1/nu) * pow((x - mu)/sigma, 2), -(nu + 1)/2));
  };
  
  // Commented out for now as this doesn't give the same answers 
  // as the R version dweibull, for example, when x = 0.0 .
  /*
  ld.weibull = function(x, shape, scale) {
    if (x < 0)
      return -Infinity;
    return log(shape) - log(scale) + (shape - 1) * log((x / scale)) - pow(x / scale, shape);
  };
  */
    
  ld.exp = function(x, rate) {
      return x < 0 ? -Infinity : log(rate) -rate * x;
  };
  
  ld.unif = function(x, min, max) {
      return (x < min || x > max) ? -Infinity : log(1 / (max - min));
  };
  
  ////////// Discrete distributions //////////
  ////////////////////////////////////////////
  
  ld.bern = function(x, prob) {
      return !(x === 0 || x === 1) ? -Infinity : log(x * prob + (1 - x) * (1 - prob));
  };
  
  ld.binom = function(x, size, prob) {
    if(x > size || x < 0) {
      return -Infinity;
    }
    if(prob === 0 || prob === 1) {
      return (size * prob) === x ? 0 : -Infinity;
    }
    return combinationln(size, x) + x * log(prob) + (size - x) * log(1 - prob);
  };
  
  ld.nbinom = function(x, size, prob) {
    if(x < 0) {
      return -Infinity;
    }
    return combinationln(x + size - 1, size - 1) + x * log(1 - prob) + size * log(prob);
  };
  
  
  ld.pois = function(x, lambda) {
      return x < 0 ? -Infinity : log(lambda) * x - lambda - factorialln(x);
  };
  
  return ld;
}());