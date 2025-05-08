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
    let gameHistory = []; // 패(ko) 규칙을 위한 간단한 기록 (optional)
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
        popup.classList.add('popup-hidden');
    }

    function drawBoard() {
        boardElement.innerHTML = ''; // 기존 보드 지우기
        boardElement.style.gridTemplateColumns = `repeat(${boardSize -1}, 1fr)`;
        boardElement.style.gridTemplateRows = `repeat(${boardSize - 1}, 1fr)`;

        const cellSize = boardElement.clientWidth / (boardSize - 1); // 셀(선과 선 사이 공간) 크기

        // 선 그리기 (가상 요소 대신 div로 명시적 생성)
        // 가로선
        for (let i = 0; i < boardSize; i++) {
            const line = document.createElement('div');
            line.className = 'line horizontal-line';
            line.style.top = `${i * cellSize - (i === boardSize -1 ? 1 : 0)}px`; // 마지막 선 두께 보정
            line.style.height = '1px';
             if (i === 0 || i === boardSize -1) line.style.height = '2px'; // 외곽선 두껍게
            boardElement.appendChild(line);
        }
        // 세로선
        for (let i = 0; i < boardSize; i++) {
            const line = document.createElement('div');
            line.className = 'line vertical-line';
            line.style.left = `${i * cellSize - (i === boardSize -1 ? 1 : 0)}px`;
            line.style.width = '1px';
            if (i === 0 || i === boardSize -1) line.style.width = '2px'; // 외곽선 두껍게
            boardElement.appendChild(line);
        }


        // 교차점(돌 놓는 위치) 생성
        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                // cell은 실제로 선들의 교차점을 나타내므로, boardSize x boardSize 개수
                // stone-container를 이 cell에 직접 넣는 대신, 절대 위치로 배치
                cell.dataset.r = r;
                cell.dataset.c = c;

                // 교차점에 stone-container (돌 모양) 배치
                const stoneContainer = document.createElement('div');
                stoneContainer.className = 'stone-container';
                stoneContainer.style.left = `${c * cellSize}px`;
                stoneContainer.style.top = `${r * cellSize}px`;
                // stoneContainer.style.width = `${cellSize * 0.8}px`; // CSS에서 %로 처리
                // stoneContainer.style.height = `${cellSize * 0.8}px`;

                if (board[r][c] === PLAYER_BLACK) {
                    stoneContainer.classList.add('black');
                } else if (board[r][c] === PLAYER_WHITE) {
                    stoneContainer.classList.add('white');
                }
                // 클릭 이벤트는 stoneContainer에 할당 (실제 돌이 놓이는 시각적 요소)
                stoneContainer.addEventListener('click', () => handleCellClick(r, c));
                boardElement.appendChild(stoneContainer);
            }
        }
        drawStarPoints(cellSize);
    }

    function drawStarPoints(cellSize) {
        const starPoints = getStarPoints(boardSize);
        starPoints.forEach(point => {
            const star = document.createElement('div');
            star.className = 'star-point';
            star.style.left = `${point.c * cellSize}px`;
            star.style.top = `${point.r * cellSize}px`;
            // star.style.width = `${Math.max(2, cellSize * 0.08)}px`; // CSS에서 처리
            // star.style.height = `${Math.max(2, cellSize * 0.08)}px`;
            boardElement.appendChild(star);
        });
    }

    function getStarPoints(size) {
        if (size <= 7) return [];
        const edge = size >= 13 ? 3 : 2; // 가장자리에서 떨어진 거리
        const middle = Math.floor((size - 1) / 2);
        let points = [
            { r: edge, c: edge },
            { r: edge, c: size - 1 - edge },
            { r: size - 1 - edge, c: edge },
            { r: size - 1 - edge, c: size - 1 - edge },
        ];
        if (size % 2 !== 0) { // 홀수판
            points.push({ r: middle, c: middle }); // 천원
            if (size > 9) { // 9줄보다 클 때 변 중앙 화점
                 points.push({ r: edge, c: middle });
                 points.push({ r: middle, c: edge });
                 points.push({ r: size - 1 - edge, c: middle });
                 points.push({ r: middle, c: size - 1 - edge });
            }
        }
        return points.filter(p => p.r >=0 && p.r < size && p.c >=0 && p.c < size);
    }


    function handleCellClick(r, c) {
        if (gameOver || board[r][c] !== EMPTY || !playerIsHuman) return;

        if (!isValidMove(r, c, currentPlayer)) {
            // 간단한 자살수 방지 (상대 돌을 따내는 경우는 허용해야 함)
            // 임시로 돌을 놓아보고, 그 돌이 바로 잡히는지 확인하고,
            // 동시에 상대 돌을 잡는 경우가 아니라면 자살수로 판단.
            const tempBoard = board.map(row => [...row]);
            tempBoard[r][c] = currentPlayer;
            
            let capturesMade = false;
            const opponent = (currentPlayer === PLAYER_BLACK) ? PLAYER_WHITE : PLAYER_BLACK;
            // 주변 상대돌 체크해서 잡히는지 확인
            [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dr, dc]) => {
                const nr = r + dr;
                const nc = c + dc;
                if (nr >= 0 && nr < boardSize && nc >= 0 && nc < boardSize && tempBoard[nr][nc] === opponent) {
                    const group = getGroup(nr, nc, tempBoard, opponent);
                    if (group.liberties === 0) {
                        capturesMade = true;
                    }
                }
            });

            const ownGroup = getGroup(r, c, tempBoard, currentPlayer);
            if (ownGroup.liberties === 0 && !capturesMade) {
                console.log("자살수입니다.");
                showTemporaryMessage("자살수는 둘 수 없습니다.");
                return;
            }
        }
        
        // Ko Rule (Simplified): 이전 보드 상태와 동일하면 안됨
        const currentBoardString = JSON.stringify(board);
        const nextBoardState = board.map(row => [...row]);
        nextBoardState[r][c] = currentPlayer;
        // (돌을 놓은 후) 따내기 로직을 포함한 후의 보드 상태를 비교해야 정확하나, 여기선 단순화.
        // let tempNextBoardForKo = applyCaptures(r,c, currentPlayer, JSON.parse(JSON.stringify(nextBoardState)));
        // if (gameHistory.includes(JSON.stringify(tempNextBoardForKo))) {
        //     console.log("패 규칙 위반입니다.");
        //     showTemporaryMessage("패 규칙에 위반됩니다.");
        //     return;
        // }


        board[r][c] = currentPlayer;
        gameHistory.push(currentBoardString); // 현재 '두기 전' 상태 저장

        const capturedStones = checkAndRemoveCaptures(r, c, currentPlayer);
        if (currentPlayer === PLAYER_BLACK) {
            blackCaptures += capturedStones;
        } else {
            whiteCaptures += capturedStones;
        }

        // 방금 둔 돌이 자살수인지 한번 더 체크 (상대돌을 따냈다면 자살수가 아님)
        if (capturedStones === 0) {
            const ownGroup = getGroup(r, c, board, currentPlayer);
            if (ownGroup.liberties === 0) {
                board[r][c] = EMPTY; // 자살수 되돌리기
                gameHistory.pop(); // 기록에서도 제거
                console.log("결과적으로 자살수가 되어 되돌립니다.");
                showTemporaryMessage("둘 수 없는 자리입니다 (자충).");
                return; // ход отменяется
            }
        }


        drawBoard(); // 돌을 그린 후
        updateGameInfo();

        if (checkWinCondition()) return;

        currentPlayer = (currentPlayer === PLAYER_BLACK) ? PLAYER_WHITE : PLAYER_BLACK;
        playerIsHuman = false;
        updateGameInfo(); // AI 턴으로 넘어가기 전 표시 업데이트
        
        // AI 턴
        setTimeout(aiMove, 500);
    }
    
    function showTemporaryMessage(message) {
        const tempMsgDiv = document.createElement('div');
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
        document.body.appendChild(tempMsgDiv);
        setTimeout(() => {
            document.body.removeChild(tempMsgDiv);
        }, 2000);
    }


    function isValidMove(r, c, player) {
        if (board[r][c] !== EMPTY) return false;
        // 여기에 더 복잡한 유효성 검사 (예: 패) 추가 가능
        return true;
    }

    function getGroup(r, c, currentBoard, player) {
        const group = { stones: [], liberties: 0 };
        const visited = Array(boardSize).fill(null).map(() => Array(boardSize).fill(false));
        const libertyCoords = new Set(); // 중복 방지

        const q = [{r, c}];
        visited[r][c] = true;
        group.stones.push({r, c});

        while (q.length > 0) {
            const curr = q.shift();
            [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dr, dc]) => {
                const nr = curr.r + dr;
                const nc = curr.c + dc;

                if (nr >= 0 && nr < boardSize && nc >= 0 && nc < boardSize) {
                    if (currentBoard[nr][nc] === EMPTY && !libertyCoords.has(`${nr},${nc}`)) {
                        group.liberties++;
                        libertyCoords.add(`${nr},${nc}`);
                    } else if (currentBoard[nr][nc] === player && !visited[nr][nc]) {
                        visited[nr][nc] = true;
                        group.stones.push({r: nr, c: nc});
                        q.push({r: nr, c: nc});
                    }
                }
            });
        }
        return group;
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
    
    function applyCaptures(r_placed, c_placed, player, targetBoard) {
        // This function simulates captures on a given board state (targetBoard)
        // without modifying the main game board. Used for Ko rule check primarily.
        const opponent = (player === PLAYER_BLACK) ? PLAYER_WHITE : PLAYER_BLACK;
        let capturedInSim = 0;

        [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dr, dc]) => {
            const nr = r_placed + dr;
            const nc = c_placed + dc;

            if (nr >= 0 && nr < boardSize && nc >= 0 && nc < boardSize && targetBoard[nr][nc] === opponent) {
                const group = getGroup(nr, nc, targetBoard, opponent); // Use targetBoard here
                if (group.liberties === 0) {
                    group.stones.forEach(stone => {
                        targetBoard[stone.r][stone.c] = EMPTY;
                        capturedInSim++;
                    });
                }
            }
        });
        // Also check if the placed stone itself is part of a group with 0 liberties (suicide)
        // (This part of Ko check can be complex if the suicide move itself makes a capture)
        // For simplified Ko, we might only check if the board state repeats *after* captures.
        return targetBoard;
    }


    function aiMove() {
        if (gameOver) return;
        playerIsHuman = true; // AI가 수를 둔 후에는 다시 사람 턴으로

        let bestMove = null;
        let maxCaptures = -1; // AI가 잡을 수 있는 돌
        let maxPlayerThreatCaptures = -1; // AI가 막아야 하는 플레이어의 위협

        // 1. AI가 이길 수 있는 수 (상대 돌 많이 잡는 수)
        // 2. 플레이어가 다음 턴에 많이 잡는 것을 막는 수
        // 3. 랜덤 수 (초급) 또는 좀 더 나은 위치 (중급/고급)

        const possibleMoves = [];
        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                if (board[r][c] === EMPTY) {
                    // 임시로 AI 돌을 놓아본다
                    const tempBoard = board.map(row => [...row]);
                    tempBoard[r][c] = currentPlayer; // AI's color

                    // 자살수인지 확인 (AI도 자살수는 피해야 함)
                    let capturesByThisAiMove = 0;
                    const opponentForAi = (currentPlayer === PLAYER_BLACK) ? PLAYER_WHITE : PLAYER_BLACK;
                    [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dr, dc]) => {
                        const nr = r + dr;
                        const nc = c + dc;
                        if (nr >= 0 && nr < boardSize && nc >= 0 && nc < boardSize && tempBoard[nr][nc] === opponentForAi) {
                            const group = getGroup(nr, nc, tempBoard, opponentForAi);
                            if (group.liberties === 0) capturesByThisAiMove += group.stones.length;
                        }
                    });
                    
                    const ownAiGroup = getGroup(r, c, tempBoard, currentPlayer);
                    if (ownAiGroup.liberties === 0 && capturesByThisAiMove === 0) {
                        continue; // 이 수는 자살수이므로 건너뜀
                    }

                    // Ko rule check for AI (Simplified)
                    // const tempBoardForKo = applyCaptures(r, c, currentPlayer, JSON.parse(JSON.stringify(tempBoard)));
                    // if (gameHistory.includes(JSON.stringify(tempBoardForKo))) {
                    //     continue; // 패 규칙 위반
                    // }


                    possibleMoves.push({ r, c, captures: 0, blocks: 0, strategicValue: 0 });
                }
            }
        }

        if (possibleMoves.length === 0) {
            // 둘 곳이 없음 (이론상으로는 거의 발생 안함. 모든 칸이 찼거나 패만 남는 경우)
            endGame(currentPlayer === PLAYER_BLACK ? "백" : "흑", "둘 곳이 없어 상대방의 승리입니다!");
            return;
        }

        // AI 레벨에 따른 로직
        if (aiLevel === 'easy') {
            bestMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
        } else { // medium or hard
            for (let move of possibleMoves) {
                const r = move.r;
                const c = move.c;
                
                // 1. AI가 이 수로 잡을 수 있는 돌 계산
                let tempBoardForAICapture = board.map(row => [...row]);
                tempBoardForAICapture[r][c] = currentPlayer; // AI 돌 놓기
                move.captures = countPotentialCaptures(r, c, currentPlayer, tempBoardForAICapture);

                // 2. 플레이어가 다음 턴에 이 자리에 두면 잡을 수 있는 돌 계산 (AI가 막아야 할 위협)
                let tempBoardForPlayerThreat = board.map(row => [...row]);
                const humanPlayer = (currentPlayer === PLAYER_BLACK) ? PLAYER_WHITE : PLAYER_BLACK;
                tempBoardForPlayerThreat[r][c] = humanPlayer; // 플레이어가 여기에 둔다고 가정
                move.blocks = countPotentialCaptures(r, c, humanPlayer, tempBoardForPlayerThreat);

                // 간단한 전략적 가치: 중앙에 가까울수록, 기존 자기 돌에 연결될수록 점수
                move.strategicValue = (boardSize / 2 - Math.abs(r - (boardSize-1)/2)) +
                                      (boardSize / 2 - Math.abs(c - (boardSize-1)/2));
                // 주변에 자기 돌이 있으면 가산점
                [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc])=>{
                    const nr = r+dr, nc = c+dc;
                    if(nr>=0 && nr<boardSize && nc>=0 && nc<boardSize && board[nr][nc] === currentPlayer){
                        move.strategicValue += 2;
                    }
                });


            }

            possibleMoves.sort((a, b) => {
                // 우선순위: 1. AI가 많이 잡는 수, 2. 플레이어 위협을 많이 막는 수, 3. 전략적 가치
                if (b.captures !== a.captures) return b.captures - a.captures;
                if (b.blocks !== a.blocks) return b.blocks - a.blocks;
                if (aiLevel === 'hard') { // 고급 AI는 전략적 가치도 고려
                     if (b.strategicValue !== a.strategicValue) return b.strategicValue - a.strategicValue;
                }
                return Math.random() - 0.5; // 동일하면 랜덤
            });
            bestMove = possibleMoves[0];
        }


        if (bestMove) {
            const { r, c } = bestMove;
            const currentBoardString = JSON.stringify(board); // AI가 두기 전 상태 기록
            
            board[r][c] = currentPlayer;
            gameHistory.push(currentBoardString);

            const capturedStones = checkAndRemoveCaptures(r, c, currentPlayer);
            if (currentPlayer === PLAYER_BLACK) {
                blackCaptures += capturedStones;
            } else {
                whiteCaptures += capturedStones;
            }
            
            // AI가 둔 수가 자살수인지 한번 더 확인 (상대돌을 못 따냈다면)
             if (capturedStones === 0) {
                const ownAiGroup = getGroup(r, c, board, currentPlayer);
                if (ownAiGroup.liberties === 0) {
                    // 이런 경우는 AI 로직에서 걸러졌어야 하지만, 안전장치
                    console.error("AI가 자살수를 두려고 했습니다. 로직 오류 가능성.");
                    board[r][c] = EMPTY; // 수 무르기
                    gameHistory.pop();
                    // 다른 수를 찾거나, 게임을 포기해야 할 수도 있음. 여기서는 가장 간단하게 랜덤으로 다시 시도.
                    if (possibleMoves.length > 1) {
                         bestMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
                         // 여기서 다시 위 로직 반복해야하나 매우 복잡해짐. 일단 로그만 남김.
                         // 이 상황은 AI 로직의 개선이 필요함을 의미.
                    } else {
                        endGame(currentPlayer === PLAYER_BLACK ? "백" : "흑", "AI가 둘 곳이 없어 상대방의 승리입니다!");
                        return;
                    }
                    // 재시도 (여기서는 생략하고 그냥 턴 넘김)
                }
            }


            drawBoard();
            updateGameInfo();

            if (checkWinCondition()) return;

            currentPlayer = (currentPlayer === PLAYER_BLACK) ? PLAYER_WHITE : PLAYER_BLACK;
            updateGameInfo();

        } else {
            // AI가 둘 곳이 없음 (모든 곳이 찼거나, 패 규칙 등으로 둘 수 없는 경우)
             // 일반적으로는 이전에 possibleMoves.length === 0 에서 걸림.
            endGame(currentPlayer === PLAYER_BLACK ? "백" : "흑", "AI가 둘 곳이 없습니다. 상대방 승리!");
        }
    }
    
    function countPotentialCaptures(r_placed, c_placed, player, targetBoard) {
        let potentialCaptures = 0;
        const opponent = (player === PLAYER_BLACK) ? PLAYER_WHITE : PLAYER_BLACK;

        [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dr, dc]) => {
            const nr = r_placed + dr;
            const nc = c_placed + dc;

            if (nr >= 0 && nr < boardSize && nc >= 0 && nc < boardSize && targetBoard[nr][nc] === opponent) {
                const group = getGroup(nr, nc, targetBoard, opponent);
                if (group.liberties === 0) {
                    potentialCaptures += group.stones.length;
                }
            }
        });
        return potentialCaptures;
    }


    function updateGameInfo() {
        currentPlayerDisplay.textContent = currentPlayer === PLAYER_BLACK ? '흑' : '백';
        if (currentPlayer === PLAYER_BLACK) {
             currentPlayerDisplay.style.color = 'black';
        } else {
            currentPlayerDisplay.style.color = '#555'; // 백돌은 회색 글씨로
        }
        blackCapturesDisplay.textContent = blackCaptures;
        whiteCapturesDisplay.textContent = whiteCaptures;
    }

    function checkWinCondition() {
        // 매우 단순화된 승리 조건: 한쪽이 특정 개수 이상 따내거나,
        // 혹은 더 이상 둘 곳이 없을 때 (이 부분은 AI 로직에서 판단)
        // 실제 바둑의 집 계산은 매우 복잡하여 여기서는 생략합니다.
        // 예시: 10개의 돌을 먼저 잡으면 승리 (테스트용)
        const WINSTONE_THRESHOLD = Math.max(10, Math.floor(boardSize*boardSize / 10)); 

        if (blackCaptures >= WINSTONE_THRESHOLD) {
            endGame("흑", "흑이 돌 " + WINSTONE_THRESHOLD + "개 이상을 잡아 승리했습니다!");
            return true;
        }
        if (whiteCaptures >= WINSTONE_THRESHOLD) {
            endGame("백", "백이 돌 " + WINSTONE_THRESHOLD + "개 이상을 잡아 승리했습니다!");
            return true;
        }

        // 모든 칸이 찼는지 확인
        let emptyCells = 0;
        for(let r=0; r<boardSize; r++) {
            for(let c=0; c<boardSize; c++) {
                if(board[r][c] === EMPTY) emptyCells++;
            }
        }
        if (emptyCells === 0) {
            if (blackCaptures > whiteCaptures) {
                endGame("흑", `모든 칸이 채워졌습니다. 흑이 ${blackCaptures}개, 백이 ${whiteCaptures}개를 잡아 흑 승리!`);
            } else if (whiteCaptures > blackCaptures) {
                endGame("백", `모든 칸이 채워졌습니다. 백이 ${whiteCaptures}개, 흑이 ${blackCaptures}개를 잡아 백 승리!`);
            } else {
                endGame("무승부", `모든 칸이 채워졌습니다. 흑과 백 모두 ${blackCaptures}개를 잡아 무승부!`);
            }
            return true;
        }

        return false;
    }

    function endGame(winner, message) {
        gameOver = true;
        popupMessage.textContent = message;
        popup.classList.remove('popup-hidden');
    }

    startGameButton.addEventListener('click', initGame);
    popupCloseButton.addEventListener('click', () => {
        popup.classList.add('popup-hidden');
        // 게임 종료 후 새 게임을 시작하도록 유도할 수 있음
        initGame(); 
    });

    // 초기 게임 시작
    initGame();
    
    // 창 크기 변경 시 바둑판 다시 그리기 (돌 크기 등 비율 유지 위함)
    window.addEventListener('resize', () => {
        if (!gameOver) { // 게임 진행 중에만
            drawBoard(); // 돌 상태는 유지하고 그리기만 다시
        }
    });
});
