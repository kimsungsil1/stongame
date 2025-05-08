document.addEventListener('DOMContentLoaded', () => {
    const boardElement = document.getElementById('baduk-board');
    const boardSizeSelect = document.getElementById('board-size');
    const aiLevelSelect = document.getElementById('ai-level');
    const startGameButton = document.getElementById('start-game');
    const currentPlayerDisplay = document.getElementById('current-player');
    const blackCapturesDisplay = document.getElementById('black-captures');
    const whiteCapturesDisplay = document.getElementById('white-captures');
    // const popup = document.getElementById('popup'); // 삭제
    // const popupMessage = document.getElementById('popup-message'); // 삭제
    // const popupCloseButton = document.getElementById('popup-close'); // 삭제

    const PLAYER_BLACK = 1;
    const PLAYER_WHITE = 2;
    const EMPTY = 0;

    let boardSize = parseInt(boardSizeSelect.value);
    let aiLevel = aiLevelSelect.value;
    let board = [];
    let currentPlayer = PLAYER_BLACK;
    let blackCaptures = 0;
    let whiteCaptures = 0;
    let gameHistory = [];
    let gameOver = false;
    let playerIsHuman = true;

    function initGame() {
        boardSize = parseInt(boardSizeSelect.value);
        aiLevel = aiLevelSelect.value;
        currentPlayer = PLAYER_BLACK;
        blackCaptures = 0;
        whiteCaptures = 0;
        gameOver = false;
        playerIsHuman = true;

        board = Array(boardSize).fill(null).map(() => Array(boardSize).fill(EMPTY));
        gameHistory = [];

        drawBoard();
        updateGameInfo();
        // if (popup) { // 삭제
        // popup.classList.add('popup-hidden'); // 삭제
        // }
    }

    function drawBoard() {
        if (!boardElement) return;

        boardElement.innerHTML = '';
        boardElement.style.gridTemplateColumns = `repeat(${boardSize -1}, 1fr)`;
        boardElement.style.gridTemplateRows = `repeat(${boardSize - 1}, 1fr)`;

        const cellSize = boardElement.clientWidth / (boardSize - 1);

        for (let i = 0; i < boardSize; i++) {
            const hLine = document.createElement('div');
            hLine.className = 'line horizontal-line';
            hLine.style.top = `${i * cellSize}px`;
            hLine.style.height = (i === 0 || i === boardSize - 1) ? '2px' : '1px';
            if (i === boardSize -1 && parseFloat(hLine.style.height) > 0) hLine.style.top = `${i * cellSize - parseFloat(hLine.style.height)}px`;
            boardElement.appendChild(hLine);

            const vLine = document.createElement('div');
            vLine.className = 'line vertical-line';
            vLine.style.left = `${i * cellSize}px`;
            vLine.style.width = (i === 0 || i === boardSize - 1) ? '2px' : '1px';
             if (i === boardSize -1 && parseFloat(vLine.style.width) > 0) vLine.style.left = `${i * cellSize - parseFloat(vLine.style.width)}px`;
            boardElement.appendChild(vLine);
        }

        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                const stoneContainer = document.createElement('div');
                stoneContainer.className = 'stone-container';
                stoneContainer.style.left = `${c * cellSize}px`;
                stoneContainer.style.top = `${r * cellSize}px`;

                if (board[r][c] === PLAYER_BLACK) {
                    stoneContainer.classList.add('black');
                } else if (board[r][c] === PLAYER_WHITE) {
                    stoneContainer.classList.add('white');
                }

                stoneContainer.dataset.r = r;
                stoneContainer.dataset.c = c;
                stoneContainer.addEventListener('click', () => handleCellClick(r, c));
                boardElement.appendChild(stoneContainer);
            }
        }
        drawStarPoints(cellSize);
    }

    function drawStarPoints(cellSize) {
        const starPointsData = getStarPoints(boardSize);
        starPointsData.forEach(point => {
            const star = document.createElement('div');
            star.className = 'star-point';
            star.style.left = `${point.c * cellSize}px`;
            star.style.top = `${point.r * cellSize}px`;
            boardElement.appendChild(star);
        });
    }

    function getStarPoints(size) {
        if (size < 7) return [];
        let points = [];
        const edgeOffset = (size >= 15) ? 3 : (size >=9 ? 2 : (size === 7 ? 1 : -1) );
        if (edgeOffset === -1) return [];

        const center = Math.floor((size - 1) / 2);

        points.push({ r: edgeOffset, c: edgeOffset });
        points.push({ r: edgeOffset, c: size - 1 - edgeOffset });
        points.push({ r: size - 1 - edgeOffset, c: edgeOffset });
        points.push({ r: size - 1 - edgeOffset, c: size - 1 - edgeOffset });

        if (size > 9 && size % 2 !== 0) {
            points.push({ r: edgeOffset, c: center });
            points.push({ r: center, c: edgeOffset });
            points.push({ r: size - 1 - edgeOffset, c: center });
            points.push({ r: center, c: size - 1 - edgeOffset });
        }
        if (size % 2 !== 0) {
            points.push({ r: center, c: center });
        }
        const uniquePoints = Array.from(new Set(points.map(JSON.stringify))).map(JSON.parse);
        return uniquePoints.filter(p => p.r >=0 && p.r < size && p.c >=0 && p.c < size);
    }

    function handleCellClick(r, c) {
        if (gameOver || board[r][c] !== EMPTY || !playerIsHuman) return;

        const tempBoard = board.map(row => [...row]);
        tempBoard[r][c] = currentPlayer;
        let capturesMadeByThisMove = 0;
        const opponent = (currentPlayer === PLAYER_BLACK) ? PLAYER_WHITE : PLAYER_BLACK;

        [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dr, dc]) => {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < boardSize && nc >= 0 && nc < boardSize && tempBoard[nr][nc] === opponent) {
                const group = getGroup(nr, nc, tempBoard, opponent);
                if (group.liberties === 0) capturesMadeByThisMove += group.stones.length;
            }
        });

        const ownGroup = getGroup(r, c, tempBoard, currentPlayer);
        if (ownGroup.liberties === 0 && capturesMadeByThisMove === 0) {
            showTemporaryMessage("자살수는 둘 수 없습니다.");
            return;
        }
        
        let boardAfterMoveAndCapture = board.map(row => [...row]);
        boardAfterMoveAndCapture[r][c] = currentPlayer;
        applyCapturesToBoard(r, c, currentPlayer, boardAfterMoveAndCapture);

        if (gameHistory.length > 0 && JSON.stringify(boardAfterMoveAndCapture) === gameHistory[gameHistory.length - 1]) {
             showTemporaryMessage("패 규칙에 위반됩니다.");
             return;
        }

        gameHistory.push(JSON.stringify(board));
        board[r][c] = currentPlayer;
        const capturedStonesCount = checkAndRemoveCaptures(r, c, currentPlayer);

        if (currentPlayer === PLAYER_BLACK) blackCaptures += capturedStonesCount;
        else whiteCaptures += capturedStonesCount;

        drawBoard();
        updateGameInfo();
        if (checkWinCondition()) return;

        currentPlayer = (currentPlayer === PLAYER_BLACK) ? PLAYER_WHITE : PLAYER_BLACK;
        playerIsHuman = false;
        updateGameInfo();
        setTimeout(aiMove, 500);
    }
    
    function showTemporaryMessage(message) {
        const existingMsg = document.getElementById('temp-message-div');
        if (existingMsg) document.body.removeChild(existingMsg);

        const tempMsgDiv = document.createElement('div');
        tempMsgDiv.id = 'temp-message-div';
        tempMsgDiv.textContent = message;
        tempMsgDiv.style.position = 'fixed';
        tempMsgDiv.style.bottom = '20px';
        tempMsgDiv.style.left = '50%';
        tempMsgDiv.style.transform = 'translateX(-50%)';
        tempMsgDiv.style.backgroundColor = 'rgba(0,0,0,0.7)';
        tempMsgDiv.style.color = 'white';
        tempMsgDiv.style.padding = '10px 20px';
        tempMsgDiv.style.borderRadius = '5px';
        tempMsgDiv.style.zIndex = '2000';
        tempMsgDiv.style.fontSize = '0.9em';
        document.body.appendChild(tempMsgDiv);
        setTimeout(() => {
            if (document.body.contains(tempMsgDiv)) document.body.removeChild(tempMsgDiv);
        }, 2000);
    }

    function getGroup(r_start, c_start, currentBoard, player) {
        const group = { stones: [], liberties: 0 };
        if (r_start < 0 || r_start >= boardSize || c_start < 0 || c_start >= boardSize || currentBoard[r_start][c_start] !== player) {
            return group;
        }
        const visitedStones = Array(boardSize).fill(null).map(() => Array(boardSize).fill(false));
        const libertyCoords = new Set();
        const q = [{r: r_start, c: c_start}];
        visitedStones[r_start][c_start] = true;
        group.stones.push({r: r_start, c: c_start});

        while (q.length > 0) {
            const curr = q.shift();
            [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dr, dc]) => {
                const nr = curr.r + dr;
                const nc = curr.c + dc;
                if (nr >= 0 && nr < boardSize && nc >= 0 && nc < boardSize) {
                    if (currentBoard[nr][nc] === EMPTY) {
                        if (!libertyCoords.has(`${nr},${nc}`)) {
                            group.liberties++;
                            libertyCoords.add(`${nr},${nc}`);
                        }
                    } else if (currentBoard[nr][nc] === player && !visitedStones[nr][nc]) {
                        visitedStones[nr][nc] = true;
                        group.stones.push({r: nr, c: nc});
                        q.push({r: nr, c: nc});
                    }
                }
            });
        }
        return group;
    }
    
    function applyCapturesToBoard(r_placed, c_placed, player, targetBoard) {
        const opponent = (player === PLAYER_BLACK) ? PLAYER_WHITE : PLAYER_BLACK;
        [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dr, dc]) => {
            const nr = r_placed + dr;
            const nc = c_placed + dc;
            if (nr >= 0 && nr < boardSize && nc >= 0 && nc < boardSize && targetBoard[nr][nc] === opponent) {
                const group = getGroup(nr, nc, targetBoard, opponent);
                if (group.liberties === 0) {
                    group.stones.forEach(stone => targetBoard[stone.r][stone.c] = EMPTY);
                }
            }
        });
    }

    function checkAndRemoveCaptures(r_placed, c_placed, player) {
        let totalCaptured = 0;
        const opponent = (player === PLAYER_BLACK) ? PLAYER_WHITE : PLAYER_BLACK;
        [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dr, dc]) => {
            const nr = r_placed + dr;
            const nc = c_placed + dc;
            if (nr >= 0 && nr < boardSize && nc >= 0 && nc < boardSize && board[nr][nc] === opponent) {
                const group = getGroup(nr, nc, board, opponent);
                if (group.liberties === 0) {
                    group.stones.forEach(stone => {
                        board[stone.r][stone.c] = EMPTY;
                        totalCaptured++;
                    });
                }
            }
        });
        return totalCaptured;
    }
    
    function aiMove() {
        if (gameOver) return;
        let bestMove = null;
        const possibleMoves = [];

        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                if (board[r][c] === EMPTY) {
                    const tempBoard = board.map(row => [...row]);
                    tempBoard[r][c] = currentPlayer;
                    let capturesByThisAiMove = 0;
                    const opponentForAi = (currentPlayer === PLAYER_BLACK) ? PLAYER_WHITE : PLAYER_BLACK;
                    [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dr_b, dc_b]) => {
                        const nr_b = r + dr_b;
                        const nc_b = c + dc_b;
                        if (nr_b >= 0 && nr_b < boardSize && nc_b >= 0 && nc_b < boardSize && tempBoard[nr_b][nc_b] === opponentForAi) {
                            const group = getGroup(nr_b, nc_b, tempBoard, opponentForAi);
                            if (group.liberties === 0) capturesByThisAiMove += group.stones.length;
                        }
                    });
                    const ownAiGroup = getGroup(r, c, tempBoard, currentPlayer);
                    if (ownAiGroup.liberties === 0 && capturesByThisAiMove === 0) continue;

                    let boardAfterAiMoveAndCapture = board.map(row => [...row]);
                    boardAfterAiMoveAndCapture[r][c] = currentPlayer;
                    applyCapturesToBoard(r, c, currentPlayer, boardAfterAiMoveAndCapture);
                    if (gameHistory.length > 0 && JSON.stringify(boardAfterAiMoveAndCapture) === gameHistory[gameHistory.length -1]) continue;
                    
                    possibleMoves.push({ r, c, captures: 0, blocks: 0, strategicValue: 0 });
                }
            }
        }

        if (possibleMoves.length === 0) {
            endGame(currentPlayer === PLAYER_BLACK ? "백" : "흑", "AI가 둘 곳이 없어 상대방의 승리입니다!");
            playerIsHuman = true; updateGameInfo(); return;
        }

        if (aiLevel === 'easy' || possibleMoves.length === 1) {
            bestMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
        } else {
            for (let move of possibleMoves) {
                const r = move.r; const c = move.c;
                let tempBoardForAICapture = board.map(row => [...row]);
                tempBoardForAICapture[r][c] = currentPlayer;
                move.captures = countPotentialCapturesOnBoard(r, c, currentPlayer, tempBoardForAICapture);

                let tempBoardForPlayerThreat = board.map(row => [...row]);
                // player가 r,c에 둔다면 (AI가 이 수를 안뒀을때) 어떤 이득이 있는지
                // 이 부분은 AI가 r,c에 둠으로써 막는 효과를 대변
                const humanPlayer = (currentPlayer === PLAYER_BLACK) ? PLAYER_WHITE : PLAYER_BLACK;
                tempBoardForPlayerThreat[r][c] = humanPlayer; // 만약 플레이어가 여기 뒀다면
                move.blocks = countPotentialCapturesOnBoard(r, c, humanPlayer, tempBoardForPlayerThreat);


                move.strategicValue = (boardSize / 2 - Math.abs(r - (boardSize-1)/2)) + (boardSize / 2 - Math.abs(c - (boardSize-1)/2));
                [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc])=>{
                    const nr = r+dr, nc = c+dc;
                    if(nr>=0 && nr<boardSize && nc>=0 && nc<boardSize && board[nr][nc] === currentPlayer) move.strategicValue += (aiLevel === 'hard' ? 2 : 1);
                    if(nr>=0 && nr<boardSize && nc>=0 && nc<boardSize && board[nr][nc] === humanPlayer ) move.strategicValue += 0.5;
                });
            }
            possibleMoves.sort((a, b) => {
                if (b.captures !== a.captures) return b.captures - a.captures;
                if (b.blocks !== a.blocks) return b.blocks - a.blocks;
                if (aiLevel === 'hard' && b.strategicValue !== a.strategicValue) return b.strategicValue - a.strategicValue;
                return Math.random() - 0.5;
            });
            bestMove = possibleMoves[0];
        }

        if (bestMove) {
            const { r, c } = bestMove;
            gameHistory.push(JSON.stringify(board));
            board[r][c] = currentPlayer;
            const capturedStonesCount = checkAndRemoveCaptures(r, c, currentPlayer);
            if (currentPlayer === PLAYER_BLACK) blackCaptures += capturedStonesCount;
            else whiteCaptures += capturedStonesCount;
            
            drawBoard(); updateGameInfo();
            if (checkWinCondition()) { playerIsHuman = true; return; }

            currentPlayer = (currentPlayer === PLAYER_BLACK) ? PLAYER_WHITE : PLAYER_BLACK;
            playerIsHuman = true; updateGameInfo();
        } else {
            endGame(currentPlayer === PLAYER_BLACK ? "백" : "흑", "AI가 둘 곳이 없습니다. 상대방 승리!");
            playerIsHuman = true; updateGameInfo();
        }
    }
    
    function countPotentialCapturesOnBoard(r_placed, c_placed, player, targetBoard) {
        let potentialCaptures = 0;
        const opponent = (player === PLAYER_BLACK) ? PLAYER_WHITE : PLAYER_BLACK;
        [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dr, dc]) => {
            const nr = r_placed + dr; const nc = c_placed + dc;
            if (nr >= 0 && nr < boardSize && nc >= 0 && nc < boardSize && targetBoard[nr][nc] === opponent) {
                // targetBoard는 이미 (r_placed, c_placed)에 player의 돌이 놓인 상태라고 가정
                const group = getGroup(nr, nc, targetBoard, opponent);
                if (group.liberties === 0) potentialCaptures += group.stones.length;
            }
        });
        return potentialCaptures;
    }

    function updateGameInfo() {
        if (!currentPlayerDisplay || !blackCapturesDisplay || !whiteCapturesDisplay) return;
        currentPlayerDisplay.textContent = currentPlayer === PLAYER_BLACK ? '흑' : '백';
        currentPlayerDisplay.style.color = currentPlayer === PLAYER_BLACK ? 'black' : '#333';
        blackCapturesDisplay.textContent = blackCaptures;
        whiteCapturesDisplay.textContent = whiteCaptures;
    }

    function checkWinCondition() {
        const WINSTONE_THRESHOLD = Math.max(5, Math.floor(boardSize*boardSize / 8)); 
        if (blackCaptures >= WINSTONE_THRESHOLD) {
            endGame("흑", `흑이 돌 ${blackCaptures}개를 잡아 승리했습니다!`);
            return true;
        }
        if (whiteCaptures >= WINSTONE_THRESHOLD) {
            endGame("백", `백이 돌 ${whiteCaptures}개를 잡아 승리했습니다!`);
            return true;
        }
        let emptyCells = 0;
        for(let r=0; r<boardSize; r++) for(let c=0; c<boardSize; c++) if(board[r][c] === EMPTY) emptyCells++;
        
        if (emptyCells === 0) {
            if (blackCaptures > whiteCaptures) endGame("흑", `모든 칸이 채워졌습니다. 흑 ${blackCaptures} vs 백 ${whiteCaptures} - 흑 승리!`);
            else if (whiteCaptures > blackCaptures) endGame("백", `모든 칸이 채워졌습니다. 백 ${whiteCaptures} vs 흑 ${blackCaptures} - 백 승리!`);
            else endGame("무승부", `모든 칸이 채워졌습니다. 흑 ${blackCaptures} vs 백 ${whiteCaptures} - 무승부!`);
            return true;
        }
        return false;
    }

    function endGame(winner, message) {
        gameOver = true;
        alert(message); // 팝업 대신 alert 사용
        initGame();     // alert 창 닫으면 새 게임 시작
    }

    if (startGameButton) {
        startGameButton.addEventListener('click', initGame);
    }
    // if (popupCloseButton && popup) { // 삭제
    //     popupCloseButton.addEventListener('click', () => { // 삭제
    //         popup.classList.add('popup-hidden'); // 삭제
    //         initGame(); // 삭제
    //     }); // 삭제
    // }

    initGame();
    
    window.addEventListener('resize', () => {
        if (!gameOver && boardElement && board.length > 0) {
            drawBoard();
        }
    });
});
