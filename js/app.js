let configData = null;
let postsData = [];
let currentPostId = null;
let currentCategory = 'all';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const [configRes, postsRes] = await Promise.all([
            fetch('data/config.json'),
            fetch('data/posts.json')
        ]);
        configData = await configRes.json();
        postsData = await postsRes.json();

        renderProfile();
        initCategories();
        renderTimeline();
        document.getElementById('year').textContent = new Date().getFullYear();
        
        loadEffects();
    } catch (err) {
        console.error("Failed to load site data (config/posts):", err);
        document.getElementById('timeline-container').innerHTML = `
            <div class="text-center text-red-500 py-10">
                无法加载博客数据，请确保在使用本地服务器(如 Live Server)浏览，而不是直接双击 HTML 文件。
            </div>
        `;
    }
});

function loadEffects() {
    if (configData.effects && Array.isArray(configData.effects)) {
        configData.effects.forEach(effectPath => {
            const script = document.createElement('script');
            script.src = effectPath;
            script.async = true;
            document.body.appendChild(script);
        });
    }
}

function renderProfile() {
    if (!configData || !configData.profile) return;
    
    document.getElementById('profile-name').textContent = configData.profile.name;
    document.getElementById('profile-bio').innerHTML = configData.profile.bio;
    document.getElementById('avatar-img').src = configData.profile.avatar;
    document.querySelector('#featured-game').onclick = () => window.open(configData.profile.deepWellUrl, '_blank');
    
    const socialContainer = document.getElementById('social-links');
    socialContainer.innerHTML = ''; 
    if (configData.socials) {
        configData.socials.forEach(social => {
            const a = document.createElement('a');
            a.href = social.url;
            a.className = "text-gray-400 hover:text-gray-900 transition-colors text-2xl";
            a.innerHTML = `<i class="${social.icon}"></i>`;
            socialContainer.appendChild(a);
        });
    }
}

function initCategories() {
    const categories = ['all', ...new Set(postsData.map(post => post.category))];
    const filterContainer = document.getElementById('category-filters');
    filterContainer.innerHTML = ''; 

    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = `filter-btn px-4 py-1.5 rounded-full border border-gray-200 text-sm font-medium transition-all ${cat === 'all' ? 'active bg-gray-800 text-white border-gray-800' : 'text-gray-500 hover:border-gray-400 bg-white hover:text-gray-800'}`;
        btn.textContent = cat === 'all' ? '全部' : cat;
        
        btn.onclick = () => {
            document.querySelectorAll('.filter-btn').forEach(b => {
                b.classList.remove('active', 'bg-gray-800', 'text-white', 'border-gray-800');
                b.classList.add('text-gray-500', 'bg-white');
            });
            btn.classList.remove('text-gray-500', 'bg-white');
            btn.classList.add('active', 'bg-gray-800', 'text-white', 'border-gray-800');
            
            currentCategory = cat;
            renderTimeline();
        };
        filterContainer.appendChild(btn);
    });
}

function renderTimeline() {
    const container = document.getElementById('timeline-container');
    container.innerHTML = '';
    
    let filteredPosts = currentCategory === 'all' 
        ? postsData 
        : postsData.filter(post => post.category === currentCategory);
    
    filteredPosts.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (filteredPosts.length === 0) {
        container.innerHTML = `<div class="text-center text-gray-400 py-10">该分类下暂无文章</div>`;
        return;
    }
    
    filteredPosts.forEach((post, index) => {
        const delay = index * 100;
        const item = document.createElement('div');
        item.className = "flex gap-x-4 md:gap-x-8 relative fade-in group";
        item.style.animationDelay = `${delay}ms`;
        
        item.innerHTML = `
            <div class="hidden md:block w-32 flex-shrink-0 text-right pt-2">
                <span class="font-mono text-gray-500 text-sm font-medium tracking-tight">${post.date}</span>
            </div>
            <div class="relative flex flex-col items-center">
                <div class="w-px h-full bg-gray-200 ${index === filteredPosts.length - 1 ? 'h-8' : ''}"></div>
                <div class="absolute top-2.5 w-3 h-3 bg-white border-2 border-gray-300 rounded-full group-hover:border-blue-500 group-hover:bg-blue-500 transition-colors z-10 shadow-sm"></div>
            </div>
            <div class="flex-1 pb-8 md:pb-12 min-w-0">
                <div class="md:hidden text-xs font-mono text-gray-500 mb-2 pl-1">${post.date}</div>
                <div class="bg-white rounded-xl border border-gray-100 p-1 shadow-sm hover:shadow-lg transition-all cursor-pointer overflow-hidden flex flex-col md:flex-row gap-0 md:gap-4 group-hover:-translate-y-1" onclick="openArticle(${post.id})">
                    <div class="w-full md:w-48 h-48 md:h-auto shrink-0 relative overflow-hidden rounded-lg md:rounded-l-lg md:rounded-r-none">
                        <img src="${post.image}" alt="${post.title}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105">
                        <div class="absolute top-2 left-2 md:hidden">
                            <span class="bg-black/70 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded font-medium">${post.category}</span>
                        </div>
                    </div>
                    <div class="p-4 md:py-5 md:pr-6 flex-1 flex flex-col justify-center">
                        <div class="hidden md:flex items-center gap-2 mb-2">
                            <span class="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">${post.category}</span>
                        </div>
                        <h3 class="text-lg md:text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors leading-tight">${post.title}</h3>
                        <p class="text-gray-500 text-sm leading-relaxed line-clamp-2 mb-3">${post.desc}</p>
                        <div class="flex items-center text-xs text-gray-400 font-medium mt-auto">
                            <span class="group-hover:translate-x-1 transition-transform flex items-center">
                                阅读更多 <i class="fa-solid fa-arrow-right ml-1"></i>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(item);
    });
}

async function openArticle(id) {
    const post = postsData.find(p => p.id === id);
    if (!post) return;

    currentPostId = id;
    
    document.getElementById('detail-title').textContent = post.title;
    document.getElementById('detail-category').textContent = post.category;
    document.getElementById('detail-date').innerHTML = `<i class="far fa-calendar-alt mr-1"></i> ${post.date}`;
    document.getElementById('detail-image').src = post.image || '';
    if (!post.image) document.getElementById('detail-image').style.display = 'none';
    else document.getElementById('detail-image').style.display = 'block';
    
    const linkEl = document.getElementById('detail-link');
    if (post.link && post.link !== '#') {
        linkEl.href = post.link;
        linkEl.parentElement.style.display = 'block';
    } else {
        linkEl.parentElement.style.display = 'none';
    }
    
    document.getElementById('home-view').classList.add('hidden');
    document.getElementById('detail-view').classList.remove('hidden');
    window.scrollTo(0, 0);

    const contentDiv = document.getElementById('detail-content');
    const loader = document.getElementById('loading-indicator');
    contentDiv.innerHTML = '';
    loader.classList.remove('hidden');

    try {
        const response = await fetch(post.file);
        if (!response.ok) throw new Error(`HTTP error! status: \${response.status}`);
        let text = await response.text();
        
        // Remove frontmatter if present (yaml format --- ... ---)
        if (text.startsWith('---')) {
            const endOfFrontmatter = text.indexOf('---', 3);
            if (endOfFrontmatter > -1) {
                text = text.substring(endOfFrontmatter + 3).trim();
            }
        }

        contentDiv.innerHTML = marked.parse(text);
    } catch (error) {
        console.error('Fetching markdown failed:', error);
        contentDiv.innerHTML = `
            <div class="p-4 bg-red-50 text-red-600 rounded-lg text-center">
                <p class="font-bold">无法加载文章内容</p>
                <p class="text-sm mt-1">请检查文件路径 '\${post.file}' 是否正确，或是否因跨域(CORS)被浏览器拦截。</p>
            </div>
        `;
    } finally {
        loader.classList.add('hidden');
    }

    loadGiscusComments();
}

function goHome() {
    document.getElementById('detail-view').classList.add('hidden');
    document.getElementById('home-view').classList.remove('hidden');
    window.scrollTo(0, 0);
}

function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    alert('地址已复制');
}

// ================= Giscus 评论系统 =================
function loadGiscusComments() {
    const container = document.getElementById('comments-list');
    container.innerHTML = ''; 

    if (!configData.giscus || !configData.giscus.repo) {
        container.innerHTML = '<p class="text-gray-500 text-sm text-center">评论系统未配置 Giscus Repo</p>';
        return;
    }
    
    const script = document.createElement('script');
    script.src = "https://giscus.app/client.js";
    
    Object.keys(configData.giscus).forEach(key => {
        // Convert camelCase to kebab-case (e.g., repoId -> data-repo-id)
        const attrName = key.replace(/[A-Z]/g, match => `-\${match.toLowerCase()}`);
        script.setAttribute(`data-\${attrName}`, configData.giscus[key]);
    });
    
    script.setAttribute("crossorigin", "anonymous");
    script.setAttribute("async", "true");
    
    container.appendChild(script);
}
