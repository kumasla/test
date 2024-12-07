let mapleData = null;
let currentSortMethod = 'progress';

async function loadCharacterData() {
    try {
        const response = await fetch('characters.json');
        if (!response.ok) {
            throw new Error('Failed to load data');
        }
        return await response.json();
    } catch (error) {
        console.error('데이터 로딩 실패:', error);
        return null;
    }
}

function calculateProgress(character) {
    const totalBosses = Object.keys(character.bosses).length;
    const clearedBosses = Object.values(character.bosses).filter(cleared => cleared).length;
    return (clearedBosses / totalBosses) * 100;
}

function getLastLiberatedBoss(character) {
    const liberationOrder = mapleData.templates.liberationNames;
    for (let i = liberationOrder.length - 1; i >= 0; i--) {
        if (character.liberation[liberationOrder[i]]) {
            return liberationOrder[i];
        }
    }
    return "없음";
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
            return parseInt(b.combat.replace(/,/g, '')) - parseInt(a.combat.replace(/,/g, ''));
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
    if (event.target.closest('.boss-item') || 
        event.target.closest('.liberation-status') || 
        event.target.type === 'checkbox' || 
        event.target.classList.contains('input-field')) {
        return;
    }
    const content = element.nextElementSibling;
    content.classList.toggle('active');
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

function formatNumber(num) {
    return new Intl.NumberFormat('ko-KR').format(num);
}

function saveToLocalStorage() {
    localStorage.setItem('mapleCharacters', JSON.stringify(mapleData.characters));
}
let searchTerm = '';

function filterCharacters(query) {
    searchTerm = query.toLowerCase();
    updateDisplay();
}


function updateDisplay() {
    const container = document.getElementById('bossTracker');
    container.innerHTML = '';

    const characters = Object.entries(mapleData.characters)
        .map(([name, data]) => ({
            name,
            ...data
        }))
        // 검색 필터 적용
        .filter(character => 
            searchTerm === '' || 
            character.name.toLowerCase().includes(searchTerm)
        )
        // 정렬 적용
        .sort(compareCharacters);

    if (characters.length === 0) {
        container.innerHTML = '<div class="no-results">검색 결과가 없습니다.</div>';
        return;
    }

    characters.sort(compareCharacters);

    characters.forEach(character => {
        const progress = calculateProgress(character);
        const lastLiberatedBoss = getLastLiberatedBoss(character);
        const characterElement = document.createElement('div');
        characterElement.className = 'character-item';
        
        const bossesHtml = Object.entries(character.bosses).map(([bossName, cleared]) => `
            <div class="boss-item" onclick="updateBossStatus('${character.name}', '${bossName}', event)">
                <input type="checkbox" 
                    ${cleared ? 'checked' : ''}
                    onclick="event.stopPropagation()" 
                    onchange="updateBossStatus('${character.name}', '${bossName}', event)">
                <span>${bossName}</span>
            </div>
        `).join('');

        const liberationHtml = mapleData.templates.liberationNames.map(bossName => {
            const isDisabled = !canLiberate(character, bossName) && !character.liberation[bossName];
            return `
                <div class="liberation-status ${isDisabled ? 'disabled' : ''}" 
                     onclick="updateLiberation('${character.name}', '${bossName}', event)">
                    <input type="checkbox" 
                        ${character.liberation[bossName] ? 'checked' : ''}
                        ${isDisabled ? 'disabled' : ''}
                        onclick="event.stopPropagation()" 
                        onchange="updateLiberation('${character.name}', '${bossName}', event)">
                    <span>${bossName} 해방</span>
                </div>
            `;
        }).join('');

        characterElement.innerHTML = `
            <div class="character-header" onclick="toggleCharacter(this, event)">
                <span>${character.name}</span>
                <div class="stats-display">
                    Lv.<input type="text" 
                        class="input-field" 
                        value="${character.level}"
                        onclick="event.stopPropagation()" 
                        onchange="updateStat('${character.name}', 'level', this.value)">
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
                <div class="boss-list">
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
    mapleData = await loadCharacterData();
    if (!mapleData) {
        console.error('기본 데이터를 로드할 수 없습니다.');
        return;
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

//진행도
function updateOverallProgress() {
    const characters = Object.values(mapleData.characters);
    
    // 전체 진행도 계산
    const totalProgress = characters.reduce((sum, char) => sum + calculateProgress(char), 0);
    const averageProgress = totalProgress / characters.length;
    
    // 평균 레벨 계산
    const totalLevel = characters.reduce((sum, char) => sum + parseInt(char.level), 0);
    const averageLevel = Math.floor(totalLevel / characters.length);
    
    // UI 업데이트
    const progressBar = document.querySelector('.overall-progress-bar .progress');
    const progressText = document.querySelector('.overall-progress-bar .progress-text');
    const totalCharactersElement = document.getElementById('totalCharacters');
    const averageLevelElement = document.getElementById('averageLevel');
    
    progressBar.style.width = `${averageProgress}%`;
    progressText.textContent = `${averageProgress.toFixed(1)}%`;
    totalCharactersElement.textContent = characters.length;
    averageLevelElement.textContent = averageLevel;
}
//전투력 표시 디자인
function formatKoreanNumber(num) {
    if (!num) return '0';
    
    const numStr = num.toString();
    let result = '';
    
    // 1억 이상
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
    // 1만 이상 1억 미만
    else if (numStr.length > 4) {
        const man = Math.floor(num / 10000);
        const remainder = num % 10000;
        result += `${man}만 `;
        if (remainder > 0) {
            result += remainder;
        }
    }
    // 1만 미만
    else {
        result = numStr;
    }
    
    return result.trim();
}

// formatNumber 함수를 수정
function formatNumber(num) {
    if (num === '0' || !num) return '0';
    return formatKoreanNumber(parseInt(num.toString().replace(/[^\d]/g, '')));
}


function enableCombatEdit(element, characterName) {
    const currentValue = mapleData.characters[characterName].combat;
    const spanElement = element.querySelector('.combat-text');
    
    // 이미 input이 있다면 무시
    if (element.querySelector('.combat-input')) return;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'combat-input';
    input.value = currentValue;
    
    // 클릭 이벤트 전파 방지
    input.onclick = (e) => e.stopPropagation();
    
    // 입력 완료 (엔터 키 또는 포커스 잃을 때)
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
    
    // 현재 텍스트를 input으로 교체
    spanElement.replaceWith(input);
    input.focus();
}
document.addEventListener('DOMContentLoaded', initialize);