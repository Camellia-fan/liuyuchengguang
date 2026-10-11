// opening.js —— 开场动画：大门图片 → 点击水波 → 推门 → 视频 → 拼图入场
// 依赖 puzzle.js 暴露的全局函数 window.startPuzzleEntrance
// 依赖 click-sound.js 暴露的全局函数 window.playClickSound

(function () {
  'use strict';

  const opening = document.getElementById('opening');
  const doorLayer = document.getElementById('doorLayer');
  const rippleContainer = document.getElementById('rippleContainer');
  const openingVideo = document.getElementById('openingVideo');
  const video = document.getElementById('introVideo');
  const skipBtn = document.getElementById('skipVideo');
  const puzzleEmbed = document.getElementById('puzzleEmbed');

  // v5 新增元素
  const openLetterDot = document.getElementById('openLetterDot');
  const letterLayer = document.getElementById('letterLayer');
  const letterText = document.getElementById('letterText');
  const continueHint = document.getElementById('continueHint');

  // 背景音乐（assets/audio/bg.mp3）：打开信封时开始播放，循环
  const bgMusic = document.getElementById('bgMusic');
  const BG_VOLUME = 0.35;   // ← 可调：背景音乐音量（0~1）

  let bgStarted = false;
  function startBgMusic() {
    if (bgStarted || !bgMusic) return;
    bgStarted = true;
    try {
      bgMusic.volume = BG_VOLUME;
      bgMusic.currentTime = 0;
    } catch (e) { /* 忽略 */ }
    const p = bgMusic.play();
    if (p && typeof p.catch === 'function') {
      p.catch(function () {
        console.warn('背景音乐播放被浏览器拦截（需用户交互后才会播放）');
      });
    }
  }

  let hasClicked = false; // 防止重复点击大门
  let hasClosed = false;  // 防止重复关闭

  // v5 状态
  let letterPhaseStarted = false; // 视频播完后的信封阶段是否已开始
  let envelopeOpened = false;     // 信件是否已展开
  let continueShown = false;      // 「点击继续」是否已出现
  let continueClicked = false;    // 「点击继续」是否已点击
  let currentLine = 0;            // 当前逐句显示到第几行

  // ---------- 创建水波（以点击点为中心扩散） ----------
  function createRipple(x, y) {
    // 最大半径覆盖整个屏幕
    const maxSize = Math.max(window.innerWidth, window.innerHeight) * 2.2;

    // 第一圈
    const ripple1 = document.createElement('div');
    ripple1.className = 'ripple';
    ripple1.style.left = x + 'px';
    ripple1.style.top = y + 'px';
    ripple1.style.width = maxSize + 'px';
    ripple1.style.height = maxSize + 'px';
    rippleContainer.appendChild(ripple1);

    // 第二圈（延迟）
    const ripple2 = document.createElement('div');
    ripple2.className = 'ripple delay';
    ripple2.style.left = x + 'px';
    ripple2.style.top = y + 'px';
    ripple2.style.width = (maxSize * 0.7) + 'px';
    ripple2.style.height = (maxSize * 0.7) + 'px';
    rippleContainer.appendChild(ripple2);

    // 动画结束后清理
    setTimeout(() => {
      ripple1.remove();
      ripple2.remove();
    }, 1600);
  }

  // ---------- 点击大门 ----------
  function handleDoorClick(e) {
    if (hasClicked) return;
    hasClicked = true;

    // 获取点击坐标（相对大门层，避免水波位置偏移）
    const rect = doorLayer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 播放点击音效（全站统一）
    if (typeof window.playClickSound === 'function') {
      window.playClickSound();
    }

    // 在点击点扩散水波
    createRipple(x, y);

    // 水波扩散约 0.5s 后，大门向两侧推开，同时直接开始播放视频
    setTimeout(() => {
      opening.classList.add('doors-open');
      doorLayer.classList.add('pushed');
      playVideo();
    }, 500);
  }

  // ---------- 播放视频 ----------
  function playVideo() {
    openingVideo.classList.add('show');
    video.currentTime = 0;

    // 设定音量（0~1），沿用已调好的 0.4
    video.volume = 0.4;

    // 优先尝试带声音自动播放；若被浏览器拦截，则静音回退，保证画面照样自动出现
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        console.warn('带声音自动播放被拦截，回退为静音自动播放');
        video.muted = true;
        video.play().catch(() => {
          console.warn('自动播放仍失败，停留在首帧，用户可点跳过');
        });
      });
    }
  }

  // ---------- 关闭整个开场，进入拼图 ----------
  function closeOpening() {
    if (hasClosed) return;
    hasClosed = true;

    // 视频层淡出
    openingVideo.classList.remove('show');

    // 整个开场层淡出（0.8s 后不可见、不再拦截点击）
    opening.classList.add('hide');

    // 显示拼图容器，并同时启动飞入（衔接更顺）
    puzzleEmbed.style.transition = 'opacity 0.8s ease';
    puzzleEmbed.style.opacity = '1';
    if (typeof window.startPuzzleEntrance === 'function') {
      window.startPuzzleEntrance();
    }

    // 彻底移除开场层
    setTimeout(() => {
      opening.style.display = 'none';
    }, 1600);
  }

  // ---------- 绑定事件 ----------
  doorLayer.addEventListener('click', handleDoorClick);

  // 视频播完 → 进入信封阶段（不再直接关闭开场）
  video.addEventListener('ended', onVideoEnded);

  // 跳过按钮：定格到最后一帧后，走正常信封流程（不跳过信封环节）
  skipBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    if (typeof window.playClickSound === 'function') {
      window.playClickSound();
    }
    skipVideo();
  });

  // 视频区域点击也可跳过（大门已推开，不再拦截）
  openingVideo.addEventListener('click', function () {
    if (typeof window.playClickSound === 'function') {
      window.playClickSound();
    }
    skipVideo();
  });

  // 视频加载失败兜底
  video.addEventListener('error', function () {
    console.warn('视频加载失败，进入信封阶段');
    setTimeout(onVideoEnded, 800);
  });

  // 兜底：视频过长，最多播 30 秒（仅在已点击大门进入视频阶段后）
  setTimeout(function () {
    if (!hasClosed && hasClicked && !letterPhaseStarted) {
      onVideoEnded();
    }
  }, 30000);

  /* =========================================================
     v5 流程（简化版）：
     视频播放中可随时跳过 → 视频结束/跳过后定格在最后一帧
     → 圆点光标+打开信封（在定格画面上）→ 点击 → 白底磨砂信件 + 逐句文字
     → 七行完出现「点击继续」→ 点击后信件淡出，直接进入拼图页（background.png）
     （不再有飞鸟碎片与碎片拼合环节）
     ========================================================= */

  // 七行文字内容
  const LETTER_LINES = [
    '我们大多是内敛安静的I人，不善言语，却在沉默之中积蓄着强大的执行力。',
    '来自不同专业、怀揣各异热爱的我们，每一个人都是独一无二的拼图。',
    '我们优势互补，分工协作，将各自的力量严丝合缝地汇聚在一起。',
    '飞鸟，是我们团队的意象。',
    '当碎片合一，便可振翅而起，结伴飞向更远的远方。'
  ];

  // ---------- 跳过：定格到最后一帧，再走正常信封流程 ----------
  function skipVideo() {
    if (letterPhaseStarted) return; // 已进入信封阶段则忽略

    // 不管视频播到哪，直接定格到最后一帧
    try {
      if (video.duration && isFinite(video.duration)) {
        video.currentTime = Math.max(0, video.duration - 0.05);
      }
      video.pause();
    } catch (e) { /* 忽略 */ }

    // 确保视频层仍显示（停在最后一帧画面）
    if (openingVideo) openingVideo.classList.add('show');

    // 进入正常后续流程：圆点提示 → 打开信封 → …（不跳过信封环节）
    onVideoEnded();
  }

  // ---------- 视频播完/跳过：定格在最后一帧，显示圆点光标 + 打开信封 ----------
  function onVideoEnded() {
    if (letterPhaseStarted) return; // 整个信封流程只触发一次
    letterPhaseStarted = true;

    // 视频定格在最后一帧：保留 openingVideo 的 .show，画面静止等待用户操作
    try { video.pause(); } catch (e) { /* 忽略 */ }

    // 视频已结束/跳过，隐藏「跳过」按钮（定格画面无需再跳过）
    if (skipBtn) skipBtn.style.display = 'none';

    // 显示圆点光标 + 「打开信封」提示（在定格的视频画面上）
    if (openLetterDot) {
      openLetterDot.classList.add('show');
    }
  }

  // ---------- 点击「打开信封」圆点 ----------
  function openLetter() {
    if (envelopeOpened) return;
    envelopeOpened = true;

    // 播放点击音效
    if (typeof window.playClickSound === 'function') {
      window.playClickSound();
    }

    // 视频已播完 → 从这一刻开始播放背景音乐（循环，延续到拼图页）
    startBgMusic();

    // 隐藏圆点提示
    if (openLetterDot) openLetterDot.classList.remove('show');

    // 直接在定格的视频画面上浮现白底磨砂信件，并开始逐句显示文字
    // （不再切换 background.png 场景）
    setTimeout(function () {
      if (letterLayer) letterLayer.classList.add('show');
      startLetterText();
    }, 650);
  }

  // ---------- 逐句显示文字 ----------
  function startLetterText() {
    showNextLine();
  }

  function showNextLine() {
    if (currentLine >= LETTER_LINES.length) {
      // 七行全部显示完，等待用户点击「点击继续」
      showContinueHint();
      return;
    }

    const lineEl = document.createElement('div');
    lineEl.className = 'line';
    lineEl.textContent = LETTER_LINES[currentLine];
    letterText.appendChild(lineEl);
    // 强制回流后再加 show，触发淡入动画
    requestAnimationFrame(function () { lineEl.classList.add('show'); });

    currentLine++;
    // 每句间隔约 1.7 秒（1~2 秒之间）
    setTimeout(showNextLine, 1700);
  }

  // ---------- 七行显示完：出现「点击继续」 ----------
  function showContinueHint() {
    if (continueShown) return;
    continueShown = true;
    if (continueHint) continueHint.classList.add('show');
  }

  // ---------- 点击「点击继续」：信件淡出，直接切换到 background.png 拼图页 ----------
  function onContinueClick() {
    // 仅在「点击继续」已出现后才响应，避免读文字阶段误触
    if (!continueShown || continueClicked) return;
    continueClicked = true;

    // 播放点击音效
    if (typeof window.playClickSound === 'function') {
      window.playClickSound();
    }

    // 信件和文字淡出
    if (letterLayer) letterLayer.classList.add('fade-out');

    // 不再有碎片拼合：信件淡出后直接进入拼图模块（拼图页背景即 background.png）
    setTimeout(enterPuzzle, 1000);
  }

  // ---------- 衔接拼图模块入场 ----------
  function enterPuzzle() {
    if (hasClosed) return;
    hasClosed = true;

    // 整个开场层淡出
    opening.classList.add('hide');

    // 显示拼图容器，并同时启动飞入（衔接更顺）
    puzzleEmbed.style.transition = 'opacity 0.8s ease';
    puzzleEmbed.style.opacity = '1';
    if (typeof window.startPuzzleEntrance === 'function') {
      window.startPuzzleEntrance();
    }

    // 彻底移除开场层
    setTimeout(function () {
      opening.style.display = 'none';
    }, 1600);
  }

  // 绑定「打开信封」圆点点击（提示为全屏，点击任意位置均触发）
  if (openLetterDot) {
    openLetterDot.addEventListener('click', openLetter);
  }
  // 绑定「点击继续」（点击提示触发）
  if (continueHint) {
    continueHint.addEventListener('click', onContinueClick);
  }
})();
