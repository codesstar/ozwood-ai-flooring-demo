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
    chatComplete: false
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

  function updateProgress() {
    const count = answeredCount();
    elements.progressLabel.textContent = `${count} / ${DATA.questions.length}`;
    elements.progressBar.style.width = `${(count / DATA.questions.length) * 100}%`;
  }

  function firstMissingQuestion() {
    return DATA.questions.find(question => state.profile[question.id] === undefined) || null;
  }

  function renderOptions(options) {
    elements.quickOptions.innerHTML = options.map(option => `<button class="quick-option" data-answer="${escapeHTML(option)}" type="button">${escapeHTML(option)}</button>`).join("");
  }

  function styleExplainerHTML() {
    return `
      <div class="style-explainer">
        <div><b>明亮通透</b><span>浅白或浅橡色，让小空间和一般采光显得更开阔。</span></div>
        <div><b>温暖自然</b><span>原木与暖棕色，家庭感更强，最容易搭配长期居住空间。</span></div>
        <div><b>澳洲木材个性</b><span>木纹和天然色差更丰富，辨识度高，强调本土木材气质。</span></div>
        <div><b>人字拼设计感</b><span>拼法本身就是视觉焦点，更精致，但安装与损耗通常更高。</span></div>
        <div><b>冷灰现代</b><span>低饱和灰调，适合极简、现代和商用空间，氛围更克制。</span></div>
      </div>`;
  }

  function askNext(delay = 330) {
    const question = firstMissingQuestion();
    updateProgress();
    if (!question) {
      finishRecommendation(delay);
      return;
    }
    state.chatBusy = true;
    const typing = showTyping();
    window.setTimeout(() => {
      typing.remove();
      const guide = question.id === "style" ? styleExplainerHTML() : "";
      addMessage("assistant", `${escapeHTML(question.text)}${guide}`, true);
      renderOptions(question.options);
      state.chatBusy = false;
    }, delay);
  }

  const PROFILE_VALUES = {
    space: ["house", "apartment", "commercial", "unknown"],
    room: ["living", "bedroom", "study", "whole", "unknown"],
    style: ["light", "warm", "australian", "herringbone", "cool", "unknown"],
    lifestyle: ["kids-pets", "heavy", "quiet", "rental", "unknown"],
    subfloor: ["concrete", "tiles", "timber", "unknown"],
    moisture: ["waterproof", "occasional", "dry", "unknown"],
    service: ["supply-install", "supply-only", "sample", "showroom", "unknown"],
    budget: ["under35", "35-55", "55plus", "quote", "unknown"]
  };
  const FIELD_LABELS = {
    space: "项目", room: "区域", area: "面积", style: "风格", lifestyle: "使用情况",
    subfloor: "基层", moisture: "防水需求", service: "服务", budget: "预算"
  };
  const VALUE_LABELS = {
    house: "独立屋", apartment: "公寓", commercial: "商用空间", living: "客餐厅",
    bedroom: "卧室", study: "书房", whole: "全屋", light: "明亮通透", warm: "温暖自然",
    australian: "澳洲木材个性", herringbone: "人字拼", cool: "冷灰现代", "kids-pets": "孩子或宠物家庭",
    heavy: "高频使用", quiet: "安静成人家庭", rental: "出租或投资房", concrete: "混凝土",
    tiles: "现有瓷砖", timber: "木基层", waterproof: "需要防水", occasional: "偶尔有水",
    dry: "普通干区", "supply-install": "供货加安装", "supply-only": "只供货", sample: "先寄样板",
    showroom: "先看展厅", under35: "AU$35 以下", "35-55": "AU$35–55", "55plus": "AU$55 以上",
    quote: "先看效果再报价", unknown: "待确认"
  };

  function looksLikeQuestion(text) {
    return /[?？]/.test(text)
      || /^(请问|想问|问一下|我想知道)/.test(text)
      || /(区别|怎么|如何|为什么|什么|是否|能否|能不能|可不可以|可以吗|哪款|哪一个|哪个好|哪个|多少钱|适合吗|耐不耐|保养|安装|注意事项|建议)/.test(text);
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

  function normalizeForQuestion(questionId, raw) {
    const text = String(raw).toLowerCase();
    const maps = {
      space: [[/公寓|apartment|unit/, "apartment"], [/办公|商用|office|commercial/, "commercial"], [/独立屋|house|家里|住宅/, "house"], [/不确定|没确定/, "unknown"]],
      room: [[/卧室|bedroom/, "bedroom"], [/书房|home\s*office/, "study"], [/全屋|whole/, "whole"], [/客厅|餐厅|living|dining/, "living"]],
      style: [[/明亮|浅色|通透|奶油|北欧|light|white/, "light"], [/人字|herring|设计感/, "herringbone"], [/澳洲|个性|spotted/, "australian"], [/冷灰|灰色|极简|modern grey/, "cool"], [/温暖|自然|原木|日式|warm|natural/, "warm"]],
      lifestyle: [[/孩子|宠物|猫|狗|kids|pet/, "kids-pets"], [/人流|耐磨|heavy/, "heavy"], [/出租|投资|rental|investment/, "rental"], [/安静|成人/, "quiet"]],
      subfloor: [[/瓷砖|tile/, "tiles"], [/混凝土|水泥|concrete|slab/, "concrete"], [/木基层|timber subfloor/, "timber"], [/不清楚|不知道/, "unknown"]],
      moisture: [[/需要防水|很潮|wet|waterproof/, "waterproof"], [/偶尔|清洁|spill/, "occasional"], [/干区|普通|dry/, "dry"], [/判断|不清楚/, "unknown"]],
      service: [[/供货.*安装|supply.*install/, "supply-install"], [/只.*供货|supply only/, "supply-only"], [/样板|sample/, "sample"], [/展厅|showroom/, "showroom"]],
      budget: [[/35\s*以下|under\s*\$?35|预算低/, "under35"], [/35\s*[–—-]\s*55|35.*55/, "35-55"], [/55\s*以上|over\s*\$?55|高预算/, "55plus"], [/报价|效果|不设|quote/, "quote"]]
    };
    if (questionId === "area") {
      const number = text.match(/(\d{2,4})\s*(?:平|m²|m2|square)?/);
      return number ? Number(number[1]) : undefined;
    }
    if (questionId === "budget") {
      const direct = (maps.budget || []).find(([pattern]) => pattern.test(text));
      if (direct) return direct[1];
      const amount = text.match(/(?:预算|每平|每平方米|au\$|\$)\D{0,8}(\d{2,3})/i);
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

  function extractProfilePatch(raw) {
    const patch = {};
    DATA.questions.forEach(question => {
      const value = normalizeForQuestion(question.id, raw);
      if (value !== undefined) patch[question.id] = value;
    });
    return sanitizeProfilePatch(patch);
  }

  function corroborateModelPatch(modelPatch, evidencePatch, text, intent) {
    if (!['requirements', 'mixed', 'direct_recommend'].includes(intent)) return {};
    const safe = sanitizeProfilePatch(modelPatch);
    const corroborated = {};
    Object.entries(safe).forEach(([id, value]) => {
      if (evidencePatch[id] !== value) return;
      if (intent === 'mixed' && id === 'style' && !/(喜欢|想要|偏好|倾向|选定|改成|风格)/.test(text)) return;
      if (intent === 'mixed' && id === 'room' && !/(主要|准备|打算|需要|想|改造|铺).{0,12}(客厅|餐厅|卧室|书房|全屋)/.test(text)) return;
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
        intent: typeof data.intent === "string" ? data.intent : "question",
        profilePatch: sanitizeProfilePatch(data.profilePatch)
      };
    } finally {
      window.clearTimeout(timer);
    }
  }

  async function handleFlexibleInput(text) {
    const currentBefore = firstMissingQuestion();
    const questionLike = looksLikeQuestion(text);
    const evidencePatch = extractProfilePatch(text);
    // 问句里的产品或风格关键词可能只是比较对象，不能直接当作用户偏好。
    // 混合型“需求 + 问题”交给结构化 AI 抽取；断网时宁可少记，也绝不污染画像。
    const localPatch = questionLike ? {} : evidencePatch;
    const changed = applyProfilePatch(localPatch);
    const directRecommendation = /(直接|现在|先).{0,5}(推荐|出结果)|给我推荐|不用再问|^推荐(一下|一款|吧)?$/.test(text);
    state.chatBusy = true;
    const typing = showTyping();
    if (directRecommendation) {
      typing.remove();
      if (changed.length) addMessage("assistant", `已更新你的需求：${formatCapturedFields(changed)}。我先按现有信息给出阶段推荐，之后仍然可以继续补充或修改。`);
      else addMessage("assistant", "可以。我先按当前已知信息给出阶段推荐，之后你仍然可以继续提问或补充条件。");
      state.chatBusy = false;
      finishRecommendation(220);
      return;
    }
    let result = {
      answer: localKnowledgeAnswer(text),
      intent: changed.length ? "requirements" : "question",
      profilePatch: {}
    };
    try {
      result = await callFlexibleAI(text, currentBefore);
    } catch (_) {
      // 云端中断时继续使用本地理解与知识，不破坏当前问答状态。
    }
    const modelPatch = corroborateModelPatch(result.profilePatch, evidencePatch, text, result.intent);
    const modelChanged = applyProfilePatch(modelPatch);
    const allChanged = [...new Set([...changed, ...modelChanged])];
    typing.remove();

    if (result.intent === "direct_recommend") {
      if (allChanged.length) addMessage("assistant", `已更新你的需求：${escapeHTML(formatCapturedFields(allChanged))}。`);
      state.chatBusy = false;
      finishRecommendation(260);
      return;
    }

    const latestQuestion = firstMissingQuestion();
    const shouldAnswer = ["question", "mixed", "off_topic"].includes(result.intent) || (!allChanged.length && result.answer);
    const parts = [];
    if (shouldAnswer && result.answer) parts.push(escapeHTML(result.answer));
    if (allChanged.length) parts.push(`<strong>已理解：</strong>${escapeHTML(formatCapturedFields(allChanged))}`);
    if (!parts.length) parts.push(escapeHTML(result.answer || localKnowledgeAnswer(text)));

    if (!allChanged.length && latestQuestion) {
      parts.push(`<div class="question-resume"><b>进度没有丢失</b> · 回答完你的问题后，我们仍停在：${escapeHTML(latestQuestion.text)}</div>`);
    } else if (!latestQuestion) {
      parts.push('<div class="question-resume">需求已经足够，你仍可以继续自由提问，或修改任何条件后重新推荐。</div>');
    }
    addMessage("assistant", parts.join("<br>"), true);
    state.chatBusy = false;

    if (!latestQuestion) {
      if (allChanged.length) finishRecommendation(260);
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
      room: "明白，场景已经同步；接下来把面积和视觉方向补齐。",
      area: "好的，我会把材料损耗和安装做成可解释的概念估算。",
      style: "视觉方向很清楚了，我会避免推荐色调相反的产品。",
      lifestyle: "这个条件很重要，耐磨、清洁和日常维护会进入排序。",
      subfloor: "记下了。最终报价前仍建议现场检查平整度与含水率。",
      moisture: "明白，我会把“防潮耐水”和“完全防水”区分开。",
      service: "好的，结果里会给出相应的下一步行动。",
      budget: "预算收到，我现在把产品、场景、性能和服务方式放在一起匹配。"
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

    const currentQuestion = firstMissingQuestion();
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
      addMessage("assistant", "没问题，这项先标记为待确认，不会阻塞后面的推荐。");
      askNext(220);
      return;
    }
    if (/^(继续|继续流程|继续问吧)$/.test(text)) {
      if (currentQuestion) askNext(160);
      else renderOptions(completedOptions());
      return;
    }

    if (options.fromOption && currentQuestion) {
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
    if (p.lifestyle === "kids-pets") reasons.push("也回应了孩子或宠物带来的耐磨与清洁需求");
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

  function recommendationCard(product, alternatives) {
    const estimate = estimateFor(product);
    return `
      <section class="recommendation-card" data-recommendation="${product.key}">
        <div class="recommendation-cover"><img src="${scenePath(product.key)}" alt="${escapeHTML(product.name)}概念效果"><span>最佳匹配 · 概念效果</span></div>
        <div class="recommendation-body">
          <small>${escapeHTML(product.code)} · ${escapeHTML(product.type)}</small>
          <h3>${escapeHTML(product.name)}</h3>
          <p>${escapeHTML(recommendationReason(product))}</p>
          <div class="recommendation-metrics">
            <div><small>材料费用参考</small><b>${escapeHTML(estimate.material)}</b></div>
            <div><small>${state.profile.service === "supply-install" ? "供货安装概算*" : "项目面积"}</small><b>${state.profile.service === "supply-install" ? escapeHTML(estimate.total) : `${estimate.area} m²`}</b></div>
          </div>
          <p>备选：${alternatives.map(item => escapeHTML(item.shortName)).join(" · ")}</p>
          <div class="recommendation-actions">
            <button data-rec-action="apply" type="button">应用到当前房间</button>
            <button class="secondary" data-rec-action="details" type="button">查看推荐理由</button>
          </div>
        </div>
      </section>
    `;
  }

  function finishRecommendation(delay = 420) {
    state.chatBusy = true;
    elements.quickOptions.innerHTML = "";
    const ranking = scoreProducts();
    const winner = ranking[0].product;
    const alternatives = ranking.slice(1, 3).map(item => item.product);
    const typing = showTyping();
    window.setTimeout(() => {
      typing.remove();
      addMessage("assistant", `匹配完成。我把 ${answeredCount()} 个条件与 Ozwood 的五个产品方向做了确定性排序；主推荐是 ${winner.name}。`);
      const holder = document.createElement("div");
      holder.innerHTML = recommendationCard(winner, alternatives).trim();
      elements.chatStream.appendChild(holder.firstElementChild);
      chooseProduct(winner.key, { forcePrimary: true, force: true });
      renderOptions(completedOptions());
      updateProgress();
      state.chatComplete = true;
      state.chatBusy = false;
      scrollChat();
    }, delay);
  }

  function startChat() {
    state.profile = {};
    state.answerOrder = [];
    state.history = [];
    state.chatBusy = false;
    state.chatComplete = false;
    elements.chatStream.innerHTML = "";
    elements.quickOptions.innerHTML = "";
    updateProgress();
    addMessage("assistant", "你好，我是 Ozwood AI 地板顾问。你可以跟着按钮完成 9 步分析，也可以随时打断我、自由提问、一次说完全部需求，或者修改之前的答案；我会保留进度，不会把插话误当成当前问题的答案。");
    askNext(360);
  }

  function handleCompletedOption(answer) {
    if (answer.includes("重新")) {
      startChat();
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
      addMessage("assistant", "直接告诉我新的条件即可，例如“预算改成 AU$40”“现在有一只狗”“改成冷灰风格”。我会更新画像并重新推荐，不需要从头再来。");
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
