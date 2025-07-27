import '@testing-library/jest-dom';
import 'whatwg-fetch';

// Polyfill for setImmediate in Jest environment
global.setImmediate = global.setImmediate || ((fn, ...args) => global.setTimeout(fn, 0, ...args));