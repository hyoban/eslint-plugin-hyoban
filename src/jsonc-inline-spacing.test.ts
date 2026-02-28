import { run, unindent as dedent } from 'eslint-vitest-rule-tester'
import * as jsoncParser from 'jsonc-eslint-parser'
import { expect } from 'vitest'

import jsoncInlineSpacing from './jsonc-inline-spacing'

run({
  name: 'jsonc-inline-spacing',
  rule: jsoncInlineSpacing,
  languageOptions: {
    parser: jsoncParser,
  },
  valid: [
    dedent`
      {
        "foo": ["1", "2", "3"]
      }
    `,
    {
      code: dedent`
        {
          "foo": [
              "1", "2", "3"]
        }
      `,
    },
    {
      code: dedent`
        {
          "foo": [              "1", "2", "3"
    
          ]
        }
      `,
    },
    {
      code: dedent`
        {
          "foo": { "a": 1, "b": "2" }
        }
      `,
    },
  ],
  invalid: [
    {
      code: dedent`
        {
            "foo": [  "1",   "2" , "3",    4, false  , null   ]
        }
      `,
      output(output) {
        expect(output).toMatchInlineSnapshot(`
          "{
              "foo": ["1", "2", "3", 4, false, null]
          }"
        `)
      },
      errors(errors) {
        expect(errors).toHaveLength(1)
      },
    },
    {
      code: dedent`
        {
            "foo": { "a": "1", "a":  "2" , "a": "3","a":    4, "a":false  , "a":null  ,"b": {"c" :1}  }
        }
      `,
      output(output) {
        expect(output).toMatchInlineSnapshot(`
          "{
              "foo": { "a": "1", "a": "2", "a": "3", "a": 4, "a": false, "a": null, "b": { "c": 1 } }
          }"
        `)
      },
      errors(errors) {
        expect(errors).toHaveLength(2)
      },
    },
  ],
})
