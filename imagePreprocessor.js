/**
 * 图像预处理模块
 * 负责将图像转换为模型所需的输入格式
 */

class ImagePreprocessor {
  constructor() {
    this.mode = 'mobilenet_v2'; // 默认预处理模式
    this.debugMode = true;
    
    // ImageNet 标准参数
    this.IMAGENET_MEAN = [0.485, 0.456, 0.406];
    this.IMAGENET_STD = [0.229, 0.224, 0.225];
  }

  /**
   * 预处理图像
   */
  preprocess(imgElement, targetSize = 224) {
    return tf.tidy(() => {
      let t = tf.browser.fromPixels(imgElement);
      
      if (this.debugMode) {
        console.log('=== 图像预处理开始 ===');
        console.log('原始图像形状:', t.shape);
        console.log('原始图像值范围:', [tf.min(t).dataSync()[0], tf.max(t).dataSync()[0]]);
      }
      
      // 调整大小
      t = tf.image.resizeBilinear(t, [targetSize, targetSize], true);
      
      // 转为浮点数
      t = t.toFloat();
      
      // 应用预处理模式
      t = this.applyPreprocessMode(t);
      
      if (this.debugMode) {
        console.log('预处理后形状:', t.shape);
        const minVal = tf.min(t).dataSync()[0];
        const maxVal = tf.max(t).dataSync()[0];
        const meanVal = tf.mean(t).dataSync()[0];
        console.log('预处理后统计: min=' + minVal.toFixed(4) + ', max=' + maxVal.toFixed(4) + ', mean=' + meanVal.toFixed(4));
        console.log('=== 图像预处理完成 ===');
      }
      
      // 增加批次维度：[1, H, W, C]
      t = t.expandDims(0);
      
      return t;
    });
  }

  /**
   * 应用预处理模式
   */
  applyPreprocessMode(tensor) {
    switch (this.mode) {
      case 'simple':
        // 模式1: 简单归一化到 [0,1]
        if (this.debugMode) {
          console.log('预处理模式: 简单归一化 [0,1]');
        }
        return tensor.div(255);

      case 'imagenet':
        // 模式2: ImageNet 标准预处理
        if (this.debugMode) {
          console.log('预处理模式: ImageNet标准化 (mean=[0.485,0.456,0.406], std=[0.229,0.224,0.225])');
        }
        const mean = tf.tensor1d(this.IMAGENET_MEAN);
        const std = tf.tensor1d(this.IMAGENET_STD);
        return tensor.div(255).sub(mean).div(std);

      case 'mobilenet_v2':
        // 模式3: MobileNetV2 / TensorFlow 标准预处理
        if (this.debugMode) {
          console.log('预处理模式: MobileNetV2标准化 [(x/127.5)-1] → [-1,1]');
        }
        return tensor.div(127.5).sub(1.0);

      case 'range_neg1_1':
        // 模式4: 另一种归一化到 [-1,1] 的方式
        if (this.debugMode) {
          console.log('预处理模式: 归一化到 [-1,1] [(x-127.5)/127.5]');
        }
        return tensor.sub(127.5).div(127.5);

      case 'none':
        // 模式5: 不做归一化，保持 [0,255]
        if (this.debugMode) {
          console.log('预处理模式: 无标准化 [0,255]');
        }
        return tensor;

      case 'caffe':
        // 模式6: Caffe 风格 - BGR 顺序 + 减均值
        if (this.debugMode) {
          console.log('预处理模式: Caffe风格 (BGR + 减均值)');
        }
        const [r, g, b] = tf.split(tensor, 3, 2);
        const bgr = tf.concat([b, g, r], 2);
        const caffeMean = tf.tensor1d([103.939, 116.779, 123.68]);
        return bgr.sub(caffeMean);

      default:
        console.warn('未知的预处理模式:', this.mode, '使用默认模式');
        return tensor.div(255);
    }
  }

  /**
   * 设置预处理模式
   */
  setMode(mode) {
    const validModes = ['simple', 'imagenet', 'mobilenet_v2', 'range_neg1_1', 'none', 'caffe'];
    if (validModes.includes(mode)) {
      this.mode = mode;
      if (this.debugMode) {
        console.log('\n' + '='.repeat(50));
        console.log('🔄 预处理模式已切换为:', mode);
        console.log(this.getModeDescription(mode));
        console.log('='.repeat(50) + '\n');
      }
    } else {
      console.error('无效的预处理模式:', mode);
    }
  }

  /**
   * 获取当前模式
   */
  getMode() {
    return this.mode;
  }

  /**
   * 获取模式描述
   */
  getModeDescription(mode = this.mode) {
    const descriptions = {
      'simple': '📝 说明: 简单归一化 x/255 → [0,1]',
      'imagenet': '📝 说明: ImageNet标准化 (x/255 - mean)/std',
      'mobilenet_v2': '📝 说明: MobileNetV2标准化 x/127.5 - 1 → [-1,1] ⭐推荐',
      'range_neg1_1': '📝 说明: 另一种[-1,1]方式 (x-127.5)/127.5',
      'none': '📝 说明: 无标准化，保持 [0,255]',
      'caffe': '📝 说明: Caffe风格 BGR + 减均值'
    };
    return descriptions[mode] || '未知模式';
  }

  /**
   * 获取所有可用模式
   */
  getAllModes() {
    return [
      { value: 'simple', label: '模式1: 简单归一化 [0,1]' },
      { value: 'imagenet', label: '模式2: ImageNet标准化' },
      { value: 'mobilenet_v2', label: '模式3: MobileNetV2标准化 (推荐)' },
      { value: 'range_neg1_1', label: '模式4: 归一化到 [-1,1]' },
      { value: 'none', label: '模式5: 无标准化 [0,255]' },
      { value: 'caffe', label: '模式6: Caffe风格 (BGR)' }
    ];
  }

  /**
   * 设置调试模式
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
  }
}

