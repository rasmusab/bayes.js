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
  expect_identical(params1, params1_completed)
})