let mapleData = null;
let currentSortMethod = 'progress';
let searchTerm = '';

async function loadCharacterData() {
    try {
        const response = await fetch('characters.json');
        if (!response.ok) {
            throw new Error('Failed to load data');
        }
        return await response.json();
    } catch (error) {
        console.warn('오프라인 모드로 실행됩니다.');
        return defaultMapleData;
    }
}

function calculateProgress(character) {
    const totalBosses = Object.keys(character.bosses).length;
    const clearedBosses = Object.values(character.bosses).filter(cleared => cleared).length;
    return (clearedBosses / totalBosses) * 100;
}

function getLastLiberatedBoss(character) {
    const liberationOrder = mapleData.templates.liberationNames;
    if (character.liberation[liberationOrder[liberationOrder.length - 1]]) {
        return "완료";
    }
    for (let i = liberationOrder.length - 1; i >= 0; i--) {
        if (character.liberation[liberationOrder[i]]) {
            return liberationOrder[i];
        }
    }
    return "없음";
}

function filterCharacters(query) {
    searchTerm = query.toLowerCase();
    updateDisplay();
}

function changeSortMethod(method) {
    currentSortMethod = method;
    document.querySelectorAll('.sort-button').forEach(button => {
        button.classList.remove('active');
    });
    event.target.classList.add('active');
    updateDisplay();
}

function compareCharacters(a, b) {
    switch (currentSortMethod) {
        case 'progress':
            return calculateProgress(b) - calculateProgress(a);
        case 'level':
            return parseInt(b.level) - parseInt(a.level);
        case 'combat':
            return parseInt(b.combat.replace(/[^\d]/g, '')) - parseInt(a.combat.replace(/[^\d]/g, ''));
        default:
            return 0;
    }
}

function canLiberate(character, bossName) {
    const liberationOrder = mapleData.templates.liberationNames;
    const bossIndex = liberationOrder.indexOf(bossName);
    if (bossIndex === 0) return true;
    return character.liberation[liberationOrder[bossIndex - 1]];
}

function canUnliberate(character, bossName) {
    const liberationOrder = mapleData.templates.liberationNames;
    const bossIndex = liberationOrder.indexOf(bossName);
    if (bossIndex === liberationOrder.length - 1) return true;
    return !character.liberation[liberationOrder[bossIndex + 1]];
}

function toggleCharacter(element, event) {
    if (event.target.type === 'checkbox' || 
        event.target.classList.contains('input-field') ||
        event.target.classList.contains('close-btn') ||
        event.target.closest('.boss-item') ||
        event.target.closest('.liberation-status') ||
        event.target.closest('.level-display') ||
        event.target.closest('.combat-display')) {
        return;
    }

    const content = element.nextElementSibling;
    content.classList.toggle('active');
}

function closeContent(button, event) {
    event.stopPropagation();
    const content = button.closest('.character-content');
    content.classList.remove('active');
}

function updateBossStatus(characterName, bossName, event) {
    event.stopPropagation();
    const character = mapleData.characters[characterName];
    character.bosses[bossName] = !character.bosses[bossName];
    saveToLocalStorage();
    updateDisplay();
}

function updateLiberation(characterName, bossName, event) {
    event.stopPropagation();
    const character = mapleData.characters[characterName];
    
    if (character.liberation[bossName]) {
        if (canUnliberate(character, bossName)) {
            character.liberation[bossName] = false;
            saveToLocalStorage();
            updateDisplay();
        }
    } else {
        if (canLiberate(character, bossName)) {
            character.liberation[bossName] = true;
            saveToLocalStorage();
            updateDisplay();
        }
    }
}

function updateStat(characterName, field, value) {
    mapleData.characters[characterName][field] = value;
    saveToLocalStorage();
}

function formatKoreanNumber(num) {
    if (!num) return '0';
    
    const numStr = num.toString();
    let result = '';
    
    if (numStr.length > 8) {
        const eok = Math.floor(num / 100000000);
        const remainder = num % 100000000;
        result += `${eok}억 `;
        if (remainder > 0) {
            const man = Math.floor(remainder / 10000);
            if (man > 0) {
                result += `${man}만 `;
            }
            const rest = remainder % 10000;
            if (rest > 0) {
                result += rest;
            }
        }
    }
    else if (numStr.length > 4) {
        const man = Math.floor(num / 10000);
        const remainder = num % 10000;
        result += `${man}만 `;
        if (remainder > 0) {
            result += remainder;
        }
    }
    else {
        result = numStr;
    }
    
    return result.trim();
}

function formatNumber(num) {
    if (num === '0' || !num) return '0';
    return formatKoreanNumber(parseInt(num.toString().replace(/[^\d]/g, '')));
}

function saveToLocalStorage() {
    localStorage.setItem('mapleCharacters', JSON.stringify(mapleData.characters));
}

function enableLevelEdit(element, characterName) {
    const currentValue = mapleData.characters[characterName].level;
    const spanElement = element.querySelector('.level-text');
    
    if (element.querySelector('.level-input')) return;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'level-input';
    input.value = currentValue;
    
    input.onclick = (e) => e.stopPropagation();
    
    function completeEdit() {
        const newValue = input.value.replace(/[^0-9]/g, '');
        updateStat(characterName, 'level', newValue);
        element.innerHTML = `<span class="level-text">Lv. ${newValue}</span>`;
    }
    
    input.onkeydown = (e) => {
        if (e.key === 'Enter') {
            completeEdit();
        } else if (e.key === 'Escape') {
            element.innerHTML = `<span class="level-text">Lv. ${currentValue}</span>`;
        }
    };
    
    input.onblur = completeEdit;
    
    spanElement.replaceWith(input);
    input.focus();
}

function enableCombatEdit(element, characterName) {
    const currentValue = mapleData.characters[characterName].combat;
    const spanElement = element.querySelector('.combat-text');
    
    if (element.querySelector('.combat-input')) return;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'combat-input';
    input.value = currentValue;
    
    input.onclick = (e) => e.stopPropagation();
    
    function completeEdit() {
        const newValue = input.value.replace(/[^0-9]/g, '');
        updateStat(characterName, 'combat', newValue);
        element.innerHTML = `전투력: <span class="combat-text">${formatNumber(newValue)}</span>`;
    }
    
    input.onkeydown = (e) => {
        if (e.key === 'Enter') {
            completeEdit();
        } else if (e.key === 'Escape') {
            element.innerHTML = `전투력: <span class="combat-text">${formatNumber(currentValue)}</span>`;
        }
    };
    
    input.onblur = completeEdit;
    
    spanElement.replaceWith(input);
    input.focus();
}

function updateOverallProgress() {
    const characters = Object.values(mapleData.characters);
    
    const totalProgress = characters.reduce((sum, char) => sum + calculateProgress(char), 0);
    const averageProgress = totalProgress / characters.length;
    
    const totalLevel = characters.reduce((sum, char) => sum + parseInt(char.level), 0);
    const averageLevel = Math.floor(totalLevel / characters.length);
    
    const progressBar = document.querySelector('.overall-progress-bar .progress');
    const progressText = document.querySelector('.overall-progress-bar .progress-text');
    const totalCharactersElement = document.getElementById('totalCharacters');
    const averageLevelElement = document.getElementById('averageLevel');
    
    progressBar.style.width = `${averageProgress}%`;
    progressText.textContent = `${averageProgress.toFixed(1)}%`;
    totalCharactersElement.textContent = characters.length;
    averageLevelElement.textContent = averageLevel;
}

function updateDisplay() {
    const container = document.getElementById('bossTracker');
    container.innerHTML = '';

    const characters = Object.entries(mapleData.characters)
        .map(([name, data]) => ({
            name,
            ...data
        }))
        .filter(character => 
            searchTerm === '' || 
            character.name.toLowerCase().includes(searchTerm)
        )
        .sort(compareCharacters);

    if (characters.length === 0) {
        container.innerHTML = '<div class="no-results">검색 결과가 없습니다.</div>';
        return;
    }

    characters.forEach(character => {
        const progress = calculateProgress(character);
        const lastLiberatedBoss = getLastLiberatedBoss(character);
        const characterElement = document.createElement('div');
        characterElement.className = 'character-item';
        
        const bossesHtml = Object.entries(character.bosses).map(([bossName, cleared]) => `
            <div class="boss-item" onclick="updateBossStatus('${character.name}', '${bossName}', event)">
                <input type="checkbox" 
                    ${cleared ? 'checked' : ''}
                    onclick="event.stopPropagation()">
                <span>${bossName}</span>
            </div>
        `).join('');

        const liberationHtml = mapleData.templates.liberationNames.map(bossName => {
            const isDisabled = !canLiberate(character, bossName) && !character.liberation[bossName];
            return `
                <div class="liberation-status ${isDisabled ? 'disabled' : ''}" 
                     onclick="${isDisabled ? '' : `updateLiberation('${character.name}', '${bossName}', event)`}">
                    <input type="checkbox" 
                        ${character.liberation[bossName] ? 'checked' : ''}
                        ${isDisabled ? 'disabled' : ''}
                        onclick="event.stopPropagation()"
                        onchange="updateLiberation('${character.name}', '${bossName}', event)">
                    <span onclick="${isDisabled ? '' : `updateLiberation('${character.name}', '${bossName}', event)`}">
                        ${bossName} 해방
                    </span>
                </div>
            `;
        }).join('');
        characterElement.innerHTML = `
            <div class="character-header" onclick="toggleCharacter(this, event)">
                <div class="character-name-level">
                    <span class="character-name">${character.name}</span>
                    <div class="stats-display level-display" onclick="enableLevelEdit(this, '${character.name}')">
                        <span class="level-text">Lv. ${character.level}</span>
                    </div>
                </div>
                <div class="stats-display combat-display" onclick="enableCombatEdit(this, '${character.name}')">
                    전투력: <span class="combat-text">${formatNumber(character.combat)}</span>
                </div>
                <div class="liberation-count">
                    해방: ${lastLiberatedBoss}
                </div>
                <div class="progress-bar">
                    <div class="progress-text">${progress.toFixed(1)}%</div>
                    <div class="progress" style="width: ${progress}%"></div>
                </div>
            </div>
            <div class="character-content">
                <div class="content-header">
                    <button class="close-btn" onclick="closeContent(this, event)">△</button>
                </div>
                <div class="boss-list">
                    <div class="boss-title">솔플 진행 현황</div>
                    ${bossesHtml}
                </div>
                <div class="liberation-section">
                    <div class="liberation-title">해방 진행 현황</div>
                    ${liberationHtml}
                </div>
            </div>
        `;
        
        container.appendChild(characterElement);
    });
    updateOverallProgress();
}

async function initialize() {
    try {
        mapleData = await loadCharacterData();
    } catch (error) {
        console.warn('기본 데이터를 사용합니다.');
        mapleData = defaultMapleData;
    }

    const savedCharacters = localStorage.getItem('mapleCharacters');
    if (savedCharacters) {
        mapleData.characters = JSON.parse(savedCharacters);
    } else {
        const newCharacters = {};
        Object.values(mapleData.jobGroups).flat().forEach(jobName => {
            if (!mapleData.characters[jobName]) {
                newCharacters[jobName] = {
                    level: "200",
                    combat: "0",
                    bosses: Object.fromEntries(
                        mapleData.templates.bossNames.map(name => [name, false])
                    ),
                    liberation: Object.fromEntries(
                        mapleData.templates.liberationNames.map(name => [name, false])
                    )
                };
            }
        });
        mapleData.characters = { ...mapleData.characters, ...newCharacters };
        saveToLocalStorage();
    }

    updateDisplay();
}

document.addEventListener('DOMContentLoaded', initialize);