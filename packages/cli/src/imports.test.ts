import { parseImportsField, createExportsField } from "./imports";

const util = (a: {} | null) => {
  const buildsToCombinations = parseImportsField(a);
  return JSON.stringify(
    {
      builds: [...buildsToCombinations.keys()],
      exports: createExportsField(buildsToCombinations, (x) => x),
    },
    null,
    2
  );
};

test("basic", () => {
  expect(
    util({
      "#a": {
        node: "./a-node.js",
        default: "./a-default.js",
      },
    })
  ).toMatchInlineSnapshot(`
    "{
      "builds": [
        [],
        [
          "node"
        ]
      ],
      "exports": {
        "node": [
          "node"
        ],
        "default": []
      }
    }"
  `);
});

test("fewer builds than conditions", () => {
  expect(
    util({
      "#a": {
        worker: "./a.js",
        browser: "./a-browser.js",
        default: "./a.js",
      },
    })
  ).toMatchInlineSnapshot(`
    "{
      "builds": [
        [],
        [
          "browser"
        ]
      ],
      "exports": {
        "worker": [],
        "browser": [
          "browser"
        ],
        "default": []
      }
    }"
  `);
});

test("multiple imports entries with the same conditions and builds", () => {
  expect(
    util({
      "#a": {
        worker: "./a.js",
        browser: "./a-browser.js",
        default: "./a.js",
      },
      "#b": {
        worker: "./b.js",
        browser: "./b-browser.js",
        default: "./b.js",
      },
    })
  ).toMatchInlineSnapshot(`
    "{
      "builds": [
        [],
        [
          "browser"
        ]
      ],
      "exports": {
        "worker": [],
        "browser": [
          "browser"
        ],
        "default": []
      }
    }"
  `);
});

test("multiple imports entries with the same conditions with more builds in one", () => {
  expect(
    util({
      "#a": {
        worker: "./a.js",
        browser: "./a-browser.js",
        default: "./a.js",
      },
      "#b": {
        worker: "./b-worker.js",
        browser: "./b-browser.js",
        default: "./b.js",
      },
    })
  ).toMatchInlineSnapshot(`
    "{
      "builds": [
        [],
        [
          "browser"
        ],
        [
          "worker"
        ]
      ],
      "exports": {
        "worker": [
          "worker"
        ],
        "browser": [
          "browser"
        ],
        "default": []
      }
    }"
  `);
});

test("multiple imports entries with distinct conditions", () => {
  expect(
    util({
      "#a": {
        worker: "./a.js",
        browser: "./a-browser.js",
        default: "./a.js",
      },
      "#b": {
        development: "./b-dev.js",
        default: "./b.js",
      },
    })
  ).toMatchInlineSnapshot(`
    "{
      "builds": [
        [],
        [
          "browser"
        ],
        [
          "development"
        ],
        [
          "browser",
          "development"
        ]
      ],
      "exports": {
        "development": {
          "worker": [
            "development"
          ],
          "browser": [
            "browser",
            "development"
          ],
          "default": [
            "development"
          ]
        },
        "worker": [],
        "browser": [
          "browser"
        ],
        "default": []
      }
    }"
  `);
});

test("dev vs default + worker vs browser vs default", () => {
  expect(
    util({
      "#b": {
        development: "./b-dev.js",
        default: "./b.js",
      },
      "#c": {
        worker: "./c-worker.js",
        browser: "./c-browser.js",
        default: "./c.js",
      },
    })
  ).toMatchInlineSnapshot(`
    "{
      "builds": [
        [],
        [
          "browser"
        ],
        [
          "development"
        ],
        [
          "browser",
          "development"
        ],
        [
          "worker"
        ],
        [
          "development",
          "worker"
        ]
      ],
      "exports": {
        "development": {
          "worker": [
            "development",
            "worker"
          ],
          "browser": [
            "browser",
            "development"
          ],
          "default": [
            "development"
          ]
        },
        "worker": [
          "worker"
        ],
        "browser": [
          "browser"
        ],
        "default": []
      }
    }"
  `);
});
test("dev vs default + browser vs worker vs default", () => {
  expect(
    util({
      "#b": {
        development: "./b-dev.js",
        default: "./b.js",
      },
      "#c": {
        browser: "./c-browser.js",
        worker: "./c-worker.js",
        default: "./c.js",
      },
    })
  ).toMatchInlineSnapshot(`
    "{
      "builds": [
        [],
        [
          "browser"
        ],
        [
          "development"
        ],
        [
          "browser",
          "development"
        ],
        [
          "worker"
        ],
        [
          "development",
          "worker"
        ]
      ],
      "exports": {
        "development": {
          "browser": [
            "browser",
            "development"
          ],
          "worker": [
            "development",
            "worker"
          ],
          "default": [
            "development"
          ]
        },
        "browser": [
          "browser"
        ],
        "worker": [
          "worker"
        ],
        "default": []
      }
    }"
  `);
});

test("worker vs browser in both positions", () => {
  expect(
    util({
      "#a": {
        worker: "./c-worker.js",
        browser: "./c-browser.js",
        default: "./c.js",
      },
      "#b": {
        development: "./b-dev.js",
        default: "./b.js",
      },
      "#c": {
        browser: "./c-browser.js",
        worker: "./c-worker.js",
        default: "./c.js",
      },
    })
  ).toMatchInlineSnapshot(`
    "{
      "builds": [
        [],
        [
          "browser"
        ],
        [
          "development"
        ],
        [
          "browser",
          "development"
        ],
        [
          "worker"
        ],
        [
          "browser",
          "worker"
        ],
        [
          "development",
          "worker"
        ],
        [
          "browser",
          "development",
          "worker"
        ]
      ],
      "exports": {
        "browser": {
          "development": {
            "worker": [
              "browser",
              "development",
              "worker"
            ],
            "default": [
              "browser",
              "development"
            ]
          },
          "worker": [
            "browser",
            "worker"
          ],
          "default": [
            "browser"
          ]
        },
        "development": {
          "worker": [
            "development",
            "worker"
          ],
          "default": [
            "development"
          ]
        },
        "worker": [
          "worker"
        ],
        "default": []
      }
    }"
  `);
});

test("no conditions", () => {
  expect(
    util({
      "#b": "./b.js",
      "#c": {
        default: "./c.js",
      },
    })
  ).toMatchInlineSnapshot(`
    "{
      "builds": [
        []
      ],
      "exports": []
    }"
  `);
});
