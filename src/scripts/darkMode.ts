export function initDarkMode() {
  const darkModeToggle = document.getElementById('dark-mode-toggle');
  const darkIcon = document.getElementById('theme-toggle-dark-icon');
  const lightIcon = document.getElementById('theme-toggle-light-icon');

  // Check for saved theme preference or default to system preference
  const savedTheme = localStorage.getItem('color-theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  function setTheme(theme: 'dark' | 'light') {
    const isDark = theme === 'dark' || (!savedTheme && systemPrefersDark && theme !== 'light');
    // Always set the class and localStorage consistently
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('color-theme', isDark ? 'dark' : 'light');

    // Update icon visibility
    if (isDark) {
      darkIcon?.classList.remove('hidden');
      lightIcon?.classList.add('hidden');
    } else {
      lightIcon?.classList.remove('hidden');
      darkIcon?.classList.add('hidden');
    }
  }

  // Initial theme setup - use the saved theme or system preference
  const themeToApply = savedTheme as 'dark' | 'light' || (systemPrefersDark ? 'dark' : 'light');
  setTheme(themeToApply);

  // Make sure the theme is always persisted
  if (!localStorage.getItem('color-theme')) {
    localStorage.setItem('color-theme', themeToApply);
  }

  // Toggle theme on button click
  darkModeToggle?.addEventListener('click', () => {
    const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    setTheme(currentTheme === 'light' ? 'dark' : 'light');
  });

  // Handle system theme changes - only if user hasn't explicitly chosen a theme
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const systemTheme = e.matches ? 'dark' : 'light';
    // Only apply system theme if user hasn't set a preference
    if (!localStorage.getItem('color-theme')) {
      setTheme(systemTheme);
    }
  });
}

// Call the function when the script loads
if (typeof window !== 'undefined') {
  initDarkMode();
}
