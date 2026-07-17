(function () {
  const floors = [
    {
      key: 'oak-natural', id: 'RD-OAK-180', name: '原生橡木 · 晨光', brand: 'NATURA', category: '三层实木',
      price: 328, size: '1900×190×15mm', finish: '自然哑光', install: '直铺',
      appCategory: '多层实木', wood: '欧洲橡木', surface: '自然哑光', thickness: '15mm', origPrice: 398,
      location: 'A区-实景样板01', hot: true, color: '#b78c5e',
      desc: '精选欧洲橡木，保留自然山纹与柔和色差。自然哑光表面减少反光，适合现代、原木与奶油风空间。',
      tags: ['地暖适用', 'E0环保', '自然哑光'],
      thumb: 'assets/floors/sku-oak-natural-thumb.jpg', texture: 'assets/floors/sku-oak-natural.png'
    },
    {
      key: 'walnut-smoked', id: 'RD-WAL-190', name: '烟熏黑胡桃 · 暮色', brand: 'NATURA', category: '多层实木',
      price: 468, size: '1860×190×15mm', finish: '柔光油面', install: '直铺',
      appCategory: '多层实木', wood: '黑胡桃木', surface: '柔光油面', thickness: '15mm', origPrice: 568,
      location: 'A区-实景样板02', hot: true, color: '#60402d',
      desc: '深烟熏胡桃色与清晰木纹带来沉稳质感，柔光油面触感温润，适合轻奢、现代与书房空间。',
      tags: ['北美黑胡桃', '高端系列', '柔光油面'],
      thumb: 'assets/floors/sku-walnut-smoked-thumb.jpg', texture: 'assets/floors/sku-walnut-smoked.png'
    },
    {
      key: 'oak-herringbone', id: 'RD-HB-120', name: '精选橡木 · 人字拼', brand: 'ATELIER', category: '多层实木',
      price: 398, size: '600×120×15mm', finish: '超哑耐磨', install: '人字拼',
      appCategory: '多层实木', wood: '橡木面层', surface: '超哑耐磨', thickness: '15mm', origPrice: 468,
      location: 'A区-实景样板03', hot: true, color: '#af875d', pattern: 'herringbone',
      desc: '经典人字拼以真实比例增强空间秩序感，精选橡木纹理自然，适合客厅、主卧与设计感空间。',
      tags: ['人字拼', '设计师款', '地暖适用'],
      thumb: 'assets/floors/sku-oak-herringbone-thumb.jpg', texture: 'assets/floors/sku-oak-herringbone.png'
    },
    {
      key: 'oak-white', id: 'RD-WO-190', name: '北欧白橡 · 云境', brand: 'NATURA', category: '三层实木',
      price: 358, size: '1900×190×15mm', finish: '柔雾哑光', install: '直铺',
      appCategory: '多层实木', wood: '白橡木', surface: '柔雾哑光', thickness: '15mm', origPrice: 428,
      location: 'A区-实景样板04', hot: true, color: '#d8c3a4',
      desc: '浅白橡色调干净通透，柔雾表面能够提亮空间且不过度反光，适合北欧、日式和小户型。',
      tags: ['北欧浅色', '空间显大', '地暖适用'],
      thumb: 'assets/floors/sku-oak-white-thumb.jpg', texture: 'assets/floors/sku-oak-white.png'
    },
    {
      key: 'oak-gray', id: 'RD-GR-190', name: '银灰橡木 · 雾岚', brand: 'URBAN', category: '强化复合',
      price: 188, size: '1215×195×12mm', finish: '同步木纹', install: '锁扣快装',
      appCategory: '强化', wood: '高密度基材', surface: '同步木纹', thickness: '12mm', origPrice: 238,
      location: 'A区-实景样板05', hot: true, color: '#aaa49a',
      desc: '克制的银灰色调搭配同步木纹，耐磨易打理，适合现代简约、工业风与高频使用空间。',
      tags: ['现代灰调', 'AC5耐磨', '易打理'],
      thumb: 'assets/floors/sku-oak-gray-thumb.jpg', texture: 'assets/floors/sku-oak-gray.png'
    }
  ];

  const scenes = [
    { key: 'living', name: '客厅', caption: '现代客厅 · 自然采光' },
    { key: 'bedroom', name: '卧室', caption: '主卧空间 · 柔和晨光' },
    { key: 'study', name: '书房', caption: '家庭书房 · 午后自然光' }
  ];

  const matrix = {};
  scenes.forEach(scene => {
    matrix[scene.key] = {};
    floors.forEach(floor => {
      matrix[scene.key][floor.key] = `assets/rooms/${scene.key}-${floor.key}.jpg`;
    });
  });

  const productMap = {
    'SM-001': 'oak-natural',
    'SM-002': 'walnut-smoked',
    'SM-003': 'oak-natural',
    'DC-001': 'oak-natural',
    'DC-002': 'oak-white',
    'DC-003': 'oak-herringbone',
    'QH-001': 'oak-white',
    'QH-002': 'walnut-smoked',
    'QH-003': 'oak-gray',
    'SPC-001': 'oak-white',
    'SPC-002': 'oak-gray',
    'SPC-003': 'oak-herringbone'
  };

  window.VISUALIZER = { floors, scenes, matrix, productMap };
})();
