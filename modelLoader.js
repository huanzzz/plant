/**
 * 模型加载器模块
 * 负责处理模型文件上传、解压和加载
 */

class ModelLoader {
  constructor() {
    this.model = null;
    this.modelType = null;
    this.inputSize = 224;
    this.labels = null;
    this.modelFiles = null;
    this.debugMode = true;
  }

  /**
   * 从 ZIP 文件加载模型
   */
  async loadFromZip(zipFile) {
    if (!zipFile.name.endsWith('.zip')) {
      throw new Error('请选择 ZIP 格式的模型压缩包');
    }

    // 解压 ZIP 文件
    const zip = await JSZip.loadAsync(zipFile);
    
    // 查找必需文件
    let modelJson = null;
    let weightsFile = null;
    let labelsFile = null;
    
    for (const [filename, fileObj] of Object.entries(zip.files)) {
      if (fileObj.dir) continue;
      
      const baseName = filename.split('/').pop();
      if (baseName === 'model.json') {
        modelJson = fileObj;
      } else if (baseName === 'model.weights.bin' || baseName.endsWith('.weights.bin')) {
        weightsFile = fileObj;
      } else if (baseName === 'labels.json') {
        labelsFile = fileObj;
      }
    }
    
    if (!modelJson || !weightsFile) {
      throw new Error('压缩包中缺少必需文件（model.json 或 model.weights.bin）');
    }
    
    this.modelFiles = {
      'model.json': modelJson,
      'model.weights.bin': weightsFile
    };
    
    if (labelsFile) {
      this.modelFiles['labels.json'] = labelsFile;
    }
    
    if (this.debugMode) {
      console.log('✅ 模型文件解压成功');
      console.log('- model.json:', modelJson.name);
      console.log('- weights:', weightsFile.name);
      if (labelsFile) {
        console.log('- labels.json:', labelsFile.name);
      }
    }
    
    // 加载模型
    await this.loadModel();
  }

  /**
   * 从 model.json 中提取标签
   */
  async tryLoadLabelsFromModelJson(modelJsonData) {
    try {
      const candidates = [
        modelJsonData?.userDefinedMetadata?.outputLabels,
        modelJsonData?.userDefinedMetadata?.labels,
        modelJsonData?.userDefinedMetadata?.classes,
        modelJsonData?.metadata?.labels,
        modelJsonData?.class_names,
        modelJsonData?.modelTopology?.training_config?.class_names,
        modelJsonData?.signature?.labels
      ];
      
      for (const c of candidates) {
        if (Array.isArray(c) && c.length && typeof c[0] === 'string') {
          this.labels = c;
          return true;
        }
      }
      
      // 检查 userDefinedMetadata 中的其他键
      const udm = modelJsonData?.userDefinedMetadata;
      if (udm && typeof udm === 'object') {
        for (const k of Object.keys(udm)) {
          const v = udm[k];
          if (Array.isArray(v) && v.length && typeof v[0] === 'string') {
            this.labels = v;
            return true;
          }
        }
      }
      
      return false;
    } catch (e) {
      return false;
    }
  }

  /**
   * 加载标签
   */
  async tryLoadLabels(modelJsonData) {
    // 优先从 model.json 解析
    const ok = await this.tryLoadLabelsFromModelJson(modelJsonData);
    if (ok) return;
    
    // 从独立的 labels.json 文件加载
    if (this.modelFiles && this.modelFiles['labels.json']) {
      try {
        const labelsText = await this.modelFiles['labels.json'].async('text');
        this.labels = JSON.parse(labelsText);
      } catch (e) {
        // 忽略错误
      }
    }
  }

  /**
   * 加载模型
   */
  async loadModel() {
    if (!this.modelFiles) {
      throw new Error('请先上传模型文件');
    }

    // 读取模型文件
    const modelJsonText = await this.modelFiles['model.json'].async('text');
    const modelJsonData = JSON.parse(modelJsonText);
    const weightsBlob = await this.modelFiles['model.weights.bin'].async('blob');
    const weightData = await weightsBlob.arrayBuffer();
    
    // 提取权重规格
    let weightSpecs = [];
    if (modelJsonData.weightsManifest && modelJsonData.weightsManifest.length > 0) {
      weightSpecs = modelJsonData.weightsManifest[0].weights || [];
    }
    
    // 创建自定义 IOHandler
    const customIOHandler = {
      load: async () => {
        return {
          modelTopology: modelJsonData.modelTopology,
          format: modelJsonData.format,
          generatedBy: modelJsonData.generatedBy,
          convertedBy: modelJsonData.convertedBy,
          weightSpecs: weightSpecs,
          weightData: weightData,
          userDefinedMetadata: modelJsonData.userDefinedMetadata
        };
      }
    };
    
    // 尝试作为 LayersModel 加载
    try {
      this.model = await tf.loadLayersModel(customIOHandler);
      this.modelType = 'layers';
      
      // 自动读取输入尺寸
      const shape = this.model.inputs?.[0]?.shape || null;
      if (shape && shape.length >= 3) {
        const h = shape[1] || this.inputSize;
        const w = shape[2] || this.inputSize;
        this.inputSize = Math.min(h || this.inputSize, w || this.inputSize) || this.inputSize;
      }
      
      if (this.debugMode) {
        console.log('模型类型:', this.modelType);
        console.log('输入形状:', shape);
        console.log('输出形状:', this.model.outputs?.[0]?.shape);
        console.log('模型摘要:');
        this.model.summary();
      }
    } catch (err) {
      console.warn('尝试以 tfjs-layers 加载失败，改用 GraphModel…', err);
      this.model = await tf.loadGraphModel(customIOHandler);
      this.modelType = 'graph';
      
      if (this.debugMode) {
        console.log('模型类型:', this.modelType);
      }
    }
    
    // 加载标签
    await this.tryLoadLabels(modelJsonData);
    
    if (this.debugMode && this.labels) {
      console.log('标签列表:', this.labels);
    }
  }

  /**
   * 执行预测
   */
  async predict(inputTensor) {
    if (!this.model) {
      throw new Error('模型未加载');
    }

    let output = null;
    
    if (this.modelType === 'layers') {
      output = this.model.predict(inputTensor);
    } else if (this.modelType === 'graph') {
      output = this.model.execute(inputTensor);
    } else {
      // 兼容模式
      output = this.model.predict ? this.model.predict(inputTensor) : this.model.execute(inputTensor);
    }

    return Array.isArray(output) ? output[0] : output;
  }

  /**
   * 获取标签名称
   */
  getLabelName(index) {
    if (this.labels && this.labels[index]) {
      return this.labels[index];
    }
    return `植物类别 #${index + 1}`;
  }

  /**
   * 设置调试模式
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
  }

  /**
   * 获取模型信息
   */
  getModelInfo() {
    return {
      isLoaded: !!this.model,
      modelType: this.modelType,
      inputSize: this.inputSize,
      labelCount: this.labels ? this.labels.length : 0,
      labels: this.labels
    };
  }
}

