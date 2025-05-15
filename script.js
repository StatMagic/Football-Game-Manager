// --- Global Data Stores ---
let players = [];
let currentlyEditingPlayerId = null;
let goalscorers = [];
let currentlyEditingGoalscorerId = null;

// --- DOM Element Variables ---
let tabButtons, tabContents;
let gameSetupForm, matchCategoryInput, matchDateInput, matchTypeSelect, matchDurationInput, team1NameInput, team2NameInput, ageCategorySelect;
let playerFormContainer, playerFormTitle, singlePlayerForm, playerEditIdInput, singlePlayerNameInput, singlePlayerTeamSelect, singlePlayerVideoInput, currentPlayerVideoFilename, savePlayerBtn, cancelPlayerEditBtn, showAddPlayerFormBtn;
let playerListDisplayContainer, playersListTeam1Ul, playerListTeam1NameH3, noTeam1PlayersMessage, playersListTeam2Ul, playerListTeam2NameH3, noTeam2PlayersMessage, noPlayersOverallMessage;
let gameSubmissionOuterForm, labelTeam1Score, labelTeam2Score, gameLinkVideoInput, team1ScoreInput, team2ScoreInput;
let goalscorerFormContainer, goalscorerFormTitle, goalscorerEditIdInput, singleGoalscorerPlayerSelect, singleGoalscorerGoalsInput, saveGoalscorerBtn, cancelGoalscorerEditBtn, showAddGoalscorerFormBtn, goalscorersListUl, noGoalscorersMessage;
let downloadBtn;

// --- Utility Functions ---
function generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

// --- Tab Functionality ---
function initializeTabs() {
    if (!tabButtons || tabButtons.length === 0) return;
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            const tabContentElement = document.getElementById(button.dataset.tab);
            if (tabContentElement) {
                tabContentElement.classList.add('active');
            }
        });
    });
}

// --- Game Setup Logic ---
function initializeGameSetup() {
    if (!matchDateInput || !team1NameInput || !team2NameInput || !matchTypeSelect) {
        console.error("Game setup core elements not found.");
        return;
    }
    const today = new Date();
    matchDateInput.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    updateTeamNamesInApp();
    team1NameInput.addEventListener('input', updateTeamNamesInApp);
    team2NameInput.addEventListener('input', updateTeamNamesInApp);
    matchTypeSelect.addEventListener('change', handleMatchTypeChange);
    handleMatchTypeChange(); // Initial call for default match type
}

function handleMatchTypeChange() {
    if (!matchTypeSelect) return;
    const matchType = matchTypeSelect.value;
    let numPlayersPerTeam = 0;

    if (matchType === "other") {
        // For "Other", don't auto-generate. User can add manually.
        // Consider if existing players should be cleared or kept. For now, let's keep them.
        // If you want to clear:
        // if (players.length > 0 && confirm("Changing to 'Other' will clear the player list. Continue?")) {
        //     players = [];
        // }
        updatePlayerOptionsInGoalscorerForm();
        renderPlayerList();
        return;
    } else {
        const match = matchType.match(/(\d+)v\d+/);
        if (match && match[1]) {
            numPlayersPerTeam = parseInt(match[1], 10);
        }
    }

    if (numPlayersPerTeam > 0) {
        let proceedWithGeneration = true;
        // Only ask to clear if there are non-placeholder (manually added/edited) players
        if (players.some(p => !p.isPlaceholder) && players.length > 0) {
             proceedWithGeneration = confirm(`Changing match type to ${matchType} will reset the player list and remove any manually added/edited players. Are you sure?`);
        } else if (players.length > 0) { // If only placeholders exist, or list is empty, just proceed
            // No confirmation needed, or a different one if desired
        }


        if (proceedWithGeneration) {
            players = []; // Clear existing players
            for (let i = 1; i <= numPlayersPerTeam; i++) {
                players.push({
                    id: generateId(), name: `A${i}`, team: 'team1',
                    videoFile: null, videoFileName: null, isPlaceholder: true
                });
                players.push({
                    id: generateId(), name: `B${i}`, team: 'team2',
                    videoFile: null, videoFileName: null, isPlaceholder: true
                });
            }
        }
    } else if (players.length > 0 && matchType !== "other") { // If match type becomes invalid for auto-generation
        if (confirm("This match type doesn't auto-generate players. Clear existing player list?")) {
            players = [];
        }
    }

    renderPlayerList();
    updatePlayerOptionsInGoalscorerForm();
    // If the player editor form was open for a player who no longer exists (due to list reset), hide it.
    if (currentlyEditingPlayerId && !players.find(p => p.id === currentlyEditingPlayerId)) {
        hidePlayerForm();
    }
}

function updateTeamNamesInApp() {
    const team1Name = team1NameInput ? (team1NameInput.value.trim() || "Team A") : "Team A";
    const team2Name = team2NameInput ? (team2NameInput.value.trim() || "Team B") : "Team B";

    if (labelTeam1Score) labelTeam1Score.textContent = `${team1Name} Score`;
    if (labelTeam2Score) labelTeam2Score.textContent = `${team2Name} Score`;
    if (playerListTeam1NameH3) playerListTeam1NameH3.textContent = `${team1Name} Players`;
    if (playerListTeam2NameH3) playerListTeam2NameH3.textContent = `${team2Name} Players`;

    populateTeamSelect(singlePlayerTeamSelect, team1Name, team2Name);
    renderPlayerList();
    renderGoalscorerList();
}

function populateTeamSelect(selectElement, team1Name, team2Name, selectedValue = "") {
    if (!selectElement) return;
    const currentValue = selectedValue || selectElement.value;
    while (selectElement.options.length > 1) { 
        selectElement.remove(1);
    }
    const opt1 = document.createElement('option');
    opt1.value = "team1"; opt1.textContent = team1Name;
    selectElement.appendChild(opt1);
    const opt2 = document.createElement('option');
    opt2.value = "team2"; opt2.textContent = team2Name;
    selectElement.appendChild(opt2);
    selectElement.value = currentValue;
    if (selectElement.selectedIndex === -1 && selectElement.options.length > 0 && currentValue === "") {
        selectElement.value = ""; 
    }
}

// --- Player Setup Logic ---
function initializePlayerSetup() {
    if (!showAddPlayerFormBtn || !singlePlayerForm || !cancelPlayerEditBtn) {
        console.error("Player setup core elements not found."); return;
    }
    showAddPlayerFormBtn.addEventListener('click', handleShowAddPlayerForm);
    singlePlayerForm.addEventListener('submit', handleSavePlayer);
    cancelPlayerEditBtn.addEventListener('click', hidePlayerForm);
    renderPlayerList();
}

function handleShowAddPlayerForm() {
    if (!playerFormContainer || !playerFormTitle || !singlePlayerForm || !playerEditIdInput || !singlePlayerNameInput || !singlePlayerTeamSelect || !currentPlayerVideoFilename || !showAddPlayerFormBtn) {
        console.error("Player form display elements missing."); return;
    }
    currentlyEditingPlayerId = null;
    playerFormTitle.textContent = "Add New Player";
    singlePlayerForm.reset(); 
    currentPlayerVideoFilename.textContent = "None";
    playerEditIdInput.value = "";
    populateTeamSelect(singlePlayerTeamSelect, team1NameInput.value || "Team A", team2NameInput.value || "Team B");
    playerFormContainer.style.display = 'block';
    showAddPlayerFormBtn.style.display = 'none';
    singlePlayerNameInput.focus();
}

function hidePlayerForm() {
    if (!playerFormContainer || !showAddPlayerFormBtn || !singlePlayerForm || !playerEditIdInput || !currentPlayerVideoFilename) {
        console.error("Player form hide elements missing."); return;
    }
    playerFormContainer.style.display = 'none';
    showAddPlayerFormBtn.style.display = 'inline-block';
    singlePlayerForm.reset(); 
    currentlyEditingPlayerId = null;
    playerEditIdInput.value = "";
    currentPlayerVideoFilename.textContent = "None";
}

function handleSavePlayer(event) {
    event.preventDefault();
    if (!singlePlayerNameInput || !singlePlayerTeamSelect || !singlePlayerVideoInput) {
         console.error("Player save form elements missing."); return;
    }
    const playerName = singlePlayerNameInput.value.trim();
    const playerTeam = singlePlayerTeamSelect.value;
    const newlySelectedVideoFile = singlePlayerVideoInput.files[0]; 

    if (!playerName || !playerTeam) {
        alert("Player Name and Team are required."); return;
    }

    if (currentlyEditingPlayerId) {
        const playerIndex = players.findIndex(p => p.id === currentlyEditingPlayerId);
        if (playerIndex > -1) {
            players[playerIndex].name = playerName;
            players[playerIndex].team = playerTeam;
            players[playerIndex].isPlaceholder = false; // Mark as customized

            if (newlySelectedVideoFile) { // User selected a new file during this edit
                players[playerIndex].videoFile = newlySelectedVideoFile;
                players[playerIndex].videoFileName = newlySelectedVideoFile.name;
            }
            // If no new file was selected, the existing player[playerIndex].videoFile and .videoFileName are preserved
        }
    } else { // Adding a brand new player
        const newPlayer = {
            id: generateId(), name: playerName, team: playerTeam,
            videoFile: newlySelectedVideoFile || null,
            videoFileName: newlySelectedVideoFile ? newlySelectedVideoFile.name : null,
            isPlaceholder: false
        };
        players.push(newPlayer);
    }

    renderPlayerList();
    hidePlayerForm(); 
    updatePlayerOptionsInGoalscorerForm();
    renderGoalscorerList();
}

function createPlayerListItem(player, targetUl) {
    const li = document.createElement('li');
    li.setAttribute('data-id', player.id);
    if (player.isPlaceholder) {
        li.classList.add('is-placeholder');
    }

    const nameSpan = document.createElement('span');
    let videoIndicator = player.videoFileName ? ` (Video: ${player.videoFileName.substring(0,10)}${player.videoFileName.length > 10 ? '...' : ''})` : "";
    nameSpan.textContent = `${player.name}${videoIndicator}`;
    
    const actionsDiv = document.createElement('div');
    actionsDiv.classList.add('item-actions');

    const editButton = document.createElement('button');
    editButton.setAttribute('type', 'button'); 
    editButton.classList.add('edit-btn');
    editButton.textContent = 'Edit';
    editButton.addEventListener('click', () => loadPlayerForEdit(player.id));

    const deleteButton = document.createElement('button');
    deleteButton.setAttribute('type', 'button'); 
    deleteButton.classList.add('delete-btn');
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', () => deletePlayer(player.id));
    
    actionsDiv.appendChild(editButton);
    actionsDiv.appendChild(deleteButton);
    li.appendChild(nameSpan);
    li.appendChild(actionsDiv);
    targetUl.appendChild(li);
}

function renderPlayerList() {
    if (!playersListTeam1Ul || !playersListTeam2Ul || !team1NameInput || !team2NameInput ||
        !noTeam1PlayersMessage || !noTeam2PlayersMessage || !noPlayersOverallMessage ||
        !playerListTeam1NameH3 || !playerListTeam2NameH3) {
        console.error("Player list rendering elements missing for two-column layout."); return;
    }

    playerListTeam1NameH3.textContent = `${team1NameInput.value.trim() || "Team A"} Players`;
    playerListTeam2NameH3.textContent = `${team2NameInput.value.trim() || "Team B"} Players`;

    playersListTeam1Ul.innerHTML = '';
    playersListTeam2Ul.innerHTML = '';

    const team1Players = players.filter(p => p.team === 'team1');
    const team2Players = players.filter(p => p.team === 'team2');
    let overallMessageVisible = true; 

    if (team1Players.length === 0) {
        noTeam1PlayersMessage.style.display = 'block'; playersListTeam1Ul.style.display = 'none';
    } else {
        noTeam1PlayersMessage.style.display = 'none'; playersListTeam1Ul.style.display = 'block';
        overallMessageVisible = false;
        team1Players.forEach(player => createPlayerListItem(player, playersListTeam1Ul));
    }

    if (team2Players.length === 0) {
        noTeam2PlayersMessage.style.display = 'block'; playersListTeam2Ul.style.display = 'none';
    } else {
        noTeam2PlayersMessage.style.display = 'none'; playersListTeam2Ul.style.display = 'block';
        overallMessageVisible = false;
        team2Players.forEach(player => createPlayerListItem(player, playersListTeam2Ul));
    }
    noPlayersOverallMessage.style.display = overallMessageVisible ? 'block' : 'none';
}

function loadPlayerForEdit(playerId) {
    const player = players.find(p => p.id === playerId);
    if (!player) return;
    if (!playerFormContainer || !playerFormTitle || !singlePlayerForm || !playerEditIdInput || !singlePlayerNameInput || !singlePlayerTeamSelect || !singlePlayerVideoInput || !currentPlayerVideoFilename || !showAddPlayerFormBtn) {
        console.error("Elements for loading player to edit are missing."); return;
    }

    currentlyEditingPlayerId = playerId;
    playerFormTitle.textContent = "Edit Player";
    playerEditIdInput.value = playerId;
    singlePlayerNameInput.value = player.name;
    populateTeamSelect(singlePlayerTeamSelect, team1NameInput.value || "Team A", team2NameInput.value || "Team B", player.team);
    
    singlePlayerVideoInput.value = ''; 
    currentPlayerVideoFilename.textContent = player.videoFileName || "None"; 
    
    playerFormContainer.style.display = 'block';
    showAddPlayerFormBtn.style.display = 'none';
    singlePlayerNameInput.focus();
}

function deletePlayer(playerId) {
    if (confirm("Are you sure you want to delete this player? This will also remove any goals scored by them.")) {
        players = players.filter(p => p.id !== playerId);
        goalscorers = goalscorers.filter(gs => gs.playerId !== playerId);
        if (currentlyEditingPlayerId === playerId) {
            hidePlayerForm();
        }
        renderPlayerList();
        updatePlayerOptionsInGoalscorerForm();
        renderGoalscorerList();
    }
}

// --- Goalscorer Setup Logic ---
function initializeGoalscorerSetup() {
    if (!showAddGoalscorerFormBtn || !saveGoalscorerBtn || !cancelGoalscorerEditBtn || !singleGoalscorerPlayerSelect || !singleGoalscorerGoalsInput || !goalscorerFormContainer || !goalscorerEditIdInput) {
        console.error("Goalscorer setup core elements not found."); return;
    }
    showAddGoalscorerFormBtn.addEventListener('click', handleShowAddGoalscorerForm);
    saveGoalscorerBtn.addEventListener('click', handleSaveGoalscorer); 
    cancelGoalscorerEditBtn.addEventListener('click', hideGoalscorerForm);
    renderGoalscorerList();
    updatePlayerOptionsInGoalscorerForm();
}

function handleShowAddGoalscorerForm() {
    if (players.length === 0) {
        alert("Please add players in the 'Player Setup' tab first before adding goalscorers."); return;
    }
    if (!goalscorerFormContainer || !goalscorerFormTitle || !goalscorerEditIdInput || !singleGoalscorerPlayerSelect || !singleGoalscorerGoalsInput || !showAddGoalscorerFormBtn) {
        console.error("Goalscorer form display elements missing."); return;
    }
    currentlyEditingGoalscorerId = null;
    goalscorerFormTitle.textContent = "Add Goalscorer";
    goalscorerEditIdInput.value = "";
    singleGoalscorerPlayerSelect.value = ""; 
    singleGoalscorerGoalsInput.value = "1"; 
    updatePlayerOptionsInGoalscorerForm(singleGoalscorerPlayerSelect);
    goalscorerFormContainer.style.display = 'block';
    showAddGoalscorerFormBtn.style.display = 'none';
    singleGoalscorerPlayerSelect.focus();
}

function hideGoalscorerForm() {
     if (!goalscorerFormContainer || !showAddGoalscorerFormBtn || !goalscorerEditIdInput || !singleGoalscorerPlayerSelect || !singleGoalscorerGoalsInput) {
        console.error("Goalscorer form hide elements missing."); return;
    }
    goalscorerFormContainer.style.display = 'none';
    showAddGoalscorerFormBtn.style.display = 'inline-block';
    goalscorerEditIdInput.value = "";
    singleGoalscorerPlayerSelect.value = "";
    singleGoalscorerGoalsInput.value = "1";
    currentlyEditingGoalscorerId = null;
}

function handleSaveGoalscorer() { 
     if (!singleGoalscorerPlayerSelect || !singleGoalscorerGoalsInput) {
        console.error("Goalscorer save elements missing."); return;
    }
    const playerId = singleGoalscorerPlayerSelect.value;
    const goals = parseInt(singleGoalscorerGoalsInput.value, 10);
    if (!playerId) {
        alert("Please select a player."); return;
    }
    if (isNaN(goals) || goals < 1) {
        alert("Number of goals must be at least 1."); return;
    }
    if (currentlyEditingGoalscorerId) {
        const gsIndex = goalscorers.findIndex(gs => gs.id === currentlyEditingGoalscorerId);
        if (gsIndex > -1) {
            goalscorers[gsIndex].playerId = playerId;
            goalscorers[gsIndex].goals = goals;
        }
    } else {
        goalscorers.push({ id: generateId(), playerId: playerId, goals: goals });
    }
    renderGoalscorerList();
    hideGoalscorerForm();
}

function renderGoalscorerList() {
    if (!goalscorersListUl || !noGoalscorersMessage || !team1NameInput || !team2NameInput) { return; }
    goalscorersListUl.innerHTML = '';
    if (goalscorers.length === 0) {
        noGoalscorersMessage.style.display = 'block'; goalscorersListUl.style.display = 'none';
    } else {
        noGoalscorersMessage.style.display = 'none'; goalscorersListUl.style.display = 'block';
        goalscorers.forEach(gs => {
            const player = players.find(p => p.id === gs.playerId);
            if (!player) { console.warn(`Player ID ${gs.playerId} not found for goalscorer.`); return; }
            const li = document.createElement('li');
            li.setAttribute('data-id', gs.id);
            const nameSpan = document.createElement('span');
            const teamDisplayName = player.team === 'team1' ? (team1NameInput.value.trim() || "Team A") : (team2NameInput.value.trim() || "Team B");
            nameSpan.textContent = `${player.name} (${teamDisplayName}) - ${gs.goals} goal(s)`;
            const actionsDiv = document.createElement('div');
            actionsDiv.classList.add('item-actions');
            const editButton = document.createElement('button');
            editButton.setAttribute('type', 'button'); editButton.classList.add('edit-btn');
            editButton.textContent = 'Edit';
            editButton.addEventListener('click', () => loadGoalscorerForEdit(gs.id));
            const deleteButton = document.createElement('button');
            deleteButton.setAttribute('type', 'button'); deleteButton.classList.add('delete-btn');
            deleteButton.textContent = 'Delete';
            deleteButton.addEventListener('click', () => deleteGoalscorer(gs.id));
            actionsDiv.appendChild(editButton); actionsDiv.appendChild(deleteButton);
            li.appendChild(nameSpan); li.appendChild(actionsDiv);
            goalscorersListUl.appendChild(li);
        });
    }
}

function loadGoalscorerForEdit(goalscorerId) {
    const goalscorer = goalscorers.find(gs => gs.id === goalscorerId);
    if (!goalscorer) return;
    if (!goalscorerFormContainer || !goalscorerFormTitle || !goalscorerEditIdInput || !singleGoalscorerPlayerSelect || !singleGoalscorerGoalsInput || !showAddGoalscorerFormBtn) {
        console.error("Elements for loading goalscorer to edit are missing."); return;
    }
    currentlyEditingGoalscorerId = goalscorerId;
    goalscorerFormTitle.textContent = "Edit Goalscorer";
    goalscorerEditIdInput.value = goalscorerId;
    updatePlayerOptionsInGoalscorerForm(singleGoalscorerPlayerSelect, goalscorer.playerId); 
    singleGoalscorerPlayerSelect.value = goalscorer.playerId; 
    singleGoalscorerGoalsInput.value = goalscorer.goals;
    goalscorerFormContainer.style.display = 'block';
    showAddGoalscorerFormBtn.style.display = 'none'; 
    singleGoalscorerPlayerSelect.focus(); 
}

function deleteGoalscorer(goalscorerId) {
    if (confirm("Are you sure you want to remove this goalscorer entry?")) {
        goalscorers = goalscorers.filter(gs => gs.id !== goalscorerId);
        if (currentlyEditingGoalscorerId === goalscorerId) {
            hideGoalscorerForm();
        }
        renderGoalscorerList();
    }
}

function updatePlayerOptionsInGoalscorerForm(selectElementParam, selectedPlayerId = "") {
    const selectElement = selectElementParam || singleGoalscorerPlayerSelect;
    if (!selectElement || !team1NameInput || !team2NameInput) { return; }
    const currentValue = selectedPlayerId || selectElement.value;
    while (selectElement.options.length > 1) { selectElement.remove(1); }
    const team1Name = team1NameInput.value.trim() || "Team A";
    const team2Name = team2NameInput.value.trim() || "Team B";
    players.forEach(player => {
        const teamDisplayName = player.team === 'team1' ? team1Name : team2Name;
        const option = document.createElement('option');
        option.value = player.id; option.textContent = `${player.name} (${teamDisplayName})`;
        selectElement.appendChild(option);
    });
    selectElement.value = currentValue;
    if (selectElement.selectedIndex === -1 && selectElement.options.length > 0 && currentValue === "") {
        selectElement.value = ""; 
    }
}

// --- Download Logic ---
function convertToCSV(data, headers) {
    const headerRow = headers.join(',');
    const dataRows = data.map(row => 
        headers.map(header => {
            let cell = row[header] === null || row[header] === undefined ? '' : String(row[header]);
            cell = cell.includes(',') || cell.includes('"') || cell.includes('\n') ? `"${cell.replace(/"/g, '""')}"` : cell;
            return cell;
        }).join(',')
    );
    return [headerRow, ...dataRows].join('\r\n');
}

async function handleDownload() {
    if (typeof JSZip === 'undefined') {
        alert("JSZip library not loaded. Cannot create zip file."); console.error("JSZip is not defined."); return;
    }
    const zip = new JSZip();
    const gameSetupData = {
        match_category: matchCategoryInput.value, match_date: matchDateInput.value,
        match_type: matchTypeSelect.value, match_duration_minutes: matchDurationInput.value,
        team1_name: team1NameInput.value, team2_name: team2NameInput.value,
        average_age_category: ageCategorySelect.value, team1_score: team1ScoreInput.value,
        team2_score: team2ScoreInput.value,
        game_video_filename: gameLinkVideoInput.files[0] ? gameLinkVideoInput.files[0].name : ""
    };
    zip.file("game_details.csv", convertToCSV([gameSetupData], Object.keys(gameSetupData)));

    if (goalscorers.length > 0) {
        const goalscorersCsvData = goalscorers.map(gs => {
            const p = players.find(pl => pl.id === gs.playerId);
            return { player_id: gs.playerId, player_name: p ? p.name : "Unknown", 
                     player_team_identifier: p ? p.team : "N/A",
                     player_team_name: p ? (p.team === 'team1' ? team1NameInput.value : team2NameInput.value) : "N/A",
                     goals_scored: gs.goals };
        });
        zip.file("goalscorers.csv", convertToCSV(goalscorersCsvData, ["player_id", "player_name", "player_team_identifier", "player_team_name", "goals_scored"]));
    }

    const videosFolder = zip.folder("player_360_videos");
    let videosAddedToFolder = false;
    const playersCsvData = players.map(player => {
        let uniqueVideoFilenameInZip = "";
        if (player.videoFile && player.videoFileName) {
            const extension = player.videoFileName.slice(player.videoFileName.lastIndexOf("."));
            uniqueVideoFilenameInZip = `player_${player.id.replace(/[^a-zA-Z0-9]/g, '_')}_360video${extension}`;
            videosFolder.file(uniqueVideoFilenameInZip, player.videoFile);
            videosAddedToFolder = true;
        }
        return { player_id: player.id, player_name: player.name, 
                 team_identifier: player.team, 
                 team_name: player.team === 'team1' ? team1NameInput.value : team2NameInput.value, 
                 video_360_filename: uniqueVideoFilenameInZip };
    });
    zip.file("players.csv", convertToCSV(playersCsvData, ["player_id", "player_name", "team_identifier", "team_name", "video_360_filename"]));
    if (!videosAddedToFolder && videosFolder && Object.keys(videosFolder.files).length === 0) { // Check if folder is truly empty
        videosFolder.file("no_videos_uploaded.txt", "No 360 videos were uploaded for players."); 
    }


    if (gameLinkVideoInput.files[0]) {
        const gameVideoFile = gameLinkVideoInput.files[0];
        const gameVideoFilenameInZip = "game_match_video" + gameVideoFile.name.slice(gameVideoFile.name.lastIndexOf("."));
        zip.file(gameVideoFilenameInZip, gameVideoFile);
    } else {
        zip.file("no_match_video_uploaded.txt", "No full match video was uploaded.");
    }

    try {
        const content = await zip.generateAsync({ type: "blob" });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const zipFilename = `game_data_${timestamp}.zip`;
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = zipFilename;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        alert("Game data zip file is being downloaded!");
    } catch (error) {
        console.error("Error generating zip file:", error);
        alert("Failed to generate zip file. See console for details.");
    }
}

function initializeDownload() {
    if (!downloadBtn) { console.error("Download button not found."); return; }
    downloadBtn.addEventListener('click', handleDownload);
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    tabButtons = document.querySelectorAll('.tab-button');
    tabContents = document.querySelectorAll('.tab-content');
    gameSetupForm = document.getElementById('game-setup-form');
    matchCategoryInput = document.getElementById('match-category');
    matchDateInput = document.getElementById('match-date');
    matchTypeSelect = document.getElementById('match-type'); 
    matchDurationInput = document.getElementById('match-duration');
    team1NameInput = document.getElementById('team1-name');
    team2NameInput = document.getElementById('team2-name');
    ageCategorySelect = document.getElementById('age-category');
    playerFormContainer = document.getElementById('player-form-container');
    playerFormTitle = document.getElementById('player-form-title');
    singlePlayerForm = document.getElementById('single-player-form');
    playerEditIdInput = document.getElementById('player-edit-id');
    singlePlayerNameInput = document.getElementById('single-player-name');
    singlePlayerTeamSelect = document.getElementById('single-player-team');
    singlePlayerVideoInput = document.getElementById('single-player-video');
    currentPlayerVideoFilename = document.getElementById('current-player-video-filename');
    savePlayerBtn = document.getElementById('save-player-btn');
    cancelPlayerEditBtn = document.getElementById('cancel-player-edit-btn');
    showAddPlayerFormBtn = document.getElementById('show-add-player-form-btn');
    playerListDisplayContainer = document.getElementById('player-list-display-container');
    playersListTeam1Ul = document.getElementById('players-list-team1-ul');
    playerListTeam1NameH3 = document.getElementById('player-list-team1-name');
    noTeam1PlayersMessage = document.getElementById('no-team1-players-message');
    playersListTeam2Ul = document.getElementById('players-list-team2-ul');
    playerListTeam2NameH3 = document.getElementById('player-list-team2-name');
    noTeam2PlayersMessage = document.getElementById('no-team2-players-message');
    noPlayersOverallMessage = document.getElementById('no-players-overall-message');
    gameSubmissionOuterForm = document.getElementById('game-submission-form');
    labelTeam1Score = document.getElementById('label-team1-score');
    labelTeam2Score = document.getElementById('label-team2-score');
    team1ScoreInput = document.getElementById('team1-score'); 
    team2ScoreInput = document.getElementById('team2-score'); 
    gameLinkVideoInput = document.getElementById('game-link-video');
    goalscorerFormContainer = document.getElementById('goalscorer-form-container');
    goalscorerFormTitle = document.getElementById('goalscorer-form-title');
    goalscorerEditIdInput = document.getElementById('goalscorer-edit-id');
    singleGoalscorerPlayerSelect = document.getElementById('single-goalscorer-player');
    singleGoalscorerGoalsInput = document.getElementById('single-goalscorer-goals');
    saveGoalscorerBtn = document.getElementById('save-goalscorer-btn');
    cancelGoalscorerEditBtn = document.getElementById('cancel-goalscorer-edit-btn');
    showAddGoalscorerFormBtn = document.getElementById('show-add-goalscorer-form-btn');
    goalscorersListUl = document.getElementById('goalscorers-list-ul');
    noGoalscorersMessage = document.getElementById('no-goalscorers-message');
    downloadBtn = document.getElementById('download-btn');

    initializeTabs();
    initializeGameSetup();
    initializePlayerSetup();
    initializeGoalscorerSetup();
    initializeDownload(); 
});