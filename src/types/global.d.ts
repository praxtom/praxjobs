// Global type declarations for window extensions
interface Window {
    errorTracker?: {
        report: (error: Error) => void;
    };
}
