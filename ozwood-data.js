window.OZWOOD_DEMO = {
  rooms: {
    living: { label: "客厅", zh: "客厅", note: "悉尼开放式住宅空间" },
    bedroom: { label: "卧室", zh: "卧室", note: "安静舒适的私人空间" },
    study: { label: "书房", zh: "书房", note: "专注工作的家庭书房" }
  },
  // products come from ozwood-catalog.js (built from Skill products.json)
  products: [],
  stories: [
    {
      id: "expertise",
      eyebrow: "OZWOOD 的承诺",
      title: "专业，让选择更安心",
      text: "Ozwood 将自己定位为悉尼木地板专业服务商，提供产品选择、供货与专业安装。官网目前介绍其已经服务超过 10,000 个悉尼家庭。",
      image: "assets/ozwood/official/story-flooring-journey.jpg",
      facts: ["服务 10,000+ 悉尼家庭", "木地板选择与供货", "经验丰富的安装团队"],
      source: "https://ozwoodaustralia.com.au/"
    },
    {
      id: "spotted",
      eyebrow: "一段木材故事",
      title: "重新认识澳洲斑纹桉",
      text: "Ozwood 最打动人的故事之一，是一次视角的改变：一位木材从业者来到悉尼，起初并不重视 Spotted Gum，后来才理解它的颜色变化、硬度与本土身份为什么如此适合澳洲住宅。",
      image: "assets/ozwood/official/story-spotted-gum.jpg",
      facts: ["绿色、灰色与蜂蜜色变化", "官网文章提到 11 kN Janka 硬度", "具有强烈澳洲身份的本土木材"],
      source: "https://ozwoodaustralia.com.au/2018/04/21/the-spotted-gum-i-know/"
    },
    {
      id: "healthy",
      eyebrow: "健康住宅",
      title: "先理解材料，而不只选择颜色",
      text: "Ozwood 的知识内容会引导客户同时考虑排放等级、材料结构和日常生活，而不只是外观。这套 Demo 把这些内容转化为孩子、宠物、清洁、潮湿和房间用途等实际问题。",
      image: "assets/ozwood/official/story-healthy-floor.png",
      facts: ["了解 E0 与排放声明", "让性能匹配使用空间", "确认具体产品检测资料"],
      source: "https://ozwoodaustralia.com.au/2017/11/15/for/"
    },
    {
      id: "journey",
      eyebrow: "完整决策过程",
      title: "选购 → 安装 → 养护",
      text: "选定颜色并不代表地板决策已经结束。Ozwood 的知识库围绕选对产品、正确准备与安装，以及长期养护三个阶段组织。",
      image: "assets/ozwood/official/story-client-journey.jpg",
      facts: ["空间与生活方式匹配", "基层和含水率检查", "低水分日常养护"],
      source: "https://ozwoodaustralia.com.au/knowledgebase/?id=tab_choosing"
    },
    {
      id: "showrooms",
      eyebrow: "亲眼看，亲手摸",
      title: "两家悉尼展厅",
      text: "数字推荐最终应该连接到真实的下一步：比较实物板，理解天然色差，并和 Ozwood 团队确认现场安装条件。",
      image: "assets/ozwood/official/story-barock.jpg",
      facts: ["Auburn · D2 / 290 Parramatta Road", "Castle Hill · 8/9 Salisbury Road", "免费咨询、样板或报价申请"],
      source: "https://ozwoodaustralia.com.au/contact/"
    }
  ],
  // critical：必须有有效值（非 unknown）才允许点名产品推荐
  // optional：可 unknown，不阻塞正式推荐
  questions: [
    { id: "space", critical: true, text: "先从项目类型开始：这次铺装是在什么空间？", options: ["独立屋", "公寓", "办公室或商用", "还没确定"] },
    {
      id: "room",
      critical: true,
      text: "主要想改造哪个区域？我会同步切换到对应的概念场景。",
      options: ["客厅和餐厅", "卧室", "书房", "全屋统一"],
      // 商用时展示办公场景文案；取值仍映射到 living / study / bedroom / whole
      commercial: {
        text: "主要铺装哪个办公区域？我会尽量同步到接近的概念场景。",
        options: ["开放办公区 / 公共区", "会议室或接待区", "独立办公室", "整层统一"]
      }
    },
    { id: "area", critical: true, text: "大约需要铺多少平方米？这个会影响材料、损耗和预算估算。", options: ["约 30 m²", "约 60 m²", "约 100 m²", "暂时不清楚"] },
    { id: "lighting", critical: true, text: "铺装空间的自然采光怎么样？这会影响深浅色调的选择。", options: ["采光很好", "采光一般", "采光比较暗", "暂时不清楚"] },
    { id: "style", critical: true, text: "你更喜欢哪种颜色和色调感觉？不确定时也可以先说「温暖」「浅色」，我会再帮你细化。", options: ["明亮通透", "温暖自然", "温暖亮色", "澳洲木材个性", "人字拼设计感", "冷灰现代"] },
    {
      id: "household",
      critical: true,
      text: "家里有没有需要特别照顾的情况？",
      options: ["有小孩", "有孕妇或备孕", "有老人", "有宠物", "多种特殊情况", "没有特殊情况"],
      commercial: {
        text: "现场使用人群有没有需要特别注意的？",
        options: ["无特殊要求", "对低排放更敏感", "长者或行动不便者较多", "多种情况需要兼顾"]
      }
    },
    {
      id: "lifestyle",
      critical: true,
      text: "日常使用强度更接近哪一种？",
      options: ["孩子宠物高频", "人流较大 / 耐磨优先", "安静的成人家庭", "出租或投资房"],
      commercial: {
        text: "办公场景的使用强度更接近哪一种？",
        options: ["人流较大 / 耐磨优先", "安静办公 / 会议为主", "短租或投资型物业", "普通日常办公"]
      }
    },
    { id: "moisture", critical: true, text: "这里对防水或防潮的要求高吗？", options: ["需要防水", "偶尔有水和清洁", "普通干区", "需要现场判断"] },
    { id: "subfloor", critical: false, text: "现有基层是什么？不知道也没关系，现场测量时可以确认。", options: ["混凝土楼板", "现有瓷砖", "木基层", "不清楚"] },
    { id: "budget", critical: true, text: "每平方米材料预算大概是多少？（指单价 AU$/m²，不是铺装面积）", options: ["单价 AU$35 以下", "单价 AU$35–55", "单价 AU$55 以上", "先看效果再报价"] },
    { id: "service", critical: false, text: "你希望 Ozwood 提供到哪一步？", options: ["供货 + 安装", "只需要供货", "先寄样板", "先到展厅看看"] }
  ]
};
