(function () {
  "use strict";

  const DATA = window.OZWOOD_DEMO;
  const products = DATA.products;
  const rooms = DATA.rooms;
  const AI_ENDPOINT = window.location.hostname.endsWith("github.io")
    ? "https://ozwood-ai-flooring-demo.vercel.app/api/ozwood-question"
    : "/api/ozwood-question";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const money = value => Math.round(value).toLocaleString("en-AU");
  const escapeHTML = value => String(value).replace(/[&<>'"]/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[char]);

  const state = {
    productKey: products[0].key,
    room: "living",
    compare: false,
    compareKey: products[1].key,
    compareSide: "a",
    split: 50,
    detailTab: "fit",
    storyId: DATA.stories[0].id,
    swapToken: 0,
    profile: {},
    answerOrder: [],
    history: [],
    chatBusy: false,
    chatComplete: false,
    pendingBatch: null,
    finalConfirmDone: false
  };

  const elements = {
    stage: $("#visualStage"),
    current: $("#sceneCurrent"),
    incoming: $("#sceneIncoming"),
    compareImage: $("#sceneCompare"),
    compareLine: $("#compareLine"),
    compareRange: $("#compareRange"),
    compareUi: $("#compareUi"),
    productStrip: $("#productStrip"),
    productStripHint: $("#productStripHint"),
    conceptRoom: $("#conceptRoom"),
    stageEyebrow: $("#stageEyebrow"),
    stageTitle: $("#stageTitle"),
    storyName: $("#floorStoryName"),
    labelA: $("#compareLabelA"),
    labelB: $("#compareLabelB"),
    sideA: $("#compareSideA"),
    sideB: $("#compareSideB"),
    compareHelp: $("#compareHelp"),
    drawer: $("#productDrawer"),
    drawerContent: $("#productDrawerContent"),
    detailBtn: $("#detailBtn"),
    compareBtn: $("#compareBtn"),
    storyOverlay: $("#storyOverlay"),
    storyNav: $("#storyNav"),
    storyFeature: $("#storyFeature"),
    chatStream: $("#chatStream"),
    quickOptions: $("#quickOptions"),
    chatInput: $("#chatInput"),
    progressLabel: $("#progressLabel"),
    progressBar: $("#progressBar"),
    toast: $("#toast")
  };

  function productByKey(key) {
    return products.find(product => product.key === key) || products[0];
  }

  function scenePath(productKey, room = state.room) {
    return `assets/ozwood/rooms/${room}-${productKey}.jpg`;
  }

  function productPriceHTML(product) {
    if (product.price == null) return `<span class="product-price quote"><b>获取报价</b></span>`;
    return `<span class="product-price"><b>AU$${product.price}</b><small>/m²</small>${product.originalPrice ? `<s>$${product.originalPrice}</s>` : ""}</span>`;
  }

  function renderProductStrip() {
    elements.productStrip.innerHTML = products.map(product => `
      <button class="product-card ${product.key === state.productKey ? "active" : ""} ${state.compare && product.key === state.compareKey ? "compare-target" : ""}" data-product="${product.key}" type="button" aria-label="查看 ${escapeHTML(product.name)} 铺装效果">
        <img class="product-thumb" src="${product.officialImage}" alt="${escapeHTML(product.shortName)} 的 Ozwood 官网产品图片">
        <span class="product-card-copy">
          <span class="product-code">${escapeHTML(product.code)}</span>
          <h3>${escapeHTML(product.shortName)}</h3>
          <span class="product-type">${escapeHTML(product.type)}</span>
          ${productPriceHTML(product)}
        </span>
        <span class="product-selected-mark">${state.compare ? (product.key === state.productKey ? "A" : product.key === state.compareKey ? "B" : "") : "✓"}</span>
      </button>
    `).join("");
  }

  function updateStageCopy() {
    const product = productByKey(state.productKey);
    const room = rooms[state.room];
    elements.conceptRoom.textContent = room.label;
    elements.stageEyebrow.textContent = `${product.tone} · ${product.type}`;
    elements.stageTitle.textContent = product.name;
    elements.storyName.textContent = product.name;
    elements.labelA.textContent = product.shortName;
    elements.labelB.textContent = productByKey(state.compareKey).shortName;
    elements.current.alt = `${room.label}中的${product.name}概念效果`;
    $$(".room-button").forEach(button => button.classList.toggle("active", button.dataset.room === state.room));
    if (elements.drawer.classList.contains("open")) renderProductDrawer();
  }

  function switchScene(productKey = state.productKey, room = state.room, instant = false) {
    const token = ++state.swapToken;
    const src = scenePath(productKey, room);
    const product = productByKey(productKey);
    if (instant) {
      elements.current.src = src;
      elements.current.alt = `${rooms[room].label}中的${product.name}概念效果`;
      return;
    }

    elements.stage.classList.add("processing");
    elements.incoming.classList.remove("show");
    elements.incoming.src = src;
    elements.incoming.onload = () => {
      if (token !== state.swapToken) return;
      requestAnimationFrame(() => elements.incoming.classList.add("show"));
      window.setTimeout(() => {
        if (token !== state.swapToken) return;
        elements.current.src = src;
        elements.current.alt = `${rooms[room].label}中的${product.name}概念效果`;
        elements.incoming.classList.remove("show");
        elements.stage.classList.remove("processing");
      }, 570);
    };
    elements.incoming.onerror = () => {
      if (token !== state.swapToken) return;
      elements.stage.classList.remove("processing");
      showToast("概念效果图加载失败，请重试");
    };
  }

  function chooseProduct(key, options = {}) {
    if (state.compare && !options.forcePrimary) {
      if (state.compareSide === "a") {
        if (key === state.compareKey) {
          showToast("这款已经在右侧 B，请为左侧 A 选择另一款");
          return;
        }
        if (key !== state.productKey) {
          state.productKey = key;
          switchScene(key, state.room);
          updateStageCopy();
        }
      } else {
        if (key === state.productKey) {
          showToast("这款已经在左侧 A，请为右侧 B 选择另一款");
          return;
        }
        state.compareKey = key;
        elements.compareImage.src = scenePath(key);
        elements.labelB.textContent = productByKey(key).shortName;
      }
      refreshCompareImage();
      renderProductStrip();
      return;
    }

    if (key === state.productKey && !options.force) return;
    state.productKey = key;
    if (state.compareKey === key) {
      state.compareKey = products.find(product => product.key !== key).key;
    }
    switchScene(key, state.room, options.instant);
    updateStageCopy();
    renderProductStrip();
    if (state.compare) refreshCompareImage();
  }

  function chooseRoom(room, options = {}) {
    if (!rooms[room] || room === state.room) return;
    state.room = room;
    switchScene(state.productKey, room, options.instant);
    updateStageCopy();
    if (state.compare) refreshCompareImage();
  }

  function refreshCompareImage() {
    elements.compareImage.src = scenePath(state.compareKey);
    elements.compareImage.style.clipPath = `inset(0 0 0 ${state.split}%)`;
    elements.compareLine.style.left = `${state.split}%`;
    elements.labelA.textContent = productByKey(state.productKey).shortName;
    elements.labelB.textContent = productByKey(state.compareKey).shortName;
    elements.sideA.classList.toggle("active", state.compareSide === "a");
    elements.sideB.classList.toggle("active", state.compareSide === "b");
    elements.compareHelp.textContent = `当前正在更换${state.compareSide === "a" ? "左侧 A" : "右侧 B"}`;
    elements.productStripHint.textContent = state.compare
      ? `正在替换${state.compareSide === "a" ? "左侧 A" : "右侧 B"} · 请从下方选择地板`
      : "点击任意产品即可查看铺装效果";
  }

  function setCompareSide(side) {
    if (!state.compare || !["a", "b"].includes(side)) return;
    state.compareSide = side;
    refreshCompareImage();
    renderProductStrip();
    showToast(`已选择${side === "a" ? "左侧 A" : "右侧 B"}，请从下方选择地板`);
  }

  function toggleCompare(force) {
    state.compare = typeof force === "boolean" ? force : !state.compare;
    elements.stage.classList.toggle("comparing", state.compare);
    elements.compareBtn.classList.toggle("active", state.compare);
    elements.compareBtn.querySelector("span").textContent = state.compare ? "退出对比" : "地板对比";
    if (state.compare) {
      if (state.compareKey === state.productKey) state.compareKey = products.find(product => product.key !== state.productKey).key;
      state.compareSide = "a";
      refreshCompareImage();
      closeProductDrawer();
      showToast("先点左侧 A 或右侧 B，再从下方选择地板");
    } else {
      elements.productStripHint.textContent = "点击任意产品即可查看铺装效果";
    }
    renderProductStrip();
  }

  function priceBlock(product) {
    if (product.price == null) return `<div class="detail-price-row"><b class="quote-price">获取当前报价</b></div>`;
    return `<div class="detail-price-row"><b>AU$${product.price}<small>/m²</small></b>${product.originalPrice ? `<s>AU$${product.originalPrice}/m²</s>` : ""}</div>`;
  }

  function detailTabCopy(product) {
    if (state.detailTab === "story") {
      return `<div class="detail-copy">${escapeHTML(product.story)}<strong>为什么这段故事重要</strong>${escapeHTML(product.why)}</div>`;
    }
    if (state.detailTab === "install") {
      return `<div class="detail-copy"><strong>安装前</strong>${escapeHTML(product.install)}<strong>交付后养护</strong>${escapeHTML(product.care)}<strong>需要注意</strong>${escapeHTML(product.avoid)}</div>`;
    }
    return `<div class="detail-copy">${escapeHTML(product.why)}<strong>最适合</strong>${product.bestFor.map(item => `• ${escapeHTML(item)}`).join("<br>")}</div>`;
  }

  function renderProductDrawer() {
    const product = productByKey(state.productKey);
    elements.drawerContent.innerHTML = `
      <img class="detail-cover" src="${product.officialImage}" alt="${escapeHTML(product.name)}的 Ozwood 官网产品图片">
      <span class="detail-eyebrow">${escapeHTML(product.code)} · ${escapeHTML(product.type)}</span>
      <h2 class="detail-name">${escapeHTML(product.name)}</h2>
      <div class="detail-sub">${escapeHTML(product.tone)} · 官网产品系列参考</div>
      ${priceBlock(product)}
      <div class="detail-tags">${product.tags.map(tag => `<span>${escapeHTML(tag)}</span>`).join("")}</div>
      <div class="detail-tabs">
        <button class="detail-tab ${state.detailTab === "fit" ? "active" : ""}" data-detail-tab="fit" type="button">为什么适合</button>
        <button class="detail-tab ${state.detailTab === "story" ? "active" : ""}" data-detail-tab="story" type="button">木材故事</button>
        <button class="detail-tab ${state.detailTab === "install" ? "active" : ""}" data-detail-tab="install" type="button">安装与养护</button>
      </div>
      ${detailTabCopy(product)}
      <div class="detail-specs">
        <div><small>产品规格</small><b title="${escapeHTML(product.specification)}">${escapeHTML(product.specification)}</b></div>
        <div><small>包装 / 拼法</small><b title="${escapeHTML(product.pack)}">${escapeHTML(product.pack)}</b></div>
        <div><small>结构特点</small><b title="${escapeHTML(product.profile)}">${escapeHTML(product.profile)}</b></div>
        <div><small>价格状态</small><b title="${escapeHTML(product.priceNote)}">向 Ozwood 确认</b></div>
      </div>
      <a class="source-link" href="${product.source}" target="_blank" rel="noreferrer">查看 Ozwood 官网参考 ↗</a>
    `;
  }

  function openProductDrawer(tab = state.detailTab) {
    state.detailTab = tab;
    if (state.compare) toggleCompare(false);
    renderProductDrawer();
    elements.drawer.classList.add("open");
    elements.drawer.setAttribute("aria-hidden", "false");
    elements.detailBtn.classList.add("active");
  }

  function closeProductDrawer() {
    elements.drawer.classList.remove("open");
    elements.drawer.setAttribute("aria-hidden", "true");
    elements.detailBtn.classList.remove("active");
  }

  function renderStoryNav() {
    elements.storyNav.innerHTML = DATA.stories.map(story => `
      <button class="story-nav-button ${story.id === state.storyId ? "active" : ""}" data-story="${story.id}" type="button">${escapeHTML(story.title)}</button>
    `).join("");
  }

  function renderStoryFeature() {
    const story = DATA.stories.find(item => item.id === state.storyId) || DATA.stories[0];
    elements.storyFeature.innerHTML = `
      <div class="story-feature-image"><img src="${story.image}" alt="${escapeHTML(story.title)}的 Ozwood 官网故事图片"></div>
      <div class="story-feature-copy">
        <small>${escapeHTML(story.eyebrow)}</small>
        <h3>${escapeHTML(story.title)}</h3>
        <p>${escapeHTML(story.text)}</p>
        <div class="story-facts">${story.facts.map(fact => `<span>${escapeHTML(fact)}</span>`).join("")}</div>
        <a class="story-source" href="${story.source}" target="_blank" rel="noreferrer">阅读官网原文 ↗</a>
      </div>
    `;
  }

  function openStories(storyId) {
    if (storyId) state.storyId = storyId;
    renderStoryNav();
    renderStoryFeature();
    elements.storyOverlay.classList.add("open");
    elements.storyOverlay.setAttribute("aria-hidden", "false");
  }

  function closeStories() {
    elements.storyOverlay.classList.remove("open");
    elements.storyOverlay.setAttribute("aria-hidden", "true");
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => elements.toast.classList.remove("show"), 2400);
  }

  function addMessage(role, content, html = false, record = true) {
    const row = document.createElement("div");
    row.className = `message-row ${role}`;
    if (role === "assistant") row.innerHTML = `<span class="message-avatar">OZ</span>`;
    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    if (html) bubble.innerHTML = content;
    else bubble.textContent = content;
    row.appendChild(bubble);
    elements.chatStream.appendChild(row);
    if (record) {
      const historyText = bubble.textContent.trim().slice(0, 1200);
      if (historyText) {
        state.history.push({ role, content: historyText });
        state.history = state.history.slice(-14);
      }
    }
    scrollChat();
    return row;
  }

  function showTyping() {
    const row = addMessage("assistant", '<span class="typing-dots"><i></i><i></i><i></i></span>', true, false);
    row.dataset.typing = "true";
    return row;
  }

  function scrollChat() {
    requestAnimationFrame(() => { elements.chatStream.scrollTop = elements.chatStream.scrollHeight; });
  }

  function answeredCount() {
    return DATA.questions.filter(question => state.profile[question.id] !== undefined).length;
  }

  function isCriticalQuestion(question) {
    return question.critical !== false;
  }

  function isMeaningfulValue(questionId, value) {
    if (value === undefined || value === "unknown") return false;
    if (questionId === "area") return Number.isFinite(Number(value)) && Number(value) >= 5 && Number(value) <= 3000;
    return true;
  }

  function criticalQuestions() {
    return DATA.questions.filter(isCriticalQuestion);
  }

  function isProfileComplete(profile = state.profile) {
    return criticalQuestions().every(question => isMeaningfulValue(question.id, profile[question.id]));
  }

  function firstIncompleteCritical(profile = state.profile) {
    return criticalQuestions().find(question => !isMeaningfulValue(question.id, profile[question.id])) || null;
  }

  function updateProgress() {
    const count = answeredCount();
    const completeLabel = isProfileComplete() ? "画像齐备" : `关键 ${criticalQuestions().filter(q => isMeaningfulValue(q.id, state.profile[q.id])).length}/${criticalQuestions().length}`;
    elements.progressLabel.textContent = `${count} / ${DATA.questions.length} · ${completeLabel}`;
    elements.progressBar.style.width = `${(count / DATA.questions.length) * 100}%`;
  }

  function firstMissingQuestion() {
    return DATA.questions.find(question => state.profile[question.id] === undefined) || null;
  }

  function nextDiscoveryQuestion() {
    return firstMissingQuestion() || firstIncompleteCritical();
  }

  function renderOptions(options) {
    elements.quickOptions.innerHTML = options.map(option => `<button class="quick-option" data-answer="${escapeHTML(option)}" type="button">${escapeHTML(option)}</button>`).join("");
  }

  function styleExplainerHTML() {
    return `
      <div class="style-explainer">
        <div><b>明亮通透</b><span>浅白或浅橡色，让小空间和一般采光显得更开阔。</span></div>
        <div><b>温暖自然</b><span>原木与暖棕色，家庭感更强，最容易搭配长期居住空间。</span></div>
        <div><b>温暖亮色</b><span>偏暖但更浅更亮，提亮空间又不失温馨。</span></div>
        <div><b>澳洲木材个性</b><span>木纹和天然色差更丰富，辨识度高，强调本土木材气质。</span></div>
        <div><b>人字拼设计感</b><span>拼法本身就是视觉焦点，更精致，但安装与损耗通常更高。</span></div>
        <div><b>冷灰现代</b><span>低饱和灰调，适合极简、现代和商用空间，氛围更克制。</span></div>
      </div>`;
  }

  /** 模糊色调描述 → 反问 + 更新底部快捷按钮，避免重复问同一句「喜欢什么颜色」 */
  function getStyleClarification(raw) {
    const text = String(raw || "").trim();
    if (!text) return null;
    if (/(明亮通透|温暖自然|温暖亮色|澳洲木材|人字拼|冷灰现代|原木暖棕|浅橡提亮)/.test(text)) return null;

    if (/^(温暖|暖色|偏暖|暖调|温馨|暖一点|喜欢暖)$/.test(text) || (/温暖|暖色|偏暖/.test(text) && !/自然|亮色|通透|冷|灰|人字|澳洲|浅白/.test(text))) {
      return {
        prompt: "听到「温暖」了——它可以是原木暖棕，也可以是偏暖的浅亮色。你更接近哪一种？",
        options: ["温暖自然 · 原木暖棕", "温暖亮色 · 浅橡提亮", "澳洲木材个性 · 暖而有色差", "人字拼设计感 · 暖色焦点"]
      };
    }
    if (/^(浅色|明亮|亮色|通透|显大|显亮|喜欢浅)$/.test(text) || (/浅色|明亮|通透/.test(text) && !/温暖自然|冷灰|人字|澳洲/.test(text) && text.length < 12)) {
      return {
        prompt: "「浅色/明亮」也有差别。你更想要哪一种空间感觉？",
        options: ["明亮通透 · 浅白提亮", "温暖亮色 · 浅橡偏暖", "冷灰现代 · 浅灰克制", "温暖自然 · 原木暖棕"]
      };
    }
    if (/^(冷色|灰色|现代|极简|喜欢冷)$/.test(text)) {
      return {
        prompt: "偏冷/现代也可以再细一点。你更接近哪一种？",
        options: ["冷灰现代 · 低饱和灰调", "明亮通透 · 浅白干净", "人字拼设计感 · 更有层次", "风格还不确定"]
      };
    }
    if (/^(自然|原木|日式)$/.test(text)) {
      return {
        prompt: "「自然/原木」常见有这几种落点，点一个最接近的：",
        options: ["温暖自然 · 原木暖棕", "温暖亮色 · 浅橡提亮", "澳洲木材个性 · 天然色差", "明亮通透 · 浅白干净"]
      };
    }
    return null;
  }

  function presentStyleClarification(clarify) {
    state.chatBusy = true;
    const typing = showTyping();
    window.setTimeout(() => {
      typing.remove();
      addMessage("assistant", `${escapeHTML(clarify.prompt)}${styleExplainerHTML()}`, true);
      renderOptions(clarify.options);
      state.chatBusy = false;
    }, 220);
  }

  function softDirectionAdvice(profile = state.profile) {
    const directions = [];
    if (profile.lighting === "dim") directions.push("采光偏弱时，更适合浅色或中浅色调来提亮空间");
    else if (profile.lighting === "bright") directions.push("采光充足时，可以考虑更深、更有个性的木材色调");
    if (profile.style === "light") directions.push("视觉上优先明亮通透的浅色方向");
    if (profile.style === "warm") directions.push("色调上更适合温暖原木感");
    if (profile.style === "cool") directions.push("色调上更适合低饱和冷灰现代感");
    if (profile.style === "herringbone") directions.push("若强调设计感，拼花铺法通常比直铺更有焦点，但施工与损耗更高");
    if (profile.style === "australian") directions.push("若喜欢本土木材个性，可接受更明显的天然色差");
    if (["kids", "pregnant", "mixed"].includes(profile.household)) directions.push("有小孩或孕妇时，优先易清洁、低维护、环保信息可核验的方向");
    if (profile.household === "elderly") directions.push("有老人时，更适合脚感稳定、日常维护友好的选择");
    if (profile.household === "pets" || profile.lifestyle === "kids-pets" || profile.lifestyle === "heavy") directions.push("耐磨耐脏会优先于纯外观");
    if (profile.moisture === "waterproof") directions.push("明确防水需求时，混合地板品类通常比纯木质方向更稳妥");
    else if (profile.moisture === "dry") directions.push("普通干区可以更放开考虑工程木与真实木质感");
    if (profile.budget === "under35") directions.push("预算偏紧时，强化或混合方向通常更现实");
    else if (profile.budget === "55plus") directions.push("预算更宽松时，可更侧重工程木质感或设计拼法");
    if (!directions.length) directions.push("已知条件还不多，先给综合稳妥方向");

    return `按目前已知条件，方向上建议：${directions.slice(0, 3).join("；")}。`;
  }

  /** 用户明确要求立刻推荐 / 列几款产品 */
  function wantsImmediateRecommendation(text) {
    const t = String(text || "").trim();
    if (!t) return false;
    return /(直接|现在|先).{0,24}(推荐|出结果|列\s*几|给\s*几|来几款)/.test(t)
      || /(给我推荐|推荐几[个款]|列几[个款]|给几[个款]|出几款|先推荐|不用再问|推荐一下)/.test(t)
      || /(适合的?(木板|地板|产品)|哪几款|有什么推荐|推荐模板)/.test(t)
      || /^(推荐(一下|一款|几款|吧)?)$/.test(t);
  }

  function partialRecommendationOptions() {
    return ["继续补全画像", "修改需求后重新推荐", "继续自由提问", "打开品牌故事"];
  }

  function askNext(delay = 330) {
    const question = nextDiscoveryQuestion();
    updateProgress();
    if (!question) {
      if (isProfileComplete() && !state.finalConfirmDone) {
        presentFinalConfirmation();
        return;
      }
      finishRecommendation(delay);
      return;
    }
    const revisiting = state.profile[question.id] === "unknown";
    state.chatBusy = true;
    const typing = showTyping();
    window.setTimeout(() => {
      typing.remove();
      const guide = question.id === "style" ? styleExplainerHTML() : "";
      const prefix = revisiting
        ? `<div class="question-resume"><b>这项对正式推荐很关键</b> · 之前记为待确认，补齐后才能点名具体型号。</div>`
        : "";
      addMessage("assistant", `${prefix}${escapeHTML(question.text)}${guide}`, true);
      renderOptions(question.options);
      state.chatBusy = false;
    }, delay);
  }

  const PROFILE_VALUES = {
    space: ["house", "apartment", "commercial", "unknown"],
    room: ["living", "bedroom", "study", "whole", "unknown"],
    lighting: ["bright", "medium", "dim", "unknown"],
    style: ["light", "warm", "australian", "herringbone", "cool", "unknown"],
    household: ["kids", "pregnant", "elderly", "pets", "mixed", "none", "unknown"],
    lifestyle: ["kids-pets", "heavy", "quiet", "rental", "unknown"],
    subfloor: ["concrete", "tiles", "timber", "unknown"],
    moisture: ["waterproof", "occasional", "dry", "unknown"],
    service: ["supply-install", "supply-only", "sample", "showroom", "unknown"],
    budget: ["under35", "35-55", "55plus", "quote", "unknown"]
  };
  const FIELD_LABELS = {
    space: "项目", room: "区域", area: "面积", lighting: "采光", style: "色调",
    household: "家庭情况", lifestyle: "使用强度", subfloor: "基层", moisture: "防水需求",
    service: "服务", budget: "预算"
  };
  const VALUE_LABELS = {
    house: "独立屋", apartment: "公寓", commercial: "商用空间", living: "客餐厅",
    bedroom: "卧室", study: "书房", whole: "全屋", bright: "采光很好", medium: "采光一般",
    dim: "采光比较暗", light: "明亮通透 / 温暖亮色", warm: "温暖自然",
    australian: "澳洲木材个性", herringbone: "人字拼", cool: "冷灰现代",
    kids: "有小孩", pregnant: "有孕妇或备孕", elderly: "有老人", pets: "有宠物",
    mixed: "多种特殊情况", none: "没有特殊情况",
    "kids-pets": "孩子宠物高频", heavy: "高频使用", quiet: "安静成人家庭", rental: "出租或投资房",
    concrete: "混凝土", tiles: "现有瓷砖", timber: "木基层", waterproof: "需要防水",
    occasional: "偶尔有水", dry: "普通干区", "supply-install": "供货加安装",
    "supply-only": "只供货", sample: "先寄样板", showroom: "先看展厅",
    under35: "单价 AU$35 以下", "35-55": "单价 AU$35–55", "55plus": "单价 AU$55 以上",
    quote: "先看效果再报价", unknown: "待确认"
  };

  function looksLikeQuestion(text) {
    return /[?？]/.test(text)
      || /^(请问|想问|问一下|我想知道)/.test(text)
      || /(区别|怎么|如何|为什么|什么|是否|能否|能不能|可不可以|可以吗|哪款|哪一个|哪个好|哪个|多少钱|适合吗|耐不耐|保养|安装|注意事项|建议)/.test(text);
  }

  function isDomainRelevantMessage(text) {
    return /(装修|翻新|房子|家里|房间|客厅|餐厅|卧室|书房|厨房|地板|木板|铺装|材料|安装|基层|防水|预算|面积|平方米|平米|采光|光线|色调|颜色|小孩|孩子|孕妇|老人|宠物|展厅|样板|ozwood|floor|renovat|interior|subfloor)/i.test(text)
      || /(?:\d+(?:\.\d+)?\s*(?:平|m²|m2|square)|约\s*\d+\s*(?:平|m))/i.test(text);
  }

  function localKnowledgeAnswer(question) {
    const text = question.toLowerCase();
    if (/(明亮|温暖|澳洲木材|人字拼|冷灰|这几个|五个).*(区别|怎么选)|风格.*区别/.test(text)) {
      return "这五个选项描述的是空间感觉，不是产品等级：明亮通透用浅色放大空间；温暖自然强调舒适和百搭；澳洲木材个性突出天然色差；人字拼把地面变成设计焦点，但人工和损耗更高；冷灰现代更克制。";
    }
    if (/(工程木|强化|混合|hybrid|laminate).*(区别|怎么选)|区别.*(工程木|强化|混合)/.test(text)) {
      return "工程木表层是真实木材，质感自然但要控制水分；强化地板耐磨、价格友好、锁扣快装；混合地板更强调防水和日常省心，但天然木材触感较弱。人字拼主要是铺装形式，成本和施工精度通常更高。";
    }
    if (/(防水|潮湿|厨房|水渍)/.test(text)) {
      return "当前五款里，灰橡混合地板明确强调防水；OZ2628 白橡木是防潮耐水，并不等于完全防水；木质方向安装前必须确认基层含水率，也不建议长期积水。";
    }
    if (/(孩子|宠物|猫|狗|耐磨|耐脏)/.test(text)) {
      return "孩子、宠物和高频使用优先看灰橡混合地板或澳洲斑纹桉：前者防水、省心且预算友好；后者硬度和木材个性更强，但需要接受天然色差与木地板养护。";
    }
    if (/(价格|预算|多少钱|报价)/.test(text)) {
      return "官网参考中，灰橡混合地板约 AU$19.8/m²、OZ2628 白橡木约 AU$28.8/m²、欧洲橡木 5106 约 AU$49/m²；斑纹桉和人字拼需单独报价。正式报价仍要确认库存、批次、面积、损耗和安装条件。";
    }
    if (/(斑纹桉|spotted gum)/.test(text)) {
      return "澳洲斑纹桉木纹和色彩变化明显，常见灰、蜂蜜色与暖棕变化，硬度和本土辨识度突出，适合接受天然色差、希望地面更有个性的家庭。";
    }
    if (/(人字拼|herringbone)/.test(text)) {
      return "人字拼的优势是方向感、层次和高端设计感；代价是放线、切割、收边更复杂，材料损耗和安装费通常高于直铺。";
    }
    if (/(安装|基层|混凝土|瓷砖|找平|含水率)/.test(text)) {
      return "无论选择哪款，都要先确认基层平整度和含水率。混凝土要检测潮气，旧瓷砖要确认牢固平整，人字拼需要专业放线，锁扣类也必须保留伸缩缝。";
    }
    if (/(保养|养护|清洁|拖地)/.test(text)) {
      return "日常先清除砂粒并及时处理水渍。工程木使用微湿拖布和木地板清洁剂；强化和混合地板更容易打理，但也应避免磨蚀清洁剂。";
    }
    return "我可以直接回答任何与地板选购、材料、安装、养护和 Ozwood 产品相关的问题；如果云端 AI 暂时不可用，我仍会保留你的咨询进度，不会把这句话误当成预设答案。";
  }

  function isBudgetDominantText(text) {
    const t = String(text || "");
    return /(au\s*\$|澳元|预算|每平|单价|材料价|\/\s*m²|\/\s*m2|\d+\s*以下|\d+\s*以上|\d+\s*[–—\-]\s*\d+|有钱|不设上限|先看效果再报价)/i.test(t)
      && !/(面积|平方米|平米|(?:约\s*)?\d+(?:\.\d+)?\s*(?:平方米|平米|m²|m2))/i.test(t);
  }

  function isAreaDominantText(text) {
    const t = String(text || "");
    return /(面积|(?:约\s*)?\d+(?:\.\d+)?\s*(?:平方米|平米|m²|m2)|(?:改为|改成)\s*(?:约\s*)?\d+)/i.test(t)
      && !/(au\s*\$|澳元|预算|每平|单价)/i.test(t);
  }

  function scrubAreaBudgetCollision(patch, text, currentQuestionId) {
    const clean = { ...patch };
    const t = String(text || "");
    const areaExplicit = /(面积|(?:约\s*)?\d+(?:\.\d+)?\s*(?:平方米|平米|m²|m2))/i.test(t);
    const budgetExplicit = /(au\s*\$|澳元|预算|每平|单价|\d+\s*以下|\d+\s*以上|\d+\s*[–—\-]\s*\d+|有钱|先看效果)/i.test(t);

    // 当前在答预算题：除非明确写了面积单位，否则丢掉面积
    if (currentQuestionId === "budget" && clean.area !== undefined && !areaExplicit) delete clean.area;
    // 当前在答面积题：除非明确写了预算/AU$，否则丢掉预算
    if (currentQuestionId === "area" && clean.budget !== undefined && !budgetExplicit) delete clean.budget;

    // 整句是预算主导（如 AU$55 以上）：禁止写入面积
    if (isBudgetDominantText(t)) delete clean.area;
    // 整句是面积主导：禁止写入预算
    if (isAreaDominantText(t) && !budgetExplicit) delete clean.budget;

    // 同句撞车：面积值刚好是 35/55，且句子在谈预算带，又没有面积单位 → 删面积
    if (clean.budget && (Number(clean.area) === 35 || Number(clean.area) === 55) && !areaExplicit) {
      delete clean.area;
    }
    return clean;
  }

  function normalizeForQuestion(questionId, raw) {
    const text = String(raw).toLowerCase().replace(/＄/g, "$");
    const maps = {
      space: [[/公寓|apartment|unit|unit\b/, "apartment"], [/办公|商用|office|commercial/, "commercial"], [/独立屋|别墅|townhouse|\bhouse\b/, "house"], [/不确定|没确定/, "unknown"]],
      room: [[/卧室|bedroom/, "bedroom"], [/书房|home\s*office/, "study"], [/全屋|whole/, "whole"], [/客厅|餐厅|living|dining/, "living"]],
      lighting: [[/采光\s*(很好|不错|充足|好)|光线\s*(很好|充足|亮)|很亮|明亮/, "bright"], [/采光\s*(一般|中等|还行)|光线\s*(一般|中等)/, "medium"], [/采光\s*(差|暗|不足)|比较暗|昏暗|偏暗/, "dim"], [/不确定|不清楚|不知道|暂时不清楚/, "unknown"]],
      style: [
        [/温暖亮色|浅橡提亮|浅橡偏暖|暖而偏亮/, "light"],
        [/明亮通透|浅白提亮|浅白干净|奶油|北欧|light\b|white/, "light"],
        [/温暖自然|原木暖棕|暖棕色|日式原木/, "warm"],
        [/人字|herring|设计感|暖色焦点/, "herringbone"],
        [/澳洲|斑纹|个性|spotted|暖而有色差|天然色差/, "australian"],
        [/冷灰|灰色调|浅灰克制|极简冷|modern grey|cool/, "cool"],
        [/风格还不确定|不确定|没想好/, "unknown"]
      ],
      household: [[/多种|都有|(小孩|孩子|儿童).{0,6}(宠物|猫|狗)|(宠物|猫|狗).{0,6}(小孩|孩子)|(孕妇|备孕).{0,8}(老人|小孩|孩子)|(老人|长辈).{0,8}(孕妇|小孩|孩子|宠物)/, "mixed"], [/孕妇|备孕|怀孕|pregnancy/, "pregnant"], [/老人|长辈|elderly/, "elderly"], [/(没有特殊|无特殊|都没有|没有以上|没有宠物|没养猫|没养狗)/, "none"], [/小孩|孩子|儿童|kids?/, "kids"], [/宠物|养猫|养狗|有只猫|有只狗|一只猫|一只狗|养了猫|养了狗|有猫|有狗|猫|狗|pets?/, "pets"]],
      lifestyle: [[/孩子和宠物|小孩.*宠物|宠物.*高频|高频.*宠物|耐磨优先|人流较大|heavy/, "kids-pets"], [/人流|耐磨|heavy/, "heavy"], [/出租|投资|rental|investment/, "rental"], [/安静|成人/, "quiet"]],
      subfloor: [[/瓷砖|tile/, "tiles"], [/混凝土|水泥|concrete|slab/, "concrete"], [/木基层|timber subfloor/, "timber"], [/不清楚|不知道/, "unknown"]],
      moisture: [[/需要防水|很潮|wet|waterproof/, "waterproof"], [/偶尔|清洁|spill/, "occasional"], [/干区|普通|dry/, "dry"], [/判断|不清楚/, "unknown"]],
      service: [[/供货.*安装|supply.*install/, "supply-install"], [/只.*供货|supply only/, "supply-only"], [/样板|sample/, "sample"], [/展厅|showroom/, "showroom"]],
      budget: [
        [/单价\s*au\s*\$?\s*35\s*以下|au\s*\$?\s*35\s*以下|under\s*\$?35|预算低/, "under35"],
        [/单价\s*au\s*\$?\s*35\s*[–—\-]\s*55|au\s*\$?\s*35\s*[–—\-]\s*55|35\s*[–—\-]\s*55/, "35-55"],
        [/单价\s*au\s*\$?\s*55\s*以上|au\s*\$?\s*55\s*以上|over\s*\$?55|高预算|有钱|不设上限|我有钱/, "55plus"],
        [/报价|效果|先看效果|quote/, "quote"]
      ]
    };
    if (questionId === "area") {
      if (/(暂时不清楚|不清楚|不确定|不知道|没测)/.test(text)) return "unknown";
      // 预算句一律不抽面积
      if (isBudgetDominantText(text)) return undefined;

      const withUnit = text.match(/(?:面积\s*(?:约\s*)?)?(\d{1,4}(?:\.\d+)?)\s*(?:平方米|平米|m²|m2)/i);
      if (withUnit) {
        const value = Number(withUnit[1]);
        return Number.isFinite(value) && value >= 5 && value <= 3000 ? value : undefined;
      }
      const withLabel = text.match(/面积\s*(?:改为|改成|约|是|为)?\s*(\d{1,4}(?:\.\d+)?)/i)
        || text.match(/(?:改为|改成)\s*(?:约\s*)?(\d{1,4}(?:\.\d+)?)\s*(?:平方米|平米|m²|m2|平)?/i);
      if (withLabel && !isBudgetDominantText(text)) {
        // 「改为 80」在无预算语境下可视为面积；若同句有 AU$/预算则上面已拦截
        const value = Number(withLabel[1]);
        if (/(au\s*\$|预算|单价)/i.test(text) && !/(面积|平方米|平米|m²|m2)/i.test(text)) return undefined;
        return Number.isFinite(value) && value >= 5 && value <= 3000 ? value : undefined;
      }
      // 整句仅为面积数字（当前答题场景由调用方约束）
      const bare = text.match(/^(?:约\s*)?(\d{1,4}(?:\.\d+)?)\s*(?:平|平方米|平米|m²|m2)?$/i);
      if (bare && !/(au\s*\$|预算|以下|以上)/i.test(text)) {
        const value = Number(bare[1]);
        return Number.isFinite(value) && value >= 5 && value <= 3000 ? value : undefined;
      }
      return undefined;
    }
    if (questionId === "budget") {
      if (isAreaDominantText(text) && !/(au\s*\$|预算|单价|每平|以下|以上)/i.test(text)) return undefined;
      const direct = (maps.budget || []).find(([pattern]) => pattern.test(text));
      if (direct) return direct[1];
      const amount = text.match(/(?:预算|每平|每平方米|单价|au\s*\$|\$)\D{0,8}(\d{2,3})/i);
      if (amount) {
        const value = Number(amount[1]);
        if (value < 35) return "under35";
        if (value <= 55) return "35-55";
        return "55plus";
      }
      return undefined;
    }
    const match = (maps[questionId] || []).find(([pattern]) => pattern.test(text));
    return match ? match[1] : undefined;
  }

  function sanitizeProfilePatch(patch) {
    const safe = {};
    if (!patch || typeof patch !== "object") return safe;
    DATA.questions.forEach(question => {
      const value = patch[question.id];
      if (question.id === "area") {
        if (value === "unknown") safe.area = "unknown";
        else if (Number.isFinite(Number(value)) && Number(value) >= 5 && Number(value) <= 3000) safe.area = Number(value);
      } else if (PROFILE_VALUES[question.id]?.includes(value)) {
        safe[question.id] = value;
      }
    });
    return safe;
  }

  function extractProfilePatch(raw, currentQuestionId = null) {
    const text = String(raw || "");
    const patch = {};
    DATA.questions.forEach(question => {
      // 答预算题时跳过面积抽取；答面积题时跳过预算抽取（除非同句明确双写）
      if (currentQuestionId === "budget" && question.id === "area" && !/(面积|平方米|平米|m²|m2)/i.test(text)) return;
      if (currentQuestionId === "area" && question.id === "budget" && !/(预算|au\s*\$|单价|每平)/i.test(text)) return;
      const value = normalizeForQuestion(question.id, text);
      if (value !== undefined) patch[question.id] = value;
    });
    // 只说「有猫/有狗」时写入 household=pets，不擅自写成使用强度=孩子宠物高频
    if (patch.lifestyle === "kids-pets"
      && !/(孩子和宠物|小孩|儿童|高频|耐磨|人流)/.test(text)
      && /(猫|狗|宠物|养猫|养狗)/.test(text)) {
      delete patch.lifestyle;
      if (!patch.household) patch.household = "pets";
    }
    // 兜底：提到猫狗但尚未写入家庭情况
    if (!patch.household && /(猫|狗|宠物)/.test(text) && !/(没有宠物|没养猫|没养狗)/.test(text)) {
      patch.household = "pets";
    }
    return sanitizeProfilePatch(scrubAreaBudgetCollision(patch, text, currentQuestionId));
  }

  function formatPatchFields(patch) {
    return Object.entries(patch || {}).map(([id, value]) => {
      const display = id === "area" && value !== "unknown" ? `${value} m²` : (VALUE_LABELS[value] || String(value));
      return `${FIELD_LABELS[id]}：${display}`;
    }).join("、");
  }

  function definedProfile(profile = state.profile) {
    const snap = {};
    DATA.questions.forEach(question => {
      if (profile[question.id] !== undefined) snap[question.id] = profile[question.id];
    });
    return snap;
  }

  function formatFullProfile(profile = state.profile) {
    return DATA.questions
      .filter(question => profile[question.id] !== undefined)
      .map(question => {
        const value = profile[question.id];
        const display = question.id === "area" && value !== "unknown" ? `${value} m²` : (VALUE_LABELS[value] || String(value));
        return `${FIELD_LABELS[question.id]}：${display}`;
      })
      .join("、");
  }

  /** 文本里是否同时出现多类画像信号（不依赖抽取是否完全成功） */
  function countProfileSignals(raw) {
    const text = String(raw || "");
    let count = 0;
    if (/(公寓|独立屋|别墅|商用|办公|住宅)/.test(text)) count += 1;
    if (/(面积|.+(?:平方米|平米|平方|m²|m2)|(?:改为|改成)\s*\d+)/.test(text)) count += 1;
    if (/(猫|狗|宠物|小孩|孩子|孕妇|备孕|老人|长辈)/.test(text)) count += 1;
    if (/(采光|光线|偏暗|昏暗)/.test(text)) count += 1;
    if (/(客厅|餐厅|卧室|书房|全屋)/.test(text)) count += 1;
    if (/(预算|每平|AU\s*\$|澳元)/i.test(text)) count += 1;
    if (/(温暖|明亮|冷灰|人字|原木|浅色|色调)/.test(text)) count += 1;
    if (/(防水|潮湿|干区)/.test(text)) count += 1;
    return count;
  }

  function shouldConfirmBatch(patch, currentQuestion, rawText = "") {
    const keys = Object.keys(patch || {});
    if (!keys.length) return false;
    // 只回答当前题的一个选项/一句答案时，不要强行弹确认
    if (keys.length === 1 && currentQuestion && keys[0] === currentQuestion.id) return false;
    if (keys.length >= 2) return true;
    if (keys.length >= 1 && countProfileSignals(rawText) >= 2) return true;
    if (keys.length === 1 && currentQuestion && keys[0] !== currentQuestion.id) return true;
    return false;
  }

  function presentBatchConfirmation(patch) {
    const safe = sanitizeProfilePatch(patch);
    if (!Object.keys(safe).length) return false;
    state.pendingBatch = { patch: safe, final: false };
    state.chatBusy = false;
    elements.quickOptions.innerHTML = "";
    const mergedPreview = { ...definedProfile(), ...safe };
    const updateSummary = formatPatchFields(safe);
    const fullSummary = formatFullProfile(mergedPreview);
    const hasExisting = Object.keys(definedProfile()).length > 0;
    const message = hasExisting
      ? `好，按你这次说的，将更新：<strong>${escapeHTML(updateSummary)}</strong>。<br>合在一起目前是：<strong>${escapeHTML(fullSummary)}</strong>。<br>这样理解对吗？`
      : `好，我大概知道了：<strong>${escapeHTML(updateSummary)}</strong>。<br>我跟你确认一下，这样理解对吗？`;
    addMessage("assistant", message, true);
    renderOptions(["确认无误", "有偏差，我要更正"]);
    return true;
  }

  function presentFinalConfirmation() {
    if (!isProfileComplete()) {
      askNext(200);
      return;
    }
    state.pendingBatch = { patch: {}, final: true };
    state.chatBusy = false;
    elements.quickOptions.innerHTML = "";
    addMessage(
      "assistant",
      `关键画像已经齐了，请最后核对一遍全部条件：<br><strong>${escapeHTML(formatFullProfile())}</strong><br>确认后我会据此给出具体型号推荐。`,
      true
    );
    renderOptions(["确认无误，开始推荐", "有偏差，我要更正"]);
  }

  function handlePendingBatchResponse(text) {
    if (!state.pendingBatch) return false;
    const confirm = /^(确认无误|确认无误，开始推荐|确认|对的|没错|没问题|可以|是的|对|嗯|好的?|ok)$/i.test(text)
      || /确认无误|开始推荐|这样理解对|没问题/.test(text);
    const correct = /^(有偏差|我要更正|更正|不对|不是|有误)$/i.test(text)
      || /有偏差|我要更正|理解错|不对|不是/.test(text);

    if (confirm) {
      if (state.pendingBatch.final) {
        state.pendingBatch = null;
        state.finalConfirmDone = true;
        addMessage("assistant", "好的，全部条件已确认。我现在按完整画像匹配产品。");
        finishRecommendation(260);
        return true;
      }
      const { patch } = state.pendingBatch;
      state.pendingBatch = null;
      const changed = applyProfilePatch(patch);
      addMessage(
        "assistant",
        `好的，已记下：${escapeHTML(formatCapturedFields(changed.length ? changed : Object.keys(patch)))}。`,
        true
      );
      if (isProfileComplete()) presentFinalConfirmation();
      else askNext(240);
      return true;
    }

    if (correct) {
      const wasFinal = state.pendingBatch.final;
      state.pendingBatch = null;
      if (wasFinal) state.finalConfirmDone = false;
      addMessage(
        "assistant",
        "好的，哪里需要改？直接说就行，例如「不是公寓，是独立屋」「面积改成 80」「没有宠物」。改完我会再跟你确认一次。"
      );
      const question = nextDiscoveryQuestion();
      renderOptions(question ? ["重新描述需求", ...question.options.slice(0, 3)] : ["重新描述需求"]);
      return true;
    }

    // 待确认期间用户又补充/修正：只合并明确抽出的字段，并带上已有画像再确认
    if (!looksLikeQuestion(text)) {
      const correction = extractProfilePatch(text, nextDiscoveryQuestion()?.id);
      if (Object.keys(correction).length) {
        const base = state.pendingBatch.final
          ? definedProfile()
          : { ...definedProfile(), ...state.pendingBatch.patch };
        const merged = { ...base, ...correction };
        // 最终确认阶段改完后，改回普通确认（先确认修改），确认后再进最终确认
        state.pendingBatch = { patch: correction, final: false };
        presentBatchConfirmation(Object.keys(correction).length ? correction : merged);
        // presentBatchConfirmation 会重设 pendingBatch.patch = correction only; show merged via definedProfile merge — good
        return true;
      }
    }
    return false;
  }

  function corroborateModelPatch(modelPatch, evidencePatch, text, intent) {
    if (!['requirements', 'mixed', 'direct_recommend'].includes(intent)) return {};
    const safe = scrubAreaBudgetCollision(sanitizeProfilePatch(modelPatch), text, null);
    const corroborated = {};
    Object.entries(safe).forEach(([id, value]) => {
      if (evidencePatch[id] !== value) return;
      if (intent === 'mixed' && id === 'style' && !/(喜欢|想要|偏好|倾向|选定|改成|风格|色调|颜色)/.test(text)) return;
      if (intent === 'mixed' && id === 'room' && !/(主要|准备|打算|需要|想|改造|铺).{0,12}(客厅|餐厅|卧室|书房|全屋)/.test(text)) return;
      if (intent === 'mixed' && id === 'lighting' && !/(采光|光线|明亮|偏暗|昏暗)/.test(text)) return;
      if (intent === 'mixed' && id === 'household' && !/(小孩|孩子|孕妇|备孕|老人|长辈|宠物|猫|狗|特殊)/.test(text)) return;
      if (id === 'area' && isBudgetDominantText(text)) return;
      if (id === 'budget' && isAreaDominantText(text) && !/(预算|au\s*\$|单价)/i.test(text)) return;
      corroborated[id] = value;
    });
    return corroborated;
  }

  function cleanAIAnswer(answer, currentQuestion) {
    let cleaned = String(answer || '').trim();
    const currentText = String(currentQuestion?.text || '').trim();
    if (currentText) cleaned = cleaned.split(currentText).join('').replace(/\s{2,}/g, ' ').trim();
    const currentStem = currentText.split(/[？?。！!]/)[0].trim();
    if (currentStem) {
      const escapedStem = currentStem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const repeatedQuestion = new RegExp(`(?:^|[\\n。！？])[^\\n。！？]{0,40}${escapedStem}[^\\n。！？]*[。！？]?`, 'g');
      cleaned = cleaned.replace(repeatedQuestion, '。').replace(/^。/, '').replace(/。{2,}/g, '。').replace(/\s{2,}/g, ' ').trim();
    }
    cleaned = cleaned.replace(/[^。！？\n]*(?:都有现货|目前有现货|现在有现货|库存充足|现货充足)[。！？]?/g, '具体库存需要向 Ozwood 确认。');
    return cleaned
      .replace(/\n*\s*(?:我们|接下来|现在).{0,12}(?:继续|回到).{0,12}(?:问题|流程)[：:]?\s*$/i, '')
      .trim();
  }

  function applyProfilePatch(patch) {
    const safe = sanitizeProfilePatch(patch);
    const changed = [];
    Object.entries(safe).forEach(([id, value]) => {
      if (state.profile[id] === value) return;
      state.profile[id] = value;
      state.answerOrder = state.answerOrder.filter(item => item !== id);
      state.answerOrder.push(id);
      changed.push(id);
    });
    if (changed.length) {
      state.chatComplete = false;
      state.finalConfirmDone = false;
      updateProgress();
      if (["living", "bedroom", "study"].includes(state.profile.room)) chooseRoom(state.profile.room);
    }
    return changed;
  }

  function formatCapturedFields(ids) {
    const unique = [...new Set(ids)];
    return unique.map(id => {
      const value = state.profile[id];
      const display = id === "area" && value !== "unknown" ? `${value} m²` : (VALUE_LABELS[value] || String(value));
      return `${FIELD_LABELS[id]}：${display}`;
    }).join(" · ");
  }

  function completedOptions() {
    return ["继续自由提问", "修改需求后重新推荐", "重新做一次需求问答", "打开品牌故事"];
  }

  async function callFlexibleAI(text, currentQuestion) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(AI_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text,
          history: state.history.slice(0, -1),
          profile: state.profile,
          currentQuestion: currentQuestion ? { id: currentQuestion.id, text: currentQuestion.text } : null
        }),
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`AI ${response.status}`);
      const data = await response.json();
      return {
        answer: typeof data.answer === "string" ? cleanAIAnswer(data.answer, currentQuestion).slice(0, 1200) : "",
        bridge: typeof data.bridge === "string" ? cleanAIAnswer(data.bridge, null).slice(0, 300) : "",
        intent: typeof data.intent === "string" ? data.intent : "question",
        route: typeof data.route === "string" ? data.route : "general",
        profilePatch: sanitizeProfilePatch(data.profilePatch),
        sources: Array.isArray(data.sources) ? data.sources.filter(source => typeof source === "string").slice(0, 3) : [],
        fallback: data.fallback === true,
        reason: typeof data.reason === "string" ? data.reason : ""
      };
    } finally {
      window.clearTimeout(timer);
    }
  }

  async function handleFlexibleInput(text) {
    const currentBefore = firstMissingQuestion() || firstIncompleteCritical();
    const questionLike = looksLikeQuestion(text);
    const domainRelevant = isDomainRelevantMessage(text);
    const evidencePatch = domainRelevant ? extractProfilePatch(text, currentBefore?.id) : {};
    // 当前流程题的自由文本答案（如“约100平”）即使没有点选项，也要直接写入。
    if (currentBefore && !questionLike) {
      const directValue = normalizeForQuestion(currentBefore.id, text);
      if (directValue !== undefined) evidencePatch[currentBefore.id] = directValue;
    }
    // 问句里的产品或风格关键词可能只是比较对象，不能直接当作用户偏好。
    // 非装修语境中的“孩子、宠物、预算”等词也不能污染画像。
    // 但明确的面积/预算数字或当前题答案仍应保留。
    const localPatch = questionLike
      ? Object.fromEntries(Object.entries(evidencePatch).filter(([id]) => id === "area" || id === "budget" || id === currentBefore?.id))
      : evidencePatch;

    const directRecommendation = wantsImmediateRecommendation(text);

    // 多条件一次描述：先确认再写入，避免用户被迫重走全流程
    if (!questionLike && !directRecommendation && shouldConfirmBatch(localPatch, currentBefore, text)) {
      presentBatchConfirmation(localPatch);
      return;
    }

    const changed = applyProfilePatch(localPatch);
    state.chatBusy = true;
    const typing = showTyping();
    if (directRecommendation) {
      typing.remove();
      if (changed.length) addMessage("assistant", `已更新你的需求：${formatCapturedFields(changed)}。`);
      state.chatBusy = false;
      requestImmediateRecommendation(220);
      return;
    }
    let result = {
      answer: localKnowledgeAnswer(text),
      bridge: "",
      intent: changed.length ? "requirements" : "question",
      route: "flooring",
      profilePatch: {},
      sources: []
    };
    try {
      result = await callFlexibleAI(text, currentBefore);
    } catch (_) {
      // 云端中断时继续使用本地理解与知识，不破坏当前问答状态。
    }
    if (result.fallback) {
      typing.remove();
      addMessage("assistant", result.answer || "抱歉，服务暂时没有成功返回内容。请再发送一次，你的咨询进度不会丢失。");
      state.chatBusy = false;
      const latestAfterFallback = nextDiscoveryQuestion();
      if (changed.length && latestAfterFallback && latestAfterFallback.id !== currentBefore?.id) {
        askNext(160);
      } else if (latestAfterFallback) {
        renderOptions(latestAfterFallback.options);
      } else {
        renderOptions(completedOptions());
      }
      return;
    }

    const modelPatch = corroborateModelPatch(result.profilePatch, evidencePatch, text, result.intent);
    // 模型又抽出多项：走确认，不直接落库推进
    if (!questionLike && result.intent !== "direct_recommend" && !wantsImmediateRecommendation(text) && shouldConfirmBatch({ ...localPatch, ...modelPatch }, currentBefore, text)) {
      typing.remove();
      state.chatBusy = false;
      presentBatchConfirmation({ ...localPatch, ...modelPatch });
      return;
    }
    const modelChanged = applyProfilePatch(modelPatch);
    const allChanged = [...new Set([...changed, ...modelChanged])];
    typing.remove();

    if (result.intent === "direct_recommend" || wantsImmediateRecommendation(text)) {
      if (allChanged.length) addMessage("assistant", `已更新你的需求：${escapeHTML(formatCapturedFields(allChanged))}。`);
      state.chatBusy = false;
      requestImmediateRecommendation(260);
      return;
    }

    const latestQuestion = nextDiscoveryQuestion();
    const shouldAnswer = ["question", "mixed", "off_topic"].includes(result.intent) || (!allChanged.length && result.answer);
    const parts = [];
    if (shouldAnswer && result.answer) parts.push(escapeHTML(result.answer));
    if (result.bridge && result.route !== "general" && result.route !== "high_risk") parts.push(`<span class="conversation-bridge">${escapeHTML(result.bridge)}</span>`);
    if (allChanged.length) parts.push(`<strong>已理解：</strong>${escapeHTML(formatCapturedFields(allChanged))}`);
    if (result.sources?.length) {
      const sourceLinks = result.sources.map((source, index) => `<a href="${escapeHTML(source)}" target="_blank" rel="noopener noreferrer">官网依据 ${index + 1}</a>`).join(" · ");
      parts.push(`<small class="answer-sources">${sourceLinks}</small>`);
    }
    if (!parts.length) parts.push(escapeHTML(result.answer || localKnowledgeAnswer(text)));

    if (!allChanged.length && latestQuestion) {
      parts.push(`<div class="question-resume"><b>进度没有丢失</b> · 回答完你的问题后，我们仍停在：${escapeHTML(latestQuestion.text)}</div>`);
    } else if (!latestQuestion && isProfileComplete()) {
      parts.push('<div class="question-resume">关键画像已经齐备，你仍可以继续自由提问，或修改任何条件后重新推荐。</div>');
    } else if (!firstMissingQuestion() && firstIncompleteCritical()) {
      parts.push('<div class="question-resume">还有关键条件待确认；补齐后才能给出具体型号匹配。</div>');
    }
    addMessage("assistant", parts.join("<br>"), true);
    state.chatBusy = false;

    if (!latestQuestion) {
      if (allChanged.length || isProfileComplete()) finishRecommendation(260);
      else renderOptions(completedOptions());
    } else if (allChanged.length) {
      askNext(260);
    } else {
      renderOptions(latestQuestion.options);
    }
  }

  function acknowledge(questionId) {
    const messages = {
      space: "收到，我会按这个项目类型考虑稳定性、使用强度和安装条件。",
      room: "明白，场景已经同步；接下来把面积和采光补齐。",
      area: "好的，我会把材料损耗和安装做成可解释的概念估算。",
      lighting: "采光条件记下了，这会影响深浅色调的匹配。",
      style: "色调偏好很清楚了，我会避免推荐感觉相反的产品。",
      household: "家庭特殊情况很重要，清洁、安全和脚感会进入排序。",
      lifestyle: "这个条件很重要，耐磨、清洁和日常维护会进入排序。",
      subfloor: "记下了。最终报价前仍建议现场检查平整度与含水率。",
      moisture: "明白，我会把“防潮耐水”和“完全防水”区分开。",
      service: "好的，结果里会给出相应的下一步行动。",
      budget: "材料单价预算收到（按 AU$/m²，不是面积）。我现在把产品、场景、性能和服务方式放在一起匹配。"
    };
    return messages[questionId] || "收到，我已经把这个条件加入推荐。";
  }

  function submitAnswer(raw, options = {}) {
    const text = String(raw).trim();
    if (!text || state.chatBusy) return;
    if (/^(重新开始|从头开始|清空重来|重做一次)$/.test(text)) {
      startChat();
      showToast("已重新开始咨询");
      return;
    }
    addMessage("user", text);
    elements.chatInput.value = "";
    elements.quickOptions.innerHTML = "";

    // 批量画像确认 / 更正优先处理
    if (state.pendingBatch && handlePendingBatchResponse(text)) return;

    const currentQuestion = firstMissingQuestion() || firstIncompleteCritical();

    // 用户明确要求立刻推荐：不再追问补全，按当前画像出产品卡
    if (wantsImmediateRecommendation(text)) {
      const patch = extractProfilePatch(text, currentQuestion?.id);
      if (Object.keys(patch).length) applyProfilePatch(patch);
      requestImmediateRecommendation(220);
      return;
    }

    if (/^(上一步|返回上一题|撤销上一个答案)$/.test(text)) {
      const previous = state.answerOrder.pop();
      if (previous) {
        delete state.profile[previous];
        state.chatComplete = false;
        updateProgress();
        addMessage("assistant", `已撤销“${FIELD_LABELS[previous]}”的答案，我们回到这里重新选择。`);
        askNext(220);
      } else {
        addMessage("assistant", "目前还没有可以撤销的答案，请直接回答当前问题即可。");
        if (currentQuestion) renderOptions(currentQuestion.options);
      }
      return;
    }
    if (/^(跳过|不知道|不清楚|先跳过)$/.test(text) && currentQuestion) {
      applyProfilePatch({ [currentQuestion.id]: "unknown" });
      if (isCriticalQuestion(currentQuestion)) {
        addMessage("assistant", "这项先记为待确认。正式点名产品前我还会再问一次，因为这会改变推荐。");
      } else {
        addMessage("assistant", "没问题，这项先标记为待确认，不会阻塞正式推荐。");
      }
      askNext(220);
      return;
    }
    if (/^(继续|继续流程|继续问吧)$/.test(text)) {
      if (currentQuestion) askNext(160);
      else renderOptions(completedOptions());
      return;
    }

    // 多条件一次描述：必须先确认，绝不能被「当前题单字段快捷路径」吞掉
    if (!looksLikeQuestion(text)) {
      const batchPatch = extractProfilePatch(text, currentQuestion?.id);
      if (shouldConfirmBatch(batchPatch, currentQuestion, text)) {
        presentBatchConfirmation(batchPatch);
        return;
      }
    }

    if (options.fromOption && currentQuestion) {
      if (/^(确认无误|有偏差，我要更正)$/.test(text)) {
        // pending 已在上方处理；若落到这里说明状态丢失，忽略
        return;
      }
      if (currentQuestion.id === "style") {
        const clarify = getStyleClarification(text);
        if (clarify) {
          presentStyleClarification(clarify);
          return;
        }
      }
      // 选项文案里若也带出多项（少见），同样走确认
      const optionPatch = extractProfilePatch(text, currentQuestion?.id);
      if (shouldConfirmBatch(optionPatch, currentQuestion, text)) {
        presentBatchConfirmation(optionPatch);
        return;
      }
      const value = normalizeForQuestion(currentQuestion.id, text);
      applyProfilePatch({ [currentQuestion.id]: value === undefined ? "unknown" : value });
      const thanks = acknowledge(currentQuestion.id);
      state.chatBusy = true;
      const typing = showTyping();
      window.setTimeout(() => {
        typing.remove();
        addMessage("assistant", thanks);
        state.chatBusy = false;
        askNext(240);
      }, 260);
      return;
    }

    // 自由输入且仅对应「当前这一题」时，才走单题确认
    if (currentQuestion && !looksLikeQuestion(text)) {
      if (currentQuestion.id === "style") {
        const clarify = getStyleClarification(text);
        if (clarify) {
          presentStyleClarification(clarify);
          return;
        }
      }
      const value = normalizeForQuestion(currentQuestion.id, text);
      if (value !== undefined) {
        applyProfilePatch({ [currentQuestion.id]: value });
        const thanks = acknowledge(currentQuestion.id);
        state.chatBusy = true;
        const typing = showTyping();
        window.setTimeout(() => {
          typing.remove();
          addMessage("assistant", thanks);
          state.chatBusy = false;
          askNext(240);
        }, 260);
        return;
      }
      if (currentQuestion.id === "style") {
        presentStyleClarification({
          prompt: "色调我还没听得很准。你可以直接点下面最接近的一项：",
          options: ["明亮通透 · 浅白提亮", "温暖自然 · 原木暖棕", "温暖亮色 · 浅橡提亮", "澳洲木材个性 · 天然色差", "人字拼设计感 · 暖色焦点", "冷灰现代 · 低饱和灰调"]
        });
        return;
      }
    }

    handleFlexibleInput(text);
  }

  function scoreProducts() {
    const p = state.profile;
    const scores = Object.fromEntries(products.map(product => [product.key, 1]));
    const add = (key, value) => { scores[key] += value; };

    if (p.style === "light") { add("white-oak", 8); add("european-oak", 4); }
    if (p.style === "warm") { add("european-oak", 8); add("spotted-gum", 4); }
    if (p.style === "australian") { add("spotted-gum", 10); add("european-oak", 1); }
    if (p.style === "herringbone") { add("herringbone", 12); }
    if (p.style === "cool") { add("hybrid-grey", 9); add("white-oak", 3); }

    if (p.lighting === "dim") { add("white-oak", 7); add("hybrid-grey", 2); add("spotted-gum", -3); add("herringbone", -2); }
    if (p.lighting === "bright") { add("spotted-gum", 3); add("herringbone", 2); add("european-oak", 2); }
    if (p.lighting === "medium") { add("european-oak", 2); add("white-oak", 2); }

    if (p.household === "kids" || p.household === "pregnant") { add("hybrid-grey", 6); add("white-oak", 4); add("european-oak", 2); }
    if (p.household === "elderly") { add("european-oak", 5); add("white-oak", 3); add("hybrid-grey", 2); }
    if (p.household === "pets") { add("hybrid-grey", 7); add("spotted-gum", 4); }
    if (p.household === "mixed") { add("hybrid-grey", 8); add("white-oak", 3); add("spotted-gum", 2); }
    if (p.household === "none") { add("european-oak", 2); add("herringbone", 1); }

    if (p.lifestyle === "kids-pets") { add("hybrid-grey", 7); add("spotted-gum", 5); add("white-oak", 2); }
    if (p.lifestyle === "heavy") { add("hybrid-grey", 6); add("spotted-gum", 6); add("european-oak", 2); }
    if (p.lifestyle === "quiet") { add("european-oak", 3); add("herringbone", 2); }
    if (p.lifestyle === "rental") { add("hybrid-grey", 6); add("white-oak", 6); }

    if (p.moisture === "waterproof") { add("hybrid-grey", 13); add("white-oak", -4); add("european-oak", -5); add("spotted-gum", -4); add("herringbone", -6); }
    if (p.moisture === "occasional") { add("hybrid-grey", 5); add("white-oak", 2); }
    if (p.moisture === "dry") { add("european-oak", 2); add("herringbone", 2); }

    if (p.budget === "under35") { add("hybrid-grey", 9); add("white-oak", 8); add("european-oak", -3); add("herringbone", -5); }
    if (p.budget === "35-55") { add("european-oak", 7); add("hybrid-grey", 2); add("white-oak", 2); }
    if (p.budget === "55plus") { add("spotted-gum", 4); add("herringbone", 6); add("european-oak", 3); }
    if (p.budget === "quote") { add("european-oak", 2); add("spotted-gum", 2); add("herringbone", 2); }

    if (p.space === "apartment") { add("white-oak", 3); add("hybrid-grey", 3); }
    if (p.space === "house") { add("european-oak", 2); add("spotted-gum", 2); add("herringbone", 1); }
    if (p.space === "commercial") { add("hybrid-grey", 5); add("spotted-gum", 3); }
    if ((p.area || 0) >= 60) { add("european-oak", 2); add("herringbone", 2); }

    return products
      .map(product => ({ product, score: scores[product.key] }))
      .sort((a, b) => b.score - a.score);
  }

  function recommendationReason(product) {
    const p = state.profile;
    const reasons = [];
    if (product.key === "hybrid-grey") reasons.push("防水、耐用和预算控制之间最稳妥");
    if (product.key === "white-oak") reasons.push("浅色能放大采光与空间感，同时材料价格友好");
    if (product.key === "european-oak") reasons.push("真实木质感、温暖色调和稳定性最均衡");
    if (product.key === "spotted-gum") reasons.push("澳洲本土木材个性、硬度和色彩变化最鲜明");
    if (product.key === "herringbone") reasons.push("人字拼能把地面变成空间的设计主角");
    if (p.lighting === "dim") reasons.push("也回应了偏弱采光下对提亮的需求");
    if (["kids", "pregnant", "mixed"].includes(p.household)) reasons.push("同时照顾了家庭特殊情况对清洁与安心的要求");
    if (p.household === "elderly") reasons.push("也兼顾了长辈家庭对脚感与维护友好的偏好");
    if (p.lifestyle === "kids-pets") reasons.push("也回应了高频使用带来的耐磨与清洁需求");
    if (p.moisture === "waterproof") reasons.push("并优先满足了明确的防水要求");
    return `${reasons.join("，")}。`;
  }

  function estimateFor(product) {
    const area = Number(state.profile.area) || 60;
    if (product.price == null) return { area, material: "获取当前报价", total: "需现场报价" };
    const material = area * (1 + product.waste) * product.price;
    const includeInstall = state.profile.service === "supply-install";
    const install = includeInstall ? area * product.installationRate : 0;
    return {
      area,
      material: `AU$${money(material)}`,
      total: `AU$${money(material + install)}${includeInstall ? "*" : ""}`
    };
  }

  function recommendationCard(product, { badge = "最佳匹配 · 概念效果", compact = false } = {}) {
    const estimate = estimateFor(product);
    return `
      <section class="recommendation-card${compact ? " is-alt" : ""}" data-recommendation="${product.key}">
        <div class="recommendation-cover"><img src="${scenePath(product.key)}" alt="${escapeHTML(product.name)}概念效果"><span>${escapeHTML(badge)}</span></div>
        <div class="recommendation-body">
          <small>${escapeHTML(product.code)} · ${escapeHTML(product.type)}</small>
          <h3>${escapeHTML(product.name)}</h3>
          <p>${escapeHTML(recommendationReason(product))}</p>
          <div class="recommendation-metrics">
            <div><small>材料费用参考</small><b>${escapeHTML(estimate.material)}</b></div>
            <div><small>${state.profile.service === "supply-install" ? "供货安装概算*" : "项目面积"}</small><b>${state.profile.service === "supply-install" ? escapeHTML(estimate.total) : `${estimate.area} m²`}</b></div>
          </div>
          <div class="recommendation-actions">
            <button data-rec-action="apply" type="button">应用到当前房间</button>
            <button class="secondary" data-rec-action="details" type="button">查看推荐理由</button>
          </div>
        </div>
      </section>
    `;
  }

  function recommendationStack(winner, alternatives) {
    const altCards = alternatives.map((product, index) =>
      recommendationCard(product, { badge: `备选 ${index + 1} · 概念效果`, compact: true })
    ).join("");
    return `
      <div class="recommendation-stack">
        ${recommendationCard(winner, { badge: "主推荐 · 概念效果" })}
        ${alternatives.length ? `<div class="recommendation-alts-label">备选方案（可点选应用）</div>${altCards}` : ""}
      </div>
    `;
  }

  function finishRecommendation(delay = 420, options = {}) {
    const forcePartial = options.forcePartial === true;
    if (!forcePartial && !isProfileComplete()) {
      addMessage("assistant", softDirectionAdvice());
      askNext(Math.min(delay, 260));
      return;
    }
    if (!forcePartial && !state.finalConfirmDone) {
      presentFinalConfirmation();
      return;
    }
    state.chatBusy = true;
    elements.quickOptions.innerHTML = "";
    const ranking = scoreProducts();
    const winner = ranking[0].product;
    const alternatives = ranking.slice(1, 3).map(item => item.product);
    const typing = showTyping();
    window.setTimeout(() => {
      typing.remove();
      const known = formatFullProfile();
      const knownCount = Object.keys(definedProfile()).length;
      const incomplete = !isProfileComplete();
      const altNames = alternatives.map(item => item.shortName).join("、");
      const lead = forcePartial && incomplete
        ? `好的，我先按当前已知条件给出阶段推荐${known ? `（${escapeHTML(known)}）` : ""}。信息越完整匹配越准，你之后仍可继续补充或修改。主推荐是 ${escapeHTML(winner.name)}${altNames ? `，备选还有 ${escapeHTML(altNames)}` : ""}。`
        : `匹配完成。我根据 ${knownCount} 项已知条件与 Ozwood 的五个产品方向做了确定性排序；主推荐是 ${escapeHTML(winner.name)}${altNames ? `，备选是 ${escapeHTML(altNames)}` : ""}。`;
      addMessage("assistant", lead, true);
      const holder = document.createElement("div");
      holder.innerHTML = recommendationStack(winner, alternatives).trim();
      while (holder.firstChild) elements.chatStream.appendChild(holder.firstChild);
      chooseProduct(winner.key, { forcePrimary: true, force: true });
      renderOptions(incomplete ? partialRecommendationOptions() : completedOptions());
      updateProgress();
      state.chatComplete = true;
      state.chatBusy = false;
      scrollChat();
    }, delay);
  }

  function requestImmediateRecommendation(delay = 220) {
    state.pendingBatch = null;
    state.finalConfirmDone = true;
    finishRecommendation(delay, { forcePartial: true });
  }

  function startChat() {
    state.profile = {};
    state.answerOrder = [];
    state.history = [];
    state.chatBusy = false;
    state.chatComplete = false;
    state.pendingBatch = null;
    state.finalConfirmDone = false;
    elements.chatStream.innerHTML = "";
    elements.quickOptions.innerHTML = "";
    updateProgress();
    addMessage("assistant", `你好，我是 Ozwood AI 地板顾问。你可以一次说多个条件（例如「60 平公寓，家里有猫」），我会先汇总确认再继续；也可以逐步点选。关键画像齐备后会请你最后核对全部条件，再给出具体型号推荐。`);
    askNext(360);
  }

  function handleCompletedOption(answer) {
    if (answer.includes("重新")) {
      startChat();
      return true;
    }
    if (answer.includes("继续补全")) {
      state.chatComplete = false;
      state.finalConfirmDone = false;
      addMessage("assistant", "好的，我们继续把还缺的条件补齐，之后匹配会更准。");
      askNext(200);
      return true;
    }
    if (answer.includes("品牌故事")) {
      openStories();
      return true;
    }
    if (answer.includes("继续自由")) {
      elements.chatInput.focus();
      showToast("可以直接输入任何地板问题");
      return true;
    }
    if (answer.includes("修改需求")) {
      state.chatComplete = false;
      state.finalConfirmDone = false;
      addMessage("assistant", "直接告诉我新的条件即可，例如“预算改成单价 AU$40”“采光比较暗”“家里有孕妇”“改成冷灰风格”。我会更新画像并重新推荐。");
      elements.chatInput.focus();
      return true;
    }
    return false;
  }

  function bindEvents() {
    elements.productStrip.addEventListener("click", event => {
      const card = event.target.closest("[data-product]");
      if (card) chooseProduct(card.dataset.product);
    });
    $$(".room-button").forEach(button => button.addEventListener("click", () => chooseRoom(button.dataset.room)));
    elements.compareBtn.addEventListener("click", () => toggleCompare());
    elements.sideA.addEventListener("click", () => setCompareSide("a"));
    elements.sideB.addEventListener("click", () => setCompareSide("b"));
    elements.compareRange.addEventListener("input", event => {
      state.split = Number(event.target.value);
      refreshCompareImage();
    });
    $("#fullscreenBtn").addEventListener("click", () => {
      if (!document.fullscreenElement) elements.stage.requestFullscreen?.();
      else document.exitFullscreen?.();
    });
    elements.detailBtn.addEventListener("click", () => {
      if (elements.drawer.classList.contains("open")) closeProductDrawer();
      else openProductDrawer("fit");
    });
    $("#floorStoryBtn").addEventListener("click", () => openProductDrawer("story"));
    $("#closeProductDrawer").addEventListener("click", closeProductDrawer);
    elements.drawerContent.addEventListener("click", event => {
      const tab = event.target.closest("[data-detail-tab]");
      if (!tab) return;
      state.detailTab = tab.dataset.detailTab;
      renderProductDrawer();
    });

    [$("#storiesBtn"), $("#viewStoriesFromChat")].forEach(button => button.addEventListener("click", () => openStories()));
    $("#closeStories").addEventListener("click", closeStories);
    $("#closeStoriesBackdrop").addEventListener("click", closeStories);
    elements.storyNav.addEventListener("click", event => {
      const button = event.target.closest("[data-story]");
      if (!button) return;
      state.storyId = button.dataset.story;
      renderStoryNav();
      renderStoryFeature();
    });

    elements.quickOptions.addEventListener("click", event => {
      const option = event.target.closest("[data-answer]");
      if (!option) return;
      if (state.chatComplete && handleCompletedOption(option.dataset.answer)) return;
      submitAnswer(option.dataset.answer, { fromOption: true });
    });
    $("#chatSend").addEventListener("click", () => submitAnswer(elements.chatInput.value));
    elements.chatInput.addEventListener("keydown", event => {
      if (event.key === "Enter") submitAnswer(elements.chatInput.value);
    });
    $("#restartChat").addEventListener("click", startChat);
    elements.chatStream.addEventListener("click", event => {
      const action = event.target.closest("[data-rec-action]");
      if (!action) return;
      const card = action.closest("[data-recommendation]");
      const key = card?.dataset.recommendation;
      if (!key) return;
      chooseProduct(key, { forcePrimary: true, force: true });
      if (action.dataset.recAction === "details") openProductDrawer("fit");
      else showToast(`${productByKey(key).name}已应用到${rooms[state.room].label}`);
    });
    document.addEventListener("keydown", event => {
      if (event.key !== "Escape") return;
      closeStories();
      closeProductDrawer();
      if (state.compare) toggleCompare(false);
    });
  }

  function preloadScenes() {
    const paths = [];
    Object.keys(rooms).forEach(room => products.forEach(product => paths.push(scenePath(product.key, room))));
    const load = () => paths.forEach(src => { const image = new Image(); image.src = src; });
    if ("requestIdleCallback" in window) window.requestIdleCallback(load, { timeout: 1800 });
    else window.setTimeout(load, 900);
  }

  function init() {
    renderProductStrip();
    updateStageCopy();
    renderStoryNav();
    renderStoryFeature();
    bindEvents();
    startChat();
    preloadScenes();
  }

  window.OZWOOD_APP = {
    chooseProduct,
    chooseRoom,
    toggleCompare,
    getState: () => ({ productKey: state.productKey, room: state.room, compare: state.compare })
  };

  init();
})();
