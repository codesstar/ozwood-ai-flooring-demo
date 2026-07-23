(function () {
  "use strict";

  const DATA = window.OZWOOD_DEMO;
  const CATALOG = window.OZWOOD_CATALOG;
  if (!CATALOG?.products?.length) {
    console.error("OZWOOD_CATALOG missing — run npm run build:ozwood-demo-catalog");
  }
  DATA.products = CATALOG?.products || [];
  const products = DATA.products;
  const rooms = DATA.rooms;
  const typeLabels = CATALOG?.typeLabels || {
    all: "全部", hybrid: "混合", laminate: "强化", engineered: "工程木", solid: "实木", parquetry: "拼花"
  };
  const AI_ENDPOINT = window.location.hostname.endsWith("github.io")
    ? "https://ozwood-ai-flooring-demo.vercel.app/api/ozwood-question"
    : "/api/ozwood-question";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const money = value => Math.round(value).toLocaleString("en-AU");
  const escapeHTML = value => String(value).replace(/[&<>'"]/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[char]);

  const preferredStart = products.find(p => p.key === "european-oak") || products[0];
  const preferredCompare = products.find(p => p.key === "spotted-gum" && p.key !== preferredStart?.key)
    || products.find(p => p.key !== preferredStart?.key)
    || preferredStart;

  const state = {
    productKey: preferredStart?.key,
    room: "living",
    compare: false,
    compareKey: preferredCompare?.key,
    compareSide: "a",
    split: 50,
    detailTab: "fit",
    storyId: DATA.stories[0].id,
    swapToken: 0,
    typeFilter: "all",
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
    productStripTitle: $("#productStripTitle"),
    catalogFilters: $("#catalogFilters"),
    conceptBadge: $(".concept-badge span"),
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
    focusedProductBar: $("#focusedProductBar"),
    focusedProductName: $("#focusedProductName"),
    focusedProductDetail: $("#focusedProductDetail"),
    productAskOptions: $("#productAskOptions"),
    chatInput: $("#chatInput"),
    progressLabel: $("#progressLabel"),
    progressBar: $("#progressBar"),
    toast: $("#toast")
  };

  function productByKey(key) {
    return products.find(product => product.key === key) || products[0];
  }

  function filteredProducts() {
    if (state.typeFilter === "all") return products;
    return products.filter(product => product.typeKey === state.typeFilter);
  }

  function visualFor(product, room = state.room) {
    if (product?.hasRoomScene) {
      return {
        src: `assets/ozwood/rooms/${room}-${product.key}.jpg`,
        kind: "scene",
        label: "概念效果"
      };
    }
    return {
      src: product?.officialImage || "assets/ozwood/official/ozwood-logo.png",
      kind: "photo",
      label: "官网产品图"
    };
  }

  function scenePath(productKey, room = state.room) {
    return visualFor(productByKey(productKey), room).src;
  }

  function productPriceHTML(product) {
    if (product.price == null) return `<span class="product-price quote"><b>获取报价</b></span>`;
    return `<span class="product-price"><b>AU$${product.price}</b><small>/m²</small>${product.originalPrice ? `<s>$${product.originalPrice}</s>` : ""}</span>`;
  }

  function renderCatalogFilters() {
    if (!elements.catalogFilters) return;
    const counts = CATALOG?.byType || {};
    const keys = ["all", "hybrid", "laminate", "engineered", "solid", "parquetry"];
    elements.catalogFilters.innerHTML = keys.map(key => {
      const count = key === "all" ? products.length : (counts[key] || 0);
      const label = typeLabels[key] || key;
      return `<button class="catalog-chip ${state.typeFilter === key ? "active" : ""}" type="button" role="tab" aria-selected="${state.typeFilter === key}" data-type-filter="${key}">${escapeHTML(label)}<small>${count}</small></button>`;
    }).join("");
  }

  function renderProductStrip() {
    const list = filteredProducts();
    if (elements.productStripTitle) {
      elements.productStripTitle.textContent = state.typeFilter === "all"
        ? `已加载 ${products.length} 款`
        : `${typeLabels[state.typeFilter] || state.typeFilter} · ${list.length} 款`;
    }
    if (!list.length) {
      elements.productStrip.innerHTML = `<div class="product-strip-empty">当前分类暂无产品，请切换其他类型。</div>`;
      return;
    }
    elements.productStrip.innerHTML = list.map(product => `
      <button class="product-card ${product.hasRoomScene ? "has-scene" : ""} ${product.key === state.productKey ? "active" : ""} ${state.compare && product.key === state.compareKey ? "compare-target" : ""}" data-product="${product.key}" type="button" aria-label="查看 ${escapeHTML(product.name)}">
        <img class="product-thumb" src="${escapeHTML(product.officialImage)}" alt="${escapeHTML(product.shortName)} 的 Ozwood 产品图片" loading="lazy" referrerpolicy="no-referrer" decoding="async">
        <span class="product-card-copy">
          <span class="product-code">${escapeHTML(product.code || "—")}</span>
          <h3>${escapeHTML(product.shortName)}</h3>
          <span class="product-type">${escapeHTML(product.type)}</span>
          ${productPriceHTML(product)}
        </span>
        <span class="product-selected-mark">${state.compare ? (product.key === state.productKey ? "A" : product.key === state.compareKey ? "B" : "") : "✓"}</span>
      </button>
    `).join("");
  }

  function updateConceptBadge(product = productByKey(state.productKey)) {
    const room = rooms[state.room];
    const visual = visualFor(product, state.room);
    if (elements.conceptRoom) elements.conceptRoom.textContent = room.label;
    const badge = $(".concept-badge");
    if (badge) {
      badge.innerHTML = `<i></i><span>${escapeHTML(visual.label)} · <b id="conceptRoom">${escapeHTML(room.label)}</b></span>`;
      elements.conceptRoom = $("#conceptRoom");
    }
  }

  function updateStageCopy() {
    const product = productByKey(state.productKey);
    const room = rooms[state.room];
    updateConceptBadge(product);
    elements.stageEyebrow.textContent = `${product.tone} · ${product.type}`;
    elements.stageTitle.textContent = product.name;
    elements.storyName.textContent = product.name;
    elements.labelA.textContent = product.shortName;
    elements.labelB.textContent = productByKey(state.compareKey).shortName;
    const visual = visualFor(product, state.room);
    elements.current.alt = `${room.label}中的${product.name}${visual.kind === "scene" ? "概念效果" : "产品图"}`;
    $$(".room-button").forEach(button => button.classList.toggle("active", button.dataset.room === state.room));
    if (elements.drawer.classList.contains("open")) renderProductDrawer();
  }

  function switchScene(productKey = state.productKey, room = state.room, instant = false) {
    const token = ++state.swapToken;
    const product = productByKey(productKey);
    const visual = visualFor(product, room);
    const src = visual.src;
    if (instant) {
      elements.current.src = src;
      elements.current.alt = `${rooms[room].label}中的${product.name}`;
      updateConceptBadge(product);
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
        elements.current.alt = `${rooms[room].label}中的${product.name}`;
        elements.incoming.classList.remove("show");
        elements.stage.classList.remove("processing");
        updateConceptBadge(product);
      }, visual.kind === "scene" ? 570 : 280);
    };
    elements.incoming.onerror = () => {
      if (token !== state.swapToken) return;
      // Prefer living scene if this room is still rendering; then official photo
      if (visual.kind === "scene") {
        const livingSrc = `assets/ozwood/rooms/living-${product.key}.jpg`;
        if (src !== livingSrc && product.hasRoomScene) {
          elements.incoming.src = livingSrc;
          return;
        }
        if (product.officialImage && src !== product.officialImage) {
          elements.incoming.src = product.officialImage;
          return;
        }
      }
      elements.stage.classList.remove("processing");
      showToast("图片加载失败，请重试或换一款产品");
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
          refreshFocusedProductBar();
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
    // Ensure recommended / selected product is visible in the strip
    const selected = productByKey(key);
    if (state.typeFilter !== "all" && selected?.typeKey && selected.typeKey !== state.typeFilter) {
      state.typeFilter = "all";
      renderCatalogFilters();
    }
    switchScene(key, state.room, options.instant);
    updateStageCopy();
    renderProductStrip();
    refreshFocusedProductBar();
    if (state.compare) refreshCompareImage();
    if (!options.silent && !options.instant && selected && !selected.hasRoomScene) {
      showToast(`「${selected.shortName}」暂无房间铺装效果，显示官网产品图。想看客厅效果请选带「概念」标签的产品`);
    }
  }

  function focusedProductPayload() {
    const product = productByKey(state.productKey);
    if (!product) return null;
    const clip = (value, max = 400) => {
      const text = String(value == null ? "" : value).trim();
      return text.length > max ? `${text.slice(0, max)}…` : text;
    };
    return {
      key: product.key,
      name: clip(product.name, 120),
      shortName: clip(product.shortName || product.name, 60),
      code: clip(product.code, 40),
      type: clip(product.type, 60),
      typeKey: product.typeKey || null,
      tone: clip(product.tone, 40),
      price: product.price == null ? null : Number(product.price),
      priceNote: clip(product.priceNote, 120),
      onSale: Boolean(product.onSale),
      tags: Array.isArray(product.tags) ? product.tags.slice(0, 8).map(tag => clip(tag, 40)) : [],
      traits: Array.isArray(product.traits) ? product.traits.slice(0, 12).map(tag => clip(tag, 40)) : [],
      fit: product.fit && typeof product.fit === "object" ? product.fit : null,
      personaHints: Array.isArray(product.personaHints) ? product.personaHints.slice(0, 6).map(tag => clip(tag, 40)) : [],
      bestFor: Array.isArray(product.bestFor) ? product.bestFor.slice(0, 4).map(item => clip(item, 80)) : [],
      avoid: clip(product.avoid, 220),
      specification: clip(product.specification, 160),
      profile: clip(product.profile, 160),
      install: clip(product.install, 220),
      care: clip(product.care, 220),
      source: clip(product.source, 220)
    };
  }

  function productAskPrompts(product) {
    const moisture = product?.fit?.moisture;
    const waterproofAsk = moisture === "waterproof" || product?.traits?.includes("waterproof")
      ? "这款防水能力怎么样？"
      : "这款防潮/防水怎么样？";
    return [
      waterproofAsk,
      "这款大概什么价位？",
      "这款适合宠物或高频使用吗？"
    ];
  }

  function refreshFocusedProductBar() {
    const product = productByKey(state.productKey);
    if (elements.focusedProductName) {
      elements.focusedProductName.textContent = product?.shortName || product?.name || "—";
      elements.focusedProductName.title = product?.name || "";
    }
    if (!elements.productAskOptions) return;
    const prompts = productAskPrompts(product);
    elements.productAskOptions.innerHTML = prompts.map(prompt =>
      `<button class="product-ask-chip" type="button" data-product-ask="${escapeHTML(prompt)}">${escapeHTML(prompt)}</button>`
    ).join("");
  }

  function chooseRoom(room, options = {}) {
    if (!rooms[room] || room === state.room) return;
    state.room = room;
    const product = productByKey(state.productKey);
    switchScene(state.productKey, room, options.instant);
    updateStageCopy();
    if (state.compare) refreshCompareImage();
    if (!options.silent && product && !product.hasRoomScene) {
      showToast(`「${product.shortName}」暂无${rooms[room].label}铺装效果图，正在显示官网实拍。带「概念」标签的产品才有房间预览`);
    }
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
      : "按分类浏览；标注「概念」的有房间预览，其余为官网实拍";
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
      elements.productStripHint.textContent = "按分类浏览；标注「概念」的有房间预览，其余为官网实拍";
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
    const completeLabel = isProfileComplete() ? "条件已齐" : `关键 ${criticalQuestions().filter(q => isMeaningfulValue(q.id, state.profile[q.id])).length}/${criticalQuestions().length}`;
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

  /** 用户明确要求立刻推荐 / 列几款产品（不含「这款适不适合 XX」类产品问答） */
  function wantsImmediateRecommendation(text) {
    const t = String(text || "").trim();
    if (!t) return false;
    // 针对左侧当前木板的适性/规格追问，绝不是「给我推荐」
    if (looksLikeFocusedProductAsk(t)) return false;
    return /(直接|现在|先).{0,24}(推荐|出结果|列\s*几|给\s*几|来几款)/.test(t)
      || /(给我推荐|推荐几[个款]|列几[个款]|给几[个款]|出几款|先推荐|不用再问|推荐一下)/.test(t)
      || /(哪几款|有什么推荐|推荐模板)/.test(t)
      || /推荐.{0,20}(适合|孕妇|宠物|小孩|老人|猫|狗|潮湿|防水|防潮)/.test(t)
      // 「适合宠物的地板/推荐」可以；「适合宠物吗」不可以
      || /(适合|给).{0,12}(孕妇|宠物|小孩|老人|猫|狗|潮湿|防水).{0,16}(推荐|地板|木板|产品)/.test(t)
      || /(再|还要|另外|基础上).{0,16}(推荐)/.test(t)
      || /^(推荐(一下|一款|几款|吧)?)$/.test(t);
  }

  /** 在已有推荐上追加条件（拓展画像） */
  function wantsProfileExpansion(text) {
    const t = String(text || "").trim();
    if (!t || looksLikeQuestion(t)) return false;
    return /(再|还要|另外|同时|也要|加上|基础上|并且|而且|补充|接着|然后).{0,24}(适合|考虑|推荐|宠物|孕妇|小孩|老人|猫|狗|预算|采光|色调|防水|潮湿|防潮|风格)/.test(t)
      || (state.chatComplete && /(宠物|孕妇|小孩|老人|猫|狗|预算|采光|色调|防水|潮湿|防潮|湿区|改成|换成)/.test(t));
  }

  function mergeHousehold(existing, incoming, text = "") {
    if (!incoming) return existing;
    if (!existing || existing === "unknown") return incoming;
    if (incoming === "none") return "none";
    if (/(改成|换成|不是|不要|取消|只考虑)/.test(text)) return incoming;
    if (existing === incoming) return existing;
    const additive = /(再|还要|另外|同时|也要|加上|基础上|并且|而且|补充|接着)/.test(text)
      || state.chatComplete;
    const specials = new Set(["kids", "pregnant", "elderly", "pets"]);
    if (additive && specials.has(existing) && specials.has(incoming) && existing !== incoming) return "mixed";
    if (existing === "mixed" || incoming === "mixed") return "mixed";
    return incoming;
  }

  function buildExpandingPatch(text, currentQuestionId = null) {
    const patch = extractProfilePatch(text, currentQuestionId);
    // 家庭情况叠加：孕妇 + 宠物 → mixed
    if (patch.household) {
      patch.household = mergeHousehold(state.profile.household, patch.household, text);
    } else if (/(宠物|猫|狗)/.test(text) && !/(没有宠物|没猫|没狗)/.test(text)) {
      const merged = mergeHousehold(state.profile.household, "pets", text);
      if (merged) patch.household = merged;
    } else if (/孕妇|备孕|怀孕/.test(text)) {
      const merged = mergeHousehold(state.profile.household, "pregnant", text);
      if (merged) patch.household = merged;
    } else if (/小孩|孩子|儿童/.test(text)) {
      const merged = mergeHousehold(state.profile.household, "kids", text);
      if (merged) patch.household = merged;
    } else if (/老人|长辈/.test(text)) {
      const merged = mergeHousehold(state.profile.household, "elderly", text);
      if (merged) patch.household = merged;
    }
    // 潮湿 / 防水拓展：自然语言兜底
    if (patch.moisture === undefined) {
      if (/(完全防水|需要防水|潮湿环境|很潮|湿度大|易积水|湿区|厨卫)/.test(text)) {
        patch.moisture = "waterproof";
      } else if (/(防潮|偶尔有水|有点水|水渍)/.test(text)) {
        patch.moisture = "occasional";
      } else if (/(普通干区|干燥环境|很干)/.test(text)) {
        patch.moisture = "dry";
      }
    }
    // 采光拓展兜底
    if (patch.lighting === undefined) {
      if (/(采光\s*(很好|充足|不错)|光线\s*(很好|充足|亮))/.test(text)) patch.lighting = "bright";
      else if (/(采光\s*(一般|中等)|光线\s*(一般|中等))/.test(text)) patch.lighting = "medium";
      else if (/(采光\s*(差|暗|不足)|比较暗|昏暗)/.test(text)) patch.lighting = "dim";
    }
    // 提到宠物时，若尚未设使用强度，补一档便于打分
    if ((patch.household === "pets" || patch.household === "mixed" || /(宠物|猫|狗)/.test(text))
      && state.profile.lifestyle === undefined
      && patch.lifestyle === undefined
      && /(宠物|猫|狗|耐磨)/.test(text)) {
      patch.lifestyle = "kids-pets";
    }
    return sanitizeProfilePatch(patch);
  }

  function expandProfileAndRerecommend(text, currentQuestionId = null) {
    // 硬保险：问左侧当前木板适性时，绝不能走「补画像 + 出推荐」
    if (looksLikeFocusedProductAsk(text)) {
      handleFocusedProductQuestion(text);
      return;
    }
    const priorCount = Object.keys(definedProfile()).length;
    const patch = buildExpandingPatch(text, currentQuestionId);
    const changed = applyProfilePatch(patch);
    const known = formatFullProfile();
    if (changed.length && priorCount > 0) {
      addMessage(
        "assistant",
        `好的，已在现有需求上补充：<strong>${escapeHTML(formatCapturedFields(changed))}</strong>。<br>目前了解到：<strong>${escapeHTML(known)}</strong>。我按更新后的条件重新匹配。`,
        true
      );
    } else if (changed.length) {
      addMessage(
        "assistant",
        `好的，已记下：<strong>${escapeHTML(formatCapturedFields(changed))}</strong>。我按当前条件给出推荐。`,
        true
      );
    } else if (known) {
      addMessage("assistant", `好的，我按你刚才说的条件重新匹配：<strong>${escapeHTML(known)}</strong>。`, true);
    } else {
      addMessage("assistant", "好的，已知条件还不多，我先给出综合稳妥的阶段推荐；你之后仍可继续补充。");
    }
    requestImmediateRecommendation(240);
  }

  function stripMarkdownForCustomer(text) {
    return String(text || "")
      .replace(/```[\s\S]*?```/g, "")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/(^|[^\w*])\*([^*\n]+)\*(?!\*)/g, "$1$2")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/^\s*[-*+]\s+/gm, "")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\*{1,2}|_{1,2}/g, "")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  /** 只回答左侧当前木板：不改需求记录、不出推荐卡 */
  async function handleFocusedProductQuestion(text) {
    state.chatBusy = true;
    elements.quickOptions.innerHTML = "";
    const typing = showTyping();
    let answer = localKnowledgeAnswer(text)
      || localFocusedProductAnswer(text)
      || "我可以先按左侧这款板说明一下；你也可以继续告诉我家里的情况和预算，再一起选。";
    let sources = [];
    try {
      const result = await callFlexibleAI(text, null);
      if (result?.answer) answer = result.answer;
      if (Array.isArray(result?.sources)) sources = result.sources.slice(0, 3);
    } catch (_) {
      // 本地兜底即可
    }
    typing.remove();

    const focused = focusedProductPayload();
    if (focused?.source && !sources.includes(focused.source)) sources = [focused.source, ...sources].slice(0, 3);

    const latestQuestion = nextDiscoveryQuestion();
    const plain = stripMarkdownForCustomer(answer);
    const parts = [escapeHTML(plain).replace(/\n/g, "<br>")];
    if (sources.length) {
      const sourceLinks = sources.map((source) =>
        `<a href="${escapeHTML(source)}" target="_blank" rel="noopener noreferrer">查看官网说明</a>`
      ).join(" · ");
      parts.push(`<small class="answer-sources">${sourceLinks}</small>`);
    }
    if (latestQuestion) {
      parts.push(`<div class="question-resume">刚才说的是左侧这款「${escapeHTML(focused?.shortName || "木板")}」。我们接着聊：${escapeHTML(questionPresentation(latestQuestion).text)}</div>`);
    } else if (isProfileComplete()) {
      parts.push('<div class="question-resume">刚才只针对左侧这款做了说明。你确认需求后，或直接说「帮我推荐」，我再帮你排型号。</div>');
    } else {
      parts.push('<div class="question-resume">刚才只针对左侧这款做了说明。你还可以继续补充家里的情况，或换一款继续问。</div>');
    }

    addMessage("assistant", parts.join("<br>"), true);
    state.chatBusy = false;
    if (latestQuestion) renderOptions(questionPresentation(latestQuestion).options);
    else if (isProfileComplete() && !state.finalConfirmDone) presentFinalConfirmation();
    else if (state.chatComplete) renderOptions(completedOptions());
    else renderOptions(partialRecommendationOptions());
  }

  function partialRecommendationOptions() {
    return ["继续补充需求", "再补充一个条件", "修改需求后重新推荐", "继续自由提问", "打开品牌故事"];
  }

  function isCommercialProject() {
    return state.profile.space === "commercial";
  }

  /** 按项目类型（住宅 / 商用）返回当前问题的文案与快捷按钮 */
  function questionPresentation(question) {
    if (!question) return { text: "", options: [] };
    if (isCommercialProject() && question.commercial) {
      return {
        text: question.commercial.text || question.text,
        options: question.commercial.options || question.options
      };
    }
    return { text: question.text, options: question.options };
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
    const presented = questionPresentation(question);
    state.chatBusy = true;
    const typing = showTyping();
    window.setTimeout(() => {
      typing.remove();
      const guide = question.id === "style" ? styleExplainerHTML() : "";
      const prefix = revisiting
        ? `<div class="question-resume"><b>这项对正式推荐很关键</b> · 之前记为待确认，补齐后才能点名具体型号。</div>`
        : "";
      addMessage("assistant", `${prefix}${escapeHTML(presented.text)}${guide}`, true);
      renderOptions(presented.options);
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
  function fieldLabel(id) {
    if (id === "household" && isCommercialProject()) return "使用人群";
    return FIELD_LABELS[id] || id;
  }
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
  function valueLabel(id, value) {
    if (isCommercialProject()) {
      if (id === "room") {
        const commercialRoom = {
          living: "开放办公 / 公共接待区",
          study: "独立办公室",
          bedroom: "休息室",
          whole: "整层统一"
        };
        if (commercialRoom[value]) return commercialRoom[value];
      }
      if (id === "household") {
        const commercialHousehold = {
          none: "无特殊要求",
          pregnant: "对低排放更敏感",
          elderly: "长者或行动不便者较多",
          mixed: "多种情况需要兼顾",
          kids: "有儿童出入",
          pets: "偶有宠物出入"
        };
        if (commercialHousehold[value]) return commercialHousehold[value];
      }
      if (id === "lifestyle") {
        const commercialLifestyle = {
          heavy: "人流较大 / 耐磨优先",
          quiet: "安静办公 / 会议为主",
          rental: "短租或投资型物业",
          "kids-pets": "高频使用（含孩宠场景）"
        };
        if (commercialLifestyle[value]) return commercialLifestyle[value];
      }
    }
    return VALUE_LABELS[value] || String(value);
  }

  function looksLikeQuestion(text) {
    return /[?？]/.test(text)
      || /^(请问|想问|问一下|我想知道)/.test(text)
      || /(区别|怎么|如何|为什么|什么|是否|能否|能不能|可不可以|可以吗|哪款|哪一个|哪个好|哪个|多少钱|适合吗|耐不耐|保养|安装|注意事项|建议)/.test(text);
  }

  function isDomainRelevantMessage(text) {
    return /(装修|翻新|房子|家里|房间|客厅|餐厅|卧室|书房|厨房|办公室|商用|办公区|会议|接待|地板|木板|铺装|材料|安装|基层|防水|潮湿|防潮|湿区|预算|面积|平方米|平米|采光|光线|色调|颜色|小孩|孩子|孕妇|老人|宠物|展厅|样板|ozwood|floor|renovat|interior|subfloor|office|commercial)/i.test(text)
      || /(?:\d+(?:\.\d+)?\s*(?:平|m²|m2|square)|约\s*\d+\s*(?:平|m))/i.test(text);
  }

  function looksLikeFocusedProductAsk(text) {
    const t = String(text || "").trim();
    if (!t) return false;
    // 明确指代当前展示板
    if (/(这款|这块板|这块木板|当前这[款板]|左边这|左侧这|正在看的|展示的这)/.test(t)) return true;
    if (/(这款|这个|这块|它).{0,12}(防水|防潮|价位|价格|多少钱|报价|宠物|猫|狗|耐磨|高频|适合|安装|保养|养护|规格|材质|型号)/.test(t)) return true;
    // 快捷追问原句 / 短句属性问法：默认指左侧当前板
    if (/适合宠物或高频|适合宠物吗|适合有猫|适合有狗|大概什么价位|什么价位|多少钱|防水吗|防潮吗/.test(t) && t.length <= 40) {
      return true;
    }
    return false;
  }

  function localFocusedProductAnswer(question) {
    const product = productByKey(state.productKey);
    if (!product) return null;
    const text = String(question || "");
    if (!looksLikeFocusedProductAsk(text) && !/(这款|这个|这块)/.test(text)) return null;

    const name = product.name || product.shortName || "当前木板";
    const code = product.code ? `（${product.code}）` : "";
    const sourceNote = product.source ? ` 详情以官网为准：${product.source}` : "";
    const moisture = product.fit?.moisture;
    const traits = product.traits || [];

    if (/(防水|防潮|潮湿|水渍)/.test(text)) {
      if (moisture === "waterproof" || traits.includes("waterproof")) {
        return `${name}${code} 在目录标签中标为防水方向（如 hybrid / 明确防水系列）。这不等于可长期积水；厨卫交界与收边仍需按现场确认。${product.avoid ? product.avoid : ""}${sourceNote}`;
      }
      if (moisture === "occasional" || traits.includes("water-resistant")) {
        return `${name}${code} 更偏向防潮/耐水清洁，而不是完全防水。不建议按湿区长期积水场景理解。${product.avoid || ""}${sourceNote}`;
      }
      return `${name}${code} 在目录中按干区木地板理解（工程木/实木/拼花常见）。安装前要确认基层含水率，也不适合长期积水。${product.avoid || ""}${sourceNote}`;
    }

    if (/(价格|价位|多少钱|报价|预算)/.test(text)) {
      if (product.price != null) {
        return `${name}${code} 演示目录参考价约 AU$${product.price}/m²${product.originalPrice ? `（原展示价约 $${product.originalPrice}）` : ""}。价格属易变信息，正式报价请向 Ozwood 确认库存、批次与安装条件。${product.priceNote ? ` ${product.priceNote}` : ""}${sourceNote}`;
      }
      return `${name}${code} 当前目录未标固定单价，需要向 Ozwood 获取报价。${product.priceNote || "价格会随活动与批次变化。"}${sourceNote}`;
    }

    if (/(宠物|猫|狗|小孩|孩子|耐磨|高频|耐脏)/.test(text)) {
      const bits = [];
      if (moisture === "waterproof" || traits.includes("waterproof")) bits.push("防潮/防水标签更友好");
      if (traits.includes("ac4") || traits.includes("ac5")) bits.push("带耐磨等级标签");
      if (traits.includes("real-timber-surface")) bits.push("真实木皮仍需注意爪痕与砂粒");
      if (product.personaHints?.includes("有孩宠物家庭")) bits.push("更常被考虑用于有孩宠物家庭");
      const summary = bits.length ? bits.join("；") : "请结合防潮标签、耐磨等级与养护说明综合判断";
      return `${name}${code} 对宠物/高频使用的参考：${summary}。${product.bestFor?.[0] ? `适用方向：${product.bestFor[0]}。` : ""}${sourceNote}`;
    }

    if (/(安装|基层|伸缩缝)/.test(text)) {
      return `${name}${code} 安装要点：${product.install || "需确认基层平整度、含水率与产品指定安装方式。"}${sourceNote}`;
    }

    if (/(保养|养护|清洁|拖地)/.test(text)) {
      return `${name}${code} 日常养护：${product.care || "低水分清洁，及时处理水渍，避免磨蚀性清洁剂。"}${sourceNote}`;
    }

    if (/(适合|怎么样|介绍|特点|材质|型号)/.test(text)) {
      const fitBits = [];
      if (product.type) fitBits.push(product.type);
      if (product.tone) fitBits.push(`色调偏${product.tone}`);
      if (moisture) fitBits.push(`防潮标签 ${moisture}`);
      if (product.personaHints?.length) fitBits.push(`提示：${product.personaHints.slice(0, 2).join("、")}`);
      return `${name}${code}：${fitBits.join("；") || "请结合产品页规格确认"}。${product.why || product.story || ""}${sourceNote}`.slice(0, 420);
    }

    return null;
  }

  function localKnowledgeAnswer(question) {
    const focused = localFocusedProductAnswer(question);
    if (focused) return focused;

    const text = question.toLowerCase();
    if (/(明亮|温暖|澳洲木材|人字拼|冷灰|这几个|五个).*(区别|怎么选)|风格.*区别/.test(text)) {
      return "这五个选项描述的是空间感觉，不是产品等级：明亮通透用浅色放大空间；温暖自然强调舒适和百搭；澳洲木材个性突出天然色差；人字拼把地面变成设计焦点，但人工和损耗更高；冷灰现代更克制。";
    }
    if (/(工程木|强化|混合|hybrid|laminate).*(区别|怎么选)|区别.*(工程木|强化|混合)/.test(text)) {
      return "工程木表层是真实木材，质感自然但要控制水分；强化地板耐磨、价格友好、锁扣快装；混合地板更强调防水和日常省心，但天然木材触感较弱。人字拼主要是铺装形式，成本和施工精度通常更高。";
    }
    if (/(防水|潮湿|厨房|水渍)/.test(text)) {
      return "当前目录里，混合地板（hybrid）通常明确强调防水；多数强化地板侧重防潮耐水，并不等于完全防水；工程木/实木/拼花安装前必须确认基层含水率，也不建议长期积水。具体以所选 SKU 产品页为准。";
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
    return "我可以直接回答任何与地板选购、材料、安装、养护和 Ozwood 产品相关的问题；如果暂时连不上云端，你前面说的条件我仍会记着，也不会把这句话当成某个预设选项。";
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
      room: [
        [/开放办公|公共区|接待|会议|办公区|open\s*plan|reception|meeting/, "living"],
        [/独立办公|私人办公|单间办公/, "study"],
        [/整层|全层|整层统一/, "whole"],
        [/休息室|茶水间/, "bedroom"],
        [/卧室|bedroom/, "bedroom"],
        [/书房|home\s*office/, "study"],
        [/全屋|whole/, "whole"],
        [/客厅|餐厅|living|dining/, "living"]
      ],
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
      household: [
        [/多种情况需要兼顾|多种|都有|(小孩|孩子|儿童).{0,6}(宠物|猫|狗)|(宠物|猫|狗).{0,6}(小孩|孩子)|(孕妇|备孕).{0,8}(老人|小孩|孩子)|(老人|长辈).{0,8}(孕妇|小孩|孩子|宠物)/, "mixed"],
        [/低排放|空气质量|孕妇|备孕|怀孕|pregnancy/, "pregnant"],
        [/长者|行动不便|老人|长辈|elderly/, "elderly"],
        [/(无特殊要求|没有特殊|无特殊|都没有|没有以上|没有宠物|没养猫|没养狗)/, "none"],
        [/小孩|孩子|儿童|kids?/, "kids"],
        [/宠物|养猫|养狗|有只猫|有只狗|一只猫|一只狗|养了猫|养了狗|有猫|有狗|猫|狗|pets?/, "pets"]
      ],
      lifestyle: [
        [/孩子和宠物|小孩.*宠物|宠物.*高频|高频.*宠物|孩子宠物高频/, "kids-pets"],
        [/人流较大|耐磨优先|人流|耐磨|\bheavy\b/, "heavy"],
        [/短租|出租|投资|rental|investment/, "rental"],
        [/普通日常办公|安静办公|会议为主|安静|成人/, "quiet"]
      ],
      subfloor: [[/瓷砖|tile/, "tiles"], [/混凝土|水泥|concrete|slab/, "concrete"], [/木基层|timber subfloor/, "timber"], [/不清楚|不知道/, "unknown"]],
      moisture: [
        [/需要防水|完全防水|很潮|潮湿环境|潮湿|湿度大|易积水|经常有水|湿区|厨卫|waterproof|humid|moisture/i, "waterproof"],
        [/偶尔有水|偶尔|防潮|有点水|清洁水渍|spill/, "occasional"],
        [/干区|普通干燥|干燥|dry\b/, "dry"],
        [/判断|不清楚|现场确认/, "unknown"]
      ],
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
      const display = id === "area" && value !== "unknown" ? `${value} m²` : valueLabel(id, value);
      return `${fieldLabel(id)}：${display}`;
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
        const display = question.id === "area" && value !== "unknown" ? `${value} m²` : valueLabel(question.id, value);
        return `${fieldLabel(question.id)}：${display}`;
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
      `关键条件已经齐了，请最后核对一遍：<br><strong>${escapeHTML(formatFullProfile())}</strong><br>确认后我会据此给出具体型号推荐。`,
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
        addMessage("assistant", "好的，全部条件已确认。我现在按这些条件帮你匹配产品。");
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
      renderOptions(question ? ["重新描述需求", ...questionPresentation(question).options.slice(0, 3)] : ["重新描述需求"]);
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
    let cleaned = stripMarkdownForCustomer(String(answer || "").trim());
    const currentText = String(currentQuestion?.text || '').trim();
    if (currentText) cleaned = cleaned.split(currentText).join('').replace(/\s{2,}/g, ' ').trim();
    const currentStem = currentText.split(/[？?。！!]/)[0].trim();
    if (currentStem) {
      const escapedStem = currentStem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const repeatedQuestion = new RegExp(`(?:^|[\\n。！？])[^\\n。！？]{0,40}${escapedStem}[^\\n。！？]*[。！？]?`, 'g');
      cleaned = cleaned.replace(repeatedQuestion, '。').replace(/^。/, '').replace(/。{2,}/g, '。').replace(/\s{2,}/g, ' ').trim();
    }
    cleaned = cleaned.replace(/[^。！？\n]*(?:都有现货|目前有现货|现在有现货|库存充足|现货充足)[。！？]?/g, '具体库存需要向 Ozwood 确认。');
    // 去掉模型偶发的开发者口吻
    cleaned = cleaned
      .replace(/选购画像|用户画像|客户画像|画像槽位|profilePatch|focusedProduct/gi, "")
      .replace(/进度没有丢失[。．]?/g, "")
      .replace(/咨询进度不会丢失[。．]?/g, "")
      .replace(/官网依据\s*\d+/g, "官网说明")
      .replace(/\s{2,}/g, " ")
      .trim();
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
      const display = id === "area" && value !== "unknown" ? `${value} m²` : valueLabel(id, value);
      return `${fieldLabel(id)}：${display}`;
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
          focusedProduct: focusedProductPayload(),
          currentQuestion: currentQuestion
            ? { id: currentQuestion.id, text: questionPresentation(currentQuestion).text }
            : null
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

  async function handleFlexibleInput(text, options = {}) {
    const currentBefore = firstMissingQuestion() || firstIncompleteCritical();
    const productAsk = options.fromProductAsk === true || looksLikeFocusedProductAsk(text);
    const questionLike = productAsk || looksLikeQuestion(text);
    const domainRelevant = !productAsk && isDomainRelevantMessage(text);
    const evidencePatch = domainRelevant ? extractProfilePatch(text, currentBefore?.id) : {};
    // 当前流程题的自由文本答案（如“约100平”）即使没有点选项，也要直接写入。
    if (!productAsk && currentBefore && !questionLike) {
      const directValue = normalizeForQuestion(currentBefore.id, text);
      if (directValue !== undefined) evidencePatch[currentBefore.id] = directValue;
    }
    // 问句里的产品或风格关键词可能只是比较对象，不能直接当作用户偏好。
    // 非装修语境中的“孩子、宠物、预算”等词也不能污染画像。
    // 但明确的面积/预算数字或当前题答案仍应保留。
    const localPatch = (questionLike || productAsk)
      ? Object.fromEntries(Object.entries(evidencePatch).filter(([id]) => id === "area" || id === "budget" || id === currentBefore?.id))
      : evidencePatch;

    const directRecommendation = !productAsk && (wantsImmediateRecommendation(text) || wantsProfileExpansion(text));

    // 明确要推荐 / 拓展画像：合并条件后直接出卡，不走批量确认弹窗
    if (directRecommendation) {
      expandProfileAndRerecommend(text, currentBefore?.id);
      return;
    }

    // 多条件一次描述：先确认再写入，避免用户被迫重走全流程
    if (!productAsk && !questionLike && shouldConfirmBatch(localPatch, currentBefore, text)) {
      presentBatchConfirmation(localPatch);
      return;
    }

    const changed = applyProfilePatch(localPatch);
    state.chatBusy = true;
    const typing = showTyping();
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
      addMessage("assistant", result.answer || "抱歉，刚才没连上，请再发一次就好。你前面说的条件我都还记着。");
      state.chatBusy = false;
      const latestAfterFallback = nextDiscoveryQuestion();
      if (changed.length && latestAfterFallback && latestAfterFallback.id !== currentBefore?.id) {
        askNext(160);
      } else if (latestAfterFallback) {
        renderOptions(questionPresentation(latestAfterFallback).options);
      } else {
        renderOptions(completedOptions());
      }
      return;
    }

    const modelPatch = productAsk
      ? {}
      : corroborateModelPatch(result.profilePatch, evidencePatch, text, result.intent);
    // 模型又抽出多项：走确认，不直接落库推进
    if (!productAsk && !questionLike && result.intent !== "direct_recommend" && !wantsImmediateRecommendation(text) && shouldConfirmBatch({ ...localPatch, ...modelPatch }, currentBefore, text)) {
      typing.remove();
      state.chatBusy = false;
      presentBatchConfirmation({ ...localPatch, ...modelPatch });
      return;
    }
    const modelChanged = applyProfilePatch(modelPatch);
    const allChanged = [...new Set([...changed, ...modelChanged])];
    typing.remove();

    // 推荐只允许：画像齐备后的正常流程，或用户明确说「直接推荐」；问当前木板绝不能触发
    const userAskedToRecommend = !productAsk && (wantsImmediateRecommendation(text) || wantsProfileExpansion(text));
    const modelForcedRecommend = !productAsk && result.intent === "direct_recommend" && userAskedToRecommend;
    if (userAskedToRecommend || modelForcedRecommend) {
      if (allChanged.length) {
        state.chatBusy = false;
        expandProfileAndRerecommend(text, currentBefore?.id);
        return;
      }
      state.chatBusy = false;
      expandProfileAndRerecommend(text, currentBefore?.id);
      return;
    }

    const latestQuestion = nextDiscoveryQuestion();
    const shouldAnswer = ["question", "mixed", "off_topic"].includes(result.intent) || (!allChanged.length && result.answer);
    const parts = [];
    if (shouldAnswer && result.answer) parts.push(escapeHTML(result.answer));
    if (result.bridge && result.route !== "general" && result.route !== "high_risk") parts.push(`<span class="conversation-bridge">${escapeHTML(result.bridge)}</span>`);
    if (allChanged.length) parts.push(`<strong>已理解：</strong>${escapeHTML(formatCapturedFields(allChanged))}`);
    if (result.sources?.length) {
      const sourceLinks = result.sources.map((source) => `<a href="${escapeHTML(source)}" target="_blank" rel="noopener noreferrer">查看官网说明</a>`).join(" · ");
      parts.push(`<small class="answer-sources">${sourceLinks}</small>`);
    }
    if (!parts.length) parts.push(escapeHTML(result.answer || localKnowledgeAnswer(text)));

    if (!allChanged.length && latestQuestion) {
      parts.push(`<div class="question-resume">我们接着聊：${escapeHTML(questionPresentation(latestQuestion).text)}</div>`);
    } else if (!latestQuestion && isProfileComplete()) {
      parts.push('<div class="question-resume">关键条件已经差不多齐了，你还可以继续提问，或修改条件后重新推荐。</div>');
    } else if (!firstMissingQuestion() && firstIncompleteCritical()) {
      parts.push('<div class="question-resume">还有几项关键条件待确认；补齐后我才能更有把握地推荐具体型号。</div>');
    }
    addMessage("assistant", parts.join("<br>"), true);
    state.chatBusy = false;

    if (!latestQuestion) {
      if (allChanged.length || isProfileComplete()) finishRecommendation(260);
      else renderOptions(completedOptions());
    } else if (allChanged.length) {
      askNext(260);
    } else {
      renderOptions(questionPresentation(latestQuestion).options);
    }
  }

  function acknowledge(questionId) {
    const commercialMessages = {
      room: "明白，办公区域记下了；接下来把面积和采光补齐。",
      household: "使用人群条件记下了，耐磨、清洁与排放敏感度会进入排序。",
      lifestyle: "办公使用强度记下了，耐磨和维护会进入排序。"
    };
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
    if (isCommercialProject() && commercialMessages[questionId]) return commercialMessages[questionId];
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

    // 问左侧当前木板：单独路径，绝不写画像、绝不出推荐
    if (options.fromProductAsk === true || looksLikeFocusedProductAsk(text)) {
      handleFocusedProductQuestion(text);
      return;
    }

    const currentQuestion = firstMissingQuestion() || firstIncompleteCritical();

    // 用户明确要求立刻推荐，或在已有推荐上继续拓展画像
    if (wantsImmediateRecommendation(text) || wantsProfileExpansion(text)) {
      expandProfileAndRerecommend(text, currentQuestion?.id);
      return;
    }

    if (/^(上一步|返回上一题|撤销上一个答案)$/.test(text)) {
      const previous = state.answerOrder.pop();
      if (previous) {
        delete state.profile[previous];
        state.chatComplete = false;
        updateProgress();
        addMessage("assistant", `已撤销“${fieldLabel(previous)}”的答案，我们回到这里重新选择。`);
        askNext(220);
      } else {
        addMessage("assistant", "目前还没有可以撤销的答案，请直接回答当前问题即可。");
        if (currentQuestion) renderOptions(questionPresentation(currentQuestion).options);
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

    handleFlexibleInput(text, options);
  }

  function scoreProducts() {
    // Keep weights in sync with scripts/lib/ozwood-product-tags.mjs (ozwood-sales-recommender)
    const p = state.profile;
    const BUDGET_ORDER = ["under35", "35-55", "55plus", "quote"];
    const normalizeBudget = (b) => (b === "quote" ? "55plus" : b);
    const budgetDistance = (a, b) => {
      const ia = BUDGET_ORDER.indexOf(normalizeBudget(a));
      const ib = BUDGET_ORDER.indexOf(normalizeBudget(b));
      if (ia < 0 || ib < 0) return 99;
      return Math.abs(ia - ib);
    };
    const intersects = (arr, value) => Array.isArray(arr) && value != null && arr.includes(value);

    const ranked = products.map(product => {
      const fit = product.fit || {};
      const traits = product.traits || [];
      const type = product.typeKey || product.type;
      let score = 0;
      let hardFail = false;
      const breakdown = {};

      const needWaterproof = p.moisture === "waterproof";
      if (needWaterproof && fit.moisture !== "waterproof" && !traits.includes("waterproof")) {
        hardFail = true;
        score -= 100;
      }
      if (p.style === "herringbone") {
        const isHerring =
          intersects(fit.style, "herringbone") || type === "parquetry" || traits.includes("high-waste-pattern");
        if (!isHerring) {
          hardFail = true;
          score -= 40;
        }
      }
      if (p.budget === "under35" && product.price != null && Number(product.price) >= 55) {
        hardFail = true;
        score -= 30;
      }

      if (p.moisture) {
        if (fit.moisture === p.moisture) { breakdown.moisture = 20; score += 20; }
        else if (p.moisture === "occasional" && fit.moisture === "waterproof") { breakdown.moisture = 12; score += 12; }
        else if (p.moisture === "dry" && fit.moisture === "occasional") { breakdown.moisture = 4; score += 4; }
        else if (!hardFail && fit.moisture && fit.moisture !== p.moisture) { breakdown.moisture = -8; score -= 8; }
      }

      if (p.budget && fit.budget) {
        if (fit.budget === p.budget) { breakdown.budget = 15; score += 15; }
        else {
          const dist = budgetDistance(p.budget, fit.budget);
          if (dist === 1) { breakdown.budget = 6; score += 6; }
          else if (dist === 2) { breakdown.budget = -8; score -= 8; }
          else if (p.budget === "quote" && (fit.budget === "55plus" || fit.budget === "quote")) { breakdown.budget = 10; score += 10; }
          else if (p.budget === "55plus" && fit.budget === "quote") { breakdown.budget = 12; score += 12; }
        }
      }

      if (p.style) {
        if (intersects(fit.style, p.style)) {
          const pts = p.style === "herringbone" ? 18 : 15;
          if (
            product.styleSource === "inferred" &&
            p.style === "warm" &&
            fit.style.length === 1 &&
            fit.style[0] === "warm"
          ) {
            breakdown.style = Math.round(pts / 2);
          } else {
            breakdown.style = pts;
          }
          score += breakdown.style;
        } else if (p.style === "light" && intersects(fit.style, "cool")) { breakdown.style = 8; score += 8; }
        else if (p.style === "cool" && intersects(fit.style, "light")) { breakdown.style = 8; score += 8; }
        else if (
          p.style === "light" &&
          intersects(fit.style, "australian") &&
          !intersects(fit.style, "light") &&
          !intersects(fit.style, "cool")
        ) { breakdown.style = -5; score -= 5; }
      }

      if (p.household) {
        if (intersects(fit.household, p.household)) { breakdown.household = 10; score += 10; }
        else if (["kids", "pets", "mixed"].includes(p.household)) {
          if (!traits.includes("waterproof") && fit.moisture !== "waterproof") {
            breakdown.household = -10;
            score -= 10;
          }
        }
      }

      if (p.lifestyle && intersects(fit.lifestyle, p.lifestyle)) {
        breakdown.lifestyle = 10;
        score += 10;
      }

      if (p.lighting) {
        if (intersects(fit.lighting, p.lighting)) { breakdown.lighting = 8; score += 8; }
        if (p.lighting === "dim" && (intersects(fit.style, "light") || intersects(fit.style, "cool"))) {
          breakdown.lightingDimBoost = 4;
          score += 4;
        }
      }

      if (p.space) {
        if (intersects(fit.space, p.space)) { breakdown.space = 6; score += 6; }
        else if (p.space === "apartment" && (type === "solid" || type === "parquetry")) {
          breakdown.space = -6;
          score -= 6;
        }
      }

      if (p.room) {
        if (intersects(fit.room, p.room)) { breakdown.room = 5; score += 5; }
        else if (p.room === "whole" && intersects(fit.room, "living")) { breakdown.room = 2; score += 2; }
      }

      let traitBonus = 0;
      if (
        (traits.includes("waterproof") || fit.moisture === "waterproof") &&
        (needWaterproof || ["kids", "pets", "mixed"].includes(p.household) || p.lifestyle === "kids-pets")
      ) traitBonus += 5;
      if (
        (traits.includes("ac4") || traits.includes("ac5")) &&
        (p.lifestyle === "heavy" || p.space === "commercial" || p.household === "pets" || p.lifestyle === "rental")
      ) traitBonus += 4;
      if (traits.includes("e0") && ["pregnant", "kids", "mixed"].includes(p.household)) traitBonus += 3;
      if (
        traits.includes("real-timber-surface") &&
        (p.lifestyle === "quiet" || p.moisture === "dry" || p.budget === "55plus" || p.budget === "quote")
      ) traitBonus += 4;
      if (traits.includes("high-waste-pattern")) traitBonus += p.style === "herringbone" ? 5 : -6;
      traitBonus = Math.max(-8, Math.min(12, traitBonus));
      if (traitBonus) { breakdown.traits = traitBonus; score += traitBonus; }

      const hints = product.personaHints || [];
      let hintPts = 0;
      if (hints.includes("有孩宠物家庭") && ["kids", "pets", "mixed"].includes(p.household)) hintPts += 2;
      if (hints.includes("暗厅提亮") && (p.lighting === "dim" || p.style === "light")) hintPts += 2;
      if (hints.includes("冷灰现代空间") && p.style === "cool") hintPts += 2;
      if (hints.includes("澳洲硬木个性") && p.style === "australian") hintPts += 2;
      if (hints.includes("人字拼设计焦点") && p.style === "herringbone") hintPts += 2;
      if (hints.includes("预算优先公寓") && p.budget === "under35") hintPts += 2;
      if (hints.includes("出租投资房") && p.lifestyle === "rental") hintPts += 2;
      if (hintPts) { breakdown.personaHints = Math.min(6, hintPts); score += breakdown.personaHints; }

      if (
        (needWaterproof || p.lifestyle === "kids-pets" || ["pets", "kids", "mixed"].includes(p.household)) &&
        fit.moisture === "waterproof" &&
        type === "hybrid"
      ) {
        breakdown.typeNudge = 4;
        score += 4;
      }

      if (product.hasRoomScene) score += 0.5;

      return { product, score, hardFail, breakdown };
    });

    ranked.sort((a, b) => b.score - a.score);

    let pool = ranked.filter(item => !item.hardFail);
    // Do not fall back to hard-failed SKUs (e.g. non-waterproof when waterproof required)
    if (!pool.length) pool = [];

    const picked = [];
    for (const item of pool) {
      if (!picked.length) {
        picked.push(item);
        continue;
      }
      if (picked.length >= 3) break;
      const winner = picked[0].product;
      const candidate = item.product;
      const diverseType = candidate.typeKey !== winner.typeKey;
      const stylesEqual =
        (candidate.fit?.style || [])[0] === (winner.fit?.style || [])[0];
      const tooSimilar = candidate.typeKey === winner.typeKey
        && stylesEqual
        && Math.abs((candidate.price || 999) - (winner.price || 999)) < 3;
      if (picked.length === 1) {
        if (diverseType || !tooSimilar) picked.push(item);
        continue;
      }
      const prev = picked[1].product;
      if (candidate.typeKey !== winner.typeKey || candidate.typeKey !== prev.typeKey || !stylesEqual) {
        picked.push(item);
      }
    }
    while (picked.length < 3 && picked.length < pool.length) {
      const next = pool.find(item => !picked.includes(item));
      if (!next) break;
      picked.push(next);
    }

    const pickedKeys = new Set(picked.map(item => item.product.key));
    return [...picked, ...ranked.filter(item => !pickedKeys.has(item.product.key))];
  }

  function recommendationReason(product) {
    const p = state.profile;
    const reasons = [];
    const hints = product.personaHints || [];
    const best = product.bestFor || [];
    const fit = product.fit || {};

    if (p.moisture && fit.moisture === p.moisture) {
      const zh = { waterproof: "防水要求", occasional: "日常防潮", dry: "干区使用" };
      reasons.push(`防潮标签匹配「${zh[p.moisture] || p.moisture}」`);
    }
    if (p.style && fit.style?.includes(p.style)) {
      const styleZh = { light: "浅色提亮", warm: "温暖原木", australian: "澳洲木材个性", herringbone: "人字拼焦点", cool: "冷灰现代" };
      reasons.push(`风格标签含${styleZh[p.style] || p.style}`);
    }
    if (p.budget && fit.budget === p.budget) {
      reasons.push("预算档与目录标签一致");
    }
    if (p.household && fit.household?.includes(p.household)) {
      reasons.push("家庭情况标签匹配");
    }
    if (p.lifestyle && fit.lifestyle?.includes(p.lifestyle)) {
      reasons.push("使用强度标签匹配");
    }
    if (hints.length && reasons.length < 3) {
      reasons.push(`更契合「${hints.slice(0, 2).join("、")}」`);
    } else if (best.length && reasons.length < 2) {
      reasons.push(best[0]);
    }
    if (p.lighting === "dim" && fit.style?.some(s => s === "light" || s === "cool")) {
      reasons.push("也回应了偏弱采光下对提亮的需求");
    }
    if (!reasons.length) reasons.push(`属于${product.type}方向，适合结合样板与现场条件再确认`);
    return `${reasons.slice(0, 3).join("，")}。`;
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

  function recommendationCard(product, { badge = null, compact = false } = {}) {
    const estimate = estimateFor(product);
    const visual = visualFor(product);
    const label = badge || (visual.kind === "scene" ? "最佳匹配 · 概念效果" : "最佳匹配 · 官网产品图");
    return `
      <section class="recommendation-card${compact ? " is-alt" : ""}" data-recommendation="${product.key}">
        <div class="recommendation-cover"><img src="${escapeHTML(visual.src)}" alt="${escapeHTML(product.name)}"><span>${escapeHTML(label)}</span></div>
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
    const winnerVisual = visualFor(winner);
    const altCards = alternatives.map((product, index) => {
      const visual = visualFor(product);
      const kind = visual.kind === "scene" ? "概念效果" : "官网产品图";
      return recommendationCard(product, { badge: `备选 ${index + 1} · ${kind}`, compact: true });
    }).join("");
    return `
      <div class="recommendation-stack">
        ${recommendationCard(winner, { badge: `主推荐 · ${winnerVisual.kind === "scene" ? "概念效果" : "官网产品图"}` })}
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
    const viable = ranking.filter(item => !item.hardFail);
    if (!viable.length) {
      state.chatBusy = false;
      const typingEmpty = showTyping();
      window.setTimeout(() => {
        typingEmpty.remove();
        addMessage(
          "assistant",
          "按当前硬条件（尤其是防潮/人字拼/预算上限），目录里暂时没有可安全点名的型号。建议先确认是否必须防水，或放宽预算/风格；也可以先按「混合地板 / 防水强化」这类方向看样。",
          true
        );
        renderOptions(["需要防水", "普通干区即可", "改成先看效果再报价", "继续补充需求", "重新开始"]);
        updateProgress();
        scrollChat();
      }, delay);
      return;
    }
    const winner = viable[0].product;
    const alternatives = viable.slice(1, 3).map(item => item.product);
    const typing = showTyping();
    window.setTimeout(() => {
      typing.remove();
      const known = formatFullProfile();
      const knownCount = Object.keys(definedProfile()).length;
      const incomplete = !isProfileComplete();
      const altNames = alternatives.map(item => item.shortName).join("、");
      const lead = forcePartial && incomplete
        ? `好的，我先按当前已知条件给出阶段推荐${known ? `（${escapeHTML(known)}）` : ""}。信息越完整匹配越准，你之后仍可继续补充或修改。主推荐是 ${escapeHTML(winner.name)}${altNames ? `，备选还有 ${escapeHTML(altNames)}` : ""}。`
        : `匹配完成。我根据 ${knownCount} 项已知条件，在当前目录 ${products.length} 款地板中做了确定性排序；主推荐是 ${escapeHTML(winner.name)}${altNames ? `，备选是 ${escapeHTML(altNames)}` : ""}。`;
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
    addMessage("assistant", `你好，我是 Ozwood AI 地板顾问。你可以一次说多个条件（例如「60 平公寓，家里有猫」），我会先汇总确认再继续；也可以逐步点选。关键条件齐了之后，我会请你最后核对，再给出具体型号推荐。`);
    askNext(360);
  }

  function handleCompletedOption(answer) {
    if (answer.includes("重新")) {
      startChat();
      return true;
    }
    if (answer.includes("继续补全") || answer.includes("继续补充")) {
      state.chatComplete = false;
      state.finalConfirmDone = false;
      addMessage("assistant", "好的，我们继续把还缺的条件补齐，之后匹配会更准。");
      askNext(200);
      return true;
    }
    if (answer.includes("再补充")) {
      state.chatComplete = false;
      addMessage("assistant", "可以。直接说新条件即可，例如「还要适合宠物」「预算改成单价 AU$55 以上」「采光比较暗」。我会叠加上去并重新推荐。");
      elements.chatInput.focus();
      renderOptions(["还要适合宠物", "家里有小孩", "采光比较暗", "单价 AU$55 以上", "继续补充需求"]);
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
      addMessage("assistant", "直接告诉我新的条件即可，例如“预算改成单价 AU$40”“采光比较暗”“还要适合宠物”。我会更新后再帮你推荐。");
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
    elements.catalogFilters?.addEventListener("click", event => {
      const chip = event.target.closest("[data-type-filter]");
      if (!chip) return;
      state.typeFilter = chip.dataset.typeFilter;
      renderCatalogFilters();
      renderProductStrip();
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
    elements.productAskOptions?.addEventListener("click", event => {
      const chip = event.target.closest("[data-product-ask]");
      if (!chip) return;
      submitAnswer(chip.dataset.productAsk, { fromProductAsk: true });
    });
    elements.focusedProductDetail?.addEventListener("click", () => openProductDrawer("fit"));
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
    const paths = new Set();
    // Only preload the 5×3 room concept renders + current product thumbs in view
    products.filter(product => product.hasRoomScene).forEach(product => {
      Object.keys(rooms).forEach(room => paths.add(`assets/ozwood/rooms/${room}-${product.key}.jpg`));
    });
    filteredProducts().slice(0, 24).forEach(product => {
      if (product.officialImage) paths.add(product.officialImage);
    });
    const load = () => paths.forEach(src => { const image = new Image(); image.src = src; });
    if ("requestIdleCallback" in window) window.requestIdleCallback(load, { timeout: 1800 });
    else window.setTimeout(load, 900);
  }

  function init() {
    if (!products.length) {
      showToast("产品目录未加载，请先运行 npm run build:ozwood-demo-catalog");
      return;
    }
    renderCatalogFilters();
    renderProductStrip();
    updateStageCopy();
    refreshFocusedProductBar();
    switchScene(state.productKey, state.room, true);
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
