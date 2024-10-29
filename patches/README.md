# @lexical/code Path

## Why

The lexical code node only supports a few languages, which can be seen [here](https://github.com/facebook/lexical/blob/v0.15.0/packages/lexical-code/src/CodeHighlighterPrism.ts)
Every language that is not supported gets also removed from the markdown content.

For example, since go is not supported, lexical would replace this markdown

```go
// some go code
```

with this markdown

```
// some go code
```

Therefore, users would always lose the information, which language should be used, if it is an unsupported language.
To fix this we patch the behaviour of [mapToPrismLanguage](https://github.com/facebook/lexical/blob/ea8ca9b2942615eeb5fd39671a6c5a5921bc13dc/packages/lexical-code/src/CodeNode.ts#L51).
With this patch, `mapToPrismLanguage` will only set the language as undefined, if the parameter is null and not if the language itself is unsupported.
