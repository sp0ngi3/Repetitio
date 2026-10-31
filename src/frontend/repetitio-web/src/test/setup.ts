import "@testing-library/jest-dom/vitest";

// jsdom has no layout engine; CodeMirror measures selections through DOM Range.
Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
Range.prototype.getBoundingClientRect = () => new DOMRect();

/**
 * Registers shared test matchers for React component tests.
 */
