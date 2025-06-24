// --- Global Data Stores ---
let players = []; // Each player object will now store their goals: { ..., goalsScored: 0, ownGoalsScored: 0 }
let currentlyEditingPlayerId = null;

// --- DOM Element Variables ---
let tabButtons, tabContents;
let gameSetupForm, matchCategoryInput, matchDateInput, matchTypeSelect, matchDurationInput, team1NameInput, team2NameInput, ageCategorySelect;
let playerFormContainer, playerFormTitle, singlePlayerForm, playerEditIdInput, singlePlayerNameInput, singlePlayerTeamSelect, singlePlayerPhoneInput, singlePlayerVideoInput, currentPlayerVideoFilename, savePlayerBtn, cancelPlayerEditBtn, showAddPlayerFormBtn;
let playerListDisplayContainer, playersListTeam1Ul, playerListTeam1NameH3, noTeam1PlayersMessage, playersListTeam2Ul, playerListTeam2NameH3, noTeam2PlayersMessage, noPlayersOverallMessage;
let gameSubmissionOuterForm, labelTeam1Score, labelTeam2Score, team1ScoreInput, team2ScoreInput;
let downloadBtn;

// New Goal Scorer UI Elements
let detailedGoalScorersContainer;
let summaryDisplayTeam1Name, summaryDisplayTeam1CalculatedScore;
let summaryDisplayTeam2Name, summaryDisplayTeam2CalculatedScore;


// --- Utility Functions ---
function generateId(team) {
    const teamPrefix = team === 'team1' ? 'A' : 'B';
    const existingIds = players
        .filter(p => p.team === team)
        .map(p => p.id)
        .filter(id => id.startsWith(teamPrefix));
    
    let nextNumber = 1;
    while (existingIds.includes(`${teamPrefix}${String(nextNumber).padStart(2, '0')}`)) {
        nextNumber++;
    }
    
    return `${teamPrefix}${String(nextNumber).padStart(2, '0')}`;
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
         renderDetailedGoalscorersTable();
         updateGoalSummaryDisplay();
        renderPlayerList(); // Still render player list (which will show "no players")
        return;
    } else {
        const match = matchType.match(/(\d+)v\d+/);
        if (match && match[1]) {
            numPlayersPerTeam = parseInt(match[1], 10);
        }
    }

    if (numPlayersPerTeam > 0) {
        let proceedWithGeneration = true;
        if (players.some(p => !p.isPlaceholder) && players.length > 0) {
             proceedWithGeneration = confirm(`Changing match type to ${matchType} will reset the player list and remove any manually added/edited players and their goal data. Are you sure?`);
        } else if (players.length > 0) {
            // No confirmation needed if only placeholders exist or list is empty
        }

        if (proceedWithGeneration) {
            players = []; // Clear existing players
            for (let i = 1; i <= numPlayersPerTeam; i++) {
                players.push({
                    id: generateId('team1'), name: `A${i}`, team: 'team1',
                    phoneNumber: "", videoFile: null, videoFileName: null, isPlaceholder: true,
                    goalsScored: 0, ownGoalsScored: 0
                });
                players.push({
                    id: generateId('team2'), name: `B${i}`, team: 'team2',
                    phoneNumber: "", videoFile: null, videoFileName: null, isPlaceholder: true,
                    goalsScored: 0, ownGoalsScored: 0
                });
            }
        }
    } else if (players.length > 0 && matchType !== "other") {
        if (confirm("This match type doesn't auto-generate players. Clear existing player list and their goal data?")) {
            players = [];
        }
    }

    renderPlayerList();
    renderDetailedGoalscorersTable();
    updateGoalSummaryDisplay();
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

    if (detailedGoalScorersContainer) {
        renderDetailedGoalscorersTable();
        updateGoalSummaryDisplay();
    }
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
    if (!playerFormContainer || !playerFormTitle || !singlePlayerForm || !playerEditIdInput || !singlePlayerNameInput || !singlePlayerTeamSelect || !singlePlayerPhoneInput || !currentPlayerVideoFilename || !showAddPlayerFormBtn) {
        console.error("Player form display elements missing."); return;
    }
    currentlyEditingPlayerId = null;
    playerFormTitle.textContent = "Add New Player";
    singlePlayerForm.reset();
    singlePlayerPhoneInput.value = "";
    currentPlayerVideoFilename.textContent = "None";
    playerEditIdInput.value = "";
    populateTeamSelect(singlePlayerTeamSelect, team1NameInput.value || "Team A", team2NameInput.value || "Team B");
    playerFormContainer.style.display = 'block';
    showAddPlayerFormBtn.style.display = 'none';
    singlePlayerNameInput.focus();
}

function hidePlayerForm() {
    if (!playerFormContainer || !showAddPlayerFormBtn || !singlePlayerForm || !playerEditIdInput || !singlePlayerPhoneInput || !currentPlayerVideoFilename) {
        console.error("Player form hide elements missing."); return;
    }
    playerFormContainer.style.display = 'none';
    showAddPlayerFormBtn.style.display = 'inline-block';
    singlePlayerForm.reset();
    singlePlayerPhoneInput.value = "";
    currentlyEditingPlayerId = null;
    playerEditIdInput.value = "";
    currentPlayerVideoFilename.textContent = "None";
}

function handleSavePlayer(event) {
    event.preventDefault();
    if (!singlePlayerNameInput || !singlePlayerTeamSelect || !singlePlayerPhoneInput || !singlePlayerVideoInput) {
         console.error("Player save form elements missing."); return;
    }
    const playerName = singlePlayerNameInput.value.trim();
    const playerTeam = singlePlayerTeamSelect.value;
    const playerPhone = singlePlayerPhoneInput.value.trim();
    const newlySelectedVideoFile = singlePlayerVideoInput.files[0];

    if (playerPhone && !/^\d{10}$/.test(playerPhone)) {
        alert("Phone number must be exactly 10 digits.");
        return;
    }

    if (!playerName || !playerTeam) {
        alert("Player Name and Team are required."); return;
    }

    if (currentlyEditingPlayerId) {
        const playerIndex = players.findIndex(p => p.id === currentlyEditingPlayerId);
        if (playerIndex > -1) {
            players[playerIndex].name = playerName;
            players[playerIndex].team = playerTeam;
            players[playerIndex].phoneNumber = playerPhone;
            players[playerIndex].isPlaceholder = false;

            if (newlySelectedVideoFile) {
                players[playerIndex].videoFile = newlySelectedVideoFile;
                players[playerIndex].videoFileName = newlySelectedVideoFile.name;
            }
            // Goal counts (goalsScored, ownGoalsScored) are preserved for existing players
        }
    } else {
        const newPlayer = {
            id: generateId(playerTeam), name: playerName, team: playerTeam,
            phoneNumber: playerPhone,
            videoFile: newlySelectedVideoFile || null,
            videoFileName: newlySelectedVideoFile ? newlySelectedVideoFile.name : null,
            isPlaceholder: false,
            goalsScored: 0,
            ownGoalsScored: 0
        };
        players.push(newPlayer);
    }

    renderPlayerList();
    hidePlayerForm();
    renderDetailedGoalscorersTable();
    updateGoalSummaryDisplay();
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
    noPlayersOverallMessage.style.display = overallMessageVisible && players.length === 0 ? 'block' : 'none';
}

function loadPlayerForEdit(playerId) {
    const player = players.find(p => p.id === playerId);
    if (!player) return;
    if (!playerFormContainer || !playerFormTitle || !singlePlayerForm || !playerEditIdInput || !singlePlayerNameInput || !singlePlayerTeamSelect || !singlePlayerPhoneInput || !singlePlayerVideoInput || !currentPlayerVideoFilename || !showAddPlayerFormBtn) {
        console.error("Elements for loading player to edit are missing."); return;
    }

    currentlyEditingPlayerId = playerId;
    playerFormTitle.textContent = "Edit Player";
    playerEditIdInput.value = playerId;
    singlePlayerNameInput.value = player.name;
    populateTeamSelect(singlePlayerTeamSelect, team1NameInput.value || "Team A", team2NameInput.value || "Team B", player.team);
    singlePlayerPhoneInput.value = player.phoneNumber || "";

    singlePlayerVideoInput.value = '';
    currentPlayerVideoFilename.textContent = player.videoFileName || "None";

    playerFormContainer.style.display = 'block';
    showAddPlayerFormBtn.style.display = 'none';
    singlePlayerNameInput.focus();
}

function deletePlayer(playerId) {
    if (confirm("Are you sure you want to delete this player? Their goal data will also be removed.")) {
        players = players.filter(p => p.id !== playerId);
        if (currentlyEditingPlayerId === playerId) {
            hidePlayerForm();
        }
        renderPlayerList();
        renderDetailedGoalscorersTable();
        updateGoalSummaryDisplay();
    }
}

// --- Detailed Goalscorer Input Logic ---
function initializeDetailedGoalInputs() {
    if (!detailedGoalScorersContainer) {
        // console.warn("Detailed goal scorers container not found for initialization.");
        return;
    }
    detailedGoalScorersContainer.addEventListener('click', handleGoalModifierClick);
    renderDetailedGoalscorersTable();
    updateGoalSummaryDisplay();
}

function renderDetailedGoalscorersTable() {
    if (!detailedGoalScorersContainer || !team1NameInput || !team2NameInput || !matchTypeSelect) {
        return;
    }

    detailedGoalScorersContainer.innerHTML = '';

    const team1Name = team1NameInput.value.trim() || "Team A";
    const team2Name = team2NameInput.value.trim() || "Team B";

    const teams = [
        { name: team1Name, identifier: 'team1', headingId: 'goal-details-team1-heading' },
        { name: team2Name, identifier: 'team2', headingId: 'goal-details-team2-heading' }
    ];

    teams.forEach(teamInfo => {
        const teamPlayers = players.filter(p => p.team === teamInfo.identifier);

        const teamSectionDiv = document.createElement('div');
        teamSectionDiv.className = 'team-goal-scorers-section';

        const heading = document.createElement('h4');
        heading.id = teamInfo.headingId;
        heading.textContent = `${teamInfo.name} Players`;
        teamSectionDiv.appendChild(heading);

        if (teamPlayers.length === 0) {
            const noPlayersMsg = document.createElement('p');
            noPlayersMsg.textContent = `No players added for ${teamInfo.name} yet.`;
            noPlayersMsg.style.fontSize = '0.9em';
            noPlayersMsg.style.color = '#6c757d';
            teamSectionDiv.appendChild(noPlayersMsg);
            detailedGoalScorersContainer.appendChild(teamSectionDiv);
        } else {
            const playerListUl = document.createElement('ul');
            playerListUl.className = 'goal-details-player-list';

            teamPlayers.forEach(player => {
                if (typeof player.goalsScored === 'undefined') player.goalsScored = 0;
                if (typeof player.ownGoalsScored === 'undefined') player.ownGoalsScored = 0;

                const listItem = document.createElement('li');
                listItem.dataset.playerId = player.id;

                const playerNameSpan = document.createElement('span');
                playerNameSpan.className = 'player-name-column';
                playerNameSpan.textContent = player.name;
                listItem.appendChild(playerNameSpan);

                const goalsDiv = document.createElement('div');
                goalsDiv.className = 'goal-input-column';
                const goalsLabel = document.createElement('label');
                goalsLabel.htmlFor = `goals-count-${player.id}`;
                goalsLabel.textContent = 'Goals:';
                const minusGoalBtn = createGoalModifierButton(player.id, 'goal', 'decrement', '-');
                const goalsCountSpan = document.createElement('span');
                goalsCountSpan.id = `goals-count-${player.id}`;
                goalsCountSpan.className = 'goal-tally';
                goalsCountSpan.textContent = player.goalsScored;
                const plusGoalBtn = createGoalModifierButton(player.id, 'goal', 'increment', '+');
                goalsDiv.appendChild(goalsLabel);
                goalsDiv.appendChild(minusGoalBtn);
                goalsDiv.appendChild(goalsCountSpan);
                goalsDiv.appendChild(plusGoalBtn);
                listItem.appendChild(goalsDiv);

                const ownGoalsDiv = document.createElement('div');
                ownGoalsDiv.className = 'goal-input-column';
                const ownGoalsLabel = document.createElement('label');
                ownGoalsLabel.htmlFor = `own-goals-count-${player.id}`;
                ownGoalsLabel.textContent = 'Own Goals:';
                const minusOwnGoalBtn = createGoalModifierButton(player.id, 'own-goal', 'decrement', '-');
                const ownGoalsCountSpan = document.createElement('span');
                ownGoalsCountSpan.id = `own-goals-count-${player.id}`;
                ownGoalsCountSpan.className = 'goal-tally';
                ownGoalsCountSpan.textContent = player.ownGoalsScored;
                const plusOwnGoalBtn = createGoalModifierButton(player.id, 'own-goal', 'increment', '+');
                ownGoalsDiv.appendChild(ownGoalsLabel);
                ownGoalsDiv.appendChild(minusOwnGoalBtn);
                ownGoalsDiv.appendChild(ownGoalsCountSpan);
                ownGoalsDiv.appendChild(plusOwnGoalBtn);
                listItem.appendChild(ownGoalsDiv);

                playerListUl.appendChild(listItem);
            });
            teamSectionDiv.appendChild(playerListUl);
            detailedGoalScorersContainer.appendChild(teamSectionDiv);
        }
    });

    if (players.length === 0 && detailedGoalScorersContainer.innerHTML.includes("No players added for")) {
        const existingMessages = detailedGoalScorersContainer.querySelectorAll('.team-goal-scorers-section p');
        if (existingMessages.length === teams.length) { 
             detailedGoalScorersContainer.innerHTML = ''; 
             const p = document.createElement('p');
             p.textContent = "Add players in 'Player Setup' (Tab 2) to assign goals.";
             p.style.textAlign = 'center';
             p.style.padding = '10px';
             p.style.color = '#6c757d';
             detailedGoalScorersContainer.appendChild(p);
        }
    } else if (players.length === 0) { 
        detailedGoalScorersContainer.innerHTML = '';
        const p = document.createElement('p');
        p.textContent = "Add players in 'Player Setup' (Tab 2) to assign goals.";
        p.style.textAlign = 'center';
        p.style.padding = '10px';
        p.style.color = '#6c757d';
        detailedGoalScorersContainer.appendChild(p);
    }
}


function createGoalModifierButton(playerId, type, action, text) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'goal-mod-btn';
    button.dataset.playerId = playerId;
    button.dataset.type = type;
    button.dataset.action = action;
    button.textContent = text;
    return button;
}

function handleGoalModifierClick(event) {
    const button = event.target.closest('.goal-mod-btn');
    if (!button) return;

    const playerId = button.dataset.playerId;
    const type = button.dataset.type;
    const action = button.dataset.action;

    const player = players.find(p => p.id === playerId);
    if (!player) return;

    let countSpanId;
    if (type === 'goal') {
        if (action === 'increment') player.goalsScored++;
        else player.goalsScored = Math.max(0, player.goalsScored - 1);
        countSpanId = `goals-count-${playerId}`;
    } else if (type === 'own-goal') {
        if (action === 'increment') player.ownGoalsScored++;
        else player.ownGoalsScored = Math.max(0, player.ownGoalsScored - 1);
        countSpanId = `own-goals-count-${playerId}`;
    }

    const countSpan = document.getElementById(countSpanId);
    if (countSpan) {
        countSpan.textContent = (type === 'goal') ? player.goalsScored : player.ownGoalsScored;
    }
    updateGoalSummaryDisplay();
}

function updateGoalSummaryDisplay() {
    if (!summaryDisplayTeam1Name || !players || !team1NameInput || !team2NameInput || !summaryDisplayTeam1CalculatedScore || !summaryDisplayTeam2CalculatedScore) {
        return;
    }

    const team1Name = team1NameInput.value.trim() || "Team A";
    const team2Name = team2NameInput.value.trim() || "Team B";

    let team1CalculatedScoreValue = 0;
    let team2CalculatedScoreValue = 0;

    players.forEach(player => {
        if (player.team === 'team1') {
            team1CalculatedScoreValue += (player.goalsScored || 0);
            team2CalculatedScoreValue += (player.ownGoalsScored || 0);
        } else if (player.team === 'team2') {
            team2CalculatedScoreValue += (player.goalsScored || 0);
            team1CalculatedScoreValue += (player.ownGoalsScored || 0);
        }
    });

    summaryDisplayTeam1Name.textContent = team1Name;
    summaryDisplayTeam1CalculatedScore.textContent = team1CalculatedScoreValue;
    summaryDisplayTeam2Name.textContent = team2Name;
    summaryDisplayTeam2CalculatedScore.textContent = team2CalculatedScoreValue;
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
        team2_score: team2ScoreInput.value
    };
    zip.file("game_details.csv", convertToCSV([gameSetupData], Object.keys(gameSetupData)));

    const detailedGoalsData = [];
    players.forEach(player => {
        if ((player.goalsScored || 0) > 0 || (player.ownGoalsScored || 0) > 0) {
            detailedGoalsData.push({
                player_id: player.id,
                player_name: player.name,
                player_team_identifier: player.team,
                player_team_name: player.team === 'team1' ? (team1NameInput.value.trim() || "Team A") : (team2NameInput.value.trim() || "Team B"),
                goals_for_own_team: player.goalsScored || 0,
                own_goals_for_opponent: player.ownGoalsScored || 0
            });
        }
    });
    if (detailedGoalsData.length > 0) {
        zip.file("goalscorers.csv", convertToCSV(detailedGoalsData, ["player_id", "player_name", "player_team_identifier", "player_team_name", "goals_for_own_team", "own_goals_for_opponent"]));
    } else {
        zip.file("goalscorers.csv", "No specific goal or own goal details recorded for any player.");
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
        return {
            player_id: player.id,
            player_name: player.name,
            team_identifier: player.team,
            team_name: player.team === 'team1' ? (team1NameInput.value.trim() || "Team A") : (team2NameInput.value.trim() || "Team B"),
            phone_number: player.phoneNumber || "",
            video_360_filename: uniqueVideoFilenameInZip
        };
    });
    zip.file("players.csv", convertToCSV(playersCsvData, ["player_id", "player_name", "team_identifier", "team_name", "phone_number", "video_360_filename"]));

    if (!videosAddedToFolder && videosFolder && Object.keys(videosFolder.files).length === 0) {
        videosFolder.file("no_videos_uploaded.txt", "No 360 videos were uploaded for players.");
    }

    zip.file("game_match_video_status.txt", "Game match video upload feature is not available in this version.");


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
    singlePlayerPhoneInput = document.getElementById('single-player-phone');
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
    downloadBtn = document.getElementById('download-btn');

    // New Goal Scorer UI Elements
    detailedGoalScorersContainer = document.getElementById('detailed-goal-scorers-container');
    summaryDisplayTeam1Name = document.getElementById('summary-display-team1-name');
    summaryDisplayTeam1CalculatedScore = document.getElementById('summary-display-team1-calculated-score');
    summaryDisplayTeam2Name = document.getElementById('summary-display-team2-name');
    summaryDisplayTeam2CalculatedScore = document.getElementById('summary-display-team2-calculated-score');

    initializeTabs();
    initializeGameSetup();
    initializePlayerSetup();
    initializeDetailedGoalInputs();
    initializeDownload();
});