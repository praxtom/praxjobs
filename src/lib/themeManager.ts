export const ThemeManager = {
    // Get current theme from localStorage
    getCurrentTheme(): 'light' | 'dark' {
        const savedTheme = localStorage.getItem('color-theme');
        return savedTheme === 'dark' ? 'dark' : 'light';
    },

    // Set theme and persist in localStorage
    setTheme(theme: 'light' | 'dark') {
        localStorage.setItem('color-theme', theme);
        this.applyTheme(theme);
    },

    // Apply theme to document
    applyTheme(theme: 'light' | 'dark') {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            document.documentElement.setAttribute('data-theme', 'light');
        }
    },

    // Toggle theme
    toggleTheme() {
        const currentTheme = this.getCurrentTheme();
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
        return newTheme;
    },

    // Initialize theme on page load
    initTheme() {
        const savedTheme = this.getCurrentTheme();
        this.applyTheme(savedTheme);
    }
};
