document.addEventListener('DOMContentLoaded', () => {
    const boardElement = document.getElementById('baduk-board');
    const boardSizeSelect = document.getElementById('board-size');
    const aiLevelSelect = document.getElementById('ai-level');
    const startGameButton = document.getElementById('start-game');
    const currentPlayerDisplay = document.getElementById('current-player');
    const blackCapturesDisplay = document.getElementById('black-captures');
    const whiteCapturesDisplay = document.getElementById('white-captures');
    const popup = document.getElementById('popup');
    const popupMessage = document.getElementById('popup-message');
    const popupCloseButton = document.getElementById('popup-close');

    const PLAYER_BLACK = 1;
    const PLAYER_WHITE = 2;
    const EMPTY = 0;

    let boardSize = parseInt(boardSizeSelect.value);
    let aiLevel = aiLevelSelect.value;
    let board = []; // 바둑판 상태 (0: 빈칸, 1: 흑돌, 2: 백돌)
    let currentPlayer = PLAYER_BLACK;
    let blackCaptures = 0;
    let whiteCaptures = 0;
    let gameHistory = []; // 패(ko) 규칙을 위한 간단한 기록
    let gameOver = false;
    let playerIsHuman = true; // 현재 턴이 사람인지 AI인지

    function initGame() {
        boardSize = parseInt(boardSizeSelect.value);
        aiLevel = aiLevelSelect.value;
        currentPlayer = PLAYER_BLACK;
        blackCaptures = 0;
        whiteCaptures = 0;
        gameOver = false;
        playerIsHuman = true; // 흑(플레이어)이 항상 먼저 시작

        board = Array(boardSize).fill(null).map(() => Array(boardSize).fill(EMPTY));
        gameHistory = []; // 게임 기록 초기화

        drawBoard();
        updateGameInfo();
        if (popup) { // popup 요소가 존재하는지 확인
            popup.classList.add('popup-hidden');
        }
    }

    function drawBoard() {
        if (!boardElement) return; // boardElement가 없으면 함수 종료

        boardElement.innerHTML = ''; // 기존 보드 지우기
        // 바둑판 선은 (boardSize - 1)개의 간격으로 이루어짐
        boardElement.style.gridTemplateColumns = `repeat(${boardSize -1}, 1fr)`;
        boardElement.style.gridTemplateRows = `repeat(${boardSize - 1}, 1fr)`;

        const cellSize = boardElement.clientWidth / (boardSize - 1);

        // 선 그리기
        // 가로선
        for (let i = 0; i < boardSize; i++) {
            const line = document.createElement('div');
            line.className = 'line horizontal-line';
            line.style.top = `${i * cellSize}px`;
            // 선이 교차점 위에 그려지도록 하기 위해, 높이는 1px 또는 2px로 설정
            // 실제 교차점은 boardSize x boardSize개. 선은 boardSize개
            line.style.height = (i === 0 || i === boardSize - 1) ? '2px' : '1px';
             if (i === boardSize -1) line.style.top = `${i * cellSize - parseFloat(line.style.height)}px`; // 마지막 선 위치 보정
            boardElement.appendChild(line);
        }
        // 세로선
        for (let i = 0; i < boardSize; i++) {
            const line = document.createElement('div');
            line.className = 'line vertical-line';
            line.style.left = `${i * cellSize}px`;
            line.style.width = (i === 0 || i === boardSize - 1) ? '2px' : '1px';
            if (i === boardSize -1) line.style.left = `${i * cellSize - parseFloat(line.style.width)}px`; // 마지막 선 위치 보정
            boardElement.appendChild(line);
        }

        // 교차점(돌 놓는 위치) 및 돌 시각화
        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                // 돌을 표시할 컨테이너 (실제 클릭 대상)
                const stoneContainer = document.createElement('div');
                stoneContainer.className = 'stone-container';
                // stone-container는 교차점에 위치해야 함
                stoneContainer.style.left = `${c * cellSize}px`;
                stoneContainer.style.top = `${r * cellSize}px`;
                // stone-container의 크기는 CSS에서 %로 설정되어 있으므로 여기서는 설정 불필요

                if (board[r][c] === PLAYER_BLACK) {
                    stoneContainer.classList.add('black');
                } else if (board[r][c] === PLAYER_WHITE) {
                    stoneContainer.classList.add('white');
                }

                stoneContainer.dataset.r = r; // 데이터 속성으로 행 정보 저장
                stoneContainer.dataset.c = c; // 데이터 속성으로 열 정보 저장
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
            // 크기는 CSS에서 처리
            boardElement.appendChild(star);
        });
    }

    function getStarPoints(size) {
        if (size < 7) return []; // 7줄 미만은 화점 없음 (일반적)
        let points = [];
        const edgeOffset = (size >= 15) ? 3 : (size >=9 ? 2 : (size === 7 ? 1 : -1) ); // 19줄:3, 13줄:3, 9줄:2, 7줄:1 (중앙에서)
                                                                                    // 보통 바둑판 가장자리에서 4번째 줄에 화점. (index 3)

        if (edgeOffset === -1) return []; // 5x5 이하

        const center = Math.floor((size - 1) / 2);

        // 귀 화점
        points.push({ r: edgeOffset, c: edgeOffset });
        points.push({ r: edgeOffset, c: size - 1 - edgeOffset });
        points.push({ r: size - 1 - edgeOffset, c: edgeOffset });
        points.push({ r: size - 1 - edgeOffset, c: size - 1 - edgeOffset });

        if (size > 9 && size % 2 !== 0) { // 9줄보다 크고 홀수 판 (13, 19)
            // 변 중앙 화점
            points.push({ r: edgeOffset, c: center });
            points.push({ r: center, c: edgeOffset });
            points.push({ r: size - 1 - edgeOffset, c: center });
            points.push({ r: center, c: size - 1 - edgeOffset });
        }

        if (size % 2 !== 0) { // 홀수 판이면 천원
            points.push({ r: center, c: center });
        }
        // 중복 제거 및 유효 범위 확인 (실제로는 중복될 일 잘 없음)
        const uniquePoints = Array.from(new Set(points.map(JSON.stringify))).map(JSON.parse);
        return uniquePoints.filter(p => p.r >=0 && p.r < size && p.c >=0 && p.c < size);
    }


    function handleCellClick(r, c) {
        if (gameOver || board[r][c] !== EMPTY || !playerIsHuman) return;

        // 임시로 돌을 놓아봄
        const tempBoard = board.map(row => [...row]);
        tempBoard[r][c] = currentPlayer;

        let capturesMadeByThisMove = 0;
        const opponent = (currentPlayer === PLAYER_BLACK) ? PLAYER_WHITE : PLAYER_BLACK;

        // 1. 이 수로 상대 돌을 잡는지 확인
        [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dr, dc]) => {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < boardSize && nc >= 0 && nc < boardSize && tempBoard[nr][nc] === opponent) {
                const group = getGroup(nr, nc, tempBoard, opponent); // 임시 보드에서 그룹 확인
                if (group.liberties === 0) {
                    capturesMadeByThisMove += group.stones.length;
                }
            }
        });

        // 2. 이 수를 둠으로써 자신의 돌 그룹이 잡히는지 (자살수) 확인
        const ownGroup = getGroup(r, c, tempBoard, currentPlayer); // 임시 보드에서 그룹 확인
        if (ownGroup.liberties === 0 && capturesMadeByThisMove === 0) {
            showTemporaryMessage("자살수는 둘 수 없습니다.");
            return;
        }
        
        // 패(Ko) 규칙 확인 (단순화된 버전: 바로 이전 상태로 돌아가는 것만 방지)
        // 돌을 놓고, 잡을 것 잡고, 그 결과가 이전 gameHistory의 마지막 상태와 같은지 비교
        let boardAfterMoveAndCapture = board.map(row => [...row]);
        boardAfterMoveAndCapture[r][c] = currentPlayer;
        applyCapturesToBoard(r, c, currentPlayer, boardAfterMoveAndCapture); // 이 함수는 boardAfterMoveAndCapture를 직접 변경

        if (gameHistory.length > 0 && JSON.stringify(boardAfterMoveAndCapture) === gameHistory[gameHistory.length - 1]) {
             showTemporaryMessage("패 규칙에 위반됩니다.");
             return;
        }

        // 실제 보드에 적용
        gameHistory.push(JSON.stringify(board)); // 현재 '두기 전' 상태 저장

        board[r][c] = currentPlayer;
        const capturedStonesCount = checkAndRemoveCaptures(r, c, currentPlayer); // 실제 보드에서 처리

        if (currentPlayer === PLAYER_BLACK) {
            blackCaptures += capturedStonesCount;
        } else {
            whiteCaptures += capturedStonesCount;
        }

        drawBoard();
        updateGameInfo();

        if (checkWinCondition()) return;

        currentPlayer = (currentPlayer === PLAYER_BLACK) ? PLAYER_WHITE : PLAYER_BLACK;
        playerIsHuman = false;
        updateGameInfo();
        
        setTimeout(aiMove, 500);
    }
    
    function showTemporaryMessage(message) {
        // 기존 메시지가 있으면 제거
        const existingMsg = document.getElementById('temp-message-div');
        if (existingMsg) {
            document.body.removeChild(existingMsg);
        }

        const tempMsgDiv = document.createElement('div');
        tempMsgDiv.id = 'temp-message-div'; // ID 추가
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
        tempMsgDiv.style.fontSize = '0.9em'; // 모바일 화면 고려
        document.body.appendChild(tempMsgDiv);
        setTimeout(() => {
            if (document.body.contains(tempMsgDiv)) { // 아직 body에 있다면 제거
                 document.body.removeChild(tempMsgDiv);
            }
        }, 2000);
    }

    function getGroup(r_start, c_start, currentBoard, player) {
        const group = { stones: [], liberties: 0 };
        if (r_start < 0 || r_start >= boardSize || c_start < 0 || c_start >= boardSize || currentBoard[r_start][c_start] !== player) {
            return group; // 시작점이 유효하지 않거나 해당 플레이어의 돌이 아니면 빈 그룹 반환
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
    
    // 주어진 보드(targetBoard)를 직접 수정하여 잡힌 돌을 제거하는 함수
    function applyCapturesToBoard(r_placed, c_placed, player, targetBoard) {
        const opponent = (player === PLAYER_BLACK) ? PLAYER_WHITE : PLAYER_BLACK;
        let totalCapturedInSim = 0;

        [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dr, dc]) => {
            const nr = r_placed + dr;
            const nc = c_placed + dc;

            if (nr >= 0 && nr < boardSize && nc >= 0 && nc < boardSize && targetBoard[nr][nc] === opponent) {
                // getGroup은 targetBoard를 참조해야 함
                const group = getGroup(nr, nc, targetBoard, opponent);
                if (group.liberties === 0) {
                    group.stones.forEach(stone => {
                        targetBoard[stone.r][stone.c] = EMPTY; // targetBoard를 직접 수정
                        totalCapturedInSim++;
                    });
                }
            }
        });
        return totalCapturedInSim; // 시뮬레이션에서 잡힌 돌 수 반환 (필요하다면 사용)
    }


    function checkAndRemoveCaptures(r_placed, c_placed, player) {
        let totalCaptured = 0;
        const opponent = (player === PLAYER_BLACK) ? PLAYER_WHITE : PLAYER_BLACK;

        // 방금 둔 돌 주변의 상대 돌 그룹 확인
        [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dr, dc]) => {
            const nr = r_placed + dr;
            const nc = c_placed + dc;

            if (nr >= 0 && nr < boardSize && nc >= 0 && nc < boardSize && board[nr][nc] === opponent) {
                const group = getGroup(nr, nc, board, opponent); // 현재 'board' 사용
                if (group.liberties === 0) {
                    group.stones.forEach(stone => {
                        board[stone.r][stone.c] = EMPTY; // 'board' 직접 수정
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
                    // 임시로 AI 돌을 놓아본다
                    const tempBoard = board.map(row => [...row]);
                    tempBoard[r][c] = currentPlayer; // AI's color (현재 currentPlayer는 AI임)

                    let capturesByThisAiMove = 0;
                    const opponentForAi = (currentPlayer === PLAYER_BLACK) ? PLAYER_WHITE : PLAYER_BLACK;

                    // AI가 이 수로 상대 돌을 잡는지 확인
                    [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dr_b, dc_b]) => {
                        const nr_b = r + dr_b;
                        const nc_b = c + dc_b;
                        if (nr_b >= 0 && nr_b < boardSize && nc_b >= 0 && nc_b < boardSize && tempBoard[nr_b][nc_b] === opponentForAi) {
                            const group = getGroup(nr_b, nc_b, tempBoard, opponentForAi);
                            if (group.liberties === 0) capturesByThisAiMove += group.stones.length;
                        }
                    });
                    
                    const ownAiGroup = getGroup(r, c, tempBoard, currentPlayer);
                    if (ownAiGroup.liberties === 0 && capturesByThisAiMove === 0) {
                        continue; // 이 수는 자살수이므로 건너뜀
                    }

                    // 패 규칙 확인
                    let boardAfterAiMoveAndCapture = board.map(row => [...row]);
                    boardAfterAiMoveAndCapture[r][c] = currentPlayer;
                    applyCapturesToBoard(r, c, currentPlayer, boardAfterAiMoveAndCapture);
                    if (gameHistory.length > 0 && JSON.stringify(boardAfterAiMoveAndCapture) === gameHistory[gameHistory.length -1]) {
                         continue; // 패 규칙 위반
                    }

                    possibleMoves.push({ r, c, captures: 0, blocks: 0, strategicValue: 0 });
                }
            }
        }

        if (possibleMoves.length === 0) {
            endGame(currentPlayer === PLAYER_BLACK ? "백" : "흑", "AI가 둘 곳이 없어 상대방의 승리입니다!");
            playerIsHuman = true; // 다음 턴은 사람에게
            updateGameInfo();
            return;
        }

        if (aiLevel === 'easy') {
            bestMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
        } else { // medium or hard
            for (let move of possibleMoves) {
                const r = move.r;
                const c = move.c;
                
                // 1. AI가 이 수로 잡을 수 있는 돌 계산
                let tempBoardForAICapture = board.map(row => [...row]);
                tempBoardForAICapture[r][c] = currentPlayer;
                move.captures = countPotentialCapturesOnBoard(r, c, currentPlayer, tempBoardForAICapture);

                // 2. 플레이어가 다음 턴에 이 자리에 두면 잡을 수 있는 돌 계산 (AI가 막아야 할 위협)
                let tempBoardForPlayerThreat = board.map(row => [...row]);
                const humanPlayer = (currentPlayer === PLAYER_BLACK) ? PLAYER_WHITE : PLAYER_BLACK;
                // 여기에 플레이어가 둔다고 가정하면 플레이어는 humanPlayer.
                // 이때, 플레이어가 r,c에 둠으로써 잡을 수 있는 AI의 돌을 계산하는 것이 "blocks"의 의미.
                // 즉, AI가 r,c에 둠으로써 humanPlayer가 다음 턴에 r,c(는 이미 AI돌이므로 다른곳)에 두어
                // AI의 돌을 잡는 것을 막는 효과. 조금 더 복잡한 로직이 필요.
                // 여기서는 "만약 플레이어가 r,c에 두었을 때 잡을 수 있는 AI 돌의 수"로 단순화.
                // (AI가 이 자리를 선점함으로서 플레이어가 얻을 수 있었던 이득을 막는 효과)
                move.blocks = countPotentialCapturesOnBoard(r, c, humanPlayer, tempBoardForPlayerThreat);


                // 간단한 전략적 가치
                move.strategicValue = (boardSize / 2 - Math.abs(r - (boardSize-1)/2)) +
                                      (boardSize / 2 - Math.abs(c - (boardSize-1)/2));
                [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc])=>{
                    const nr = r+dr, nc = c+dc;
                    if(nr>=0 && nr<boardSize && nc>=0 && nc<boardSize && board[nr][nc] === currentPlayer){ // 현재 보드에서 자기돌과 연결
                        move.strategicValue += (aiLevel === 'hard' ? 2 : 1);
                    }
                    if(nr>=0 && nr<boardSize && nc>=0 && nc<boardSize && board[nr][nc] === ((currentPlayer === PLAYER_BLACK) ? PLAYER_WHITE : PLAYER_BLACK) ){ // 상대돌 근처
                        move.strategicValue += 0.5;
                    }
                });
            }

            possibleMoves.sort((a, b) => {
                if (b.captures !== a.captures) return b.captures - a.captures; // 1. 내가 많이 잡는 수
                if (b.blocks !== a.blocks) return b.blocks - a.blocks;         // 2. 상대가 많이 잡을 수 있는 곳 막는 수
                if (aiLevel === 'hard') {
                     if (b.strategicValue !== a.strategicValue) return b.strategicValue - a.strategicValue; // 3. 전략적 가치
                }
                return Math.random() - 0.5; // 동일하면 랜덤
            });
            bestMove = possibleMoves[0];
        }


        if (bestMove) {
            const { r, c } = bestMove;
            gameHistory.push(JSON.stringify(board)); // AI가 두기 전 상태 기록
            
            board[r][c] = currentPlayer;
            const capturedStonesCount = checkAndRemoveCaptures(r, c, currentPlayer);
            if (currentPlayer === PLAYER_BLACK) {
                blackCaptures += capturedStonesCount;
            } else {
                whiteCaptures += capturedStonesCount;
            }
            
            drawBoard();
            updateGameInfo();

            if (checkWinCondition()) {
                 playerIsHuman = true; // 게임 끝났으니 사람에게 제어권 (의미는 없지만)
                 return;
            }

            currentPlayer = (currentPlayer === PLAYER_BLACK) ? PLAYER_WHITE : PLAYER_BLACK;
            playerIsHuman = true; // AI 턴 끝, 사람 턴 시작
            updateGameInfo();

        } else {
             // AI가 둘 곳이 없는 희귀한 경우 (위에서 possibleMoves.length === 0 에서 걸릴 것)
            endGame(currentPlayer === PLAYER_BLACK ? "백" : "흑", "AI가 둘 곳이 없습니다. 상대방 승리!");
            playerIsHuman = true;
            updateGameInfo();
        }
    }
    
    // targetBoard에서 player가 (r_placed, c_placed)에 두었을 때 잡을 수 있는 상대 돌의 수
    function countPotentialCapturesOnBoard(r_placed, c_placed, player, targetBoard) {
        let potentialCaptures = 0;
        const opponent = (player === PLAYER_BLACK) ? PLAYER_WHITE : PLAYER_BLACK;
        
        // 먼저 targetBoard에 player의 돌을 놓는 것을 시뮬레이션 (주의: 이 함수는 targetBoard를 직접 바꾸지 않음)
        // 단, 이 함수는 이미 targetBoard가 (r_placed, c_placed)에 player의 돌이 놓인 상태라고 가정하고 호출될 수 있음.
        // 여기서는 r_placed, c_placed 주변의 opponent 돌 그룹을 확인.
        
        [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dr, dc]) => {
            const nr = r_placed + dr;
            const nc = c_placed + dc;

            if (nr >= 0 && nr < boardSize && nc >= 0 && nc < boardSize && targetBoard[nr][nc] === opponent) {
                // targetBoard[r_placed][c_placed]는 player의 돌이 있다고 가정하고 getGroup 호출
                // (getGroup은 현재 상태의 보드를 받으므로, 이미 player 돌이 놓여있는 tempBoardForAICapture 등을 전달해야 함)
                const group = getGroup(nr, nc, targetBoard, opponent);
                if (group.liberties === 0) {
                    potentialCaptures += group.stones.length;
                }
            }
        });
        return potentialCaptures;
    }


    function updateGameInfo() {
        if (!currentPlayerDisplay || !blackCapturesDisplay || !whiteCapturesDisplay) return;

        currentPlayerDisplay.textContent = currentPlayer === PLAYER_BLACK ? '흑' : '백';
        if (currentPlayer === PLAYER_BLACK) {
             currentPlayerDisplay.style.color = 'black';
        } else {
            currentPlayerDisplay.style.color = '#333'; // 백돌은 좀 더 진한 회색 글씨로
        }
        blackCapturesDisplay.textContent = blackCaptures;
        whiteCapturesDisplay.textContent = whiteCaptures;
    }

    function checkWinCondition() {
        const PASS_LIMIT = 2; // 연속 패 제한 (실제 게임에서는 보통 미구현)
        // 여기서는 잡은 돌 개수로만 판단
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
        for(let r=0; r<boardSize; r++) {
            for(let c=0; c<boardSize; c++) {
                if(board[r][c] === EMPTY) emptyCells++;
            }
        }
        if (emptyCells === 0) { // 모든 칸이 찼을 때
            if (blackCaptures > whiteCaptures) {
                endGame("흑", `모든 칸이 채워졌습니다. 흑 ${blackCaptures} vs 백 ${whiteCaptures} (따낸 돌) - 흑 승리!`);
            } else if (whiteCaptures > blackCaptures) {
                endGame("백", `모든 칸이 채워졌습니다. 백 ${whiteCaptures} vs 흑 ${blackCaptures} (따낸 돌) - 백 승리!`);
            } else {
                endGame("무승부", `모든 칸이 채워졌습니다. 흑 ${blackCaptures} vs 백 ${whiteCaptures} (따낸 돌) - 무승부!`);
            }
            return true;
        }
        return false;
    }

    function endGame(winner, message) {
        gameOver = true;
        if (popupMessage && popup) {
            popupMessage.textContent = message;
            popup.classList.remove('popup-hidden');
        } else {
            alert(message); // 팝업 요소가 없다면 alert 사용
        }
    }

    if (startGameButton) {
        startGameButton.addEventListener('click', initGame);
    }
    if (popupCloseButton && popup) {
        popupCloseButton.addEventListener('click', () => {
            popup.classList.add('popup-hidden');
            initGame(); // 팝업 닫고 새 게임 시작
        });
    }

    // 초기 게임 시작
    initGame();
    
    window.addEventListener('resize', () => {
        if (!gameOver && boardElement && board.length > 0) {
            drawBoard();
        }
    });
});
