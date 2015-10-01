"use strict";

// TODO Change names and parameterization in order to match R.


// Most of the code below is directly taken from the great Jstat project
// https://github.com/jstat/
/*
Copyright (c) 2013 jStat

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

////////// Helper functions //////////

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

var factorialln = function(n) {
  return n < 0 ? NaN : gammaln(n + 1);
};

var combinationln = function(n, m){
  return factorialln(n) - factorialln(m) - factorialln(n - m);
};

// natural logarithm of beta function
var betaln = function betaln(x, y) {
  return gammaln(x) + gammaln(y) - gammaln(x + y);
};

var log = Math.log;
var pow = Math.pow;
var sqrt = Math.sqrt;
var pi = Math.PI;

////////// Continous distributions //////////

var beta_log_pdf = function(x, alpha, beta) {
  if (x > 1 || x < 0) {
      return -Infinity;
  }
  if(alpha === 1 && beta === 1) {
    return 0;
  } else {
    return (alpha - 1) * log(x) + (beta - 1) * log(1 - x) - betaln(alpha, beta);  
  }
};


var cauchy_log_pdf = function(x, location, scale) {
  return log(scale) - log(pow(x - location, 2) + pow(scale, 2))  - log(pi);
};

var norm_log_pdf = function(x, mean, std) {
    return -0.5 * log(2 * pi) -log(std) - pow(x - mean, 2) / (2 * std * std);
};

var gamma_log_pdf = function(x, shape, scale) {
  if (x < 0) {
    return -Infinity;
  }
  if((x === 0 && shape === 1) ) {
    return -log(scale);
  } else {
    return (shape - 1) * log(x) - x / scale - gammaln(shape) - shape * log(scale);
  }
};

var invgamma_log_pdf = function(x, shape, scale) {
    if (x <= 0) {
      return -Infinity;
    }
    return -(shape + 1) * log(x) - scale / x - gammaln(shape) + shape * log(scale);
  };

var lognormal_log_pdf =  function(x, mu, sigma) {
  if (x <= 0) {
    return -Infinity;
  }
  return -log(x) - 0.5 * log(2 * pi) - log(sigma) - 
          pow(log(x) - mu, 2) / (2 * sigma * sigma);
};

var pareto_log_pdf = function(x, scale, shape) {
  if (x < scale) {
    return -Infinity;
  }
  return log(shape) + shape * log(scale) - (shape + 1) * log(x);
};

var t_log_pdf  =  function(x, mu, sigma, nu) {
  nu = nu > 1e100 ? 1e100 : nu;
  return gammaln((nu + 1)/2) - gammaln(nu/2) - log(sqrt(pi * nu) * sigma) +
         log(pow(1 + (1/nu) * pow((x - mu)/sigma, 2), -(nu + 1)/2));
};

// This doesn't really give the same answers as the R version dweibull
// for example, when x = 0.0
var weibull_log_pdf = function(x, shape, scale) {
  if (x < 0)
    return -Infinity;
  return log(shape) - log(scale) + (shape - 1) * log((x / scale)) - pow(x / scale, shape);
};

  



var exp_log_pdf = function(x, rate) {
    return x < 0 ? -Infinity : log(rate) -rate * x;
};

var unif_log_pdf = function(x, a, b) {
    return (x < a || x > b) ? -Infinity : log(1 / (b - a));
};

////////// Discrete distributions //////////

var bern_log_pdf = function(x, p) {
    return !(x === 0 || x === 1) ? -Infinity : log(x * p + (1 - x) * (1 - p));
};

var binom_log_pdf = function(x, n, p) {
  if(x > n || x < 0) {
    return -Infinity;
  }
  if(p === 0 || p === 1) {
    return (n * p) === x ? 0 : -Infinity;
  }
  return combinationln(n, x) + x * log(p) + (n - x) * log(1 - p);
};

var nbinom = function(x, size, prob) {
  if(x < 0) {
    return -Infinity;
  }
  return combinationln(x + size - 1, size - 1) + x * log(1 - prob) + size * log(prob);
};


var poisson_log_pdf = function(x, lambda) {
    return x < 0 ? -Infinity : log(lambda) * x - lambda - factorialln(x);
};

