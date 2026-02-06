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
  ],
  invalid: [
    {
      code: dedent`
        {
          "title": "Hello",
          "title": "Hi"
        }
      `,
      errors(errors) {
        expect(errors).toHaveLength(1)
        expect(errors.map(error => error.messageId)).toMatchInlineSnapshot(`
          [
            "duplicateKeyNotAllowed",
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
            "keyConflictsWithPrefix",
            "keyIsPrefixOfAnother",
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
            "keyConflictsWithPrefix",
            "keyIsPrefixOfAnother",
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
            "keyConflictsWithPrefix",
            "keyIsPrefixOfAnother",
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
        expect(errors.map(error => error.messageId)).toMatchInlineSnapshot(`
          [
            "nestedJsonNotAllowed",
          ]
        `)
      },
    },
  ],
})
