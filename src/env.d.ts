/// <reference types="astro/client" />

interface ImportMetaEnv {
    readonly DEEPSEEK_API_KEY: string;
    readonly PUBLIC_DEEPSEEK_API_KEY: string;
    readonly PUBLIC_FIREBASE_API_KEY: string;
    readonly PUBLIC_FIREBASE_AUTH_DOMAIN: string;
    readonly PUBLIC_FIREBASE_PROJECT_ID: string;
    readonly PUBLIC_FIREBASE_STORAGE_BUCKET: string;
    readonly PUBLIC_FIREBASE_MESSAGING_SENDER_ID: string;
    readonly PUBLIC_FIREBASE_APP_ID: string;
    readonly PUBLIC_FIREBASE_MEASUREMENT_ID: string;

    // Firebase Admin Config
    readonly FIREBASE_ADMIN_PROJECT_ID: string;
    readonly FIREBASE_ADMIN_CLIENT_EMAIL: string;
    readonly FIREBASE_ADMIN_PRIVATE_KEY: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

// Add middleware context type
declare namespace App {
    interface Locals {
        user?: {
            id: string;
            email: string;
        };
    }
}
