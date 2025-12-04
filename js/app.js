// Optimized and organized app.js

document.addEventListener("DOMContentLoaded", () => {
    // === Theme and Color Management ===
    const savedTheme = localStorage.getItem("theme") || "light";
    const savedColor = localStorage.getItem("color") || "default";
    document.documentElement.setAttribute("data-theme", savedTheme);
    document.documentElement.setAttribute("data-color", savedColor);

    // Theme toggle
    const checkbox = document.getElementById("checkbox");
    if (checkbox) {
        checkbox.checked = savedTheme === "dark";
        checkbox.addEventListener("change", () => {
            const newTheme = checkbox.checked ? "dark" : "light";
            document.documentElement.setAttribute("data-theme", newTheme);
            localStorage.setItem("theme", newTheme);
        });
    }

    // Color select
    const colorSelect = document.getElementById("color-select");
    if (colorSelect) {
        colorSelect.value = savedColor;
        colorSelect.addEventListener("change", (e) => {
            const color = e.target.value;
            document.documentElement.setAttribute("data-color", color);
            localStorage.setItem("color", color);
        });
    }

    // === Sidebar Hamburger Toggle ===
    const hamburger = document.getElementById("hamburger");
    const sidebar = document.querySelector(".sidebar");
    if (hamburger && sidebar) {
        hamburger.addEventListener("click", () => {
            sidebar.classList.toggle("active");
        });
        // Close sidebar on link click (for mobile)
        sidebar.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                sidebar.classList.remove("active");
            });
        });
    }

    // === Search Bar Functionality ===
    const pages = [
        { name: 'Home', path: '/index.html' },
        { name: 'Journal', path: '/journal.html' },
        { name: 'Tasks', path: '/tasks.html' },
        { name: 'Settings', path: '/settings.html' }
    ];
    const searchBar = document.getElementById('search-bar');
    const searchResults = document.getElementById('search-results');
    let debounceTimeout;

    function sanitizeInput(input) {
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }

    function showResults(results) {
        searchResults.innerHTML = '';
        if (results.length === 0) {
            const noResultItem = document.createElement('div');
            noResultItem.classList.add('search-result-item');
            noResultItem.textContent = 'No results found';
            noResultItem.style.cursor = 'default';
            noResultItem.style.opacity = '0.7';
            searchResults.appendChild(noResultItem);
        } else {
            results.forEach(page => {
                const resultItem = document.createElement('div');
                resultItem.classList.add('search-result-item');
                resultItem.textContent = page.name;
                resultItem.setAttribute('role', 'option');
                resultItem.setAttribute('tabindex', '0');
                resultItem.addEventListener('click', () => {
                    navigateTo(page.path);
                    searchResults.classList.add('hidden');
                    searchBar.value = '';
                });
                resultItem.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        navigateTo(page.path);
                        searchResults.classList.add('hidden');
                        searchBar.value = '';
                    }
                });
                searchResults.appendChild(resultItem);
            });
        }
        searchResults.classList.remove('hidden');
    }

    function hideResults() {
        searchResults.classList.add('hidden');
        searchResults.innerHTML = '';
    }

    function navigateTo(path) {
        try {
            const basePath = window.location.origin;
            let fullPath = path;
            if (path.startsWith('/')) {
                fullPath = basePath + path;
            } else if (!path.startsWith('http')) {
                const currentPath = window.location.pathname;
                const currentDir = currentPath.substring(0, currentPath.lastIndexOf('/'));
                fullPath = basePath + currentDir + '/' + path;
            }
            window.location.href = fullPath;
        } catch (error) {
            console.error('Navigation error:', error);
        }
    }

    function debounceSearch(query, delay = 300) {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            const sanitizedQuery = sanitizeInput(query.trim());
            if (sanitizedQuery.length === 0) {
                hideResults();
                return;
            }
            const filteredPages = pages.filter(page =>
                page.name.toLowerCase().includes(sanitizedQuery.toLowerCase())
            );
            showResults(filteredPages);
        }, delay);
    }

    if (searchBar && searchResults) {
        searchBar.addEventListener('input', (e) => {
            debounceSearch(e.target.value);
        });
        searchBar.addEventListener('focus', () => {
            if (searchBar.value.trim().length > 0) {
                debounceSearch(searchBar.value);
            }
        });
        document.addEventListener('click', (e) => {
            if (!searchBar.contains(e.target) && !searchResults.contains(e.target)) {
                hideResults();
            }
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                hideResults();
                searchBar.value = '';
                searchBar.blur();
            }
        });
    }

 
});

document.addEventListener("DOMContentLoaded", () => {
    // Button navigation logic for Home page
    const gotoJournalBtn = document.querySelector(".gotoJournal");
    const gotoTasksBtn = document.querySelector(".gotoTasks");

    

    if (gotoJournalBtn) {
        gotoJournalBtn.addEventListener("click", () => {
            window.location.href = "pages/journal.html";
        });
    }
    if (gotoTasksBtn) {
        gotoTasksBtn.addEventListener("click", () => {
            window.location.href = "pages/todolist.html";
        });
    }
       // === Quote Generator ===
       const quoteBox = document.getElementById("quoteBox");

       if (quoteBox) {
           fetch("https://api.allorigins.win/raw?url=https://zenquotes.io/api/random")
   
             .then(res => res.json())
             .then(data => {
               if (Array.isArray(data) && data[0].q && data[0].a) {
                 quoteBox.textContent = `"${data[0].q}" — ${data[0].a}`;
               } else {
                 quoteBox.textContent = `"Your daily quote goes here."`;
               }
             })
             .catch(err => {
               console.error("ZenQuotes fetch error:", err);
               quoteBox.textContent = `"Your daily quote goes here."`;
             });
         }
});