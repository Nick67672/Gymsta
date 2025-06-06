// Essential polyfills for React Native compatibility with Supabase
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';

// Buffer polyfill
import { Buffer } from 'buffer';
(global as any).Buffer = (global as any).Buffer || Buffer;

// Process polyfill
import process from 'process';
(global as any).process = (global as any).process || process;

// Util polyfill
(global as any).util = (global as any).util || require('util');

// Events polyfill
(global as any).events = (global as any).events || require('events');

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
} 