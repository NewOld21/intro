document.documentElement.classList.add('js');

    const body = document.body;
    const menuButton = document.querySelector('.menu-toggle');
    const navigation = document.querySelector('.main-nav');

    menuButton?.addEventListener('click', () => {
      const isOpen = body.classList.toggle('menu-open');
      menuButton.setAttribute('aria-expanded', String(isOpen));
    });

    navigation?.addEventListener('click', () => {
      body.classList.remove('menu-open');
      menuButton?.setAttribute('aria-expanded', 'false');
    });

    document.querySelector(`[data-nav="${body.dataset.page}"]`)?.classList.add('active');

    const revealItems = document.querySelectorAll('.reveal');

    if ('IntersectionObserver' in window) {
      const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.08 });

      revealItems.forEach((item) => revealObserver.observe(item));
    } else {
      revealItems.forEach((item) => item.classList.add('visible'));
    }

    const filterButtons = document.querySelectorAll('.filter-btn');
    const archiveCards = document.querySelectorAll('.sport-card');

    filterButtons.forEach((button) => {
      button.addEventListener('click', () => {
        filterButtons.forEach((item) => item.classList.remove('active'));
        button.classList.add('active');

        archiveCards.forEach((card) => {
          card.hidden = button.dataset.filter !== 'all'
            && card.dataset.category !== button.dataset.filter;
        });
      });
    });

    const boardForm = document.querySelector('#board-form');
    const messagesContainer = document.querySelector('#messages');
    const storageKey = 'sports_messages';
    const defaultMessages = [
      {
        name: 'SSAFY 16기 야구팬',
        message: '기아 챔피언스 필드 응원 열기 대단하죠!! 광주 직관 파트너 구합니다~'
      },
      {
        name: '시티즌 99호',
        message: '다비드 실바는 진짜 전설이었습니다. 메인 화면 메시 멘트 격하게 공감합니다!'
      }
    ];

    function escapeHTML(value) {
      return value.replace(/[&<>'"]/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      })[character]);
    }

    function getMessages() {
      try {
        return JSON.parse(localStorage.getItem(storageKey)) || defaultMessages;
      } catch {
        return defaultMessages;
      }
    }

    function renderMessages() {
      if (!messagesContainer) return;

      messagesContainer.innerHTML = getMessages().map((item, index) => `
        <article class="message">
          <strong>${escapeHTML(item.name)}</strong>
          <p>${escapeHTML(item.message)}</p>
          <button class="delete-message" data-index="${index}" type="button" aria-label="메시지 삭제">삭제</button>
        </article>
      `).join('');
    }

    boardForm?.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(boardForm);
      const name = String(formData.get('name')).trim();
      const message = String(formData.get('message')).trim();
      if (!name || !message) return;

      const messages = getMessages();
      messages.unshift({ name, message });
      localStorage.setItem(storageKey, JSON.stringify(messages.slice(0, 20)));
      boardForm.reset();
      renderMessages();
    });

    messagesContainer?.addEventListener('click', (event) => {
      const deleteButton = event.target.closest('.delete-message');
      if (!deleteButton) return;

      const messages = getMessages();
      messages.splice(Number(deleteButton.dataset.index), 1);
      localStorage.setItem(storageKey, JSON.stringify(messages));
      renderMessages();
    });

    renderMessages();


    /* ==========================================
       [STREAMING_CHUNK:Initializing state & interactive toggles...]
       ========================================== */
    // 기존 mockDb 및 투표 종합 데이터를 정교한 연산 로직으로 완벽 보완
    const baseWcVotes = {
      match1: { baseA: 4890, baseB: 4320, nameA: '프랑스', nameB: '스페인' },
      match2: { baseA: 3120, baseB: 4180, nameA: '잉글랜드', nameB: '아르헨티나' }
    };

    function getUserPrediction(matchId) {
      return localStorage.getItem(`wc_pred_${matchId}`) || null; // 'A' or 'B' or null
    }

    function handlePrediction(matchId, team) {
      const currentChoice = getUserPrediction(matchId);
      
      if (currentChoice === team) {
        // 이미 투표한 카드를 다시 누르면 투표가 즉각 해제됩니다.
        localStorage.removeItem(`wc_pred_${matchId}`);
      } else {
        // 수정하기 절차 없이 클릭하는 즉시 다른 쪽으로 전환/투표됩니다.
        localStorage.setItem(`wc_pred_${matchId}`, team);
      }
      
      renderPredictionResult(matchId);
    }

    function renderPredictionResult(matchId) {
      const userChoice = getUserPrediction(matchId);
      const base = baseWcVotes[matchId];
      const statsPanel = document.getElementById(`${matchId}-stats`);
      
      const cardA = document.querySelector(`.poster-card[data-match="${matchId}"][data-team="A"]`);
      const cardB = document.querySelector(`.poster-card[data-match="${matchId}"][data-team="B"]`);
      
      const promptA = document.getElementById(`${matchId === 'match1' ? 'm1' : 'm2'}-prompt-A`);
      const promptB = document.getElementById(`${matchId === 'match1' ? 'm1' : 'm2'}-prompt-B`);

      // 상태 클래스 초기화
      cardA.classList.remove('selected', 'dimmed');
      cardB.classList.remove('selected', 'dimmed');
      
      promptA.innerHTML = `${base.nameA} 승리 예측`;
      promptB.innerHTML = `${base.nameB} 승리 예측`;

      // 선택에 따른 UI 가이드 디밍/선택 표시
      if (userChoice === 'A') {
        cardA.classList.add('selected');
        cardB.classList.add('dimmed');
        promptA.innerHTML = `<i class="fa-solid fa-check"></i> 예측 완료`;
      } else if (userChoice === 'B') {
        cardB.classList.add('selected');
        cardA.classList.add('dimmed');
        promptB.innerHTML = `<i class="fa-solid fa-check"></i> 예측 완료`;
      }

      // 투표했을 시 그래프 슬라이딩 등장 및 연산
      if (userChoice) {
        statsPanel.classList.add('reveal-stats');
        
        const totalA = base.baseA + (userChoice === 'A' ? 1 : 0);
        const totalB = base.baseB + (userChoice === 'B' ? 1 : 0);
        const totalSum = totalA + totalB;
        
        const percentA = Math.round((totalA / totalSum) * 100);
        const percentB = 100 - percentA;

        // 진행 바 스무스 업데이트
        document.getElementById(`m${matchId === 'match1' ? '1' : '2'}-bar-A`).style.width = `${percentA}%`;
        document.getElementById(`m${matchId === 'match1' ? '1' : '2'}-bar-B`).style.width = `${percentB}%`;

        // 텍스트 라벨 갱신
        document.getElementById(`m${matchId === 'match1' ? '1' : '2'}-lbl-A`).textContent = `${base.nameA} ${percentA}%`;
        document.getElementById(`m${matchId === 'match1' ? '1' : '2'}-lbl-B`).textContent = `${base.nameB} ${percentB}%`;
        
        document.getElementById(`m${matchId === 'match1' ? '1' : '2'}-total`).innerHTML = 
          `<i class="fa-solid fa-square-poll-vertical"></i> 종합 ${totalSum.toLocaleString()}표 참여 완료 (예측 성공 기원)`;
      } else {
        statsPanel.classList.remove('reveal-stats');
      }
    }

    // 예측 버튼 인터랙션 할당 및 초기 상태 복원
    document.querySelectorAll('.poster-card').forEach(btn => {
      btn.addEventListener('click', () => {
        const mId = btn.getAttribute('data-match');
        const team = btn.getAttribute('data-team');
        handlePrediction(mId, team);
      });
    });

    document.addEventListener('DOMContentLoaded', () => {
      renderPredictionResult('match1');
      renderPredictionResult('match2');
    });