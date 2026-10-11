// puzzle.js —— 拼图交互逻辑（v6：色区卡片 + 个人介绍卡片）
// 依赖 data.js 提供的全局变量：blocks

(function () {
  const stage = document.getElementById('stage');
  const pieces = document.querySelectorAll('.piece');
  const backBtn = document.getElementById('backBtn');
  const hint = document.getElementById('hint');
  // 拼图标题「六羽成光」：靠右、逐字呈现
  const puzzleTitle = document.getElementById('puzzleTitle');

  // 色区卡片层
  const colorCardLayer = document.getElementById('colorCardLayer');
  const cardMask = document.getElementById('cardMask');
  const cardParticles = document.getElementById('cardParticles');
  const colorCard = document.getElementById('colorCard');
  const avatarGrid = document.getElementById('avatarGrid');
  // 色区卡片上方的组名标题（如「视觉呈现」），位置见 css/card.css 的 .color-card-group
  const colorCardGroup = document.getElementById('colorCardGroup');

  // 个人介绍卡片层
  const introCardLayer = document.getElementById('introCardLayer');
  const introCardMask = document.getElementById('introCardMask');
  const introCardName = document.getElementById('introCardName');
  const introCardSlogan = document.getElementById('introCardSlogan');
  const introCardSchool = document.getElementById('introCardSchool');
  const introCardTags = document.getElementById('introCardTags');
  const introCardText = document.getElementById('introCardText');
  const introCardClose = document.getElementById('introCardClose');
  const introCardQr = document.getElementById('introCardQr');

  // 介绍名片模板默认占位文案
  const PLACEHOLDER = {
    slogan: '请在此输入迷你 slogan',
    school: '请输入学校/专业',
    tags: ['标签1', '标签2', '标签3', '标签4', '标签5', '标签6'],
    intro: '请在此输入一句话介绍'
  };

  let isExploded = false;
  let entranceStarted = false;

  function playClick() {
    if (typeof window.playClickSound === 'function') {
      window.playClickSound();
    }
  }

  // ---------- 标题：逐字呈现 / 隐藏 ----------
  // 把标题拆成一个个 span，依次淡入
  function buildTitle() {
    if (!puzzleTitle) return;
    const text = puzzleTitle.textContent.replace(/\s/g, '');
    puzzleTitle.innerHTML = '';
    text.split('').forEach(function (ch, i) {
      const s = document.createElement('span');
      s.className = 'pz-char';
      s.textContent = ch;
      s.style.animationDelay = (i * 0.12) + 's';   // ← 可调：每个字之间的间隔（秒）
      puzzleTitle.appendChild(s);
    });
  }

  function showTitle() { if (puzzleTitle) puzzleTitle.classList.add('show'); }
  function hideTitle() { if (puzzleTitle) puzzleTitle.classList.remove('show'); }

  // ---------- 入场动画 ----------
  function finishEntrance() {
    if (!stage.classList.contains('entering')) return;
    stage.classList.remove('entering');
    if (!isExploded) {
      hint.textContent = window.PUZZLE_NO_EXPLODE
        ? '✦ 调试模式：拼图保持合拢 ✦'
        : '✦ 点击拼图 → 散开漂浮 ✦';
      showTitle();          // 拼图拼好 → 标题逐字浮现
    }
  }

  // 由 opening.js 在开场结束后调用
  function startPuzzleEntrance() {
    if (entranceStarted) return;
    entranceStarted = true;
    stage.classList.add('entering');
    hint.textContent = '✦ 飞鸟正在归位… ✦';
    hideTitle();          // 拼合过程中先隐藏
    const lastPiece = pieces[pieces.length - 1];
    lastPiece.addEventListener('animationend', function (e) {
      if (e.animationName !== 'floatIn') return;
      finishEntrance();
    });
    setTimeout(finishEntrance, 4200); // 兜底
  }
  window.startPuzzleEntrance = startPuzzleEntrance;

  // 调试用：跳过「飞鸟归位」动画，直接把拼图置于拼合完成状态
  function setAssembled() {
    entranceStarted = true;
    stage.classList.remove('exploded');
    if (!stage.classList.contains('entering')) stage.classList.add('entering');
    finishEntrance();
  }
  window.setPuzzleAssembled = setAssembled;

  // ---------- 散开 / 合拢 ----------
  function explode() {
    if (isExploded) return;
    isExploded = true;
    stage.classList.add('exploded');
    hint.textContent = '✦ 点击碎片展开成员 · 点空白处合拢成图 ✦';
    hideTitle();          // 拼图散开 → 标题消失
    backBtn.classList.remove('show');
  }

  function resetAll() {
    isExploded = false;
    stage.classList.remove('exploded');
    closeColorCard();
    closeIntro();
    hint.textContent = '✦ 点击拼图 → 散开漂浮 ✦';
    showTitle();          // 重新合拢成图 → 标题再次逐字呈现
    backBtn.classList.remove('show');
  }

  // ---------- 淡黄色粒子（围绕卡片缓慢漂浮） ----------
  function buildParticles() {
    const n = 16;
    for (let i = 0; i < n; i++) {
      const p = document.createElement('span');
      p.className = 'particle';
      // 集中在卡片四周的环形区域
      p.style.left = (12 + Math.random() * 76) + '%';
      p.style.top = (16 + Math.random() * 68) + '%';
      const dur = 6 + Math.random() * 7;
      p.style.animationDuration = dur + 's';
      p.style.animationDelay = (-Math.random() * dur) + 's';
      const sz = 5 + Math.random() * 6;
      p.style.width = sz + 'px';
      p.style.height = sz + 'px';
      cardParticles.appendChild(p);
    }
  }

  // ---------- 按人数计算头像行布局 ----------
  function layoutFor(n) {
    if (n === 3) return [3];
    if (n === 4) return [2, 2];
    if (n === 6) return [3, 3];
    if (n === 7) return [2, 3, 2];
    // 其他数量：每行最多 3 个回退
    const rows = [];
    let rem = n;
    while (rem > 0) {
      const c = Math.min(3, rem);
      rows.push(c);
      rem -= c;
    }
    return rows;
  }

  // ---------- 打开色区卡片 ----------
  function openColorCard(idx) {
    const block = blocks[idx];
    if (!block) return;
    playClick();

    // 组名标题（如「视觉呈现」）显示在色区卡片上方
    colorCardGroup.textContent = shortZoneName(block.name);

    // 所有色区头像组统一靠右（默认定位）；2×2 的四人色区再右移到 15%
    avatarGrid.className = 'avatar-grid';
    if (block.members.length === 4) avatarGrid.classList.add('pos-4');

    // 构建头像网格
    avatarGrid.innerHTML = '';
    const rows = layoutFor(block.members.length);
    let mi = 0;
    rows.forEach(function (count) {
      const row = document.createElement('div');
      row.className = 'avatar-row';
      for (let k = 0; k < count && mi < block.members.length; k++, mi++) {
        const name = block.members[mi];
        const av = document.createElement('div');
        av.className = 'avatar';

        // 头像图：按成员名命名；文件名大小写不一致时兜底尝试小写
        const img = document.createElement('img');
        img.alt = name;
        img.onerror = function () {
          img.onerror = null;
          img.src = 'assets/images/card/' + name.toLowerCase() + '.png';
          img.addEventListener('error', function () { img.remove(); }, { once: true });
        };
        img.src = 'assets/images/card/' + name + '.png';
        av.appendChild(img);

        av.addEventListener('click', function (e) {
          e.stopPropagation();
          onAvatarClick(idx, name, av);
        });

        row.appendChild(av);
      }
      avatarGrid.appendChild(row);
    });

    colorCardLayer.classList.add('show');
    hint.textContent = '✦ 点击头像看介绍 · 点空白处返回 ✦';
  }

  function closeColorCard() {
    colorCardLayer.classList.remove('show');
    if (isExploded) {
      hint.textContent = '✦ 点击碎片展开成员 · 点空白处合拢成图 ✦';
    }
  }

  // ---------- 头像点击：翻转 → 弹出介绍卡片 ----------
  function onAvatarClick(idx, name, av) {
    if (av.classList.contains('flipping')) return;
    playClick();
    av.classList.add('flipping');
    setTimeout(function () {
      openIntro(idx, name);
    }, 480);
  }

  // 联系方式图片：assets/images/connection/{成员名}.png，居中且不拉伸；没有则显示「无」
  function fillConnection(name) {
    introCardQr.innerHTML = '';
    introCardQr.classList.remove('is-none');

    function tryLoad(src, onFail) {
      const probe = new Image();
      probe.onload = function () {
        introCardQr.innerHTML = '';
        const img = document.createElement('img');
        img.src = src;
        img.alt = name + ' 的联系方式';
        introCardQr.appendChild(img);
      };
      probe.onerror = onFail;
      probe.src = src;
    }

    function showNone() {
      introCardQr.textContent = '无';
      introCardQr.classList.add('is-none');
    }

    // 先按成员名找（如 Estelle.png），失败再试小写（如 estelle.png），都没有则显示「无」
    tryLoad('assets/images/connection/' + name + '.png', function () {
      const lower = 'assets/images/connection/' + name.toLowerCase() + '.png';
      if (lower === 'assets/images/connection/' + name + '.png') { showNone(); return; }
      tryLoad(lower, showNone);
    });
  }

  // 从全名（如 "红色 · 创意破局块"）提取短名（如 "创意破局"）
  function shortZoneName(full) {
    if (!full) return '';
    let s = full.split('·').slice(1).join('·').trim(); // 去 "颜色 · " 前缀
    if (s.endsWith('块')) s = s.slice(0, -1);          // 去结尾 "块"
    return s;
  }

  function openIntro(idx, name) {
    const p = (typeof profiles !== 'undefined' && profiles && profiles[name]) || {};

    // 昵称：成员名（悬停可看到表格里的完整昵称）
    introCardName.textContent = name;
    introCardName.title = p.full || name;

    // mini slogan
    introCardSlogan.textContent = p.slogan || PLACEHOLDER.slogan;
    introCardSlogan.classList.toggle('is-placeholder', !p.slogan);

    // 学校 · 专业
    introCardSchool.textContent = p.school || PLACEHOLDER.school;
    introCardSchool.classList.toggle('is-placeholder', !p.school);

    // 一句话介绍
    introCardText.textContent = p.intro || PLACEHOLDER.intro;
    introCardText.classList.toggle('is-placeholder', !p.intro);

    // 标签：有资料用资料，否则 6 个占位胶囊
    const tags = (p.tags && p.tags.length) ? p.tags : PLACEHOLDER.tags;
    introCardTags.innerHTML = '';
    tags.slice(0, 6).forEach(function (t) {
      const s = document.createElement('span');
      s.className = 'ic-tag';
      s.textContent = t;
      introCardTags.appendChild(s);
    });

    // 联系方式图片（没有则显示「无」）
    fillConnection(name);

    introCardLayer.classList.add('show');
  }

  function closeIntro() {
    introCardLayer.classList.remove('show');
    // 复位头像翻转状态，避免关闭后头像仍保持镜面翻转
    avatarGrid.querySelectorAll('.avatar.flipping').forEach(function (a) {
      a.classList.remove('flipping');
    });
  }

  // ---------- 碎片点击 ----------
  pieces.forEach(function (piece) {
    piece.addEventListener('click', function (e) {
      e.stopPropagation();
      playClick();

      // 入场动画播放中：点击则跳过入场
      if (stage.classList.contains('entering')) {
        finishEntrance();
        return;
      }

      const idx = Array.prototype.indexOf.call(pieces, this);

      if (!isExploded) {
        // 调试模式（puzzle.html 会设置 window.PUZZLE_NO_EXPLODE = true）：保持拼合，不散开
        if (window.PUZZLE_NO_EXPLODE) return;
        explode();
        return;
      }
      // 已散开：打开对应色区卡片（一次只展示一个色区）
      openColorCard(idx);
    });
  });

  // ---------- 点击任意空白处：合拢成图 ----------
  // 说明：监听挂在 document 上，而不是只挂在 .stage 上。
  // 因为散开后碎片会飘到舞台之外，屏幕上真正的「空白」大多在 .stage 范围以外，
  // 只监听 stage 会导致「点空白没反应」。
  document.addEventListener('click', function (e) {
    // 开场动画还没结束（大门/视频/信封）：这些点击归 opening.js 管，这里不插手
    if (e.target.closest('#opening')) return;
    // 碎片自身有自己的点击逻辑（且已 stopPropagation），这里直接跳过
    if (e.target.closest('.piece')) return;
    // 卡片 / 名片 / 按钮内部的点击交给它们自己的处理逻辑，不算「空白」
    if (e.target.closest('.color-card-layer')) return;
    if (e.target.closest('.intro-card-layer')) return;
    if (e.target.closest('.back-btn')) return;

    playClick();

    // 入场动画播放中：点击空白处可跳过入场
    if (stage.classList.contains('entering')) {
      finishEntrance();
      return;
    }
    // 已散开：合拢成图（并顺带关闭可能打开的卡片）
    if (isExploded) {
      resetAll();
    }
  });

  // ---------- 蒙版 / 关闭按钮 ----------
  cardMask.addEventListener('click', function () {
    playClick();
    closeColorCard();
  });
  introCardMask.addEventListener('click', function () {
    playClick();
    closeIntro();
  });
  introCardClose.addEventListener('click', function (e) {
    e.stopPropagation();
    playClick();
    closeIntro();
  });
  // 介绍卡片本身不冒泡到蒙版
  document.getElementById('introCard').addEventListener('click', function (e) {
    e.stopPropagation();
  });

  // 初始化粒子
  buildParticles();
  // 初始化标题（拆成单字，等待 show 时逐字呈现）
  buildTitle();
})();
