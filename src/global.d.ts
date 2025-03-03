// Declare global variables and types for polyfills
declare global {
    const process: {
        env: Record<string, string>;
        browser: boolean;
    };
    const global: any;
}

// Augment Node.js built-in modules for browser compatibility
declare module 'node:path' {
    export * from 'path';
}

declare module 'node:fs' {
    export * from 'fs';
}

declare module 'node:crypto' {
    export * from 'crypto';
}

declare module 'node:stream' {
    export * from 'stream';
}

declare module 'node:util' {
    export * from 'util';
}

export {};
