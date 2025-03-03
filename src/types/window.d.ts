// Extend the Window interface with custom methods
interface CustomWindow extends Window {
    toggleModal(show: boolean): void;
}

// Augment the global Window interface
interface Window {
    toggleModal?: (show: boolean) => void;
}

// Ensure this file is treated as a module
export {};
