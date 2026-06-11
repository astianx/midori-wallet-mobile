import 'react-native-url-polyfill/auto';

const globalScope = globalThis as typeof globalThis & {
  global?: typeof globalThis;
  URL?: typeof URL;
  URLSearchParams?: typeof URLSearchParams;
};

if (!globalScope.global) {
  globalScope.global = globalScope;
}

if (typeof globalScope.URL !== 'undefined') {
  globalScope.global.URL = globalScope.URL;
}

if (typeof globalScope.URLSearchParams !== 'undefined') {
  globalScope.global.URLSearchParams = globalScope.URLSearchParams;
}
