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
    "init": [0.5],
    "state": [0.5]
  },
  "sigma": {
    "type": "real",
    "dim": [1],
    "upper": Infinity,
    "lower": 0,
    "init": [1],
    "state": [1]
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
    "init": [0.5],
    "state": [0.5]
  },
  "state": {
    "type": "binary",
    "init": [1],
    "dim": [1],
    "upper": null,
    "lower": null,
    "state": [1]
  },
  "mat": {
    "type": "int",
    "dim": [3,3],
    "upper": null,
    "lower": null,
    "init": [[1,1,1],
             [1,1,1],
             [1,1,1]],
    "state": [[1,1,1],
              [1,1,1],
              [1,1,1]]
  }
};
