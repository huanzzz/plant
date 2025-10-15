/**
 * 植物识别应用主文件
 * 协调模型加载器和图像预处理器
 */

class PlantRecognitionApp {
  constructor() {
    this.modelLoader = new ModelLoader();
    this.imagePreprocessor = new ImagePreprocessor();
    this.initUI();
    this.initEventListeners();
    this.printWelcomeMessage();
  }

  /**
   * 初始化 UI 元素引用
   */
  initUI() {
    this.elements = {
      status: document.getElementById('status'),
      modelPath: document.getElementById('modelPath'),
      modelInput: document.getElementById('modelInput'),
      fileInput: document.getElementById('fileInput'),
      preview: document.getElementById('preview'),
      predictBtn: document.getElementById('predictBtn'),
      results: document.getElementById('results'),
      imgWrap: document.getElementById('imgWrap'),
      placeholderText: document.querySelector('.placeholder-text'),
      preprocessSelect: document.getElementById('preprocessSelect'),
      debugToggle: document.getElementById('debugToggle'),
      testAllBtn: document.getElementById('testAllBtn')
    };

    // 初始化状态
    this.elements.status.innerHTML = '<span style="color: #f59e0b;">⚠️ 请上传模型文件</span>';
    this.elements.modelPath.textContent = '未上传';
  }

  /**
   * 初始化事件监听器
   */
  initEventListeners() {
    // 模型上传
    this.elements.modelInput.addEventListener('change', () => this.handleModelUpload());
    
    // 图片上传
    this.elements.fileInput.addEventListener('change', () => this.handleImageUpload());
    
    // 拖放功能
    this.setupDragAndDrop();
    
    // 点击预览区域选择文件
    this.elements.imgWrap.addEventListener('click', () => {
      this.elements.fileInput.click();
    });
    
    // 预测按钮
    this.elements.predictBtn.addEventListener('click', () => this.predict());
    
    // 预处理模式切换
    this.elements.preprocessSelect.addEventListener('change', (e) => {
      this.imagePreprocessor.setMode(e.target.value);
      if (this.elements.preview.src && this.modelLoader.model) {
        console.log('ℹ️  检测到已上传图片，可以直接点击"开始识别"按钮测试新模式');
      }
    });
    
    // 调试开关
    this.elements.debugToggle.addEventListener('change', (e) => {
      const enabled = e.target.checked;
      this.modelLoader.setDebugMode(enabled);
      this.imagePreprocessor.setDebugMode(enabled);
      console.log('调试模式:', enabled ? '开启' : '关闭');
    });
    
    // 测试所有模式按钮
    this.elements.testAllBtn.addEventListener('click', () => this.testAllModes());
  }

  /**
   * 设置拖放功能
   */
  setupDragAndDrop() {
    this.elements.imgWrap.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.elements.imgWrap.classList.add('drag-over');
    });

    this.elements.imgWrap.addEventListener('dragleave', (e) => {
      e.preventDefault();
      this.elements.imgWrap.classList.remove('drag-over');
    });

    this.elements.imgWrap.addEventListener('drop', (e) => {
      e.preventDefault();
      this.elements.imgWrap.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      this.handleFileSelect(file);
    });
  }

  /**
   * 处理模型上传
   */
  async handleModelUpload() {
    const file = this.elements.modelInput.files?.[0];
    if (!file) return;

    try {
      this.elements.status.innerHTML = '<span class="loading"></span> 正在解压模型文件…';
      this.elements.modelPath.textContent = '解压中...';

      await this.modelLoader.loadFromZip(file);

      const info = this.modelLoader.getModelInfo();
      this.elements.status.innerHTML = `<span style="color: #48bb78;">✅ 模型加载成功（${info.modelType === 'layers' ? 'LayersModel' : 'GraphModel'}）</span>`;
      this.elements.status.innerHTML += `<br><span class="small">输入尺寸：${info.inputSize}x${info.inputSize}</span>`;
      
      if (info.labelCount > 0) {
        this.elements.status.innerHTML += `<br><span class="small">识别类别：${info.labelCount} 种植物</span>`;
      }
      
      this.elements.modelPath.textContent = '用户上传的模型';
      this.elements.predictBtn.disabled = false;

    } catch (err) {
      console.error('模型上传失败:', err);
      this.elements.status.innerHTML = '<span style="color: #e53e3e;">❌ ' + err.message + '</span>';
      this.elements.modelPath.textContent = '加载失败';
      alert('❌ 模型上传失败：' + err.message);
    }
  }

  /**
   * 处理图片上传
   */
  handleImageUpload() {
    const file = this.elements.fileInput.files?.[0];
    this.handleFileSelect(file);
  }

  /**
   * 处理文件选择
   */
  handleFileSelect(file) {
    if (!file || !file.type.startsWith('image/')) {
      alert('请选择有效的图片文件（JPG、PNG等格式）');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('图片文件大小不能超过10MB');
      return;
    }

    const url = URL.createObjectURL(file);
    this.elements.preview.onload = () => {
      URL.revokeObjectURL(url);
      this.elements.results.innerHTML = '';
      this.elements.placeholderText.style.display = 'none';
      this.elements.preview.style.display = 'block';
    };
    this.elements.preview.src = url;
  }

  /**
   * 执行预测
   */
  async predict() {
    if (!this.modelLoader.model || !this.elements.preview.src) return;

    const originalText = this.elements.predictBtn.innerHTML;
    this.elements.predictBtn.disabled = true;
    this.elements.predictBtn.innerHTML = '⏳ 识别中...';
    
    this.elements.results.innerHTML = '<div class="small" style="text-align: center; padding: 20px;">🔍 正在分析植物特征...</div>';

    try {
      if (this.imagePreprocessor.debugMode) {
        console.log('=== 开始预测 ===');
        console.log('模型类型:', this.modelLoader.modelType);
      }

      // 预处理图像
      const input = this.imagePreprocessor.preprocess(
        this.elements.preview,
        this.modelLoader.inputSize
      );

      if (this.imagePreprocessor.debugMode) {
        console.log('输入张量形状:', input.shape);
        console.log('输入张量值范围:', [tf.min(input).dataSync()[0], tf.max(input).dataSync()[0]]);
      }

      // 执行预测
      const output = await this.modelLoader.predict(input);

      if (this.imagePreprocessor.debugMode) {
        console.log('输出张量形状:', output.shape);
        console.log('输出张量值范围:', [tf.min(output).dataSync()[0], tf.max(output).dataSync()[0]]);
      }

      const probs = await output.data();
      const probsArray = Array.from(probs);

      if (this.imagePreprocessor.debugMode) {
        console.log('预测概率:', probsArray);
        console.log('概率总和:', probsArray.reduce((a, b) => a + b, 0));
        probsArray.forEach((p, i) => {
          const label = this.modelLoader.getLabelName(i);
          console.log(`  ${label}: ${(p * 100).toFixed(2)}%`);
        });
        console.log('=== 预测完成 ===');
      }

      this.showResults(probsArray);
      tf.dispose([input, output]);

    } catch (e) {
      console.error('预测错误:', e);
      this.elements.results.innerHTML = `
        <div style="text-align: center; padding: 20px; color: #e53e3e;">
          <div>❌ 识别失败</div>
          <div class="small">${e.message || '未知错误'}</div>
        </div>
      `;
    } finally {
      this.elements.predictBtn.disabled = false;
      this.elements.predictBtn.innerHTML = originalText;
    }
  }

  /**
   * 显示预测结果
   */
  showResults(probArray, topK = 5) {
    const indexed = probArray.map((p, i) => ({ i, p }));
    indexed.sort((a, b) => b.p - a.p);
    const tops = indexed.slice(0, topK);

    this.elements.results.innerHTML = '';

    if (tops.length === 0) {
      this.elements.results.innerHTML = '<div class="small">未识别到有效结果</div>';
      return;
    }

    tops.forEach(({ i, p }, index) => {
      const name = this.modelLoader.getLabelName(i);
      const percentage = (p * 100).toFixed(2);
      const confidence = p > 0.8 ? '高' : p > 0.5 ? '中' : '低';

      const div = document.createElement('div');
      div.className = 'result-item';
      div.innerHTML = `
        <div>
          <strong>${index === 0 ? '🏆 ' : ''}${name}</strong>
          <div class="small">置信度：${confidence}</div>
        </div>
        <div class="result-percentage">${percentage}%</div>
      `;
      this.elements.results.appendChild(div);
    });
  }

  /**
   * 测试所有预处理模式
   */
  async testAllModes() {
    if (!this.modelLoader.model || !this.elements.preview.src) {
      alert('⚠️ 请先上传图片！');
      return;
    }

    const modes = this.imagePreprocessor.getAllModes();
    const modeValues = modes.map(m => m.value);

    this.elements.testAllBtn.disabled = true;
    this.elements.testAllBtn.innerHTML = '⏳ 测试中...';

    console.log('\n' + '='.repeat(70));
    console.log('🧪 开始自动测试所有预处理模式');
    console.log('='.repeat(70));
    console.log('📸 当前图片已加载，将依次测试 6 种预处理模式\n');

    const results = [];

    for (let i = 0; i < modeValues.length; i++) {
      const modeValue = modeValues[i];
      const modeLabel = modes[i].label;
      
      this.imagePreprocessor.setMode(modeValue);
      this.elements.preprocessSelect.value = modeValue;

      console.log(`\n[${i + 1}/6] 测试 ${modeLabel}`);
      console.log('-'.repeat(70));

      try {
        const input = this.imagePreprocessor.preprocess(
          this.elements.preview,
          this.modelLoader.inputSize
        );
        
        const output = await this.modelLoader.predict(input);
        const probs = await output.data();
        const probsArray = Array.from(probs);

        // 找出最高概率的类别
        let maxProb = -1;
        let maxIdx = -1;
        probsArray.forEach((p, idx) => {
          if (p > maxProb) {
            maxProb = p;
            maxIdx = idx;
          }
        });

        const predictedLabel = this.modelLoader.getLabelName(maxIdx);

        results.push({
          mode: modeLabel,
          label: predictedLabel,
          confidence: maxProb,
          probs: probsArray
        });

        console.log(`✅ 预测结果: ${predictedLabel} (${(maxProb * 100).toFixed(2)}%)`);
        console.log('完整概率分布:');
        probsArray.forEach((p, idx) => {
          const label = this.modelLoader.getLabelName(idx);
          console.log(`  ${label}: ${(p * 100).toFixed(2)}%`);
        });

        tf.dispose([input, output]);
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (e) {
        console.error(`❌ ${modeLabel} 测试失败:`, e.message);
        results.push({
          mode: modeLabel,
          label: '错误',
          confidence: 0,
          error: e.message
        });
      }
    }

    // 输出汇总
    this.printTestSummary(results);

    this.elements.testAllBtn.disabled = false;
    this.elements.testAllBtn.innerHTML = '🧪 自动测试所有模式';

    alert('✅ 测试完成！请查看控制台查看详细结果。');
  }

  /**
   * 打印测试汇总
   */
  printTestSummary(results) {
    console.log('\n' + '='.repeat(70));
    console.log('📊 测试结果汇总');
    console.log('='.repeat(70));

    const summary = {};
    results.forEach(r => {
      if (!r.error) {
        if (!summary[r.label]) {
          summary[r.label] = [];
        }
        summary[r.label].push({ mode: r.mode, conf: r.confidence });
      }
    });

    console.log('\n按预测类别分组:');
    Object.keys(summary).forEach(label => {
      console.log(`\n🏷️  ${label}:`);
      summary[label].forEach(item => {
        console.log(`   ${item.mode}: ${(item.conf * 100).toFixed(2)}%`);
      });
    });

    console.log('\n' + '='.repeat(70));
    console.log('💡 使用建议:');
    console.log('   1. 查看哪个模式预测出了正确的类别');
    console.log('   2. 选择该模式作为默认预处理方式');
    console.log('   3. 用多张训练图片验证该模式的准确性');
    console.log('='.repeat(70) + '\n');
  }

  /**
   * 打印欢迎信息
   */
  printWelcomeMessage() {
    console.log('\n' + '='.repeat(60));
    console.log('🌿 植物识别系统已启动');
    console.log('='.repeat(60));
    console.log('📌 默认预处理模式: MobileNetV2标准化 [-1,1]');
    console.log('📌 这是TensorFlow预训练MobileNet模型的标准预处理方式');
    console.log('');
    console.log('📦 使用步骤:');
    console.log('  1️⃣  上传模型压缩包（包含 model.json 和 model.weights.bin）');
    console.log('  2️⃣  等待模型加载完成');
    console.log('  3️⃣  上传植物图片进行识别');
    console.log('');
    console.log('🔧 如果训练集图片预测错误，请尝试以下步骤:');
    console.log('  1️⃣  上传小草的训练图片');
    console.log('  2️⃣  查看控制台的预测结果');
    console.log('  3️⃣  如果错误，切换预处理模式并重新识别');
    console.log('  4️⃣  测试所有6种模式，找出正确结果的模式');
    console.log('');
    console.log('💡 建议测试顺序:');
    console.log('   模式3 (MobileNetV2) → 模式4 ([-1,1]) → 模式1 ([0,1])');
    console.log('   → 模式2 (ImageNet) → 模式6 (Caffe) → 模式5 ([0,255])');
    console.log('='.repeat(60) + '\n');
  }
}

// 初始化应用
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new PlantRecognitionApp();
});

