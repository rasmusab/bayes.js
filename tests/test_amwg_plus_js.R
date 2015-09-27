library(testthat)
library(js)

context("AMWG Plus")

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


j <- new_context()
j$source("../amwg_plus.js")
j$source("test_data.js")

test_that("parameter completion works", {
  params1 <- sort_list_by_names(j$get( "complete_params(params1, param_init)" ))
  params1_completed <- sort_list_by_names(j$get( "params1_completed" ))
  expect_identical(params1, params1_completed)
  params2 <- sort_list_by_names(j$get( "complete_params(params2, param_init)" ))
  params2_completed <- sort_list_by_names(j$get( "params2_completed" ))
  expect_identical(params2, params2_completed)
})

test_that("the js version of rnorm works (this might fail occationally as it is random)", {
  norm_sample <- replicate(4500, j$get("rnorm(10, 5)"))
  expect_more_than(shapiro.test(norm_sample)$p.val, 0.01)
  expect_more_than(t.test(norm_sample, mu = 10)$p.val, 0.01)
  expect_more_than(var.test(norm_sample, rnorm(9999, 10, 5))$p.val, 0.01)
})

test_that("real_adaptive_metropolis_sampler works", {
  j$eval("var sampler = real_adaptive_metropolis_sampler('x', -Infinity, Infinity)")
  j$eval("var state = {x: 0}")
  norm_samples = replicate(10000, j$get("state.x = sampler.next(state, norm_dens)"))
  norm_samples = norm_samples[sample(1:10000, 1000)]
  expect_more_than(shapiro.test(norm_sample)$p.val, 0.01)
  expect_more_than(t.test(norm_sample, mu = 10)$p.val, 0.01)
  expect_more_than(var.test(norm_sample, rnorm(9999, 10, 5))$p.val, 0.01)
})

test_that("int_adaptive_metropolis_sampler works", {
  j$eval("var sampler = int_adaptive_metropolis_sampler('x', 0, Infinity)")
  j$eval("var state = {x: 1}")
  poisson_samples = replicate(10000, j$get("state.x = sampler.next(state, poisson_dens)"))
  poisson_samples = poisson_samples[sample(1:10000, 1000)]
  expect_more_than(poisson.test(sum(poisson_samples), length(poisson_samples) * 10)$p.val, 0.01)
  
  # Cludging together a chi square test with H0 Poisson(10)
  p_expected <- c( dpois(x=c(0:20),lambda=10), 1 - ppois(q = 20,lambda = 10))
  poisson_samples[poisson_samples > 21] <- 21 
  cont_table <- table(factor(poisson_samples, levels = 0:21))
  expect_more_than(chisq.test(x = cont_table, p = p_expected)$p.val, 0.01)
})

