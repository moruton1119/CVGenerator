document.addEventListener('DOMContentLoaded', () => {
    // Initial Load
    loadData();

    // Event Listeners for Static Inputs
    const staticInputs = document.querySelectorAll('input:not([type="file"]), textarea');
    staticInputs.forEach(input => {
        input.addEventListener('input', saveData);
        if (input.tagName === 'TEXTAREA') {
            input.addEventListener('input', function () { autoResize(this); });
        }
    });

    // Button Listeners
    document.getElementById('btn-save-json').addEventListener('click', downloadJSON);
    document.getElementById('btn-load-json').addEventListener('click', () => document.getElementById('file-input').click());
    document.getElementById('file-input').addEventListener('change', loadJSON);
    document.getElementById('btn-print').addEventListener('click', () => window.print());
    document.getElementById('btn-clear').addEventListener('click', clearData);
});

// Keys for LocalStorage
const STORAGE_KEY = 'resume_helper_data';

/**
 * Main Data Saving Function
 * Scrapes the DOM to build the data object and saves to localStorage
 */
function saveData() {
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
        experience: getDynamicList('experience-list', ['.input-company', '.input-position', '.input-status', '.input-startDate', '.input-endDate', '.input-description']),
        education: getDynamicList('education-list', ['.input-institution', '.input-degree', '.input-gradDate']),
        skills: getValue('skills')
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * Main Data Loading Function
 * Reads from localStorage and populates the DOM
 */
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

    // Normalize data if it comes from the specific Japanese JSON format
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
    setValue('skills', normalized.skills);

    // Experience
    const expList = document.getElementById('experience-list');
    expList.innerHTML = ''; // Clear current
    if (normalized.experience && Array.isArray(normalized.experience)) {
        normalized.experience.forEach(item => {
            addExperience(item);
        });
    }

    // Education
    const eduList = document.getElementById('education-list');
    eduList.innerHTML = ''; // Clear current
    if (normalized.education && Array.isArray(normalized.education)) {
        normalized.education.forEach(item => {
            addEducation(item);
        });
    }

    // Trigger resize for all textareas after data is populated
    setTimeout(() => {
        document.querySelectorAll('textarea').forEach(el => autoResize(el));
    }, 0);
}

/**
 * Normalizes input data to the internal schema
 * Handles legacy/English format and the specific Japanese resume.json format
 */
function normalizeData(data) {
    // Check if it's likely the Japanese format (has "個人情報" or "職務経歴")
    if (data["個人情報"] || data["職務経歴"]) {
        const p = data["個人情報"] || {};
        const skillsObj = data["スキル一覧"] || {};

        // Flatten skills object to string
        let skillsStr = "";
        if (typeof skillsObj === 'object') {
            skillsStr = Object.entries(skillsObj)
                .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
                .join('\n');
        } else if (typeof data["スキル"] === 'object') {
            // Fallback if "スキル" exists instead
            skillsStr = Object.values(data["スキル"]).flat().join(', ');
        }

        // Map Experience
        const experience = (data["職務経歴"] || []).map(item => {
            const period = item["期間"] || {};

            // Construct description from multiple fields
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
                startDate: period["開始年月"] || "",
                endDate: period["終了年月"] || "",
                description: desc.trim()
            };
        });

        return {
            personal: {
                fullName: p["氏名"] || "",
                jobTitle: "", // Not directly in 個人情報, maybe infer or leave blank
                email: p["メールアドレス"] || "",
                phone: p["電話番号"] || "",
                location: p["住所"] || "",
                website: ""
            },
            summary: (data["自己PR"] || "") + (data["志望動機"] ? "\n\n【志望動機】\n" + data["志望動機"] : ""),
            skills: skillsStr,
            experience: experience,
            education: data["学歴"] || [] // Mapping needed if structure differs, assuming empty or compatible for now
        };
    }

    // Return as-is if it matches internal schema (or unknown)
    return data;
}

// Helper: Get form value safely
function getValue(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
}

// Helper: Set form value safely
function setValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
}

// Helper: Get data from dynamic lists
function getDynamicList(containerId, selectors) {
    const container = document.getElementById(containerId);
    const items = [];
    container.querySelectorAll('.item-card').forEach(card => {
        const itemObj = {};
        selectors.forEach(sel => {
            const input = card.querySelector(sel);
            // Extract key from class name (e.g., input-company -> company)
            const key = sel.replace('.input-', '');
            itemObj[key] = input ? input.value : '';
        });
        items.push(itemObj);
    });
    return items;
}

// Dynamic Add: Experience
function addExperience(data = {}) {
    const template = document.getElementById('template-experience');
    const clone = template.content.cloneNode(true);

    if (data.company) clone.querySelector('.input-company').value = data.company;
    if (data.position) clone.querySelector('.input-position').value = data.position;
    if (data.status) clone.querySelector('.input-status').value = data.status;
    if (data.startDate) clone.querySelector('.input-startDate').value = data.startDate;
    if (data.endDate) clone.querySelector('.input-endDate').value = data.endDate;
    if (data.description) clone.querySelector('.input-description').value = data.description;

    setupDynamicInputs(clone);
    document.getElementById('experience-list').appendChild(clone);

    // Trigger auto-resize for all textareas in this new item
    const newItem = document.getElementById('experience-list').lastElementChild;
    newItem.querySelectorAll('textarea').forEach(el => autoResize(el));
}

// Dynamic Add: Education
function addEducation(data = {}) {
    const template = document.getElementById('template-education');
    const clone = template.content.cloneNode(true);

    if (data.institution) clone.querySelector('.input-institution').value = data.institution;
    if (data.degree) clone.querySelector('.input-degree').value = data.degree;
    if (data.gradDate) clone.querySelector('.input-gradDate').value = data.gradDate;

    setupDynamicInputs(clone);
    document.getElementById('education-list').appendChild(clone);

    // Trigger auto-resize for all textareas in this new item
    const newItem = document.getElementById('education-list').lastElementChild;
    newItem.querySelectorAll('textarea').forEach(el => autoResize(el));
}

function setupDynamicInputs(fragment) {
    fragment.querySelectorAll('input, textarea').forEach(input => {
        input.addEventListener('input', saveData);
        if (input.tagName === 'TEXTAREA') {
            input.addEventListener('input', function () { autoResize(this); });
            // Initial resize for new elements (if they have content)
            setTimeout(() => autoResize(input), 0);
        }
    });
}

function removeParent(btn) {
    if (confirm('この項目を削除しますか？')) {
        btn.closest('.item-card').remove();
        saveData();
    }
}

// JSON Export
function downloadJSON() {
    saveData(); // Ensure latest state
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

// JSON Import
function loadJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = JSON.parse(e.target.result);
            restoreData(data);
            saveData(); // Save loaded data to local storage
            alert('データを読み込みました');
        } catch (error) {
            alert('ファイルの読み込みに失敗しました。正しいJSONファイルか確認してください。');
            console.error(error);
        }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset file input
}

function clearData() {
    if (confirm('すべてのデータを消去しますか？この操作は取り消せません。')) {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
    }
}

function autoResize(element) {
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = element.scrollHeight + 'px';
}

// Summary page limit constraint
document.addEventListener('DOMContentLoaded', () => {
    const summary = document.getElementById('summary');
    const MAX_CHARS = 1000; // Approx limit to fit single page with personal info

    if (summary) {
        summary.addEventListener('input', (e) => {
            if (e.target.value.length > MAX_CHARS) {
                e.target.value = e.target.value.substring(0, MAX_CHARS);
                alert('1ページに収めるため、文字数の上限に達しました。');
            }
            autoResize(e.target);
        });
    }
});

// Global scope required for onclick handlers in HTML
window.addExperience = addExperience;
window.addEducation = addEducation;
window.removeParent = removeParent;
