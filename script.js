// ==================== CVGenerator - Main Script ====================

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    bindStaticInputs();
    bindButtons();
    bindSidebar();
    bindSkillInputs();
    bindSummaryCharCount();
    updateProgress();
});

// ==================== CONSTANTS ====================
const STORAGE_KEY = 'resume_helper_data';
let skillsData = { languages: [], frameworks: [], tools: [], cloud: [], other: [] };

// ==================== INPUT BINDING ====================
function bindStaticInputs() {
    document.querySelectorAll('#page-personal input, #page-summary textarea, #page-summary input').forEach(input => {
        input.addEventListener('input', () => { saveData(); updateProgress(); });
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

    // Personal (6 fields)
    ['fullName', 'jobTitle', 'email', 'phone', 'location', 'website'].forEach(f => {
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
            personal: { fullName: '', fullNameKana: '', jobTitle: 'ソフトウェアエンジニア', email: '', phone: '', location: '', website: '' },
            summary: '〇年間のWebアプリケーション開発経験を持ち、バックエンドからフロントエンドまで幅広い技術スタックを扱ってきました。アジャイル開発チームでの開発プロセス改善や、パフォーマンス最適化の実績があります。',
            experience: [{ company: '', position: 'ソフトウェアエンジニア', status: '正社員', startDate: '', endDate: '', description: '・Webアプリケーションの設計・開発・運用\n・アジャイルチームでのスクラム開発\n・API設計とデータベース最適化', techTags: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'AWS'] }],
            skills: { languages: ['JavaScript', 'TypeScript', 'Python', 'Java'], frameworks: ['React', 'Vue.js', 'Express', 'Spring Boot'], tools: ['Git', 'Docker', 'Jest'], cloud: ['AWS', 'Docker'], other: ['アジャイル/スクラム'] },
            certifications: [],
            education: []
        },
        designer: {
            personal: { fullName: '', fullNameKana: '', jobTitle: 'UI/UXデザイナー', email: '', phone: '', location: '', website: '' },
            summary: 'ユーザー中心のデザインプロセスに精通し、Web・モバイルアプリケーションのUI/UXデザインを担当。ユーザーリサーチからプロトタイピング、デザインシステムの構築まで一貫して手がけています。',
            experience: [{ company: '', position: 'UI/UXデザイナー', status: '正社員', startDate: '', endDate: '', description: '・Web・アプリのUI/UXデザイン\n・デザインシステムの構築・運用\n・ユーザーテストと改善施策の実施', techTags: ['Figma', 'Adobe XD', 'Photoshop'] }],
            skills: { languages: ['HTML', 'CSS'], frameworks: ['Figma', 'Adobe CC'], tools: ['Miro', 'Notion'], cloud: [], other: ['ユーザーリサーチ', 'プロトタイピング'] },
            certifications: [],
            education: []
        },
        manager: {
            personal: { fullName: '', fullNameKana: '', jobTitle: 'プロジェクトマネージャー', email: '', phone: '', location: '', website: '' },
            summary: '〇年のプロジェクトマネジメント経験。大規模システム開発プロジェクトの計画・進行管理から、ステークホルダー調整、チームビルディングまで幅広く対応。PMP資格保有。',
            experience: [{ company: '', position: 'プロジェクトマネージャー', status: '正社員', startDate: '', endDate: '', description: '・プロジェクト計画策定と進行管理\n・要件定義・基本設計のリード\n・品質管理・リスク管理', techTags: ['Jira', 'Confluence', 'MS Project'] }],
            skills: { languages: [], frameworks: [], tools: ['Jira', 'Confluence', 'MS Project'], cloud: [], other: ['プロジェクト管理', 'アジャイル/スクラム', '要件定義', 'リスク管理'] },
            certifications: [{ name: 'PMP (Project Management Professional)', date: '', issuer: 'PMI' }],
            education: []
        },
        blank: {
            personal: { fullName: '', fullNameKana: '', jobTitle: '', email: '', phone: '', location: '', website: '' },
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

// ==================== SKILL TAGS ====================
function addSkillTag(category, value) {
    if (!skillsData[category]) skillsData[category] = [];
    if (!skillsData[category].includes(value)) {
        skillsData[category].push(value);
        renderSkillTags(category);
    }
}

function removeSkillTag(category, index) {
    skillsData[category].splice(index, 1);
    renderSkillTags(category);
    saveData();
    updateProgress();
}

function renderSkillTags(category) {
    const container = document.querySelector(`.tags-display[data-skill-category="${category}"]`);
    if (!container) return;
    container.innerHTML = '';
    (skillsData[category] || []).forEach((tag, i) => {
        const el = document.createElement('span');
        el.className = 'tag';
        el.innerHTML = `${escHtml(tag)} <span class="tag-remove" onclick="removeSkillTag('${category}', ${i})">&times;</span>`;
        container.appendChild(el);
    });
}

function renderAllSkillTags() {
    ['languages', 'frameworks', 'tools', 'cloud', 'other'].forEach(c => renderSkillTags(c));
}

// ==================== TECH TAGS (experience items) ====================
function addTechTagToItem(input) {
    const val = input.value.trim();
    if (!val) return;
    const card = input.closest('.item-card');
    if (!card._techTags) card._techTags = [];
    if (!card._techTags.includes(val)) {
        card._techTags.push(val);
        renderTechTagsForCard(card);
        input.value = '';
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
    saveData();
}

// ==================== DATA: GET / SAVE / LOAD ====================
function getCurrentData() {
    return {
        personal: {
            fullName: getValue('fullName'),
            fullNameKana: getValue('fullNameKana'),
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
    setValue('jobTitle', data.personal.jobTitle);
    setValue('email', data.personal.email);
    setValue('phone', data.personal.phone);
    setValue('location', data.personal.location);
    setValue('website', data.personal.website);

    // Summary
    setValue('summary', data.summary);

    // Skills
    skillsData = {
        languages: data.skills.languages || [],
        frameworks: data.skills.frameworks || [],
        tools: data.skills.tools || [],
        cloud: data.skills.cloud || [],
        other: data.skills.other || []
    };
    renderAllSkillTags();

    // Experience
    const expList = document.getElementById('experience-list');
    expList.innerHTML = '';
    (data.experience || []).forEach(item => addExperience(item));

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
    let html = '';

    // Header
    html += '<div class="preview-header">';
    html += `<h1>${escHtml(data.personal.fullName || '氏名未入力')}</h1>`;
    if (data.personal.jobTitle) html += `<div class="preview-jobtitle">${escHtml(data.personal.jobTitle)}</div>`;
    html += '<div class="preview-contact">';
    if (data.personal.email) html += `<span>📧 ${escHtml(data.personal.email)}</span>`;
    if (data.personal.phone) html += `<span>📱 ${escHtml(data.personal.phone)}</span>`;
    if (data.personal.location) html += `<span>📍 ${escHtml(data.personal.location)}</span>`;
    if (data.personal.website) html += `<span>🔗 ${escHtml(data.personal.website)}</span>`;
    html += '</div></div>';

    // Summary
    if (data.summary) {
        html += '<div class="preview-section"><h3 class="preview-section-title">自己PR</h3>';
        html += `<div class="preview-summary">${escHtml(data.summary)}</div></div>`;
    }

    // Experience
    if (data.experience.length > 0) {
        html += '<div class="preview-section"><h3 class="preview-section-title">職務経歴</h3>';
        html += '<div class="preview-experience-list">';
        data.experience.forEach(exp => {
            html += '<div class="preview-exp-card"><div class="preview-exp-date">';
            html += escHtml(exp.startDate || '');
            if (exp.endDate) html += `<br>〜 ${escHtml(exp.endDate)}`;
            html += '</div><div class="preview-exp-content">';
            if (exp.company) html += `<div class="preview-exp-company">${escHtml(exp.company)}</div>`;
            if (exp.status) html += `<div class="preview-exp-status">${escHtml(exp.status)}</div>`;
            if (exp.position) html += `<div class="preview-exp-position">${escHtml(exp.position)}</div>`;
            if (exp.description) html += `<div class="preview-exp-description">${escHtml(exp.description)}</div>`;
            if (exp.techTags && exp.techTags.length > 0) {
                html += '<div class="preview-tech-tags">';
                exp.techTags.forEach(t => html += `<span class="tag">${escHtml(t)}</span>`);
                html += '</div>';
            }
            html += '</div></div>';
        });
        html += '</div></div>';
    }

    // Skills
    const hasSkills = Object.values(data.skills).some(arr => arr.length > 0);
    if (hasSkills) {
        const labels = { languages: 'プログラミング言語', frameworks: 'フレームワーク', tools: 'ツール・ミドルウェア', cloud: 'クラウド・インフラ', other: 'その他' };
        html += '<div class="preview-section"><h3 class="preview-section-title">スキル</h3>';
        html += '<div class="preview-skills-grid">';
        Object.entries(labels).forEach(([key, label]) => {
            if (data.skills[key] && data.skills[key].length > 0) {
                html += `<div class="preview-skill-category"><h4>${label}</h4><div class="preview-tech-tags">`;
                data.skills[key].forEach(t => html += `<span class="tag">${escHtml(t)}</span>`);
                html += '</div></div>';
            }
        });
        html += '</div></div>';
    }

    // Education
    if (data.education.length > 0) {
        html += '<div class="preview-section"><h3 class="preview-section-title">学歴</h3>';
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
    }

    // Certifications
    if (data.certifications.length > 0) {
        html += '<div class="preview-section"><h3 class="preview-section-title">保有資格</h3>';
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
    fragment.querySelectorAll('input:not(.tag-input), textarea').forEach(input => {
        input.addEventListener('input', () => { saveData(); updateProgress(); });
        if (input.tagName === 'TEXTAREA') {
            input.addEventListener('input', function() { autoResize(this); });
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

// ==================== UTILITIES ====================
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

function autoResize(el) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
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
