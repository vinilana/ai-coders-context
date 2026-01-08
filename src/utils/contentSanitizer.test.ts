import {
  sanitizeAIResponse,
  hasReasoningPrefix,
  extractFinalContent,
  SanitizeOptions
} from './contentSanitizer';

describe('contentSanitizer', () => {
  describe('sanitizeAIResponse', () => {
    it('should remove "I will..." reasoning prefixes', () => {
      const input = `I will first read the README.md file to understand the project.
I will then analyze the package.json.

# Project Documentation

This is the actual documentation content.`;

      const result = sanitizeAIResponse(input);

      expect(result).toBe(`# Project Documentation

This is the actual documentation content.`);
    });

    it('should remove "Let me..." prefixes', () => {
      const input = `Let me analyze the codebase structure.
Let me check the main entry point.

# Getting Started

Welcome to the project.`;

      const result = sanitizeAIResponse(input);

      expect(result).toBe(`# Getting Started

Welcome to the project.`);
    });

    it('should remove numbered planning steps', () => {
      const input = `1. Read the main configuration file
2. Analyze the service architecture
3. Check the test patterns
4. Generate documentation

# Architecture Overview

The system is built with...`;

      const result = sanitizeAIResponse(input);

      expect(result).toBe(`# Architecture Overview

The system is built with...`);
    });

    it('should remove bulleted planning steps', () => {
      const input = `- Read the source files
- Analyze the exports
- Check dependencies

# Module Guide

This module provides...`;

      const result = sanitizeAIResponse(input);

      expect(result).toBe(`# Module Guide

This module provides...`);
    });

    it('should remove "Wait, actually..." self-corrections', () => {
      const input = `Wait, I should also check the config file.
Actually, let me look at the tests first.

# Testing Guide

Run tests with npm test.`;

      const result = sanitizeAIResponse(input);

      expect(result).toBe(`# Testing Guide

Run tests with npm test.`);
    });

    it('should remove "### Reading..." analysis headers at start', () => {
      const input = `### Reading package.json
### Analyzing src/index.ts

# API Reference

## Functions

### getData()`;

      const result = sanitizeAIResponse(input);

      expect(result).toBe(`# API Reference

## Functions

### getData()`);
    });

    it('should preserve YAML front matter', () => {
      const input = `---
title: Documentation
author: AI
---

I will analyze the codebase.

# Documentation

Content here.`;

      const result = sanitizeAIResponse(input);

      expect(result).toBe(`---
title: Documentation
author: AI
---
# Documentation

Content here.`);
    });

    it('should preserve code blocks containing reasoning-like text', () => {
      const input = `# Example Code

\`\`\`typescript
// I will process the data
const data = getData();
let me = "variable name";
\`\`\`

More content.`;

      const result = sanitizeAIResponse(input);

      expect(result).toBe(input);
    });

    it('should not remove valid headers starting with action words', () => {
      const input = `# Getting Started

## Reading Configuration

The config file is located at...

## Understanding the Architecture

The system uses...`;

      const result = sanitizeAIResponse(input);

      expect(result).toBe(input);
    });

    it('should handle content with no reasoning prefix', () => {
      const input = `# Clean Documentation

This content has no reasoning prefix.

## Section One

Details here.`;

      const result = sanitizeAIResponse(input);

      expect(result).toBe(input);
    });

    it('should handle empty content', () => {
      expect(sanitizeAIResponse('')).toBe('');
      expect(sanitizeAIResponse(null as unknown as string)).toBe(null);
      expect(sanitizeAIResponse(undefined as unknown as string)).toBe(undefined);
    });

    it('should handle content that is entirely reasoning', () => {
      const input = `I will read the files.
Let me check the structure.
I need to understand the patterns.`;

      const result = sanitizeAIResponse(input);

      expect(result).toBe('');
    });

    it('should remove "First, I" style statements', () => {
      const input = `First, I need to understand the project structure.
Now, I will check the configuration.
Then, I should look at the tests.

# Project Guide

Here is the guide.`;

      const result = sanitizeAIResponse(input);

      expect(result).toBe(`# Project Guide

Here is the guide.`);
    });

    it('should remove "Let\'s" statements', () => {
      const input = `Let's start by reading the README.
Let's check the package.json next.

# Overview

Project overview here.`;

      const result = sanitizeAIResponse(input);

      expect(result).toBe(`# Overview

Project overview here.`);
    });

    it('should handle mixed reasoning and empty lines', () => {
      const input = `I will analyze this.

Let me read the file.


I need to check dependencies.

# Documentation

Content starts here.`;

      const result = sanitizeAIResponse(input);

      expect(result).toBe(`# Documentation

Content starts here.`);
    });

    it('should preserve HTML comments', () => {
      const input = `<!-- This is a comment -->
# Title

Content here.`;

      const result = sanitizeAIResponse(input);

      expect(result).toBe(input);
    });

    it('should preserve blockquotes', () => {
      const input = `> Note: This is important

# Title

Content.`;

      const result = sanitizeAIResponse(input);

      expect(result).toBe(input);
    });

    it('should handle "I\'m going to" patterns', () => {
      const input = `I'm going to examine the source code.
I'm going to check the test files.

# Source Code Guide

The source code is organized...`;

      const result = sanitizeAIResponse(input);

      expect(result).toBe(`# Source Code Guide

The source code is organized...`);
    });
  });

  describe('hasReasoningPrefix', () => {
    it('should detect "I will" prefixes', () => {
      const input = `I will read the files first.

# Documentation`;

      expect(hasReasoningPrefix(input)).toBe(true);
    });

    it('should detect "Let me" prefixes', () => {
      const input = `Let me analyze this code.

# Guide`;

      expect(hasReasoningPrefix(input)).toBe(true);
    });

    it('should detect numbered planning steps', () => {
      const input = `1. Read the config
2. Analyze the structure

# Docs`;

      expect(hasReasoningPrefix(input)).toBe(true);
    });

    it('should return false for clean content', () => {
      const input = `# Documentation

This is clean content.`;

      expect(hasReasoningPrefix(input)).toBe(false);
    });

    it('should return false for empty content', () => {
      expect(hasReasoningPrefix('')).toBe(false);
      expect(hasReasoningPrefix(null as unknown as string)).toBe(false);
    });

    it('should handle content starting with empty lines', () => {
      const input = `

I will read the file.`;

      expect(hasReasoningPrefix(input)).toBe(true);
    });
  });

  describe('extractFinalContent', () => {
    it('should extract content after reasoning', () => {
      const input = `I will analyze this project.
Let me check the files.

# Final Documentation

This is the result.`;

      const result = extractFinalContent(input);

      expect(result).toBe(`# Final Documentation

This is the result.`);
    });

    it('should preserve front matter', () => {
      const input = `---
title: Test
---
I will analyze.

# Content

Body.`;

      const result = extractFinalContent(input);

      expect(result).toBe(`---
title: Test
---
# Content

Body.`);
    });
  });
});
