/* =========================================================
   全局点击音效
   全站任意点击场景调用 window.playClickSound()
   ========================================================= */

(function () {
  'use strict';

  let clickAudio = null;

  function init() {
    clickAudio = document.getElementById('clickSound');
    if (!clickAudio) {
      console.warn('未找到 #clickSound 音频元素');
    }
  }

  // 播放点击音效（每次 currentTime=0，快速点击不会叠加卡顿）
  window.playClickSound = function () {
    if (!clickAudio) return;
    try {
      clickAudio.currentTime = 0;
      clickAudio.volume = 0.6;
      clickAudio.play().catch(function () {
        // 浏览器在某些时机可能拒绝播放，静默忽略
      });
    } catch (e) {
      /* 静默失败 */
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
