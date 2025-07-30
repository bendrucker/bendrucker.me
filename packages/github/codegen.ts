import type { CodegenConfig } from '@graphql-codegen/cli'
import { resolve } from 'path'

const config: CodegenConfig = {
  schema: resolve(__dirname, '../../node_modules/@octokit/graphql-schema/schema.graphql'),
  documents: ['src/queries/**/*.graphql'],
  generates: {
    './src/gql/': {
      preset: 'client',
      plugins: [],
      presetConfig: {
        gqlTagName: 'gql',
      },
      config: {
        useTypeImports: true,
      }
    }
  },
  ignoreNoDocuments: true,
}

export default config
