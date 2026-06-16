// ==================== CVGenerator - Main Script ====================

document.addEventListener('DOMContentLoaded', () => {
    // Check for shared data in URL
    if (loadFromURL()) {
        // Read-only mode
        document.body.classList.add('readonly-mode');
        document.querySelectorAll('.no-print').forEach(el => el.style.display = 'none');
        switchPage('preview');
    } else {
        loadData();
    }
    bindStaticInputs();
    bindButtons();
    bindSidebar();
    bindSkillInputs();
    bindSummaryCharCount();
    bindKeyboardShortcuts();
    bindValidation();
    restoreDarkMode();
    updateProgress();
    updateSkillCounts();
});

// ==================== CONSTANTS ====================
const STORAGE_KEY = 'resume_helper_data';
let skillsData = { languages: [], frameworks: [], tools: [], cloud: [], other: [] };
let activeTemplate = 'standard';

// Backward compatibility: convert string arrays to objects
function migrateSkillItems(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.map(item => {
        if (typeof item === 'string') {
            return { name: item, level: 3, years: '', fromExp: false };
        }
        return { name: item.name || '', level: item.level || 3, years: item.years || '', fromExp: item.fromExp || false };
    });
}

// ==================== INPUT BINDING ====================
function bindStaticInputs() {
    document.querySelectorAll('#page-personal input, #page-personal select, #page-summary textarea, #page-summary input').forEach(input => {
        input.addEventListener('input', () => { saveData(); updateProgress(); });
        input.addEventListener('change', () => { saveData(); updateProgress(); });
        if (input.tagName === 'TEXTAREA') {
            input.addEventListener('input', function() { autoResize(this); });
        }
    });
}

function bindButtons() {
    document.getElementById('btn-save-json').addEventListener('click', downloadJSON);
    document.getElementById('btn-load-json').addEventListener('click', () => document.getElementById('file-input').click());
    document.getElementById('file-input').addEventListener('change', loadJSON);
    document.getElementById('btn-print').addEventListener('click', () => {
        const missing = validateRequiredFields();
        if (missing.length > 0) {
            showToast(`⚠️ 必須項目が${missing.length}個未入力です（そのまま出力できます）`);
        }
        switchPage('preview');
        setTimeout(() => window.print(), 400);
    });
    document.getElementById('btn-clear').addEventListener('click', clearData);
    document.getElementById('template-select').addEventListener('change', e => {
        if (e.target.value) {
            loadTemplate(e.target.value);
            e.target.value = '';
        }
    });
    document.getElementById('sidebar-toggle').addEventListener('click', toggleSidebar);
    document.getElementById('sidebar-overlay').addEventListener('click', closeSidebar);

    // Dark mode
    document.getElementById('btn-darkmode').addEventListener('click', toggleDarkMode);

    // URL share
    document.getElementById('btn-share-url').addEventListener('click', generateShareURL);
    document.getElementById('btn-copy-url').addEventListener('click', () => {
        const input = document.getElementById('share-url-input');
        input.select();
        document.execCommand('copy');
        showToast('URLをコピーしました');
    });

    // Preview controls
    const previewTpl = document.getElementById('preview-template-select');
    const previewSort = document.getElementById('preview-sort-select');
    if (previewTpl) previewTpl.addEventListener('change', () => renderPreview());
    if (previewSort) previewSort.addEventListener('change', () => renderPreview());

    const btnSavePdf = document.getElementById('btn-save-pdf');
    if (btnSavePdf) btnSavePdf.addEventListener('click', () => {
        switchPage('preview');
        setTimeout(() => window.print(), 400);
    });
}

function bindSidebar() {
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.addEventListener('click', () => {
            switchPage(item.dataset.page);
            if (window.innerWidth <= 768) closeSidebar();
        });
    });
}

function bindSkillInputs() {
    document.querySelectorAll('.tag-input[data-skill-category]').forEach(input => {
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                const cat = input.dataset.skillCategory;
                const val = input.value.trim();
                if (val) {
                    addSkillTag(cat, val);
                    input.value = '';
                    saveData();
                    updateProgress();
                }
            }
        });
    });
}

function bindSummaryCharCount() {
    const summary = document.getElementById('summary');
    const counter = document.getElementById('summary-count');
    if (summary && counter) {
        const update = () => {
            counter.textContent = summary.value.length + '文字';
            autoResize(summary);
        };
        summary.addEventListener('input', update);
        update();
        // Also resize on focus and after a delay (for template loads)
        summary.addEventListener('focus', () => autoResize(summary));
        setTimeout(() => autoResize(summary), 100);
        setTimeout(() => autoResize(summary), 500);
    }
}

// ==================== PAGE SWITCHING ====================
function switchPage(pageId) {
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));

    const target = document.getElementById('page-' + pageId);
    const navItem = document.querySelector(`.sidebar-item[data-page="${pageId}"]`);
    if (target) target.classList.add('active');
    if (navItem) navItem.classList.add('active');

    if (pageId === 'preview') {
        saveData();
        renderPreview();
    }
}

// ==================== SIDEBAR (mobile) ====================
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebar-overlay').classList.toggle('show');
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('show');
}

// ==================== SAVE FEEDBACK ====================
function saveSectionFeedback(btn) {
    saveData();
    updateProgress();
    const original = btn.innerHTML;
    btn.innerHTML = '✅ 保存しました';
    btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    showToast('保存しました');
    setTimeout(() => {
        btn.innerHTML = original;
        btn.style.background = '';
    }, 1500);
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
}

// ==================== PROGRESS BAR ====================
function updateProgress() {
    const data = getCurrentData();
    let filled = 0, total = 0;

    // Personal (8 fields)
    ['fullName', 'jobTitle', 'email', 'phone', 'location', 'website', 'birthDate', 'gender'].forEach(f => {
        total++;
        if (data.personal[f]) filled++;
    });

    // Summary
    total++;
    if (data.summary) filled++;

    // Experience (at least 1 entry with key fields)
    total += 3;
    if (data.experience.length > 0) {
        filled++;
        if (data.experience[0].company) filled++;
        if (data.experience[0].description) filled++;
    }

    // Skills (at least 1 tag)
    total++;
    if (Object.values(data.skills).some(arr => arr.length > 0)) filled++;

    // Education
    total++;
    if (data.education.length > 0) filled++;

    // Certifications (bonus)
    total++;
    if (data.certifications.length > 0) filled++;

    const percent = Math.round((filled / total) * 100);
    document.getElementById('progress-fill').style.width = percent + '%';
    document.getElementById('progress-text').textContent = `入力完了度: ${percent}%`;
}

// ==================== TEMPLATE LOADING ====================
function loadTemplate(key) {
    if (!confirm('テンプレートを読み込みますか？現在の入力内容は上書きされます。')) return;

    const templates = {
        engineer: {
            personal: { fullName: '', fullNameKana: '', birthDate: '', gender: '', jobTitle: 'ソフトウェアエンジニア', email: '', phone: '', location: '', website: '' },
            summary: '〇年間のWebアプリケーション開発経験を持ち、バックエンドからフロントエンドまで幅広い技術スタックを扱ってきました。アジャイル開発チームでの開発プロセス改善や、パフォーマンス最適化の実績があります。',
            experience: [{ company: '', position: 'ソフトウェアエンジニア', status: '正社員', startDate: '', endDate: '', description: '・Webアプリケーションの設計・開発・運用\n・アジャイルチームでのスクラム開発\n・API設計とデータベース最適化', techTags: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'AWS'] }],
            skills: {
                languages: [{name:'JavaScript',level:4,years:'3年'},{name:'TypeScript',level:4,years:'2年'},{name:'Python',level:3,years:'2年'},{name:'Java',level:3,years:'3年'}],
                frameworks: [{name:'React',level:4,years:'2年'},{name:'Vue.js',level:3,years:'1年'},{name:'Express',level:3,years:'2年'},{name:'Spring Boot',level:3,years:'1年'}],
                tools: [{name:'Git',level:4,years:'3年'},{name:'Docker',level:3,years:'2年'},{name:'Jest',level:3,years:'1年'}],
                cloud: [{name:'AWS',level:4,years:'2年'}],
                other: [{name:'アジャイル/スクラム',level:3,years:'2年'}]
            },
            certifications: [],
            education: []
        },
        designer: {
            personal: { fullName: '', fullNameKana: '', birthDate: '', gender: '', jobTitle: 'UI/UXデザイナー', email: '', phone: '', location: '', website: '' },
            summary: 'ユーザー中心のデザインプロセスに精通し、Web・モバイルアプリケーションのUI/UXデザインを担当。ユーザーリサーチからプロトタイピング、デザインシステムの構築まで一貫して手がけています。',
            experience: [{ company: '', position: 'UI/UXデザイナー', status: '正社員', startDate: '', endDate: '', description: '・Web・アプリのUI/UXデザイン\n・デザインシステムの構築・運用\n・ユーザーテストと改善施策の実施', techTags: ['Figma', 'Adobe XD', 'Photoshop'] }],
            skills: {
                languages: [{name:'HTML',level:4,years:'3年'},{name:'CSS',level:4,years:'3年'}],
                frameworks: [{name:'Figma',level:5,years:'3年'},{name:'Adobe CC',level:4,years:'3年'}],
                tools: [{name:'Miro',level:3,years:'1年'},{name:'Notion',level:3,years:'1年'}],
                cloud: [],
                other: [{name:'ユーザーリサーチ',level:4,years:'2年'},{name:'プロトタイピング',level:4,years:'2年'}]
            },
            certifications: [],
            education: []
        },
        manager: {
            personal: { fullName: '', fullNameKana: '', birthDate: '', gender: '', jobTitle: 'プロジェクトマネージャー', email: '', phone: '', location: '', website: '' },
            summary: '〇年のプロジェクトマネジメント経験。大規模システム開発プロジェクトの計画・進行管理から、ステークホルダー調整、チームビルディングまで幅広く対応。PMP資格保有。',
            experience: [{ company: '', position: 'プロジェクトマネージャー', status: '正社員', startDate: '', endDate: '', description: '・プロジェクト計画策定と進行管理\n・要件定義・基本設計のリード\n・品質管理・リスク管理', techTags: ['Jira', 'Confluence', 'MS Project'] }],
            skills: {
                languages: [],
                frameworks: [],
                tools: [{name:'Jira',level:4,years:'3年'},{name:'Confluence',level:4,years:'3年'},{name:'MS Project',level:3,years:'2年'}],
                cloud: [],
                other: [{name:'プロジェクト管理',level:5,years:'5年'},{name:'アジャイル/スクラム',level:4,years:'3年'},{name:'要件定義',level:4,years:'4年'},{name:'リスク管理',level:4,years:'3年'}]
            },
            certifications: [{ name: 'PMP (Project Management Professional)', date: '', issuer: 'PMI' }],
            education: []
        },
        blank: {
            personal: { fullName: '', fullNameKana: '', birthDate: '', gender: '', jobTitle: '', email: '', phone: '', location: '', website: '' },
            summary: '',
            experience: [],
            skills: { languages: [], frameworks: [], tools: [], cloud: [], other: [] },
            certifications: [],
            education: []
        }
    };

    const tpl = templates[key];
    if (tpl) {
        skillsData = JSON.parse(JSON.stringify(tpl.skills));
        restoreData(tpl);
        renderAllSkillTags();
        saveData();
        updateProgress();
        showToast('テンプレートを読み込みました');
    }
}

// ==================== SKILL TAGS (with level system) ====================
const SKILL_LEVELS = {
    1: { label: '★1 初心者', stars: '★☆☆☆☆' },
    2: { label: '★2 経験者', stars: '★★☆☆☆' },
    3: { label: '★3 中級', stars: '★★★☆☆' },
    4: { label: '★4 上級', stars: '★★★★☆' },
    5: { label: '★5 エキスパート', stars: '★★★★★' }
};

function addSkillTag(category, value) {
    if (!skillsData[category]) skillsData[category] = [];
    // Check if already exists
    if (skillsData[category].some(s => s.name === value)) return;
    skillsData[category].push({ name: value, level: 3, years: '', fromExp: false });
    renderSkillTags(category);
}

function removeSkillTag(category, index) {
    skillsData[category].splice(index, 1);
    renderSkillTags(category);
    saveData();
    updateProgress();
}

function setSkillLevel(category, index, level) {
    if (skillsData[category] && skillsData[category][index]) {
        skillsData[category][index].level = level;
        renderSkillTags(category);
        saveData();
    }
}

function setSkillYears(category, index, years) {
    if (skillsData[category] && skillsData[category][index]) {
        skillsData[category][index].years = years;
        saveData();
    }
}

function renderSkillTags(category) {
    const container = document.querySelector(`.tags-display[data-skill-category="${category}"]`);
    if (!container) return;
    container.innerHTML = '';
    (skillsData[category] || []).forEach((skill, i) => {
        const el = document.createElement('span');
        el.className = 'skill-tag' + (skill.fromExp ? ' from-experience' : '');

        const levelInfo = SKILL_LEVELS[skill.level] || SKILL_LEVELS[3];
        let innerHTML = `<span class="skill-name">${escHtml(skill.name)}</span>`;
        innerHTML += `<span class="skill-stars">${levelInfo.stars}</span>`;
        if (skill.years) innerHTML += `<span class="skill-years">${escHtml(skill.years)}</span>`;
        if (skill.fromExp) innerHTML += `<span class="from-exp-badge">経歴</span>`;
        innerHTML += ` <span class="tag-remove" onclick="removeSkillTag('${category}', ${i})">&times;</span>`;
        el.innerHTML = innerHTML;

        // Click to edit level/years
        el.addEventListener('click', e => {
            if (e.target.classList.contains('tag-remove')) return;
            showSkillEditor(el, category, i);
        });

        container.appendChild(el);
    });
    updateSkillCount(category);
}

function showSkillEditor(tagEl, category, index) {
    // Remove any existing editor
    document.querySelectorAll('.skill-editor-popover').forEach(e => e.remove());

    const skill = skillsData[category][index];
    const editor = document.createElement('div');
    editor.className = 'skill-editor-popover';

    // Stars
    const starsDiv = document.createElement('div');
    starsDiv.innerHTML = '<label>レベル</label>';
    const starsRow = document.createElement('div');
    starsRow.className = 'skill-level-stars-input';
    for (let lv = 1; lv <= 5; lv++) {
        const btn = document.createElement('button');
        btn.className = 'star-btn' + (lv <= skill.level ? ' active' : '');
        btn.textContent = '★';
        btn.onclick = (e) => {
            e.stopPropagation();
            skillsData[category][index].level = lv;
            saveData();
            renderSkillTags(category);
            editor.remove();
        };
        starsRow.appendChild(btn);
    }
    starsDiv.appendChild(starsRow);
    editor.appendChild(starsDiv);

    // Years
    const yearsDiv = document.createElement('div');
    yearsDiv.innerHTML = '<label>経験年数</label>';
    const yearsInput = document.createElement('input');
    yearsInput.type = 'text';
    yearsInput.value = skill.years || '';
    yearsInput.placeholder = '例: 3年';
    yearsInput.onclick = e => e.stopPropagation();
    yearsInput.addEventListener('input', () => {
        skillsData[category][index].years = yearsInput.value;
        saveData();
    });
    yearsDiv.appendChild(yearsInput);
    editor.appendChild(yearsDiv);

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn small';
    closeBtn.textContent = '閉じる';
    closeBtn.onclick = e => { e.stopPropagation(); editor.remove(); };
    editor.appendChild(closeBtn);

    tagEl.style.position = 'relative';
    tagEl.appendChild(editor);

    // Close on outside click
    setTimeout(() => {
        document.addEventListener('click', function closeEditor(e) {
            if (!editor.contains(e.target) && e.target !== tagEl) {
                editor.remove();
                document.removeEventListener('click', closeEditor);
            }
        });
    }, 0);
}

function renderAllSkillTags() {
    ['languages', 'frameworks', 'tools', 'cloud', 'other'].forEach(c => renderSkillTags(c));
    updateSkillCounts();
}

// ==================== TECH TAGS (experience items) + AGGREGATION ====================
function addTechTagToItem(input) {
    const val = input.value.trim();
    if (!val) return;
    const card = input.closest('.item-card');
    if (!card._techTags) card._techTags = [];
    if (!card._techTags.includes(val)) {
        card._techTags.push(val);
        renderTechTagsForCard(card);
        input.value = '';
        aggregateTechTagsToSkills();
        saveData();
    }
}

function renderTechTagsForCard(card) {
    const display = card.querySelector('.tech-tags-display');
    if (!display) return;
    const tags = card._techTags || [];
    display.innerHTML = '';
    tags.forEach((tag, i) => {
        const el = document.createElement('span');
        el.className = 'tag';
        el.innerHTML = `${escHtml(tag)} <span class="tag-remove" onclick="removeTechTagFromItem(this, ${i})">&times;</span>`;
        display.appendChild(el);
    });
}

function removeTechTagFromItem(span, index) {
    const card = span.closest('.item-card');
    card._techTags.splice(index, 1);
    renderTechTagsForCard(card);
    aggregateTechTagsToSkills();
    saveData();
}

// Aggregate tech tags from all experience items into skills
function aggregateTechTagsToSkills() {
    // Collect all tech tags from experience items
    const allTechTags = new Set();
    document.querySelectorAll('#experience-list .item-card').forEach(card => {
        (card._techTags || []).forEach(tag => allTechTags.add(tag));
    });

    // Mark existing skills that come from experience
    Object.keys(skillsData).forEach(cat => {
        skillsData[cat].forEach(skill => {
            if (allTechTags.has(skill.name)) {
                skill.fromExp = true;
            } else if (skill.fromExp) {
                // Was from experience but tech tag was removed
                // Keep the skill but mark as not from experience
                skill.fromExp = false;
            }
        });
    });

    // Auto-add new tech tags to 'other' or try to match existing categories
    const knownSkills = new Set();
    Object.values(skillsData).forEach(arr => arr.forEach(s => knownSkills.add(s.name)));

    allTechTags.forEach(tag => {
        if (!knownSkills.has(tag)) {
            // Try to categorize
            const cat = categorizeSkill(tag);
            skillsData[cat].push({ name: tag, level: 3, years: '', fromExp: true });
            knownSkills.add(tag);
        }
    });

    renderAllSkillTags();
}

// Comprehensive skill categorization
function categorizeSkill(name) {
    const lower = name.toLowerCase().trim();

    // --- プログラミング言語 ---
    const langList = [
        'javascript', 'js', 'typescript', 'ts', 'python', 'java', 'c#', 'csharp',
        'c++', 'cpp', 'c言語', 'go', 'golang', 'rust', 'php', 'ruby', 'perl',
        'kotlin', 'swift', 'scala', 'r', 'sql', 'html', 'css', 'dart',
        'objective-c', 'cobol', 'fortran', 'haskell', 'elixir', 'erlang',
        'lua', 'clojure', 'f#', 'assembly', 'vhdl', 'verilog',
        'vba', 'powershell', 'bash', 'shell', 'solidity'
    ];

    // --- フレームワーク・ライブラリ ---
    const fwList = [
        'react', 'vue', 'vue.js', 'nuxt', 'nuxt.js', 'angular', 'svelte', 'sveltekit',
        'next', 'next.js', 'jquery', 'bootstrap', 'tailwind', 'tailwindcss',
        'express', 'express.js', 'fastify', 'koa', 'nestjs', 'nest.js',
        'spring', 'spring boot', 'springboot', 'django', 'flask', 'fastapi',
        'rails', 'ruby on rails', 'laravel', 'codeigniter', 'symfony',
        'node', 'node.js', 'deno', 'bun',
        'electron', 'unity', 'unreal', 'godot',
        '.net', '.net core', 'asp.net', 'xamarin', 'maui',
        'flutter', 'react native', 'ionic', 'cordova', 'phonegap',
        'qt', 'wpf', 'winforms', 'wxwidgets',
        'redux', 'mobx', 'recoil', 'zustand', 'pinia', 'vuex',
        'three.js', 'threejs', 'd3.js', 'chart.js', 'pixi.js',
        'storybook', 'material-ui', 'mui', 'chakra ui', 'antd',
        'prisma', 'typeorm', 'sequelize', 'mongoose',
        'gin', 'echo', 'fiber'
    ];

    // --- クラウド・インフラ ---
    const cloudList = [
        'aws', 'amazon web services', 'azure', 'microsoft azure', 'gcp', 'google cloud',
        'docker', 'kubernetes', 'k8s', 'containerd', 'podman',
        'terraform', 'ansible', 'cloudformation', 'pulumi',
        'lambda', 'ec2', 's3', 'rds', 'dynamodb', 'ecs', 'eks', 'fargate',
        'cloudfront', 'route53', 'cloudwatch', 'iam', 'api gateway',
        'cloudflare', 'vercel', 'netlify', 'heroku', 'digitalocean',
        'nginx', 'apache', 'caddy', 'traefik',
        'ci/cd', 'github actions', 'gitlab ci', 'jenkins', 'circleci', 'travis ci',
        'argocd', 'helm', 'istio', 'minikube', 'kind',
        'serverless', 'sam', 'amplify', 'appsync',
        'firebase', 'supabase', 'planetscale', 'render'
    ];

    // --- データベース（toolsに入れる） ---
    const dbList = [
        'postgresql', 'postgres', 'mysql', 'mariadb', 'mongodb', 'mongo',
        'redis', 'memcached', 'sqlite', 'oracle', 'sqlserver', 'sql server',
        'dynamodb', 'cassandra', 'elasticsearch', 'neo4j', 'influxdb',
        'supabase', 'firebase', 'firestore', 'prisma', 'typeorm'
    ];

    // --- ツール・ミドルウェア（toolsに入れる） ---
    const toolsList = [
        'git', 'github', 'gitlab', 'bitbucket', 'svn',
        'playwright', 'puppeteer', 'selenium', 'cypress', 'jest', 'vitest',
        'webpack', 'vite', 'rollup', 'esbuild', 'babel', 'postcss',
        'eslint', 'prettier', 'jira', 'confluence', 'trello', 'asana',
        'figma', 'photoshop', 'illustrator', 'adobe xd', 'sketch', 'gimp',
        'notion', 'slack', 'discord', 'teams',
        'n8n', 'zapier', 'make', 'ifttt',
        'linux', 'ubuntu', 'centos', 'debian', 'alpine',
        'windows', 'macos', 'android', 'ios',
        'webrtc', 'agora', 'socket.io', 'websocket',
        'openai', 'chatgpt', 'langchain', 'llm', 'ai', 'ml',
        's3', 'grafana', 'prometheus', 'datadog', 'sentry',
        'yarn', 'npm', 'pnpm', 'composer', 'pip', 'gem',
        'android studio', 'xcode', 'vscode', 'intellij', 'eclipse'
    ];

    // 完全一致を優先
    if (langList.some(l => lower === l)) return 'languages';
    if (fwList.some(f => lower === f)) return 'frameworks';
    if (cloudList.some(c => lower === c)) return 'cloud';
    if (dbList.some(d => lower === d)) return 'tools';
    if (toolsList.some(t => lower === t)) return 'tools';

    // 部分一致
    if (langList.some(l => lower.includes(l))) return 'languages';
    if (fwList.some(f => lower.includes(f))) return 'frameworks';
    if (dbList.some(d => lower.includes(d))) return 'tools';
    if (cloudList.some(c => lower.includes(c))) return 'cloud';
    if (toolsList.some(t => lower.includes(t))) return 'tools';

    return 'other';
}

// ==================== DATA: GET / SAVE / LOAD ====================
function getCurrentData() {
    return {
        personal: {
            fullName: getValue('fullName'),
            fullNameKana: getValue('fullNameKana'),
            birthDate: getValue('birthDate'),
            gender: getValue('gender'),
            jobTitle: getValue('jobTitle'),
            email: getValue('email'),
            phone: getValue('phone'),
            location: getValue('location'),
            website: getValue('website')
        },
        summary: getValue('summary'),
        experience: getExperienceData(),
        education: getEducationData(),
        skills: JSON.parse(JSON.stringify(skillsData)),
        certifications: getCertificationData()
    };
}

function getExperienceData() {
    const PROCESS_KEYS = ['proc-requirements', 'proc-basic-design', 'proc-detailed-design', 'proc-implementation', 'proc-unit-test', 'proc-integration-test', 'proc-maintenance'];
    const items = [];
    document.querySelectorAll('#experience-list .item-card').forEach(card => {
        const processes = [];
        PROCESS_KEYS.forEach(cls => {
            const cb = card.querySelector('.' + cls);
            if (cb && cb.checked) processes.push(cb.value);
        });
        items.push({
            company: getVal(card, '.input-company'),
            position: getVal(card, '.input-position'),
            status: getVal(card, '.input-status'),
            startDate: getVal(card, '.input-startDate'),
            endDate: getVal(card, '.input-endDate'),
            description: getVal(card, '.input-description'),
            processes: processes,
            techTags: card._techTags ? [...card._techTags] : []
        });
    });
    return items;
}

function getEducationData() {
    const items = [];
    document.querySelectorAll('#education-list .item-card').forEach(card => {
        items.push({
            institution: getVal(card, '.input-institution'),
            degree: getVal(card, '.input-degree'),
            gradDate: getVal(card, '.input-gradDate')
        });
    });
    return items;
}

function getCertificationData() {
    const items = [];
    document.querySelectorAll('#certification-list .item-card').forEach(card => {
        items.push({
            name: getVal(card, '.input-certName'),
            date: getVal(card, '.input-certDate'),
            issuer: getVal(card, '.input-certIssuer')
        });
    });
    return items;
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getCurrentData()));
    showSaveIndicator();
}

let saveIndicatorTimer = null;
function showSaveIndicator() {
    const el = document.getElementById('save-indicator');
    if (!el) return;
    el.classList.add('show');
    clearTimeout(saveIndicatorTimer);
    saveIndicatorTimer = setTimeout(() => el.classList.remove('show'), 2000);
}

function loadData() {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) return;
    try {
        restoreData(JSON.parse(json));
    } catch (e) {
        console.error('Load failed', e);
    }
}

function restoreData(data) {
    if (!data) return;

    // Ensure fields exist
    data.personal = data.personal || {};
    if (!data.skills) data.skills = { languages: [], frameworks: [], tools: [], cloud: [], other: [] };
    if (!data.certifications) data.certifications = [];

    // Personal
    setValue('fullName', data.personal.fullName);
    setValue('fullNameKana', data.personal.fullNameKana);
    setValue('birthDate', data.personal.birthDate);
    setValue('gender', data.personal.gender);
    setValue('jobTitle', data.personal.jobTitle);
    setValue('email', data.personal.email);
    setValue('phone', data.personal.phone);
    setValue('location', data.personal.location);
    setValue('website', data.personal.website);

    // Summary
    setValue('summary', data.summary);

    // Skills
    skillsData = {
        languages: migrateSkillItems(data.skills.languages),
        frameworks: migrateSkillItems(data.skills.frameworks),
        tools: migrateSkillItems(data.skills.tools),
        cloud: migrateSkillItems(data.skills.cloud),
        other: migrateSkillItems(data.skills.other)
    };
    renderAllSkillTags();

    // Experience
    const expList = document.getElementById('experience-list');
    expList.innerHTML = '';
    (data.experience || []).forEach(item => addExperience(item));

    // Aggregate tech tags after experience is loaded
    aggregateTechTagsToSkills();

    // Education
    const eduList = document.getElementById('education-list');
    eduList.innerHTML = '';
    (data.education || []).forEach(item => addEducation(item));

    // Certifications
    const certList = document.getElementById('certification-list');
    certList.innerHTML = '';
    (data.certifications || []).forEach(item => addCertification(item));

    // Resize textareas
    setTimeout(() => {
        document.querySelectorAll('textarea').forEach(el => autoResize(el));
        // Update char count
        const counter = document.getElementById('summary-count');
        const summary = document.getElementById('summary');
        if (counter && summary) counter.textContent = summary.value.length + '文字';
    }, 0);
}

// ==================== PREVIEW ====================
function renderPreview() {
    const data = getCurrentData();
    const container = document.getElementById('preview-content');

    // Get template and sort order
    const tplSelect = document.getElementById('preview-template-select');
    const sortSelect = document.getElementById('preview-sort-select');
    if (tplSelect) activeTemplate = tplSelect.value;
    const sortOrder = sortSelect ? sortSelect.value : 'new';

    // Sort experience
    let sortedExp = [...data.experience];
    if (sortOrder === 'new') {
        sortedExp.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
    } else {
        sortedExp.sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
    }

    let sections = [];

    // Build each section as a function
    const buildHeader = () => {
        let html = '<div class="preview-header">';
        html += `<h1>${escHtml(data.personal.fullName || '氏名未入力')}</h1>`;
        if (data.personal.fullNameKana) html += `<div style="font-size:0.85rem;color:var(--text-light);margin-bottom:0.3rem;">${escHtml(data.personal.fullNameKana)}</div>`;
        // Birth date & gender
        const personalInfo = [];
        if (data.personal.birthDate) {
            const d = new Date(data.personal.birthDate);
            personalInfo.push(`生年月日: ${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`);
        }
        if (data.personal.gender) personalInfo.push(`性別: ${escHtml(data.personal.gender)}`);
        if (personalInfo.length > 0) html += `<div style="font-size:0.8rem;color:var(--text-light);margin-bottom:0.3rem;">${personalInfo.join(' / ')}</div>`;
        if (data.personal.jobTitle) html += `<div class="preview-jobtitle">${escHtml(data.personal.jobTitle)}</div>`;
        html += '<div class="preview-contact">';
        if (data.personal.email) html += `<span>📧 ${escHtml(data.personal.email)}</span>`;
        if (data.personal.phone) html += `<span>📱 ${escHtml(data.personal.phone)}</span>`;
        if (data.personal.location) html += `<span>📍 ${escHtml(data.personal.location)}</span>`;
        if (data.personal.website) html += `<span>🔗 ${escHtml(data.personal.website)}</span>`;
        html += '</div></div>';
        return html;
    };

    const buildSummary = () => {
        if (!data.summary) return '';
        return '<div class="preview-section"><h3 class="preview-section-title">自己PR</h3>' +
               `<div class="preview-summary">${escHtml(data.summary)}</div></div>`;
    };

    const buildSkills = () => {
        const hasSkills = Object.values(data.skills).some(arr => arr.length > 0);
        if (!hasSkills) return '';
        const labels = { languages: 'プログラミング言語', frameworks: 'フレームワーク・ライブラリ', tools: 'ツール・ミドルウェア', cloud: 'クラウド・インフラ', other: 'その他' };
        let html = '<div class="preview-section"><h3 class="preview-section-title">スキル</h3>';
        html += '<div class="preview-skills-grid">';
        Object.entries(labels).forEach(([key, label]) => {
            if (data.skills[key] && data.skills[key].length > 0) {
                html += `<div class="preview-skill-category"><h4>${label}</h4>`;
                data.skills[key].forEach(skill => {
                    const levelInfo = SKILL_LEVELS[skill.level] || SKILL_LEVELS[3];
                    html += '<div class="preview-skill-item">';
                    html += `<span class="skill-name">${escHtml(skill.name)}</span>`;
                    html += `<span class="skill-stars">${levelInfo.stars}</span>`;
                    if (skill.years) html += `<span class="skill-years">${escHtml(skill.years)}</span>`;
                    html += '</div>';
                });
                html += '</div>';
            }
        });
        html += '</div></div>';
        return html;
    };

    const buildExperience = () => {
        if (sortedExp.length === 0) return '';
        let html = '<div class="preview-section"><h3 class="preview-section-title">職務経歴</h3>';
        
        // Career summary
        const summary = calculateCareerSummary(sortedExp);
        if (summary && summary.careerPeriod) {
            html += '<div class="preview-career-summary">';
            html += `<div class="summary-stat"><span class="summary-stat-label">キャリア期間</span><span class="summary-stat-value">${summary.careerPeriod}</span></div>`;
            html += `<div class="summary-stat"><span class="summary-stat-label">経歴数</span><span class="summary-stat-value">${summary.totalExp}件</span></div>`;
            const procEntries = Object.entries(summary.processCount);
            if (procEntries.length > 0) {
                html += '<div class="summary-stat" style="flex-basis:100%;"><span class="summary-stat-label">担当工程集計</span><div class="summary-process-stats">';
                const procOrder = ['要件定義','基本設計','詳細設計','製造','単体テスト','結合テスト','運用'];
                procEntries.sort((a,b) => procOrder.indexOf(a[0]) - procOrder.indexOf(b[0]));
                procEntries.forEach(([proc, count]) => {
                    html += `<span class="summary-process-badge">${escHtml(proc)} <span class="summary-process-count">${count}</span></span>`;
                });
                html += '</div></div>';
            }
            html += '</div>';
        }

        html += '<div class="preview-experience-list">';
        sortedExp.forEach(exp => {
            html += '<div class="preview-exp-card"><div class="preview-exp-date">';
            html += escHtml(exp.startDate || '');
            if (exp.endDate) html += `<br>〜 ${escHtml(exp.endDate)}`;
            html += '</div><div class="preview-exp-content">';
            if (exp.company) html += `<div class="preview-exp-company">${escHtml(exp.company)}</div>`;
            if (exp.status) html += `<div class="preview-exp-status">${escHtml(exp.status)}</div>`;
            if (exp.position) html += `<div class="preview-exp-position">${escHtml(exp.position)}</div>`;
            if (exp.processes && exp.processes.length > 0) {
                html += '<div class="preview-exp-processes">';
                html += '<span class="processes-label">担当工程:</span> ';
                exp.processes.forEach(p => html += `<span class="process-badge">${escHtml(p)}</span>`);
                html += '</div>';
            }
            if (exp.description) html += `<div class="preview-exp-description">${escHtml(exp.description)}</div>`;
            if (exp.techTags && exp.techTags.length > 0) {
                html += '<div class="preview-tech-tags">';
                exp.techTags.forEach(t => html += `<span class="tag">${escHtml(t)}</span>`);
                html += '</div>';
            }
            html += '</div></div>';
        });
        html += '</div></div>';
        return html;
    };

    const buildEducation = () => {
        if (data.education.length === 0) return '';
        let html = '<div class="preview-section"><h3 class="preview-section-title">学歴</h3>';
        html += '<div class="preview-edu-list">';
        data.education.forEach(edu => {
            html += '<div class="preview-edu-card"><div class="preview-edu-date">';
            html += escHtml(edu.gradDate || '');
            html += '</div><div class="preview-edu-content">';
            if (edu.institution) html += `<div class="preview-edu-institution">${escHtml(edu.institution)}</div>`;
            if (edu.degree) html += `<div class="preview-edu-degree">${escHtml(edu.degree)}</div>`;
            html += '</div></div>';
        });
        html += '</div></div>';
        return html;
    };

    const buildCerts = () => {
        if (data.certifications.length === 0) return '';
        let html = '<div class="preview-section"><h3 class="preview-section-title">保有資格</h3>';
        html += '<div class="preview-cert-list">';
        data.certifications.forEach(cert => {
            html += '<div class="preview-cert-item">';
            if (cert.date) html += `<span class="preview-cert-date">${escHtml(cert.date)}</span>`;
            html += '<div>';
            if (cert.name) html += `<span class="preview-cert-name">${escHtml(cert.name)}</span>`;
            if (cert.issuer) html += ` <span class="preview-cert-issuer">(${escHtml(cert.issuer)})</span>`;
            html += '</div></div>';
        });
        html += '</div></div>';
        return html;
    };

    // Template-specific section ordering
    const tpl = activeTemplate || 'standard';
    if (tpl === 'engineer') {
        // Skills first, then experience
        sections = [buildHeader(), buildSummary(), buildSkills(), buildExperience(), buildEducation(), buildCerts()];
    } else if (tpl === 'designer') {
        // Summary, Experience, Skills, Certs
        sections = [buildHeader(), buildSummary(), buildExperience(), buildSkills(), buildEducation(), buildCerts()];
    } else if (tpl === 'manager') {
        // Certs prominent, then summary
        sections = [buildHeader(), buildCerts(), buildSummary(), buildExperience(), buildSkills(), buildEducation()];
    } else {
        // Standard: Header → Summary → Experience → Skills → Education → Certs
        sections = [buildHeader(), buildSummary(), buildExperience(), buildSkills(), buildEducation(), buildCerts()];
    }

    let html = sections.join('');

    if (!html.trim()) {
        html = '<div class="preview-empty">まだ入力されたデータがありません。サイドバーから各項目を入力してください。</div>';
    }

    container.innerHTML = html;
}

// ==================== DYNAMIC LISTS ====================
function addExperience(data = {}) {
    const tpl = document.getElementById('template-experience');
    const clone = tpl.content.cloneNode(true);
    const card = clone.querySelector('.item-card');

    if (data.company) card.querySelector('.input-company').value = data.company;
    if (data.position) card.querySelector('.input-position').value = data.position;
    if (data.status) card.querySelector('.input-status').value = data.status;
    if (data.startDate) card.querySelector('.input-startDate').value = data.startDate;
    if (data.endDate) card.querySelector('.input-endDate').value = data.endDate;
    if (data.description) card.querySelector('.input-description').value = data.description;

    // Restore process checkboxes
    const PROCESS_MAP = {
        'proc-requirements': '要件定義',
        'proc-basic-design': '基本設計',
        'proc-detailed-design': '詳細設計',
        'proc-implementation': '製造',
        'proc-unit-test': '単体テスト',
        'proc-integration-test': '結合テスト',
        'proc-maintenance': '運用'
    };
    const processes = data.processes || [];
    Object.entries(PROCESS_MAP).forEach(([cls, label]) => {
        const cb = card.querySelector('.' + cls);
        if (cb && processes.includes(label)) cb.checked = true;
    });

    card._techTags = data.techTags ? [...data.techTags] : [];

    const techInput = card.querySelector('.tech-tag-input');
    techInput.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTechTagToItem(techInput);
        }
    });

    renderTechTagsForCard(card);
    setupDynamicInputs(clone);
    document.getElementById('experience-list').appendChild(clone);

    const newItem = document.getElementById('experience-list').lastElementChild;
    newItem.querySelectorAll('textarea').forEach(el => autoResize(el));

    // Setup drag and drop for this card
    setupDragAndDrop(newItem);
}

function addEducation(data = {}) {
    const tpl = document.getElementById('template-education');
    const clone = tpl.content.cloneNode(true);

    if (data.institution) clone.querySelector('.input-institution').value = data.institution;
    if (data.degree) clone.querySelector('.input-degree').value = data.degree;
    if (data.gradDate) clone.querySelector('.input-gradDate').value = data.gradDate;

    setupDynamicInputs(clone);
    document.getElementById('education-list').appendChild(clone);
}

function addCertification(data = {}) {
    const tpl = document.getElementById('template-certification');
    const clone = tpl.content.cloneNode(true);

    if (data.name) clone.querySelector('.input-certName').value = data.name;
    if (data.date) clone.querySelector('.input-certDate').value = data.date;
    if (data.issuer) clone.querySelector('.input-certIssuer').value = data.issuer;

    setupDynamicInputs(clone);
    document.getElementById('certification-list').appendChild(clone);
}

function setupDynamicInputs(fragment) {
    fragment.querySelectorAll('input:not(.tag-input):not([type="checkbox"]), textarea').forEach(input => {
        input.addEventListener('input', () => { saveData(); updateProgress(); });
        if (input.tagName === 'TEXTAREA') {
            input.addEventListener('input', function() { autoResize(this); });
            setTimeout(() => autoResize(input), 0);
        }
    });
    // Checkboxes
    fragment.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', () => { saveData(); updateProgress(); });
    });
}

function removeParent(btn) {
    if (confirm('この項目を削除しますか？')) {
        btn.closest('.item-card').remove();
        saveData();
        updateProgress();
    }
}

// ==================== DRAG & DROP REORDERING ====================
let draggedItem = null;

function setupDragAndDrop(card) {
    card.addEventListener('dragstart', e => {
        draggedItem = card;
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', '');
    });

    card.addEventListener('dragend', e => {
        card.classList.remove('dragging');
        document.querySelectorAll('.item-card').forEach(c => c.classList.remove('drag-over'));
        saveData();
    });

    card.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (draggedItem && draggedItem !== card) {
            card.classList.add('drag-over');
        }
    });

    card.addEventListener('dragleave', e => {
        card.classList.remove('drag-over');
    });

    card.addEventListener('drop', e => {
        e.preventDefault();
        e.stopPropagation();
        if (draggedItem && draggedItem !== card) {
            const list = card.parentNode;
            const items = [...list.children];
            const draggedIdx = items.indexOf(draggedItem);
            const targetIdx = items.indexOf(card);

            if (draggedIdx < targetIdx) {
                list.insertBefore(draggedItem, card.nextSibling);
            } else {
                list.insertBefore(draggedItem, card);
            }
            saveData();
        }
        card.classList.remove('drag-over');
    });
}

// ==================== JSON EXPORT / IMPORT ====================
function downloadJSON() {
    saveData();
    const json = localStorage.getItem(STORAGE_KEY);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resume_data_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('JSONを保存しました');
}

function loadJSON(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.skills) {
                skillsData = data.skills;
                renderAllSkillTags();
            }
            restoreData(data);
            saveData();
            updateProgress();
            showToast('データを読み込みました');
        } catch (err) {
            alert('ファイルの読み込みに失敗しました。正しいJSONファイルか確認してください。');
            console.error(err);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function clearData() {
    if (confirm('すべてのデータを消去しますか？この操作は取り消せません。')) {
        localStorage.removeItem(STORAGE_KEY);
        skillsData = { languages: [], frameworks: [], tools: [], cloud: [], other: [] };
        location.reload();
    }
}

// ==================== SKILL COUNTS ====================
function updateSkillCount(category) {
    const badge = document.querySelector(`.skill-count-badge[data-skill-count="${category}"]`);
    if (badge) badge.textContent = (skillsData[category] || []).length;
}

function updateSkillCounts() {
    ['languages', 'frameworks', 'tools', 'cloud', 'other'].forEach(c => updateSkillCount(c));
}

// ==================== KEYBOARD SHORTCUTS ====================
function bindKeyboardShortcuts() {
    document.addEventListener('keydown', e => {
        // Ctrl+S = Save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            saveData();
            updateProgress();
            showToast('💾 保存しました');
        }
        // Ctrl+P = Preview & Print
        if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
            e.preventDefault();
            // Check required fields before printing
            const missing = validateRequiredFields();
            if (missing.length > 0) {
                showToast(`⚠️ 必須項目が${missing.length}個未入力です`);
            }
            switchPage('preview');
            setTimeout(() => window.print(), 400);
        }
    });
}

// ==================== VALIDATION ====================
function bindValidation() {
    document.querySelectorAll('[data-required]').forEach(input => {
        input.addEventListener('blur', () => {
            if (!input.value.trim()) {
                input.classList.add('invalid');
            } else {
                input.classList.remove('invalid');
            }
        });
        input.addEventListener('input', () => {
            if (input.value.trim()) {
                input.classList.remove('invalid');
            }
        });
    });
}

function validateRequiredFields() {
    const missing = [];
    document.querySelectorAll('[data-required]').forEach(input => {
        if (!input.value.trim()) {
            missing.push(input);
            input.classList.add('invalid');
        }
    });
    return missing;
}

// ==================== DARK MODE ====================
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    document.getElementById('btn-darkmode').classList.toggle('active', isDark);
    document.getElementById('btn-darkmode').textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('cv_darkmode', isDark ? '1' : '0');
}

function restoreDarkMode() {
    if (localStorage.getItem('cv_darkmode') === '1') {
        toggleDarkMode();
    }
}

// ==================== DUPLICATE EXPERIENCE ====================
function duplicateExperience(btn) {
    const card = btn.closest('.item-card');
    const data = getExperienceData();
    const allCards = document.querySelectorAll('#experience-list .item-card');
    const idx = Array.from(allCards).indexOf(card);
    if (idx >= 0 && data[idx]) {
        const clone = JSON.parse(JSON.stringify(data[idx]));
        addExperience(clone);
        showToast('経歴を複製しました');
        saveData();
    }
}

// ==================== URL SHARE ====================
function generateShareURL() {
    saveData();
    const data = getCurrentData();
    const dataCopy = JSON.parse(JSON.stringify(data));
    const json = JSON.stringify(dataCopy);
    // Compress with btoa (base64 encode UTF-8)
    const encoded = btoa(unescape(encodeURIComponent(json)));
    const url = window.location.origin + window.location.pathname + '#d=' + encoded;
    document.getElementById('share-url-input').value = url;
    document.getElementById('share-modal').classList.add('show');
}

function loadFromURL() {
    const hash = window.location.hash;
    if (!hash || !hash.startsWith('#d=')) return false;
    try {
        const encoded = hash.substring(3);
        const json = decodeURIComponent(escape(atob(encoded)));
        const data = JSON.parse(json);
        skillsData = { languages: [], frameworks: [], tools: [], cloud: [], other: [] };
        if (data.skills) {
            ['languages','frameworks','tools','cloud','other'].forEach(k => {
                skillsData[k] = migrateSkillItems(data.skills[k] || []);
            });
        }
        restoreData(data);
        renderAllSkillTags();
        return true;
    } catch(e) {
        console.error('URL load failed', e);
        return false;
    }
}

// ==================== CAREER SUMMARY ====================
function calculateCareerSummary(experiences) {
    if (!experiences || experiences.length === 0) return null;
    
    // Parse dates
    const parseDate = (str) => {
        if (!str) return null;
        const m = str.match(/(\d{4})[\/\-年](\d{1,2})/);
        if (m) return new Date(parseInt(m[1]), parseInt(m[2]) - 1);
        return null;
    };

    let earliest = null, latest = null;
    const processCount = {};
    let totalExp = 0;

    experiences.forEach(exp => {
        const start = parseDate(exp.startDate);
        const end = exp.endDate ? parseDate(exp.endDate) : new Date();
        if (start) {
            if (!earliest || start < earliest) earliest = start;
        }
        if (end) {
            if (!latest || end > latest) latest = end;
        }
        // Count processes
        (exp.processes || []).forEach(p => {
            processCount[p] = (processCount[p] || 0) + 1;
        });
        totalExp++;
    });

    let careerPeriod = '';
    if (earliest && latest) {
        const months = (latest.getFullYear() - earliest.getFullYear()) * 12 + (latest.getMonth() - earliest.getMonth());
        const years = Math.floor(months / 12);
        const remMonths = months % 12;
        careerPeriod = `${years}年${remMonths}ヶ月`;
    }

    return {
        careerPeriod,
        totalExp,
        processCount
    };
}

// ==================== UTILITIES ====================
function getValue(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
}

function setValue(id, val) {
    const el = document.getElementById(id);
    if (el) {
        el.value = val || '';
        if (el.tagName === 'TEXTAREA') {
            setTimeout(() => autoResize(el), 50);
        }
    }
}

function getVal(parent, selector) {
    const el = parent.querySelector(selector);
    return el ? el.value : '';
}

function autoResize(el) {
    if (!el) return;
    el.style.height = 'auto';
    const newHeight = Math.max(el.scrollHeight, 120);
    el.style.height = newHeight + 'px';
}

function escHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== GLOBAL SCOPE ====================
window.addExperience = addExperience;
window.addEducation = addEducation;
window.addCertification = addCertification;
window.removeParent = removeParent;
window.removeSkillTag = removeSkillTag;
window.removeTechTagFromItem = removeTechTagFromItem;
window.switchPage = switchPage;
window.saveSectionFeedback = saveSectionFeedback;
window.setSkillLevel = setSkillLevel;
window.setSkillYears = setSkillYears;
window.aggregateTechTagsToSkills = aggregateTechTagsToSkills;
window.setupDragAndDrop = setupDragAndDrop;
window.duplicateExperience = duplicateExperience;
window.validateRequiredFields = validateRequiredFields;
window.updateSkillCounts = updateSkillCounts;
