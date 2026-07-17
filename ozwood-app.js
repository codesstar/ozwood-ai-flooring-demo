(function () {
  "use strict";

  const DATA = window.OZWOOD_DEMO;
  const products = DATA.products;
  const rooms = DATA.rooms;

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

  function addMessage(role, content, html = false) {
    const row = document.createElement("div");
    row.className = `message-row ${role}`;
    if (role === "assistant") row.innerHTML = `<span class="message-avatar">OZ</span>`;
    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    if (html) bubble.innerHTML = content;
    else bubble.textContent = content;
    row.appendChild(bubble);
    elements.chatStream.appendChild(row);
    scrollChat();
    return row;
  }

  function showTyping() {
    const row = addMessage("assistant", '<span class="typing-dots"><i></i><i></i><i></i></span>', true);
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

  function looksLikeQuestion(text) {
    return /[?？]/.test(text)
      || /(有什么区别|区别是什么|怎么选|为什么|是什么|是不是|是否|能不能|可不可以|可以吗|哪款|哪一个|哪个好|哪个|多少钱|适合吗|耐不耐|如何|怎么保养|怎么安装|需要注意什么)/.test(text);
  }

  function localKnowledgeAnswer(question) {
    const text = question.toLowerCase();
    if (/(明亮|温暖|澳洲木材|人字拼|冷灰|这几个|五个).*(区别|怎么选)|风格.*区别/.test(text)) {
      return "这五个选项描述的是空间感觉，不是产品等级：明亮通透用浅色放大空间；温暖自然强调舒适和百搭；澳洲木材个性突出天然色差与本土木纹；人字拼把地面变成设计焦点，但人工和损耗更高；冷灰现代更克制，适合极简或商用环境。";
    }
    if (/(工程木|强化|混合|hybrid|laminate).*(区别|怎么选)|区别.*(工程木|强化|混合)/.test(text)) {
      return "工程木地板表层是真实木材，质感自然、结构比实木稳定，但仍要控制水分；强化地板以耐磨表层和高密度基材为主，价格友好、锁扣快装，防潮耐水不等于防水；混合地板更强调防水和高频使用，适合宠物、投资房或靠近厨房的空间，但天然木材触感较弱。人字拼则主要是铺装形式，成本和施工精度通常更高。";
    }
    if (/(防水|潮湿|厨房|水渍)/.test(text)) {
      return "当前五款里，灰橡混合地板明确强调防水，最适合水渍和高频清洁需求；OZ2628 白橡木是防潮耐水，并不等于完全防水；欧洲橡木、斑纹桉和人字拼属于木质方向，安装前必须确认基层含水率，也不建议用于长期积水区域。";
    }
    if (/(孩子|宠物|猫|狗|耐磨|耐脏)/.test(text)) {
      return "孩子、宠物和高频使用优先看灰橡混合地板或澳洲斑纹桉：前者更省心、防水且预算友好；后者木材个性更强、硬度高，但需要接受天然色差和木地板的养护方式。";
    }
    if (/(价格|预算|多少钱|报价)/.test(text)) {
      return "当前官网参考中，灰橡混合地板约 AU$19.8/m²、OZ2628 白橡木约 AU$28.8/m²、欧洲橡木 5106 的产品页促销参考约 AU$49/m²；斑纹桉和人字拼需要单独报价。官网存在不同页面价格记录，正式报价仍需确认库存、批次、面积、损耗和安装条件。";
    }
    if (/(斑纹桉|spotted gum)/.test(text)) {
      return "澳洲斑纹桉的特点是木纹和色彩变化明显，常见绿色、灰色、蜂蜜色与暖棕变化，硬度和澳洲本土辨识度都很突出。它适合希望地面有个性、能接受天然色差的家庭。";
    }
    if (/(人字拼|herringbone)/.test(text)) {
      return "人字拼的优势是方向感、层次和高端设计感；代价是放线、切割、收边更复杂，材料损耗和安装费通常高于直铺。它更适合作为客厅、玄关或重点空间的视觉主角。";
    }
    if (/(安装|基层|混凝土|瓷砖|找平|含水率)/.test(text)) {
      return "无论选择哪款，先确认基层平整度和含水率。混凝土楼板要检测潮气；旧瓷砖要确认牢固和平整；人字拼需要专业放线；锁扣类产品也必须保留伸缩缝。最终安装方式应由现场测量决定。";
    }
    if (/(保养|养护|清洁|拖地)/.test(text)) {
      return "日常先清除砂粒并及时处理水渍。工程木地板使用微湿拖布和建议的木地板清洁剂；强化和混合地板更容易打理，但也应避免磨蚀清洁剂。家具脚建议使用保护垫。";
    }
    return "可以自由提问。你可以问我产品材质区别、哪款更适合孩子宠物、防水能力、价格、安装基层、清洁养护，或者直接把两款产品放在一起比较。我会先回答问题，再保留当前选购进度。";
  }

  async function answerCustomQuestion(question) {
    const currentQuestion = firstMissingQuestion();
    state.chatBusy = true;
    const typing = showTyping();
    let answer = localKnowledgeAnswer(question);
    const supportsCloudAI = !window.location.hostname.endsWith("github.io");
    if (supportsCloudAI) {
      try {
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), 9000);
        const response = await fetch("/api/ozwood-question", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question }),
          signal: controller.signal
        });
        window.clearTimeout(timer);
        if (response.ok) {
          const data = await response.json();
          if (typeof data.answer === "string" && data.answer.trim()) answer = data.answer.trim();
        }
      } catch (_) {
        // 本地知识答案已经准备好，API 中断时不影响现场演示。
      }
    }
    typing.remove();
    const resume = currentQuestion
      ? `<div class="question-resume">你的选购进度已保留，请继续回答当前问题。</div>`
      : `<div class="question-resume">你还可以继续提问，或重新开始需求分析。</div>`;
    addMessage("assistant", `${escapeHTML(answer)}${resume}`, true);
    if (currentQuestion) renderOptions(currentQuestion.options);
    else renderOptions(["重新做一次需求问答", "打开品牌故事"]);
    state.chatBusy = false;
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
      return number ? Number(number[1]) : null;
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
      return String(raw);
    }
    const match = (maps[questionId] || []).find(([pattern]) => pattern.test(text));
    return match ? match[1] : String(raw);
  }

  function extractProfile(raw) {
    const text = String(raw);
    const ids = DATA.questions.map(question => question.id);
    ids.forEach(id => {
      const value = normalizeForQuestion(id, text);
      if (id === "area") {
        if (value) state.profile.area = value;
      } else if (typeof value === "string" && value !== text) {
        state.profile[id] = value;
      }
    });
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

  function submitAnswer(raw) {
    const text = String(raw).trim();
    if (!text || state.chatBusy) return;
    addMessage("user", text);
    elements.chatInput.value = "";
    elements.quickOptions.innerHTML = "";

    if (looksLikeQuestion(text)) {
      answerCustomQuestion(text);
      return;
    }

    if (state.chatComplete) {
      extractProfile(text);
      state.chatComplete = false;
      finishRecommendation(420);
      return;
    }

    const currentQuestion = firstMissingQuestion();
    extractProfile(text);
    if (currentQuestion && state.profile[currentQuestion.id] === undefined) {
      state.profile[currentQuestion.id] = normalizeForQuestion(currentQuestion.id, text);
    }

    if (state.profile.room === "living" || state.profile.room === "bedroom" || state.profile.room === "study") {
      chooseRoom(state.profile.room);
    }
    const thanks = acknowledge(currentQuestion?.id);
    state.chatBusy = true;
    const typing = showTyping();
    window.setTimeout(() => {
      typing.remove();
      addMessage("assistant", thanks);
      state.chatBusy = false;
      askNext(280);
    }, 340);
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
      renderOptions(["重新做一次需求问答", "打开品牌故事"]);
      updateProgress();
      state.chatComplete = true;
      state.chatBusy = false;
      scrollChat();
    }, delay);
  }

  function startChat() {
    state.profile = {};
    state.chatBusy = false;
    state.chatComplete = false;
    elements.chatStream.innerHTML = "";
    elements.quickOptions.innerHTML = "";
    updateProgress();
    addMessage("assistant", "你好，我会像一位真实的地板顾问一样，先了解空间、生活方式、基层和预算，再从当前 5 个 Ozwood 产品方向中给出一款主推荐与两款备选。每一步都有按钮，也可以直接用一句话告诉我全部需求。");
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
      submitAnswer(option.dataset.answer);
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

  init();
})();
