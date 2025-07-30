const config = {
    schema: '../../node_modules/@octokit/graphql-schema/schema.graphql',
    documents: ['src/queries/**/*.graphql'],
    generates: {
        './src/gql/': {
            preset: 'client',
            plugins: [],
            presetConfig: {
                gqlTagName: 'gql',
            }
        }
    },
    ignoreNoDocuments: true,
};
export default config;
//# sourceMappingURL=codegen.js.map