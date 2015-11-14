var replicate = function(n, fun) {
  var result = [];
  for(var i = 0; i < n; i++) {
    result[i] = fun();
  }
  return(result);
};

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
    "init": 0.5
  },
  "sigma": {
    "type": "real",
    "dim": [1],
    "upper": Infinity,
    "lower": 0,
    "init": 1
  }
};

var params2 = {
  "theta": {},
  "state": {
    "type": "binary",
    "init": 1
  },
  "mat": {
    "type": "int",
    "dim": [3, 3]
  }
};

var params2_completed = {
  "theta": {
    "type": "real",
    "dim": [1],
    "upper": Infinity,
    "lower": -Infinity,
    "init": 0.5
  },
  "state": {
    "type": "binary",
    "init": 1,
    "dim": [1],
    "upper": 1,
    "lower": 0
  },
  "mat": {
    "type": "int",
    "dim": [3,3],
    "upper": Infinity,
    "lower": -Infinity,
    "init": [[1,1,1],
             [1,1,1],
             [1,1,1]]
  }
};

//round(rnorm(10, 100, 50))
var norm_data = [100, 62, 96, 122, 141, 144, 74, 73, 78, 128];

// Should be compatible with the params1 definition.
var norm_post = function(par, data) {
  var mu = par.mu;
  var sigma = par.sigma;
  var log_post = 0;
  log_post += ldnorm(mu, 0, 100);
  log_post += ldunif(sigma, 0, 100);
  for(var i = 0; i < data.length; i++) {
    log_post += ldnorm(data[i], mu, sigma);
  }
  return log_post;
};

var norm_dens = function(par) {
  return ldnorm(par.x, 10, 5);
};

var multivar_norm_dens = function(par) {
  x1 = par.x[0][0];
  x2 = par.x[0][1];
  x3 = par.x[1][0];
  x4 = par.x[1][1];
  var log_post = ldnorm(x1, 1000, 50) + 
              ldnorm(x2, 10, 5) + 
              ldnorm(x3, 0.1, 0.5) + 
              ldnorm(x4, 0.001, 0.05);
  return log_post;
};

var poisson_dens = function(par) {
  return ldpois(par.x, 10);
};

var multivar_poisson_dens = function(par) {
  x1 = par.x[0][0];
  x2 = par.x[0][1];
  x3 = par.x[1][0];
  x4 = par.x[1][1];
  var log_post = ldpois(x1, 0.1) + 
              ldpois(x2, 10) + 
              ldpois(x3, 1000) + 
              ldpois(x4, 100000);
  return log_post;
};

var bern_dens = function(par) {
  return ldbern(par.x, 0.85);
};

var multi_bern_dens = function(par) {
  x1 = par.x[0][0];
  x2 = par.x[0][1];
  x3 = par.x[1][0];
  x4 = par.x[1][1];
  return Math.log(x1 * x2 * 0.85 + (1 - x1*x2) * 0.15) + 
    Math.log(x3*x4 * 0.75 + (1 - x3*x4) * 0.25);
};

var params_complex_model = {
  "p1": {
    "type": "real",
    "lower": 0,
    "upper": 1
  },
  "n1": {
    "type": "int",
    "lower": 1,
    "init": 1
  },
  "m": {
    type: "binary"
  }
};

var complex_model_post = function(par, x) {
  var p1 = par.p1;
  var n1 = par.n1;
  var m = par.m;
  var log_post = 0;
  log_post += ldbern(m, 0.4);
  log_post += ldbeta(p1, 2, 2);
  log_post += ldnbinom(n1, 2, 0.1);
  for(var i = 0; i < x.length; i++) {
    if(m === 0) {
      log_post += ldnbinom(x[i], 21, 0.5);
    } else {
      log_post += ldnbinom(x[i], n1, p1);
      
    }
  }
  return log_post;
};