/* ========================================
   CYBER FORTRESS - MINIMAL PORTFOLIO SCRIPTS
   ======================================== */

// ========================
// NAVIGATION
// ========================
(function initNav() {
    const nav = document.getElementById('main-nav');
    const toggle = document.querySelector('.nav-toggle');
    const links = document.querySelector('.nav-links');

    // Mobile toggle
    if (toggle) {
        toggle.addEventListener('click', () => {
            links.classList.toggle('active');
        });
    }

    // Close on outside click
    document.addEventListener('click', (e) => {
        if (!nav.contains(e.target) && links) {
            links.classList.remove('active');
        }
    });
})();

// ========================
// ACTIVE NAV LINK TRACKING
// ========================
(function activeNavLinkTracking() {
    const navLinks = document.querySelectorAll('.nav-links a');
    const path = window.location.pathname;

    navLinks.forEach((link) => {
        link.classList.remove('active');
        const href = link.getAttribute('href');

        if (path.includes('writeups') && href.includes('writeups')) {
            link.classList.add('active');
        } else if (path.includes('about') && href.includes('about')) {
            link.classList.add('active');
        } else if (path.includes('experience') && href.includes('experience')) {
            link.classList.add('active');
        } else if (path.includes('projects') && href.includes('projects')) {
            link.classList.add('active');
        } else if (path.includes('contact') && href.includes('contact')) {
            link.classList.add('active');
        } else if ((path === '/' || path.endsWith('index.html') || path === '') && !path.includes('writeups') && href.includes('index.html')) {
            link.classList.add('active');
        }
    });
})();

// ========================
// DYNAMIC YEAR IN FOOTER
// ========================
const yearEl = document.getElementById('year');
if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
}

// ========================
// WRITEUPS LIST (for writeups.html)
// ========================
(async function initWriteups() {
    const container = document.getElementById('writeups-container');
    const searchInput = document.getElementById('writeup-search');

    if (!container || !searchInput) return;

    let writeupsData = [];
    const jsonPath = container.getAttribute('data-json') || 'writeups.json';
    const baseUrl = container.getAttribute('data-base-url') || 'writeups/';

    // Fetch writeups manifest
    try {
        const res = await fetch(jsonPath);
        if (res.ok) {
            writeupsData = await res.json();
            renderCards(writeupsData);
        } else {
            container.innerHTML = '<p style="color: var(--text-secondary)">No writeups found or failed to load.</p>';
        }
    } catch (e) {
        console.error('Failed to load writeups', e);
    }

    // Render cards function
    function renderCards(data) {
        container.innerHTML = '';
        if (data.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary)">No writeups match your search.</p>';
            return;
        }

        data.forEach(item => {
            const card = document.createElement('a');
            card.className = 'writeup-card';
            // Link directly to the dynamic viewer page
            card.href = `writeup.html?id=${item.id}`;

            card.innerHTML = `
                <div class="writeup-card-content">
                    <div class="writeup-meta"><span>${item.date}</span></div>
                    <h3 class="writeup-title">${item.title}</h3>
                    <div class="writeup-tags">
                        ${item.tags.map(tag => `<span>${tag}</span>`).join('')}
                    </div>
                </div>
                <div class="writeup-card-cover">
                    <img src="../assets/writeups/${item.id}/images/cover.png" alt="Cover" onerror="this.parentElement.style.display='none'">
                </div>
            `;

            container.appendChild(card);
        });
    }

    // Search functionality
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = writeupsData.filter(item => {
            return item.title.toLowerCase().includes(term) ||
                item.tags.some(tag => tag.toLowerCase().includes(term));
        });
        renderCards(filtered);
    });

})();

// ========================
// INDIVIDUAL WRITEUP VIEWER
// ========================
(async function initSingleWriteup() {
    const contentDiv = document.getElementById('writeup-content');
    if (!contentDiv) return; // Only run on the individual writeup page

    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    let markdownFile = contentDiv.getAttribute('data-src');
    if (!markdownFile && id) {
        markdownFile = `../assets/writeups/${id}/${id}.md`;

        // Dynamically update the page title and metadata
        fetch('../assets/data/writeups.json')
            .then(r => r.json())
            .then(data => {
                const item = data.find(i => i.id === id);
                if (item) {
                    document.title = `${item.title} - Swilam`;
                    const metaDesc = document.querySelector('meta[name="description"]');
                    if (metaDesc && item.summary) metaDesc.content = item.summary;
                }
            }).catch(e => console.error('Failed to load metadata', e));
    }

    if (!markdownFile) {
        contentDiv.innerHTML = '<p>No writeup specified.</p>';
        return;
    }

    // Configure marked options
    if (typeof marked !== 'undefined') {
        marked.setOptions({
            highlight: function (code, lang) {
                if (typeof hljs !== 'undefined' && hljs.getLanguage(lang)) {
                    return hljs.highlight(code, { language: lang }).value;
                }
                return hljs.highlightAuto(code).value;
            },
            breaks: true,
            gfm: true
        });
    }

    try {
        const res = await fetch(markdownFile);
        if (!res.ok) throw new Error('File not found');
        const markdown = await res.text();

        // Render and sanitize
        const html = marked.parse(markdown);
        let cleanHTML = DOMPurify.sanitize(html);

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = cleanHTML;

        // Extract H1 for Hero Header
        const h1 = tempDiv.querySelector('h1');
        let titleText = 'Writeup';
        if (h1) {
            titleText = h1.innerHTML;
            h1.remove(); // Remove it from the markdown content
        }

        // Inject hero cover with extracted title
        const coverDiv = document.createElement('div');
        coverDiv.className = 'writeup-hero-header';
        coverDiv.innerHTML = `
            <div class="hero-bg" style="background-image: url('../assets/writeups/${id}/images/cover.png');"></div>
            <div class="hero-overlay"></div>
            <div class="hero-content">
                <h1>${titleText}</h1>
            </div>
            <!-- Hidden img to fallback hero-bg if image doesn't exist -->
            <img src="../assets/writeups/${id}/images/cover.png" style="display:none;" onerror="this.parentElement.querySelector('.hero-bg').style.display='none';">
        `;
        contentDiv.parentNode.insertBefore(coverDiv, contentDiv);
        // Rewrite relative image paths to point to the correct writeup folder
        const images = tempDiv.querySelectorAll('img');
        images.forEach(img => {
            const src = img.getAttribute('src');
            if (src && !src.startsWith('http') && !src.startsWith('/') && !src.startsWith('../')) {
                img.setAttribute('src', `../assets/writeups/${id}/${src}`);
            }
        });

        // Generate TOC and assign IDs
        const headings = tempDiv.querySelectorAll('h2, h3');
        let tocHTML = '';
        const idCounts = {};
        const headingElements = [];

        if (headings.length > 1) { // Only show TOC if multiple headings exist
            tocHTML += '<span class="toc-title">On This Page</span><ul class="toc-list">';
            let prevLevel = parseInt(headings[0].tagName.substring(1));

            headings.forEach(heading => {
                let slug = heading.textContent.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                if (!slug) slug = 'section';

                if (idCounts[slug]) {
                    idCounts[slug]++;
                    slug = `${slug}-${idCounts[slug]}`;
                } else {
                    idCounts[slug] = 1;
                }

                heading.id = slug;
                headingElements.push(heading);

                const level = parseInt(heading.tagName.substring(1));
                const levelClass = level === 3 ? 'toc-h3' : 'toc-h2';

                let stepClass = '';
                let svgHTML = '';

                if (level > prevLevel) {
                    stepClass = 'step-in';
                    svgHTML = `<svg class="toc-svg" viewBox="0 0 14 16"><path d="M 1,0 L 1,2 L 13,14 L 13,16" fill="none" stroke="currentColor" stroke-width="2" /></svg>`;
                } else if (level < prevLevel) {
                    stepClass = 'step-out';
                    svgHTML = `<svg class="toc-svg" viewBox="0 0 14 16"><path d="M 13,0 L 13,2 L 1,14 L 1,16" fill="none" stroke="currentColor" stroke-width="2" /></svg>`;
                }
                prevLevel = level;

                tocHTML += `<li class="${levelClass} ${stepClass}">
                    ${svgHTML}
                    <a href="#${slug}" class="toc-link" data-toc-target="${slug}">
                        ${heading.textContent}
                    </a>
                </li>`;
            });
            tocHTML += '</ul>';
        }

        contentDiv.innerHTML = tempDiv.innerHTML;

        // Inject TOC into containers
        if (tocHTML) {
            const mobileContainer = document.getElementById('toc-mobile-container');
            if (mobileContainer) {
                mobileContainer.innerHTML = `
                    <div class="toc-mobile-details">
                        <button class="toc-mobile-summary"><span>On This Page</span> <i class="fas fa-chevron-down"></i></button>
                        <div class="toc-mobile-content-wrapper">
                            <div class="toc-mobile-content">${tocHTML}</div>
                        </div>
                    </div>
                `;
                
                const summaryBtn = mobileContainer.querySelector('.toc-mobile-summary');
                const contentWrapper = mobileContainer.querySelector('.toc-mobile-content-wrapper');
                const icon = summaryBtn.querySelector('i');
                
                summaryBtn.addEventListener('click', () => {
                    const isExpanded = contentWrapper.classList.contains('expanded');
                    if (isExpanded) {
                        contentWrapper.classList.remove('expanded');
                        icon.style.transform = 'rotate(0deg)';
                    } else {
                        contentWrapper.classList.add('expanded');
                        icon.style.transform = 'rotate(180deg)';
                    }
                });
            }
            const desktopContainer = document.getElementById('toc-desktop-container');
            if (desktopContainer) {
                desktopContainer.innerHTML = tocHTML;
            }
        }

        // Setup Intersection Observer for TOC highlight
        if (headingElements.length > 0) {
            const liveHeadings = Array.from(contentDiv.querySelectorAll('h2, h3'));
            const tocLinks = document.querySelectorAll('.toc-link');

            const observerOptions = {
                root: null,
                rootMargin: '0px 0px -20% 0px',
                threshold: 0
            };

            const visibleHeadings = new Set();
            let lastPassedHeading = liveHeadings[0].id;

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        visibleHeadings.add(entry.target.id);
                        lastPassedHeading = entry.target.id;
                    } else {
                        visibleHeadings.delete(entry.target.id);

                        // If we scrolled past it (it's above the viewport)
                        if (entry.boundingClientRect.top < 0) {
                            lastPassedHeading = entry.target.id;
                        }
                    }
                });

                // If there are visible headings, highlight all of them.
                // Otherwise, highlight the last one we scrolled past.
                const targetsToHighlight = visibleHeadings.size > 0
                    ? visibleHeadings
                    : new Set([lastPassedHeading]);

                tocLinks.forEach(link => {
                    if (targetsToHighlight.has(link.getAttribute('data-toc-target'))) {
                        link.parentElement.classList.add('active');
                    } else {
                        link.parentElement.classList.remove('active');
                    }
                });
            }, observerOptions);

            liveHeadings.forEach(h => observer.observe(h));

            // Handle hash navigation on load
            if (window.location.hash) {
                setTimeout(() => {
                    const target = document.getElementById(window.location.hash.substring(1));
                    if (target) {
                        target.scrollIntoView();
                    }
                }, 100);
            }
        }
    } catch (e) {
        console.error(e);
        contentDiv.innerHTML = '<p>Failed to load writeup content.</p>';
    }
})();

// ========================
// PROJECTS LIST (for projects.html)
// ========================
(async function initProjects() {
    const container = document.getElementById('projects-container');
    if (!container) return;

    const jsonPath = container.getAttribute('data-json') || '../assets/data/projects.json';

    try {
        const res = await fetch(jsonPath);
        if (res.ok) {
            const data = await res.json();
            renderProjects(data);
        } else {
            container.innerHTML = '<p style="color: var(--text-secondary)">No projects found or failed to load.</p>';
        }
    } catch (e) {
        console.error('Failed to load projects', e);
    }

    function renderProjects(data) {
        container.innerHTML = '';
        data.forEach(item => {
            const card = document.createElement('div');
            card.className = 'project-card';

            const header = document.createElement('div');
            header.className = 'project-header';

            const title = document.createElement('h3');
            title.className = 'project-name';
            title.textContent = item.name;

            header.appendChild(title);

            if (item.url) {
                const link = document.createElement('a');
                link.href = item.url;
                link.target = '_blank';
                link.rel = 'noopener';
                link.className = 'project-link';
                link.innerHTML = '<i class="fab fa-github"></i>';
                header.appendChild(link);
            }

            const desc = document.createElement('p');
            desc.className = 'project-desc';
            desc.textContent = item.description;

            const techContainer = document.createElement('div');
            techContainer.className = 'project-tech';
            if (item.tech && Array.isArray(item.tech)) {
                item.tech.forEach(t => {
                    const span = document.createElement('span');
                    span.textContent = t;
                    techContainer.appendChild(span);
                });
            }

            card.appendChild(header);
            card.appendChild(desc);
            card.appendChild(techContainer);

            container.appendChild(card);
        });
    }
})();

// ========================
// EXPERIENCE LIST (for experience.html)
// ========================
(async function initExperience() {
    const container = document.getElementById('experience-container');
    if (!container) return;

    const jsonPath = '../assets/data/experience.json';

    try {
        const res = await fetch(jsonPath);
        if (res.ok) {
            const data = await res.json();
            renderExperience(data);
        } else {
            container.innerHTML = '<p style="color: var(--text-secondary)">No experience data found.</p>';
        }
    } catch (e) {
        console.error('Failed to load experience data', e);
    }

    function renderExperience(data) {
        container.innerHTML = '';
        data.forEach(item => {
            const card = document.createElement('div');
            card.className = 'exp-item';

            card.innerHTML = `
                <div class="exp-meta">
                    <span class="exp-date">${item.date}</span>
                </div>
                <div class="exp-timeline">
                    <div class="timeline-line"></div>
                    <div class="timeline-dot"></div>
                </div>
                <div class="exp-details">
                    <h3 class="exp-role">${item.role}</h3>
                    <span class="exp-org">${item.organization}</span>
                    <p class="exp-desc">${item.description}</p>
                </div>
            `;

            container.appendChild(card);
        });
    }
})();
// ========================
// SKILLS LIST (for about.html)
// ========================
(async function initSkills() {
    const container = document.getElementById('skills-container');
    if (!container) return;

    const jsonPath = container.getAttribute('data-json') || '../assets/data/skills.json';

    try {
        const res = await fetch(jsonPath);
        if (res.ok) {
            const data = await res.json();
            renderSkills(data);
        } else {
            container.innerHTML = '<p style="color: var(--text-secondary)">No skills found or failed to load.</p>';
        }
    } catch (e) {
        console.error('Failed to load skills', e);
    }

    function renderSkills(data) {
        container.innerHTML = '';
        data.forEach(item => {
            // Category Wrapper
            const categoryDiv = document.createElement('div');
            categoryDiv.style.marginBottom = '32px';

            // Title
            const title = document.createElement('h4');
            title.style.marginBottom = '16px';
            title.style.fontSize = '1.05rem';
            title.style.color = 'var(--text-primary)';
            title.textContent = item.category;

            // Tech List Container
            const techList = document.createElement('div');
            techList.className = 'project-tech';
            techList.style.justifyContent = 'flex-start';

            // Add all skills to techList first
            if (item.skills && Array.isArray(item.skills)) {
                item.skills.forEach(s => {
                    const span = document.createElement('span');
                    span.textContent = s;
                    techList.appendChild(span);
                });
            }

            categoryDiv.appendChild(title);
            categoryDiv.appendChild(techList);
            container.appendChild(categoryDiv);

            // Apply Collapse Logic if more than 3 skills
            const skills = Array.from(techList.querySelectorAll('span'));
            if (skills.length > 3) {
                const visibleSkills = skills.slice(0, 3);
                const hiddenSkills = skills.slice(3);
                
                // Clear original and append first 3
                techList.innerHTML = '';
                visibleSkills.forEach(s => techList.appendChild(s));
                
                // Create collapse wrapper
                const collapseWrapper = document.createElement('div');
                collapseWrapper.className = 'skill-collapse-content';
                
                // Inner container
                const innerTechList = document.createElement('div');
                innerTechList.className = 'project-tech';
                innerTechList.style.justifyContent = 'flex-start';
                innerTechList.style.paddingTop = '12px';
                
                hiddenSkills.forEach(s => innerTechList.appendChild(s));
                collapseWrapper.appendChild(innerTechList);
                
                // Insert collapse wrapper after original techList
                techList.parentElement.insertBefore(collapseWrapper, techList.nextSibling);
                
                // Create toggle button
                const btn = document.createElement('button');
                btn.className = 'skill-toggle-btn';
                btn.innerHTML = '<span class="btn-text">View more</span> <i class="fas fa-chevron-down"></i>';
                
                btn.addEventListener('click', () => {
                    const isExpanded = collapseWrapper.classList.contains('expanded');
                    const icon = btn.querySelector('i');
                    if (isExpanded) {
                        collapseWrapper.classList.remove('expanded');
                        btn.querySelector('.btn-text').textContent = 'View more';
                        icon.style.transform = 'rotate(0deg)';
                    } else {
                        collapseWrapper.classList.add('expanded');
                        btn.querySelector('.btn-text').textContent = 'View less';
                        icon.style.transform = 'rotate(180deg)';
                    }
                });
                
                title.style.display = 'flex';
                title.style.justifyContent = 'space-between';
                title.style.alignItems = 'center';
                title.appendChild(btn);
            }
        });
    }
})();
