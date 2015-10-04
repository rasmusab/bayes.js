library(testthat)
library(V8)

context("mcmc.js")

# Helper function that recursively sorts a list by names()
sort_list_by_names <- function(l) {
  if(is.list(l)) {
    l <- l[order(names(l))]
    l <- lapply(l, sort_list_by_names)
    l
  } else {
    l
  }
}

cont_chisq_test <- function(x1, x2, no_splits) {
  x1 <- as.matrix(x1)
  x2 <- as.matrix(x2)
  x1_cuts <- lapply(1:ncol(x1), function(i) {
    q <- quantile(c(x1[,i], x2[,i]) , seq(0, 1, length.out = no_splits + 1))
    cut(x1[,i], breaks=q, include.lowest=T)
  })
  x2_cuts <- lapply(1:ncol(x1), function(i) {
    q <- quantile(c(x1[,i], x2[,i]) , seq(0, 1, length.out = no_splits + 1))
    cut(x2[,i], breaks=q, include.lowest=T)
  })
  x1_counts <- as.vector(table(x1_cuts))
  x2_counts <- as.vector(table(x2_cuts))
  chisq.test(cbind(x1_counts, x2_counts))
}

j <- new_context()
j$source("../mcmc.js")
j$source("../distributions.js")
j$source("test_data.js")
#j$source("mcmc.js"); j$source("distributions.js"); j$source("tests/test_data.js")

test_that("parameter completion works", {
  params1 <- sort_list_by_names(j$get( "complete_params(params1, param_init)" ))
  params1_completed <- sort_list_by_names(j$get( "params1_completed" ))
  expect_identical(params1, params1_completed)
  params2 <- sort_list_by_names(j$get( "complete_params(params2, param_init)" ))
  params2_completed <- sort_list_by_names(j$get( "params2_completed" ))
  expect_identical(params2, params2_completed)
})

test_that("the js version of rnorm works (this might fail occationally as it is random)", {
  norm_sample <- j$get("replicate(4500, function()  {return rnorm(10, 5)} )")
  expect_more_than(shapiro.test(norm_sample)$p.val, 0.01)
  expect_more_than(t.test(norm_sample, mu = 10)$p.val, 0.01)
  expect_more_than(var.test(norm_sample, rnorm(9999, 10, 5))$p.val, 0.01)
})

test_that("RealMetropolisStepper works", {
  j$eval("var state = {x: 0}")
  j$eval("var posterior = function() { return norm_dens(state)};")
  j$eval("var parameters = {x: {lower: -Infinity, upper: Infinity}};")
  j$eval("var stepper = new RealMetropolisStepper(parameters, state, posterior)")
  norm_samples = j$get("replicate(10000, function()  {return stepper.step()} )")
  norm_samples = norm_samples[sample(1:10000, 1000)]
  expect_more_than(shapiro.test(norm_sample)$p.val, 0.01)
  expect_more_than(t.test(norm_sample, mu = 10)$p.val, 0.01)
  expect_more_than(var.test(norm_sample, rnorm(9999, 10, 5))$p.val, 0.01)
})

test_that("IntMetropolisStepper works", {
  j$eval("var state = {x: 1}")
  j$eval("var posterior = function() { return poisson_dens(state)};")
  j$eval("var parameters = {x: {lower: 0, upper: Infinity}};")
  j$eval("var stepper = new IntMetropolisStepper(parameters, state, posterior)")
  poisson_samples = j$get("replicate(10000, function()  {return stepper.step()} )")
  poisson_samples = poisson_samples[sample(1:10000, 1000)]
  expect_more_than(poisson.test(sum(poisson_samples), length(poisson_samples) * 10)$p.val, 0.01)
  
  # Cludging together a chi square test with H0 Poisson(10)
  p_expected <- c( dpois(x=c(0:20),lambda=10), 1 - ppois(q = 20,lambda = 10))
  poisson_samples[poisson_samples > 21] <- 21 
  cont_table <- table(factor(poisson_samples, levels = 0:21))
  expect_more_than(chisq.test(x = cont_table, p = p_expected)$p.val, 0.01)
})

test_that("MultiRealComponentMetropolisStepper works", {
  j$eval("var state = {x: [[0, 0], [0, 0]]}")
  j$eval("var posterior = function() { return multivar_norm_dens(state)};")
  j$eval("var options = {max_adaptation: 0.2, prop_log_scale: [[10,0],[-10, 5]]};")
  j$eval("var parameters = {x: {lower: -Infinity, upper: Infinity, dim: [2, 2]}};")
  j$eval("var stepper = new MultiRealComponentMetropolisStepper(parameters, state, posterior, options)")
  norm_samples = j$get("replicate(100, function()  {return stepper.step()} )")
  j$eval("stepper.stop_adaptation()")
  norm_samples = j$get("replicate(100, function()  {return stepper.step()} )")
  j$eval("stepper.start_adaptation()")
  norm_samples = j$get("replicate(10000, function()  {return stepper.step()} )")
  norm_samples = j$get("replicate(10000, function()  {return stepper.step()} )")
  norm_samples = norm_samples[sample(1:10000, 1000), , ]
  expect_more_than(shapiro.test(norm_samples[, 1,1])$p.val, 0.01)
  expect_more_than(t.test(norm_samples[, 1,2], mu = 10)$p.val, 0.01)
  expect_more_than(var.test(norm_samples[, 2,1], rnorm(9999, 0.1, 0.5))$p.val, 0.01)
})

test_that("MultiIntComponentMetropolisStepper works", {
  j$eval("var state = {x: [[0, 0], [0, 0]]}")
  j$eval("var posterior = function() { return multivar_poisson_dens(state)};")
  j$eval("var options = {batch_size: 10, target_accept_rate: [[0.22, 0.22],[0.75, 0.10]], prop_log_scale: [[1,10],[30, 1]]};")
  j$eval("var parameters = {x: {lower: 0, upper: Infinity, dim: [2, 2]}};")
  j$eval("var stepper = new MultiIntComponentMetropolisStepper(parameters, state, posterior, options)")
  pois_samples = j$get("replicate(100, function()  {return stepper.step()} )")
  j$eval("stepper.stop_adaptation()")
  pois_samples = j$get("replicate(100, function()  {return stepper.step()} )")
  j$eval("stepper.start_adaptation()")
  pois_samples = j$get("replicate(10000, function()  {return stepper.step()} )")
  pois_samples = j$get("replicate(10000, function()  {return stepper.step()} )")
  pois_samples = pois_samples[sample(1:10000, 1000), , ]
  expect_more_than(poisson.test(sum(pois_samples[ ,1,1]), length(pois_samples[ , 1,1]) * 0.1)$p.val, 0.01)
  
  # Cludging together a chi square test with H0 Poisson(10)
  p_expected <- c( dpois(x=c(0:20),lambda=10), 1 - ppois(q = 20,lambda = 10))
  poisson_samples[pois_samples[ ,1,2] > 21] <- 21 
  cont_table <- table(factor(poisson_samples, levels = 0:21))
  expect_more_than(chisq.test(x = cont_table, p = p_expected)$p.val, 0.01)
})

test_that("BinaryStepper works", {
  j$eval("var state = {x: 0}")
  j$eval("var posterior = function() { return bern_dens(state)};")
  j$eval("var parameters = {x: {type: 'binary'}};")
  j$eval("var stepper = new BinaryStepper(parameters, state, posterior)")
  bern_samples = j$get("replicate(1000, function()  {return stepper.step()} )")
  expect_more_than(binom.test(sum(bern_samples), length(bern_samples), p = 0.85)$p.val, 0.01)
})

test_that("BinaryComponentStepper works", {
  j$eval("var state = {x: [[0, 0], [0, 0]]}")
  j$eval("var posterior = function() { return multi_bern_dens(state)};")
  j$eval("var parameters = {x: {type: 'binary', dim: [2,2]} } ;")
  j$eval("var stepper = new BinaryComponentStepper(parameters, state, posterior)")
  bern_samples = j$get("replicate(1000, function()  {return stepper.step()} )")
  expected_freq_x1 <- (0.85 + 0.15) / (0.85 + 0.15 + 0.15 + 0.15)
  expected_freq_x4 <- (0.75 + 0.25) / (0.75 + 0.25 + 0.25 + 0.25)
  expect_more_than(binom.test(sum(bern_samples[ , 1, 1]), length(bern_samples[ , 1, 1]), p = expected_freq_x1)$p.val, 0.01)
  expect_more_than(binom.test(sum(bern_samples[ , 2, 2]), length(bern_samples[ , 2, 2]), p = expected_freq_x2)$p.val, 0.01)
})

test_that("AmwgPlustStepper works", {
  j$eval("var pars = complete_params(params1, param_init)" )
  j$eval("var state = {mu: pars.mu.init[0], sigma: pars.sigma.init[0]}")
  # round(rnorm(10, 100, 50))
  j$eval("var norm_data = [100, 62, 96, 122, 141, 144, 74, 73, 78, 128];")
  j$eval("var posterior = function() { return norm_post(state, norm_data)};")
  j$eval("var stepper = new AmwgPlusStepper(pars, state, posterior)")
  norm_post_samples = j$get("replicate(10000, function() {stepper.step(); return [state.mu, state.sigma];})")
  norm_post_samples = j$get("replicate(10000, function() {stepper.step(); return [state.mu, state.sigma];})")
  norm_post_samples = norm_post_samples[sample(1:nrow(norm_post_samples), 2000),]
  
  library(rjags)
  jags_norm_post_string <- "model {
    mu ~ dnorm(0, 1 / (100 * 100))
    sigma ~ dunif(0, 100)
    for(i in 1:length(x)) {
      x[i] ~ dnorm(mu, 1 / (sigma * sigma))
    }
  }"
  jags_norm_post <- jags.model(textConnection(jags_norm_post_string), inits = list(mu = 0, sigma = 1), quiet = TRUE,
                               data = list(x = c(100, 62, 96, 122, 141, 144, 74, 73, 78, 128)), n.chains = 1)
  jags_norm_samples <- coda.samples(jags_norm_post, variable.names = c("mu", "sigma"), n.iter = 10000, thin = 5, progress.bar = "none")
  jags_norm_samples <- as.matrix(jags_norm_samples)
  
  expect_more_than(cont_chisq_test(norm_post_samples[,1], jags_norm_samples[,1], no_splits = 10)$p.val, 0.01)
  expect_more_than(cont_chisq_test(norm_post_samples[,2], jags_norm_samples[,2], no_splits = 10)$p.val, 0.01)
  expect_more_than(cont_chisq_test(norm_post_samples, jags_norm_samples, no_splits = 5)$p.val, 0.01)
})
