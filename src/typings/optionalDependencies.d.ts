declare module 'tree-sitter' {
  export default class Parser {
    setLanguage(language: unknown): void;
    parse(input: string): { rootNode: unknown };
  }
}

declare module 'tree-sitter-typescript' {
  export const typescript: unknown;
  export const tsx: unknown;
}

