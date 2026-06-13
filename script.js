// ==================== CVGenerator - Main Script ====================

document.addEventListener('DOMContentLoaded', () => {
    // Initial Load
    loadData();

    // Event Listeners for Static Inputs
    const staticInputs = document.querySelectorAll('#edit-mode input:not([type="file"]):not(.tag-input), #edit-mode textarea');
    staticInputs.forEach(input => {
        input.addEventListener('input', () => { saveData(); updateProgress(); });
        if (input.tagName === 'TEXTAREA') {
            input.addEventListener('input', function () { autoResize(this); });
        }
    });

    // Button Listeners
    document.getElementById('btn-save-json').addEventListener('click', downloadJSON);
    document.getElementById('btn-load-json').addEventListener('click', () => document.getElementById('file-input').click());
    document.getElementById('file-input').addEventListener('change', loadJSON);
    document.getElementById('btn-print').addEventListener('click', () => {
        // Switch to preview before printing
        switchTab('preview');
        setTimeout(() => window.print(), 300);
    });
    document.getElementById('btn-clear').addEventListener('click', clearData);

    // Tab Listeners
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => switchTab(e.target.dataset.tab));
    });

    // Template Selector
    document.getElementById('template-select').addEventListener('change', (e) => {
        if (e.target.value) {
            loadTemplate(e.target.value);
            e.target.value = '';
        }
    });

    // Skill Tag Input Listeners
    document.querySelectorAll('.tag-input[data-skill-category]').forEach(input => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                const category = input.dataset.skillCategory;
                const value = input.value.trim();
                if (value) {
                    addSkillTag(category, value);
                    input.value = '';
                    saveData();
                    updateProgress();
                }
            }
        });
    });

    // Initial progress update
    updateProgress();
});

// Keys for LocalStorage
const STORAGE_KEY = 'resume_helper_data';

// In-memory skills data
let skillsData = {
    languages: [],
    frameworks: [],
    tools: [],
    cloud: [],
    other: []
};

// ==================== TAB SWITCHING ====================

function switchTab(tab) {
    const editMode = document.getElementById('edit-mode');
    const previewMode = document.getElementById('preview-mode');
    const tabBtns = document.querySelectorAll('.tab-btn');

    if (tab === 'preview') {
        saveData();
        renderPreview();
        editMode.style.display = 'none';
        previewMode.style.display = 'block';
    } else {
        editMode.style.display = 'block';
        previewMode.style.display = 'none';
    }

    tabBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
}

// ==================== PREVIEW RENDERING ====================

function renderPreview() {
    const data = getCurrentData();
    const preview = document.getElementById('preview-mode');

    let html = '';

    // Header
    html += '<div class="preview-header">';
    html += `<h1>${escHtml(data.personal.fullName || '氏名未入力')}</h1>`;
    if (data.personal.jobTitle) {
        html += `<div class="preview-jobtitle">${escHtml(data.personal.jobTitle)}</div>`;
    }
    html += '<div class="preview-contact">';
    if (data.personal.email) html += `<span>📧 ${escHtml(data.personal.email)}</span>`;
    if (data.personal.phone) html += `<span>📱 ${escHtml(data.personal.phone)}</span>`;
    if (data.personal.location) html += `<span>📍 ${escHtml(data.personal.location)}</span>`;
    if (data.personal.website) html += `<span>🔗 ${escHtml(data.personal.website)}</span>`;
    html += '</div></div>';

    // Summary
    if (data.summary) {
        html += '<div class="preview-section">';
        html += '<h3 class="preview-section-title">自己PR / 概要</h3>';
        html += `<div class="preview-summary">${escHtml(data.summary)}</div>`;
        html += '</div>';
    }

    // Experience (maintains table-style layout!)
    if (data.experience && data.experience.length > 0) {
        html += '<div class="preview-section">';
        html += '<h3 class="preview-section-title">職務経歴</h3>';
        html += '<div class="preview-experience-list">';
        data.experience.forEach(exp => {
            html += '<div class="preview-exp-card">';
            html += '<div class="preview-exp-date">';
            html += escHtml(exp.startDate || '');
            if (exp.endDate) html += `<br>〜 ${escHtml(exp.endDate)}`;
            html += '</div>';
            html += '<div class="preview-exp-content">';
            if (exp.company) html += `<div class="preview-exp-company">${escHtml(exp.company)}</div>`;
            if (exp.status) html += `<div class="preview-exp-status">${escHtml(exp.status)}</div>`;
            if (exp.position) html += `<div class="preview-exp-position">${escHtml(exp.position)}</div>`;
            if (exp.description) html += `<div class="preview-exp-description">${escHtml(exp.description)}</div>`;
            // Tech Tags
            if (exp.techTags && exp.techTags.length > 0) {
                html += '<div class="preview-tech-tags">';
                exp.techTags.forEach(tag => {
                    html += `<span class="tag">${escHtml(tag)}</span>`;
                });
                html += '</div>';
            }
            html += '</div></div>';
        });
        html += '</div></div>';
    }

    // Skills
    const hasSkills = Object.values(data.skills || {}).some(arr => arr && arr.length > 0);
    if (hasSkills) {
        const categoryLabels = {
            languages: 'プログラミング言語',
            frameworks: 'フレームワーク・ライブラリ',
            tools: 'ツール・ミドルウェア',
            cloud: 'クラウド・インフラ',
            other: 'その他'
        };
        html += '<div class="preview-section">';
        html += '<h3 class="preview-section-title">スキル</h3>';
        html += '<div class="preview-skills-grid">';
        Object.entries(categoryLabels).forEach(([key, label]) => {
            const tags = data.skills[key];
            if (tags && tags.length > 0) {
                html += `<div class="preview-skill-category">`;
                html += `<h4>${label}</h4>`;
                html += '<div class="preview-tech-tags">';
                tags.forEach(tag => {
                    html += `<span class="tag">${escHtml(tag)}</span>`;
                });
                html += '</div></div>';
            }
        });
        html += '</div></div>';
    }

    // Education
    if (data.education && data.education.length > 0) {
        html += '<div class="preview-section">';
        html += '<h3 class="preview-section-title">学歴</h3>';
        html += '<div class="preview-edu-list">';
        data.education.forEach(edu => {
            html += '<div class="preview-edu-card">';
            html += `<div class="preview-edu-date">${escHtml(edu.gradDate || '')}</div>`;
            html += '<div class="preview-edu-content">';
            if (edu.institution) html += `<div class="preview-edu-institution">${escHtml(edu.institution)}</div>`;
            if (edu.degree) html += `<div class="preview-edu-degree">${escHtml(edu.degree)}</div>`;
            html += '</div></div>';
        });
        html += '</div></div>';
    }

    // Certifications
    if (data.certifications && data.certifications.length > 0) {
        html += '<div class="preview-section">';
        html += '<h3 class="preview-section-title">保有資格</h3>';
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
    }

    // Empty state
    if (!html.trim() || (html.length < 100 && !data.personal.fullName)) {
        html = '<div class="preview-empty">まだ入力されたデータがありません。「入力」タブからデータを入力してください。</div>';
    }

    preview.innerHTML = html;
}

function escHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== PROGRESS BAR ====================

function updateProgress() {
    const data = getCurrentData();
    let filled = 0;
    let total = 0;

    // Personal info (6 fields)
    const personalFields = ['fullName', 'jobTitle', 'email', 'phone', 'location', 'website'];
    personalFields.forEach(f => {
        total++;
        if (data.personal[f]) filled++;
    });

    // Summary
    total++;
    if (data.summary) filled++;

    // Experience (at least 1 entry with key fields)
    total += 3;
    if (data.experience && data.experience.length > 0) {
        filled++;
        const firstExp = data.experience[0];
        if (firstExp.company) filled++;
        if (firstExp.description) filled++;
    }

    // Skills (at least 1 tag in any category)
    total++;
    if (Object.values(data.skills || {}).some(arr => arr && arr.length > 0)) filled++;

    // Education (at least 1 entry)
    total++;
    if (data.education && data.education.length > 0) filled++;

    // Certifications (optional, bonus)
    total++;
    if (data.certifications && data.certifications.length > 0) filled++;

    const percent = Math.round((filled / total) * 100);
    document.getElementById('progress-fill').style.width = percent + '%';
    document.getElementById('progress-text').textContent = `入力完了度: ${percent}%`;
}

// ==================== TEMPLATE LOADING ====================

function loadTemplate(templateKey) {
    if (!confirm('テンプレートを読み込みますか？現在の入力内容は上書きされます。')) return;

    const templates = {
        engineer: {
            personal: {
                fullName: '',
                jobTitle: 'ソフトウェアエンジニア',
                email: '',
                phone: '',
                location: '',
                website: ''
            },
            summary: '〇年間のWebアプリケーション開発経験を持ち、バックエンドからフロントエンドまで幅広い技術スタックを扱ってきました。アジャイル開発チームでの開発プロセス改善や、パフォーマンス最適化の実績があります。',
            experience: [{
                company: '',
                position: 'ソフトウェアエンジニア',
                status: '正社員',
                startDate: '',
                endDate: '',
                description: '・Webアプリケーションの設計・開発・運用\n・アジャイルチームでのスクラム開発\n・API設計とデータベース最適化',
                techTags: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'AWS']
            }],
            skills: {
                languages: ['JavaScript', 'TypeScript', 'Python', 'Java'],
                frameworks: ['React', 'Vue.js', 'Express', 'Spring Boot'],
                tools: ['Git', 'Docker', 'Jest', 'Webpack'],
                cloud: ['AWS', 'Docker', 'CI/CD'],
                other: ['アジャイル/スクラム']
            },
            certifications: [],
            education: []
        },
        designer: {
            personal: {
                fullName: '',
                jobTitle: 'UI/UXデザイナー',
                email: '',
                phone: '',
                location: '',
                website: ''
            },
            summary: 'ユーザー中心のデザインプロセスに精通し、Web・モバイルアプリケーションのUI/UXデザインを担当。ユーザーリサーチからプロトタイピング、デザインシステムの構築まで一貫して手がけています。',
            experience: [{
                company: '',
                position: 'UI/UXデザイナー',
                status: '正社員',
                startDate: '',
                endDate: '',
                description: '・Web・アプリのUI/UXデザイン\n・デザインシステムの構築・運用\n・ユーザーテストと改善施策の実施',
                techTags: ['Figma', 'Adobe XD', 'Photoshop', 'Illustrator']
            }],
            skills: {
                languages: ['HTML', 'CSS'],
                frameworks: ['Figma', 'Adobe Creative Suite', 'Sketch'],
                tools: ['Miro', 'Notion', 'Zeplin'],
                cloud: [],
                other: ['ユーザーリサーチ', 'プロトタイピング', 'デザインシステム']
            },
            certifications: [],
            education: []
        },
        manager: {
            personal: {
                fullName: '',
                jobTitle: 'プロジェクトマネージャー',
                email: '',
                phone: '',
                location: '',
                website: ''
            },
            summary: '〇年のプロジェクトマネジメント経験。大規模システム開発プロジェクトの計画・進行管理から、ステークホルダー調整、チームビルディングまで幅広く対応。PMP資格保有。',
            experience: [{
                company: '',
                position: 'プロジェクトマネージャー',
                status: '正社員',
                startDate: '',
                endDate: '',
                description: '・プロジェクト計画策定と進行管理\n・要件定義・基本設計のリード\n・品質管理・リスク管理・ステークホルダー調整',
                techTags: ['Jira', 'Confluence', 'MS Project']
            }],
            skills: {
                languages: [],
                frameworks: [],
                tools: ['Jira', 'Confluence', 'MS Project', 'Excel'],
                cloud: [],
                other: ['プロジェクト管理', 'アジャイル/スクラム', '要件定義', 'リスク管理']
            },
            certifications: [
                { name: 'PMP (Project Management Professional)', date: '', issuer: 'PMI' }
            ],
            education: []
        },
        blank: {
            personal: { fullName: '', jobTitle: '', email: '', phone: '', location: '', website: '' },
            summary: '',
            experience: [],
            skills: { languages: [], frameworks: [], tools: [], cloud: [], other: [] },
            certifications: [],
            education: []
        }
    };

    const template = templates[templateKey];
    if (template) {
        skillsData = JSON.parse(JSON.stringify(template.skills || { languages: [], frameworks: [], tools: [], cloud: [], other: [] }));
        restoreData(template);
        renderAllSkillTags();
        saveData();
        updateProgress();
    }
}

// ==================== SKILL TAG MANAGEMENT ====================

function addSkillTag(category, value) {
    if (!skillsData[category]) skillsData[category] = [];
    if (!skillsData[category].includes(value)) {
        skillsData[category].push(value);
        renderSkillTags(category);
    }
}

function removeSkillTag(category, index) {
    if (skillsData[category]) {
        skillsData[category].splice(index, 1);
        renderSkillTags(category);
        saveData();
        updateProgress();
    }
}

function renderSkillTags(category) {
    const container = document.querySelector(`.tags-display[data-skill-category="${category}"]`);
    if (!container) return;

    container.innerHTML = '';
    (skillsData[category] || []).forEach((tag, index) => {
        const tagEl = document.createElement('span');
        tagEl.className = 'tag';
        tagEl.innerHTML = `${escHtml(tag)} <span class="tag-remove" onclick="removeSkillTag('${category}', ${index})">&times;</span>`;
        container.appendChild(tagEl);
    });
}

function renderAllSkillTags() {
    ['languages', 'frameworks', 'tools', 'cloud', 'other'].forEach(cat => renderSkillTags(cat));
}

// ==================== TECH TAG MANAGEMENT (for experience items) ====================

function getTechTagsForItem(item) {
    if (!item.techTags) item.techTags = [];
    return item.techTags;
}

function addTechTagToItem(inputElement) {
    const value = inputElement.value.trim();
    if (!value) return;

    const card = inputElement.closest('.item-card');
    const display = card.querySelector('.tech-tags-display');
    const tags = getTechTagsForItem(card._techTags = card._techTags || []);

    if (!tags.includes(value)) {
        tags.push(value);
        renderTechTagsForCard(card);
        inputElement.value = '';
        saveData();
    }
}

function renderTechTagsForCard(card) {
    const display = card.querySelector('.tech-tags-display');
    if (!display) return;

    const tags = card._techTags || [];
    display.innerHTML = '';
    tags.forEach((tag, index) => {
        const tagEl = document.createElement('span');
        tagEl.className = 'tag';
        tagEl.innerHTML = `${escHtml(tag)} <span class="tag-remove" onclick="removeTechTagFromItem(this, ${index})">&times;</span>`;
        display.appendChild(tagEl);
    });
}

function removeTechTagFromItem(removeSpan, index) {
    const card = removeSpan.closest('.item-card');
    const tags = card._techTags || [];
    tags.splice(index, 1);
    renderTechTagsForCard(card);
    saveData();
}

// ==================== DATA MANAGEMENT ====================

function getCurrentData() {
    const data = {
        personal: {
            fullName: getValue('fullName'),
            jobTitle: getValue('jobTitle'),
            email: getValue('email'),
            phone: getValue('phone'),
            location: getValue('location'),
            website: getValue('website')
        },
        summary: getValue('summary'),
        experience: getExperienceData(),
        education: getDynamicList('education-list', ['.input-institution', '.input-degree', '.input-gradDate']),
        skills: JSON.parse(JSON.stringify(skillsData)),
        certifications: getCertificationData()
    };
    return data;
}

function getExperienceData() {
    const items = [];
    document.querySelectorAll('#experience-list .item-card').forEach(card => {
        items.push({
            company: getVal(card, '.input-company'),
            position: getVal(card, '.input-position'),
            status: getVal(card, '.input-status'),
            startDate: getVal(card, '.input-startDate'),
            endDate: getVal(card, '.input-endDate'),
            description: getVal(card, '.input-description'),
            techTags: card._techTags ? [...card._techTags] : []
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
    const data = getCurrentData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadData() {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) return;

    try {
        const data = JSON.parse(json);
        restoreData(data);
    } catch (e) {
        console.error("Failed to load data", e);
    }
}

function restoreData(data) {
    if (!data) return;

    // Normalize legacy data
    const normalized = normalizeData(data);

    // Personal
    if (normalized.personal) {
        setValue('fullName', normalized.personal.fullName);
        setValue('jobTitle', normalized.personal.jobTitle);
        setValue('email', normalized.personal.email);
        setValue('phone', normalized.personal.phone);
        setValue('location', normalized.personal.location);
        setValue('website', normalized.personal.website);
    }

    // Summary
    setValue('summary', normalized.summary);

    // Skills (structured)
    if (normalized.skills) {
        if (Array.isArray(normalized.skills)) {
            // Legacy: all skills in "other"
            skillsData = { languages: [], frameworks: [], tools: [], cloud: [], other: [...normalized.skills] };
        } else if (typeof normalized.skills === 'string') {
            // Legacy: comma-separated string
            const arr = normalized.skills.split(/[,\n]/).map(s => s.trim()).filter(s => s);
            skillsData = { languages: [], frameworks: [], tools: [], cloud: [], other: arr };
        } else {
            // New structured format
            skillsData = {
                languages: normalized.skills.languages || [],
                frameworks: normalized.skills.frameworks || [],
                tools: normalized.skills.tools || [],
                cloud: normalized.skills.cloud || [],
                other: normalized.skills.other || []
            };
        }
        renderAllSkillTags();
    }

    // Experience
    const expList = document.getElementById('experience-list');
    expList.innerHTML = '';
    if (normalized.experience && Array.isArray(normalized.experience)) {
        normalized.experience.forEach(item => addExperience(item));
    }

    // Education
    const eduList = document.getElementById('education-list');
    eduList.innerHTML = '';
    if (normalized.education && Array.isArray(normalized.education)) {
        normalized.education.forEach(item => addEducation(item));
    }

    // Certifications
    const certList = document.getElementById('certification-list');
    certList.innerHTML = '';
    if (normalized.certifications && Array.isArray(normalized.certifications)) {
        normalized.certifications.forEach(item => addCertification(item));
    }

    // Trigger resize for all textareas
    setTimeout(() => {
        document.querySelectorAll('textarea').forEach(el => autoResize(el));
    }, 0);
}

/**
 * Normalizes input data - handles legacy formats
 */
function normalizeData(data) {
    // Japanese legacy format
    if (data["個人情報"] || data["職務経歴"]) {
        const p = data["個人情報"] || {};
        const skillsObj = data["スキル一覧"] || {};

        let skillsStr = "";
        if (typeof skillsObj === 'object') {
            skillsStr = Object.entries(skillsObj)
                .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
                .join('\n');
        }

        const experience = (data["職務経歴"] || []).map(item => {
            const period = item["期間"] || {};
            let desc = item["担当業務"] || "";
            if (item["主要プロジェクト"] && Array.isArray(item["主要プロジェクト"])) {
                desc += "\n\n【主要プロジェクト】\n" + item["主要プロジェクト"].map(p =>
                    `・${p["プロジェクト名"]}: ${p["概要"]}`
                ).join('\n');
            }
            if (item["業務工程"] && Array.isArray(item["業務工程"])) {
                desc += "\n\n【担当工程】: " + item["業務工程"].join(', ');
            }

            return {
                company: item["企業名"] || "",
                position: item["職種"] || "",
                status: '',
                startDate: period["開始年月"] || "",
                endDate: period["終了年月"] || "",
                description: desc.trim(),
                techTags: []
            };
        });

        return {
            personal: {
                fullName: p["氏名"] || "",
                jobTitle: "",
                email: p["メールアドレス"] || "",
                phone: p["電話番号"] || "",
                location: p["住所"] || "",
                website: ""
            },
            summary: (data["自己PR"] || "") + (data["志望動機"] ? "\n\n【志望動機】\n" + data["志望動機"] : ""),
            skills: { languages: [], frameworks: [], tools: [], cloud: [], other: skillsStr.split(/[,\n]/).map(s => s.trim()).filter(s => s) },
            experience: experience,
            education: data["学歴"] || [],
            certifications: []
        };
    }

    // Ensure all fields exist
    if (!data.skills) data.skills = { languages: [], frameworks: [], tools: [], cloud: [], other: [] };
    if (!data.certifications) data.certifications = [];
    if (data.experience) {
        data.experience.forEach(exp => {
            if (!exp.techTags) exp.techTags = [];
        });
    }

    return data;
}

// ==================== HELPER FUNCTIONS ====================

function getValue(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
}

function setValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
}

function getVal(parent, selector) {
    const el = parent.querySelector(selector);
    return el ? el.value : '';
}

function getDynamicList(containerId, selectors) {
    const container = document.getElementById(containerId);
    const items = [];
    if (!container) return items;
    container.querySelectorAll('.item-card').forEach(card => {
        const itemObj = {};
        selectors.forEach(sel => {
            const input = card.querySelector(sel);
            const key = sel.replace('.input-', '');
            itemObj[key] = input ? input.value : '';
        });
        items.push(itemObj);
    });
    return items;
}

// ==================== DYNAMIC LIST: EXPERIENCE ====================

function addExperience(data = {}) {
    const template = document.getElementById('template-experience');
    const clone = template.content.cloneNode(true);
    const item = clone.querySelector('.item-card');

    if (data.company) item.querySelector('.input-company').value = data.company;
    if (data.position) item.querySelector('.input-position').value = data.position;
    if (data.status) item.querySelector('.input-status').value = data.status;
    if (data.startDate) item.querySelector('.input-startDate').value = data.startDate;
    if (data.endDate) item.querySelector('.input-endDate').value = data.endDate;
    if (data.description) item.querySelector('.input-description').value = data.description;

    // Tech Tags
    item._techTags = data.techTags ? [...data.techTags] : [];

    // Setup tech tag input
    const techInput = item.querySelector('.tech-tag-input');
    techInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTechTagToItem(techInput);
        }
    });

    renderTechTagsForCard(item);

    setupDynamicInputs(clone);
    document.getElementById('experience-list').appendChild(clone);

    // Trigger auto-resize
    const newItem = document.getElementById('experience-list').lastElementChild;
    newItem.querySelectorAll('textarea').forEach(el => autoResize(el));
}

// ==================== DYNAMIC LIST: EDUCATION ====================

function addEducation(data = {}) {
    const template = document.getElementById('template-education');
    const clone = template.content.cloneNode(true);

    if (data.institution) clone.querySelector('.input-institution').value = data.institution;
    if (data.degree) clone.querySelector('.input-degree').value = data.degree;
    if (data.gradDate) clone.querySelector('.input-gradDate').value = data.gradDate;

    setupDynamicInputs(clone);
    document.getElementById('education-list').appendChild(clone);

    const newItem = document.getElementById('education-list').lastElementChild;
    newItem.querySelectorAll('textarea').forEach(el => autoResize(el));
}

// ==================== DYNAMIC LIST: CERTIFICATION ====================

function addCertification(data = {}) {
    const template = document.getElementById('template-certification');
    const clone = template.content.cloneNode(true);

    if (data.name) clone.querySelector('.input-certName').value = data.name;
    if (data.date) clone.querySelector('.input-certDate').value = data.date;
    if (data.issuer) clone.querySelector('.input-certIssuer').value = data.issuer;

    setupDynamicInputs(clone);
    document.getElementById('certification-list').appendChild(clone);
}

// ==================== DYNAMIC INPUT SETUP ====================

function setupDynamicInputs(fragment) {
    fragment.querySelectorAll('input:not(.tag-input), textarea').forEach(input => {
        input.addEventListener('input', () => { saveData(); updateProgress(); });
        if (input.tagName === 'TEXTAREA') {
            input.addEventListener('input', function () { autoResize(this); });
            setTimeout(() => autoResize(input), 0);
        }
    });
}

function removeParent(btn) {
    if (confirm('この項目を削除しますか？')) {
        btn.closest('.item-card').remove();
        saveData();
        updateProgress();
    }
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
}

function loadJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = JSON.parse(e.target.result);
            const normalized = normalizeData(data);
            if (normalized.skills) {
                skillsData = normalized.skills;
                renderAllSkillTags();
            }
            restoreData(data);
            saveData();
            updateProgress();
            alert('データを読み込みました');
        } catch (error) {
            alert('ファイルの読み込みに失敗しました。正しいJSONファイルか確認してください。');
            console.error(error);
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

// ==================== UTILITIES ====================

function autoResize(element) {
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = element.scrollHeight + 'px';
}

// Summary page limit constraint
document.addEventListener('DOMContentLoaded', () => {
    const summary = document.getElementById('summary');
    const MAX_CHARS = 2000;

    if (summary) {
        summary.addEventListener('input', (e) => {
            if (e.target.value.length > MAX_CHARS) {
                e.target.value = e.target.value.substring(0, MAX_CHARS);
                alert('文字数の上限に達しました。');
            }
            autoResize(e.target);
        });
    }
});

// Global scope for onclick handlers
window.addExperience = addExperience;
window.addEducation = addEducation;
window.addCertification = addCertification;
window.removeParent = removeParent;
window.removeSkillTag = removeSkillTag;
window.removeTechTagFromItem = removeTechTagFromItem;
window.switchTab = switchTab;
