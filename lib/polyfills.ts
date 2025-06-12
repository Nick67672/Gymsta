// Essential polyfills for React Native compatibility with Supabase
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';

console.log('Loading polyfills...'); // Debug log

// Buffer polyfill
import { Buffer } from 'buffer';
if (typeof (global as any).Buffer === 'undefined') {
  (global as any).Buffer = Buffer;
  console.log('Buffer polyfill applied');
}

// Process polyfill
import process from 'process';
if (typeof (global as any).process === 'undefined') {
  (global as any).process = process;
  console.log('Process polyfill applied');
}

// Util polyfill
if (typeof (global as any).util === 'undefined') {
  (global as any).util = require('util');
  console.log('Util polyfill applied');
}

// Events polyfill
if (typeof (global as any).events === 'undefined') {
  (global as any).events = require('events');
  console.log('Events polyfill applied');
}

// EventSource polyfill (minimal implementation for SSE support)
if (typeof (global as any).EventSource === 'undefined') {
  // @ts-ignore
  (global as any).EventSource = class {
    constructor(url: string, options?: any) {
      console.warn('EventSource not fully implemented in React Native');
    }
    close() {}
    addEventListener() {}
    removeEventListener() {}
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSED = 2;
  };
  console.log('EventSource polyfill applied');
}

console.log('Polyfills loaded successfully'); 