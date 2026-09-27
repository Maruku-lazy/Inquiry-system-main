// Runs once before the whole test suite. Adds matchers like
// toBeInTheDocument()/toBeDisabled() to expect() — without this, you'd be
// stuck writing much clumsier assertions like
// expect(element).not.toBeNull() for everything DOM-related.
import '@testing-library/jest-dom';

// Ensure localStorage mock is fully functional in Node / jsdom test environment
let store: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, val: string) => {
    store[key] = String(val);
  },
  removeItem: (key: string) => {
    delete store[key];
  },
  clear: () => {
    store = {};
  },
  get length() {
    return Object.keys(store).length;
  },
  key: (index: number) => Object.keys(store)[index] ?? null,
};

Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});
