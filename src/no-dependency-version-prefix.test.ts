import { run, unindent as dedent } from 'eslint-vitest-rule-tester'
import jsoncParser from 'jsonc-eslint-parser'
import { expect } from 'vitest'

import type { Options } from './no-dependency-version-prefix'
import noDependencyVersionPrefix from './no-dependency-version-prefix'

const customDependencyKeysOptions: Options = [
  {
    dependencyKeys: ['overrides'],
  },
]

const customPeerDependencyKeysOptions: Options = [
  {
    dependencyKeys: ['peerDependencies'],
  },
]

const customVersionPrefixesOptions: Options = [
  {
    versionPrefixes: ['workspace:'],
  },
]

const customAllOptions: Options = [
  {
    dependencyKeys: ['overrides'],
    versionPrefixes: ['workspace:'],
  },
]

run({
  name: 'no-dependency-version-prefix',
  rule: noDependencyVersionPrefix,
  languageOptions: {
    parser: jsoncParser,
  },
  valid: [
    {
      code: dedent`
        {
          "dependencies": {
            "eslint": "9.39.2"
          },
          "devDependencies": {
            "vitest": "4.0.18"
          }
        }
      `,
    },
    {
      code: dedent`
        {
          "dependencies": {
            "eslint": "9.39.2"
          }
        }
      `,
    },
    {
      code: dedent`
        {
          "dependencies": {
            "eslint": "workspace:^"
          },
          "peerDependencies": {
            "typescript": ">=5.0.0"
          }
        }
      `,
    },
    {
      code: dedent`
        {
          "dependencies": {
            "eslint": "^9.39.2"
          }
        }
      `,
      options: customVersionPrefixesOptions,
    },
    {
      code: dedent`
        {
          "overrides": {
            "eslint": "9.39.2"
          }
        }
      `,
      options: customDependencyKeysOptions,
    },
    {
      code: dedent`
        {
          "peerDependencies": {
            "eslint": "^9.0.0-beta.1"
          }
        }
      `,
    },
  ],
  invalid: [
    {
      code: dedent`
        {
          "dependencies": {
            "eslint": "^9.39.2"
          }
        }
      `,
      output(output) {
        expect(output).toMatchInlineSnapshot(`
          "{
            "dependencies": {
              "eslint": "9.39.2"
            }
          }"
        `)
      },
      errors(errors) {
        expect(errors).toHaveLength(1)
        expect(errors.map(error => error.messageId)).toMatchInlineSnapshot(`
          [
            "dependencyVersionPrefix",
          ]
        `)
      },
    },
    {
      code: dedent`
        {
          "devDependencies": {
            "vitest": "~4.0.18"
          }
        }
      `,
      output(output) {
        expect(output).toMatchInlineSnapshot(`
          "{
            "devDependencies": {
              "vitest": "4.0.18"
            }
          }"
        `)
      },
      errors(errors) {
        expect(errors).toHaveLength(1)
        expect(errors.map(error => error.messageId)).toMatchInlineSnapshot(`
          [
            "dependencyVersionPrefix",
          ]
        `)
      },
    },
    {
      code: dedent`
        {
          "peerDependencies": {
            "eslint": "^9.0.0-beta.1"
          }
        }
      `,
      output: null,
      options: customPeerDependencyKeysOptions,
      errors(errors) {
        expect(errors).toHaveLength(1)
        expect(errors.map(error => error.messageId)).toMatchInlineSnapshot(`
          [
            "dependencyVersionPrefix",
          ]
        `)
      },
    },
    {
      code: dedent`
        {
          "overrides": {
            "eslint": "^9.39.2"
          }
        }
      `,
      output(output) {
        expect(output).toMatchInlineSnapshot(`
          "{
            "overrides": {
              "eslint": "9.39.2"
            }
          }"
        `)
      },
      options: customDependencyKeysOptions,
      errors(errors) {
        expect(errors).toHaveLength(1)
        expect(errors.map(error => error.messageId)).toMatchInlineSnapshot(`
          [
            "dependencyVersionPrefix",
          ]
        `)
      },
    },
    {
      code: dedent`
        {
          "dependencies": {
            "eslint": "workspace:9.39.2"
          }
        }
      `,
      output(output) {
        expect(output).toMatchInlineSnapshot(`
          "{
            "dependencies": {
              "eslint": "9.39.2"
            }
          }"
        `)
      },
      options: customVersionPrefixesOptions,
      errors(errors) {
        expect(errors).toHaveLength(1)
        expect(errors.map(error => error.messageId)).toMatchInlineSnapshot(`
          [
            "dependencyVersionPrefix",
          ]
        `)
      },
    },
    {
      code: dedent`
        {
          "overrides": {
            "eslint": "workspace:9.39.2"
          }
        }
      `,
      output(output) {
        expect(output).toMatchInlineSnapshot(`
          "{
            "overrides": {
              "eslint": "9.39.2"
            }
          }"
        `)
      },
      options: customAllOptions,
      errors(errors) {
        expect(errors).toHaveLength(1)
        expect(errors.map(error => error.messageId)).toMatchInlineSnapshot(`
          [
            "dependencyVersionPrefix",
          ]
        `)
      },
    },
  ],
})
