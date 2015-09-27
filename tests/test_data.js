var params1 = {
  "mu": {
    "type": "real"
  },
  "sigma": {
    "type": "real",
    "lower": 0,
    "init": 1
  }
};

var params1_completed = {
  "mu": {
    "type": "real",
    "dim": [1],
    "upper": Infinity,
    "lower": -Infinity,
    "init": [0.5]
  },
  "sigma": {
    "type": "real",
    "dim": [1],
    "upper": Infinity,
    "lower": 0,
    "init": [1]
  }
};

var params2 = {
  "theta": {},
  "state": {
    "type": "binary",
    "init": [1]
  },
  "mat": {
    "type": "int",
    "dim": [3, 3]
  }
};

var params2_completed = {
  "theta": {
    "type": "real",
    "dim": [
      1
    ],
    "upper": null,
    "lower": null,
    "init": [0.5]
  },
  "state": {
    "type": "binary",
    "init": [1],
    "dim": [1],
    "upper": null,
    "lower": null
  },
  "mat": {
    "type": "int",
    "dim": [3,3],
    "upper": null,
    "lower": null,
    "init": [[1,1,1],
             [1,1,1],
             [1,1,1]]
  }
};

// These log PDFs are modified versions taken from https://github.com/jstat/
var norm_log_pdf = function(x, mean, std) {
    return -0.5 * Math.log(2 * Math.PI) -Math.log(std) - Math.pow(x - mean, 2) / (2 * std * std);
};

var exp_log_pdf = function(x, rate) {
    return x < 0 ? -Infinity : Math.log(rate) -rate * x;
};

var unif_log_pdf = function(x, a, b) {
    return (x < a || x > b) ? -Infinity : Math.log(1 / (b - a));
};

var bern_log_pdf = function(x, p) {
    return !(x === 0 || x === 1) ? -Infinity : Math.log(x * p + (1 - x) * (1 - p));
};

// Log-gamma function taken from https://github.com/jstat/jstat/blob/master/src/special.js
var gammaln = function(x) {
  var j = 0;
  var cof = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5
  ];
  var ser = 1.000000000190015;
  var xx, y, tmp;
  tmp = (y = xx = x) + 5.5;
  tmp -= (xx + 0.5) * Math.log(tmp);
  for (; j < 6; j++)
    ser += cof[j] / ++y;
  return Math.log(2.5066282746310005 * ser / xx) - tmp;
};

// natural log factorial of n taken from https://github.com/jstat/jstat/blob/master/src/special.js
var factorialln = function(n) {
  return n < 0 ? NaN : gammaln(n + 1);
};

var poisson_log_pdf = function(x, lambda) {
    return x < 0 ? -Infinity : Math.log(lambda) * x - lambda - factorialln(x);
};

//round(rnorm(10, 100, 50))
var norm_data = [100, 62, 96, 122, 141, 144, 74, 73, 78, 128];

// Should be compatible with the params1 definition.
var norm_post = function(par) {
  var mu = par.mu;
  var sigma = par.sigma;
  var log_post = 0;
  log_post += norm_log_pdf(mu, 0, 100);
  log_post += unif_log_pdf(sigma, 0, 100);
  for(var i = 0; i < norm_data.length; i++) {
    log_post += norm_log_pdf(norm_data[i], mu, sigma);
  }
  return log_post;
};

var norm_dens = function(par) {
  return norm_log_pdf(par.x, 10, 5);
};

var poisson_dens = function(par) {
  return poisson_log_pdf(par.x, 10);
};
