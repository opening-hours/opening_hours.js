# Internals

## Terminology

    Mo-Fr 10:00-11:00;  Th 10:00-12:00
    \_____rule_____/  \ \____rule____/
                       \
                        ";" Rule separator (could also be "," or "||")

    Jan Mo-Fr 10:00-11:00
    \_/ \___/ \_________/
    selectors (left to right: month, weekday, time)

    Logic:
    - Tokenize
    Foreach rule:
    - Run top-level (rule) parser
      - Which calls sub parser for specific selector types
        - Which produce selector functions

## Tokens

The tokens are stored in the array `tokens` which has the following structure. The example results from the value `We-Fr 10:00-24:00 open "it is open", Mo closed "It‘s monday." || 2012 "please call"; Jan 1 open "should never appear"` which is in the test framework.

The most inner array represents one token:

0. [lexeme](https://en.wikipedia.org/wiki/Lexeme) (an internal representation of the token value).
1. Token name
2. Start position of the token in the input stream (which is used for generation warnings and let the user know the position where the problem occurred)
3. Optional and specifies to which selector the token belongs to.
4. Optional, Symbol from https://wiki.openstreetmap.org/wiki/Key:opening_hours/specification#nth_entry
   Might later replace the token name.

```JavaScript
[ // Tokenized input stream
    [ // One rule
        [ // All tokens of one rule. Referred to as "selector array of tokens".
            [ // Referred to as "token array".
                3,
                "weekday",
                117,
                "weekday"
            ],
            [ // Still belongs to token group "weekday".
                "-",
                "-",
                115
            ],
            [
                5,
                "weekday",
                114
            ],
            [
                10,
                "number",
                111,
                "time" // Start of new selector type "time".
            ],
            [
                ":",
                "timesep",
                109
            ],
            [
                0,
                "number",
                108
            ],
            [
                "-",
                "-",
                106
            ],
            [
                24,
                "number",
                105
            ],
            [
                ":",
                "timesep",
                103
            ],
            [
                0,
                "number",
                102
            ],
            [
                "open",
                "state", // Selector type with only one token. The token name is also the name of the selector.
                99
            ],
            [
                "it is open",
                "comment",
                94
            ],
            [
                ",",
                "rule separator",
                82
            ],
            [
                1,
                "weekday",
                80,
                "weekday"
            ],
            [
                "closed",
                "state",
                77
            ],
            [
                "It‘s monday.",
                "comment",
                70
            ]
        ],
        false,
        55 // Last character in value of this rule (excluding <any_rule_separator>).
    ],
    [
        [
            [
                "2012",
                "year",
                52,
                "year"
            ],
            [
                "please call",
                "comment",
                47
            ]
        ],
        true,
        34
    ],
    [
        [
            [
                0,
                "month",
                32,
                "month"
            ],
            [
                1,
                "number",
                28
            ],
            [
                "open",
                "state",
                26
            ],
            [
                "should never appear",
                "comment",
                21
            ]
        ],
        false
    ]
]
```

## ToDo

* Make implementation of weekday and holiday interaction clearer.
