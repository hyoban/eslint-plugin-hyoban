import { run, unindent as dedent } from 'eslint-vitest-rule-tester'
import jsoncParser from 'jsonc-eslint-parser'
import { expect } from 'vitest'

import i18nFlatKey from './i18n-flat-key'

run({
  name: 'i18n-flat-key',
  rule: i18nFlatKey,
  languageOptions: {
    parser: jsoncParser,
  },
  valid: [
    {
      code: dedent`
        {
          "title": "Hello",
          "welcome.message": "Hi",
          "user.profile.name": "Name"
        }
      `,
    },
    {
      code: '\uFEFF{"title":"Hello"}',
    },
    {
      code: dedent`
        {
          "title": "Menu",
          "menu.home": "Home"
        }
      `,
    },
    {
      code: dedent`
        {
          "title": "Hello",
          "title": "Hi"
        }
      `,
    },
  ],
  invalid: [
    {
      code: dedent`
        {
          "menu": "Menu",
          "menu.home": "Home"
        }
      `,
      errors(errors) {
        expect(errors).toHaveLength(2)
        expect(errors.map(error => ({
          messageId: error.messageId,
          line: error.line,
          column: error.column,
        }))).toMatchInlineSnapshot(`
          [
            {
              "column": 3,
              "line": 2,
              "messageId": "keyIsPrefixOfAnother",
            },
            {
              "column": 3,
              "line": 3,
              "messageId": "keyConflictsWithPrefix",
            },
          ]
        `)
      },
    },
    {
      code: dedent`
        {
          "menu.home": "Home",
          "menu.home.mobile": "Mobile Home"
        }
      `,
      errors(errors) {
        expect(errors).toHaveLength(2)
        expect(errors.map(error => error.messageId)).toMatchInlineSnapshot(`
          [
            "keyIsPrefixOfAnother",
            "keyConflictsWithPrefix",
          ]
        `)
      },
    },
    {
      code: dedent`
        {
          "menu": "Menu",
          "menu.home": "Home"
        }
      `,
      errors(errors) {
        expect(errors).toHaveLength(2)
        expect(errors.map(error => error.messageId)).toMatchInlineSnapshot(`
          [
            "keyIsPrefixOfAnother",
            "keyConflictsWithPrefix",
          ]
        `)
      },
    },
    {
      code: dedent`
        {
          "menu": {
            "home": "Home"
          }
        }
      `,
      errors(errors) {
        expect(errors).toHaveLength(1)
        expect(errors.map(error => ({
          messageId: error.messageId,
          line: error.line,
          column: error.column,
        }))).toMatchInlineSnapshot(`
          [
            {
              "column": 3,
              "line": 2,
              "messageId": "nestedJsonNotAllowed",
            },
          ]
        `)
      },
    },
  ],
})
