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
  "theta": {"init": function() {return 1.5} },
  "state": {
    "type": "binary",
    "init": 1
  },
  "mat": {
    "type": "int",
    "dim": [3, 3],
    "init": function() {return 2}
  }
};

var params2_completed = {
  "theta": {
    "type": "real",
    "dim": [1],
    "upper": Infinity,
    "lower": -Infinity,
    "init": 1.5
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
    "init": [[2,2,2],
             [2,2,2],
             [2,2,2]]
  }
};

//round(rnorm(10, 100, 50))
var norm_data = [100, 62, 96, 122, 141, 144, 74, 73, 78, 128];

// Should be compatible with the params1 definition.
var norm_post = function(par, data) {
  var mu = par.mu;
  var sigma = par.sigma;
  var log_post = 0;
  log_post += ld.norm(mu, 0, 100);
  log_post += ld.unif(sigma, 0, 100);
  for(var i = 0; i < data.length; i++) {
    log_post += ld.norm(data[i], mu, sigma);
  }
  par.var = sigma * sigma;
  return log_post;
};

var norm_dens = function(par) {
  return ld.norm(par.x, 10, 5);
};

var multivar_norm_dens = function(par) {
  x1 = par.x[0][0];
  x2 = par.x[0][1];
  x3 = par.x[1][0];
  x4 = par.x[1][1];
  var log_post = ld.norm(x1, 1000, 50) + 
              ld.norm(x2, 10, 5) + 
              ld.norm(x3, 0.1, 0.5) + 
              ld.norm(x4, 0.001, 0.05);
  return log_post;
};

var poisson_dens = function(par) {
  return ld.pois(par.x, 10);
};

var multivar_poisson_dens = function(par) {
  x1 = par.x[0][0];
  x2 = par.x[0][1];
  x3 = par.x[1][0];
  x4 = par.x[1][1];
  var log_post = ld.pois(x1, 0.1) + 
              ld.pois(x2, 10) + 
              ld.pois(x3, 1000) + 
              ld.pois(x4, 100000);
  return log_post;
};

var bern_dens = function(par) {
  return ld.bern(par.x, 0.85);
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
  log_post += ld.bern(m, 0.4);
  log_post += ld.beta(p1, 2, 2);
  log_post += ld.nbinom(n1, 2, 0.1);
  for(var i = 0; i < x.length; i++) {
    if(m === 0) {
      log_post += ld.nbinom(x[i], 21, 0.5);
    } else {
      log_post += ld.nbinom(x[i], n1, p1);
      
    }
  }
  return log_post;
};


var binom_data = {"x": [5, 6, 9, 14, 13, 20], "n": [10, 10, 20, 20, 30, 30]};

var params_hierarchical_binomial = {
  "p": {
    "type": "real",
    "init": 0.5,
    "lower": 0,
    "upper": 1,
    "dim": [1,6] // The "1" is just there to complicate stuff.
  },
  "mu_logit_p": {
    "type": "real",
    "init": 0
  },
  "sigma_logit_p": {
    "type": "real",
    "lower": 0,
    "init": 1
  }
};

var logit = function(p) {
  return Math.log(p / (1 -p));
};

var hierarchical_binomial_post = function(par, d) {
  var p = par.p[0];
  var mu_logit_p = par.mu_logit_p;
  var sigma_logit_p = par.sigma_logit_p;
  var log_post = 0;
  log_post += ld.norm(mu_logit_p, 0, 10);
  log_post += ld.norm(sigma_logit_p, 0, 10);
  for(var i = 0; i < d.x.length; i++) {
    log_post += ld.norm(logit(p[i]), mu_logit_p, sigma_logit_p);
    log_post += ld.binom(d.x[i], d.n[i], p[i]); 
  }
  return log_post;
};
