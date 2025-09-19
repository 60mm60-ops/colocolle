class ColorfulProApp {
    constructor() {
        this.colorThief = new ColorThief();
        this.currentColors = [];
        this.currentImage = null;
        this.paletteHistory = [];
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.maxResolution = { width: 1920, height: 1080 };
        this.processingStartTime = null;
        this.chart = null;
        
        this.init();
    }

    init() {
        this.createSampleImages();
        this.bindEvents();
        this.loadHistory();
        this.initializeAccessibility();
        this.checkBrowserCompatibility();
    }

    createSampleImages() {
        const samples = [
            { 
                name: 'sunset', 
                colors: ['#FF6B35', '#F7931E', '#FFD23F', '#EE4B2B', '#FF8C69'],
                gradient: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 25%, #FFD23F 50%, #EE4B2B 75%, #FF8C69 100%)'
            },
            { 
                name: 'ocean', 
                colors: ['#006A6B', '#0080A3', '#40E0D0', '#87CEEB', '#B0E0E6'],
                gradient: 'linear-gradient(135deg, #006A6B 0%, #0080A3 25%, #40E0D0 50%, #87CEEB 75%, #B0E0E6 100%)'
            },
            { 
                name: 'forest', 
                colors: ['#355E3B', '#50C878', '#8FBC8F', '#228B22', '#32CD32'],
                gradient: 'linear-gradient(135deg, #355E3B 0%, #50C878 25%, #8FBC8F 50%, #228B22 75%, #32CD32 100%)'
            },
            { 
                name: 'city', 
                colors: ['#2C3E50', '#34495E', '#7F8C8D', '#BDC3C7', '#ECF0F1'],
                gradient: 'linear-gradient(135deg, #2C3E50 0%, #34495E 25%, #7F8C8D 50%, #BDC3C7 75%, #ECF0F1 100%)'
            },
            { 
                name: 'flower', 
                colors: ['#E91E63', '#FF69B4', '#FFB6C1', '#DDA0DD', '#DA70D6'],
                gradient: 'linear-gradient(135deg, #E91E63 0%, #FF69B4 25%, #FFB6C1 50%, #DDA0DD 75%, #DA70D6 100%)'
            }
        ];

        samples.forEach(sample => {
            const canvas = document.querySelector(`[data-sample="${sample.name}"]`);
            if (canvas) {
                const ctx = canvas.getContext('2d');
                canvas.width = 90;
                canvas.height = 90;

                // グラデーション描画の代わりに個別色ブロックで表現
                const blockHeight = canvas.height / sample.colors.length;
                sample.colors.forEach((color, index) => {
                    ctx.fillStyle = color;
                    ctx.fillRect(0, index * blockHeight, canvas.width, blockHeight);
                });
            }
        });
    }

    bindEvents() {
        // ファイル入力
        const fileInput = document.getElementById('fileInput');
        const multiFileInput = document.getElementById('multiFileInput');
        const uploadSection = document.getElementById('uploadSection');

        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e.target.files[0]));
        }

        if (multiFileInput) {
            multiFileInput.addEventListener('change', (e) => this.handleMultipleFiles(e.target.files));
        }

        // ドラッグ&ドロップ
        if (uploadSection) {
            uploadSection.addEventListener('dragover', (e) => this.handleDragOver(e));
            uploadSection.addEventListener('dragleave', () => this.handleDragLeave());
            uploadSection.addEventListener('drop', (e) => this.handleDrop(e));
        }

        // オプション変更
        document.querySelectorAll('input[type="checkbox"], input[type="radio"]').forEach(input => {
            input.addEventListener('click', (e) => e.stopPropagation());
            input.addEventListener('change', () => this.onOptionsChange());
        });

        // スライダー
        const colorCountSlider = document.getElementById('colorCountSlider');
        if (colorCountSlider) {
            colorCountSlider.addEventListener('input', (e) => {
                document.getElementById('colorCountValue').textContent = e.target.value;
                this.onOptionsChange();
            });
        }

        // ボタンイベント
        this.bindButtonEvents();

        // サンプル画像
        document.querySelectorAll('.sample-img').forEach(img => {
            img.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleSampleImage(img);
            });
            
            // キーボードアクセシビリティ
            img.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.handleSampleImage(img);
                }
            });
        });

        // ウィンドウリサイズ
        window.addEventListener('resize', () => this.onWindowResize());
    }

    bindButtonEvents() {
        const buttons = {
            'exportPaletteBtn': () => this.exportPalette(),
            'exportCodeBtn': () => this.exportCode(),
            'shareBtn': () => this.sharepalette(),
            'newProjectBtn': () => this.newProject(),
            'clearHistoryBtn': () => this.clearHistory(),
            'settingsBtn': () => this.showSettings(),
            'helpBtn': () => this.showHelp(),
            'retryBtn': () => this.retryCurrentOperation()
        };

        Object.entries(buttons).forEach(([id, handler]) => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', handler);
            }
        });
    }

    checkBrowserCompatibility() {
        const features = {
            'Canvas API': 'HTMLCanvasElement' in window,
            'File API': 'File' in window && 'FileReader' in window,
            'Drag & Drop': 'ondragstart' in document.createElement('div'),
            'CSS Grid': CSS.supports('display', 'grid'),
            'CSS Backdrop Filter': CSS.supports('backdrop-filter', 'blur(10px)'),
            'Clipboard API': 'navigator' in window && 'clipboard' in navigator
        };

        const unsupportedFeatures = Object.entries(features)
            .filter(([feature, supported]) => !supported)
            .map(([feature]) => feature);

        if (unsupportedFeatures.length > 0) {
            console.warn('一部機能がサポートされていません:', unsupportedFeatures);
            this.showNotification(
                `お使いのブラウザでは一部機能が制限される可能性があります。最新のブラウザをご利用ください。`,
                'warning'
            );
        }
    }

    initializeAccessibility() {
        // スクリーンリーダー対応
        const announcer = document.createElement('div');
        announcer.setAttribute('aria-live', 'polite');
        announcer.setAttribute('aria-atomic', 'true');
        announcer.className = 'visually-hidden';
        announcer.id = 'screenReaderAnnouncer';
        document.body.appendChild(announcer);

        // ハイコントラストモード検出
        if (window.matchMedia && window.matchMedia('(prefers-contrast: high)').matches) {
            document.body.classList.add('high-contrast');
        }

        // 縮小モーション設定検出
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            document.body.classList.add('reduced-motion');
        }
    }

    announceToScreenReader(message) {
        const announcer = document.getElementById('screenReaderAnnouncer');
        if (announcer) {
            announcer.textContent = message;
        }
    }

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        const uploadSection = document.getElementById('uploadSection');
        uploadSection.classList.add('dragover');
    }

    handleDragLeave() {
        const uploadSection = document.getElementById('uploadSection');
        uploadSection.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        const uploadSection = document.getElementById('uploadSection');
        uploadSection.classList.remove('dragover');

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            if (files.length === 1) {
                this.handleFileSelect(files[0]);
            } else {
                this.handleMultipleFiles(files);
            }
        }
    }

    handleFileSelect(file) {
        if (!this.validateFile(file)) {
            return;
        }

        this.processingStartTime = Date.now();
        this.showLoading('画像を読み込み中...');
        this.updateProgress(10);

        const reader = new FileReader();
        reader.onload = (e) => {
            this.updateProgress(30);
            this.processImage(e.target.result, {
                name: file.name,
                size: file.size,
                type: file.type
            });
        };

        reader.onerror = () => {
            this.showError('ファイルの読み込みに失敗しました', 'ファイルが破損している可能性があります。別のファイルをお試しください。');
        };

        reader.readAsDataURL(file);
    }

    handleMultipleFiles(files) {
        const validFiles = Array.from(files).filter(file => this.validateFile(file, false));
        
        if (validFiles.length === 0) {
            this.showNotification('有効な画像ファイルがありません', 'error');
            return;
        }

        // 複数ファイル処理UI表示
        this.displayMultipleFiles(validFiles);
    }

    displayMultipleFiles(files) {
        const multiUploadSection = document.getElementById('multiUploadSection');
        const multiUploadGrid = document.getElementById('multiUploadGrid');
        
        if (!multiUploadSection || !multiUploadGrid) return;

        multiUploadSection.style.display = 'block';
        multiUploadGrid.innerHTML = '';

        files.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const imageItem = document.createElement('div');
                imageItem.className = 'image-item';
                imageItem.innerHTML = `
                    <img src="${e.target.result}" alt="${file.name}">
                    <div>${file.name}</div>
                    <button class="remove-btn" onclick="this.parentElement.remove()">×</button>
                    <button class="btn" style="margin-top: 8px; padding: 4px 8px; font-size: 0.8rem;" 
                            onclick="app.processImage('${e.target.result}', {name: '${file.name}', size: ${file.size}, type: '${file.type}'})">
                        分析
                    </button>
                `;
                multiUploadGrid.appendChild(imageItem);
            };
            reader.readAsDataURL(file);
        });
    }

    validateFile(file, showError = true) {
        // ファイル形式チェック
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            if (showError) {
                this.showError(
                    'サポートされていないファイル形式です',
                    `対応形式: ${allowedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')}`
                );
            }
            return false;
        }

        // ファイルサイズチェック
        if (file.size > this.maxFileSize) {
            if (showError) {
                this.showError(
                    'ファイルサイズが大きすぎます',
                    `最大サイズ: ${this.formatFileSize(this.maxFileSize)}\n現在のサイズ: ${this.formatFileSize(file.size)}`
                );
            }
            return false;
        }

        return true;
    }

    handleSampleImage(canvas) {
        this.processingStartTime = Date.now();
        const dataUrl = canvas.toDataURL();
        const sampleName = canvas.dataset.sample;
        
        this.processImage(dataUrl, {
            name: `${sampleName}-sample.png`,
            size: 0,
            type: 'image/png',
            isSample: true
        });
    }

    processImage(imageSrc, fileInfo) {
        this.showLoading('画像を解析中...');
        this.updateProgress(50);

        const previewImage = document.getElementById('previewImage');
        const previewSection = document.getElementById('previewSection');

        previewImage.src = imageSrc;
        previewSection.style.display = 'block';
        this.currentImage = { src: imageSrc, info: fileInfo };

        // 画像情報を表示
        this.displayImageInfo(fileInfo);

        previewImage.onload = () => {
            // 解像度チェック
            if (!this.checkImageResolution(previewImage)) {
                return;
            }

            this.updateProgress(70);
            
            try {
                // 画像をリサイズしてメモリ使用量を最適化
                const optimizedImage = this.optimizeImage(previewImage);
                
                setTimeout(() => {
                    this.extractColors(optimizedImage);
                }, 100);
            } catch (error) {
                console.error('画像処理エラー:', error);
                this.showError('画像の処理中にエラーが発生しました', error.message);
            }
        };

        previewImage.onerror = () => {
            this.showError('画像の読み込みに失敗しました', '画像ファイルが破損している可能性があります。');
        };
    }

    checkImageResolution(img) {
        if (img.naturalWidth > this.maxResolution.width || img.naturalHeight > this.maxResolution.height) {
            const shouldContinue = confirm(
                `画像の解像度が高いため、処理に時間がかかる場合があります。\n` +
                `解像度: ${img.naturalWidth}×${img.naturalHeight}\n` +
                `推奨: ${this.maxResolution.width}×${this.maxResolution.height}以下\n\n` +
                `続行しますか？`
            );
            
            if (!shouldContinue) {
                this.hideLoading();
                return false;
            }
        }
        return true;
    }

    optimizeImage(img) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 大きすぎる画像をリサイズ
        let { width, height } = this.calculateOptimalSize(img.naturalWidth, img.naturalHeight);
        
        canvas.width = width;
        canvas.height = height;
        
        ctx.drawImage(img, 0, 0, width, height);
        
        return canvas;
    }

    calculateOptimalSize(width, height) {
        const maxWidth = this.maxResolution.width;
        const maxHeight = this.maxResolution.height;
        
        if (width <= maxWidth && height <= maxHeight) {
            return { width, height };
        }
        
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        return {
            width: Math.floor(width * ratio),
            height: Math.floor(height * ratio)
        };
    }

    extractColors(imageElement) {
        this.updateProgress(80);
        this.showLoading('カラーパレットを生成中...');

        try {
            const extractionMode = document.querySelector('input[name="extractionMode"]:checked')?.value || 'balanced';
            const colorCount = parseInt(document.getElementById('colorCountSlider')?.value) || 8;
            const advancedMode = document.getElementById('advancedMode')?.checked || false;
            
            let palette, dominantColor;
            
            if (advancedMode) {
                // 高精度モード: より細かい色抽出
                palette = this.colorThief.getPalette(imageElement, colorCount * 2, 10);
                dominantColor = this.colorThief.getColor(imageElement, 10);
            } else {
                palette = this.colorThief.getPalette(imageElement, colorCount);
                dominantColor = this.colorThief.getColor(imageElement);
            }
            
            const allColors = [dominantColor, ...palette];
            let uniqueColors = this.removeDuplicateColors(allColors, extractionMode);
            
            // 抽出モードに応じて色を調整
            uniqueColors = this.adjustColorsByMode(uniqueColors, extractionMode);
            
            // 指定色数に制限
            uniqueColors = uniqueColors.slice(0, colorCount);
            
            this.updateProgress(90);
            this.generateColorData(uniqueColors, imageElement);
            
        } catch (error) {
            console.error('色抽出エラー:', error);
            this.showError('色の抽出に失敗しました', '別の画像をお試しください。');
        }
    }

    adjustColorsByMode(colors, mode) {
        switch (mode) {
            case 'vibrant':
                return colors.filter(color => this.isVibrantColor(color));
            case 'muted':
                return colors.filter(color => this.isMutedColor(color));
            case 'balanced':
            default:
                return colors;
        }
    }

    isVibrantColor(rgb) {
        const [r, g, b] = rgb;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const saturation = max === 0 ? 0 : (max - min) / max;
        const brightness = max / 255;
        
        return saturation > 0.4 && brightness > 0.3;
    }

    isMutedColor(rgb) {
        const [r, g, b] = rgb;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const saturation = max === 0 ? 0 : (max - min) / max;
        
        return saturation < 0.6;
    }

    removeDuplicateColors(colors, mode = 'balanced') {
        const unique = [];
        const thresholds = { 
            balanced: 25, 
            vibrant: 30, 
            muted: 20 
        };
        const threshold = thresholds[mode] || 25;

        colors.forEach(color => {
            const isDuplicate = unique.some(existingColor => {
                const distance = this.calculateColorDistance(color, existingColor);
                return distance < threshold;
            });

            if (!isDuplicate) {
                unique.push(color);
            }
        });

        return unique;
    }

    calculateColorDistance(color1, color2) {
        return Math.sqrt(
            Math.pow(color1[0] - color2[0], 2) +
            Math.pow(color1[1] - color2[1], 2) +
            Math.pow(color1[2] - color2[2], 2)
        );
    }

    generateColorData(colors, imageElement) {
        const useSmartFilter = document.getElementById('smartFilter')?.checked || false;
        const usePortraitMode = document.getElementById('portraitMode')?.checked || false;
        
        if (useSmartFilter || usePortraitMode) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = imageElement.width;
            canvas.height = imageElement.height;
            ctx.drawImage(imageElement, 0, 0);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            this.currentColors = this.analyzeImageColors(imageData.data, colors, usePortraitMode);
        } else {
            this.currentColors = this.generateSimpleColorData(colors);
        }
        
        this.updateProgress(95);
        this.finalizeProcessing();
    }

    analyzeImageColors(imageData, extractedColors, isPortraitMode = false) {
        const colorCounts = new Map();
        const totalPixels = imageData.length / 4;
        const backgroundThreshold = 0.25;
        const sampleRate = Math.max(1, Math.floor(totalPixels / 50000)); // パフォーマンス最適化
        
        for (let i = 0; i < imageData.length; i += 4 * sampleRate) {
            const r = imageData[i];
            const g = imageData[i + 1];
            const b = imageData[i + 2];
            const alpha = imageData[i + 3];
            
            if (alpha < 128) continue;
            if (isPortraitMode && this.isSkinColor([r, g, b])) continue;
            
            const nearestColor = this.findNearestColor([r, g, b], extractedColors);
            if (nearestColor) {
                const key = nearestColor.join(',');
                colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
            }
        }
        
        const colorArray = Array.from(colorCounts.entries())
            .map(([key, count]) => ({
                rgb: key.split(',').map(Number),
                count,
                percentage: (count / (totalPixels / sampleRate)) * 100
            }))
            .sort((a, b) => b.count - a.count);
        
        // スマートフィルターで背景色除去
        let filteredColors = this.applySmartFilter(colorArray, backgroundThreshold);
        
        // アクセシビリティチェック
        filteredColors = this.addAccessibilityInfo(filteredColors);
        
        const totalFilteredCount = filteredColors.reduce((sum, color) => sum + color.count, 0);
        
        return filteredColors.map(color => ({
            rgb: color.rgb,
            hex: this.rgbToHex(color.rgb[0], color.rgb[1], color.rgb[2]),
            percentage: Math.round((color.count / totalFilteredCount) * 1000) / 10,
            accessibility: color.accessibility
        }));
    }

    applySmartFilter(colorArray, backgroundThreshold) {
        if (colorArray.length === 0) return colorArray;
        
        // 背景色候補を特定
        const dominantColor = colorArray[0];
        if (dominantColor.percentage < backgroundThreshold * 100) {
            return colorArray;
        }
        
        // 背景色と類似した色を除去
        return colorArray.filter((color, index) => {
            if (index === 0) return false; // 最も多い色（背景色）を除去
            
            // その他の背景色候補もチェック
            return !this.isBackgroundColor(color.rgb) && 
                   !this.isSimilarColor(color.rgb, dominantColor.rgb, 30);
        });
    }

    addAccessibilityInfo(colors) {
        return colors.map(color => ({
            ...color,
            accessibility: this.calculateAccessibility(color.rgb)
        }));
    }

    calculateAccessibility(rgb) {
        const result = {
            normal: true,
            protanopia: false,
            deuteranopia: false,
            tritanopia: false
        };
        
        // 色覚異常シミュレーション（簡易版）
        if (document.getElementById('colorblindMode')?.checked) {
            const [r, g, b] = rgb;
            
            // プロタノピア（赤色盲）
            const protanopia = this.simulateProtanopia([r, g, b]);
            result.protanopia = this.calculateColorDistance(rgb, protanopia) < 50;
            
            // デュータノピア（緑色盲）
            const deuteranopia = this.simulateDeuteranopia([r, g, b]);
            result.deuteranopia = this.calculateColorDistance(rgb, deuteranopia) < 50;
            
            // トリタノピア（青色盲）
            const tritanopia = this.simulateTritanopia([r, g, b]);
            result.tritanopia = this.calculateColorDistance(rgb, tritanopia) < 50;
        }
        
        return result;
    }

    simulateProtanopia([r, g, b]) {
        // プロタノピア用の変換行列（簡易版）
        return [
            Math.round(0.567 * r + 0.433 * g),
            Math.round(0.558 * r + 0.442 * g),
            Math.round(0.242 * g + 0.758 * b)
        ];
    }

    simulateDeuteranopia([r, g, b]) {
        // デュータノピア用の変換行列（簡易版）
        return [
            Math.round(0.625 * r + 0.375 * g),
            Math.round(0.7 * r + 0.3 * g),
            Math.round(0.3 * g + 0.7 * b)
        ];
    }

    simulateTritanopia([r, g, b]) {
        // トリタノピア用の変換行列（簡易版）
        return [
            Math.round(0.95 * r + 0.05 * g),
            Math.round(0.433 * g + 0.567 * b),
            Math.round(0.475 * g + 0.525 * b)
        ];
    }

    generateSimpleColorData(colors) {
        let remainingPercentage = 100;
        const result = colors.map((color, index) => {
            const percentage = index === colors.length - 1 
                ? remainingPercentage 
                : Math.max(5, Math.random() * (remainingPercentage / (colors.length - index)));
            
            remainingPercentage -= percentage;
            
            return {
                rgb: color,
                hex: this.rgbToHex(color[0], color[1], color[2]),
                percentage: Math.round(percentage * 10) / 10,
                accessibility: this.calculateAccessibility(color)
            };
        });
        
        return result.sort((a, b) => b.percentage - a.percentage);
    }

    finalizeProcessing() {
        const processingTime = Date.now() - this.processingStartTime;
        document.getElementById('processingTime').textContent = `${processingTime}ms`;
        
        this.updateProgress(100);
        
        setTimeout(() => {
            this.hideLoading();
            this.displayResults();
            this.saveToHistory();
            this.announceToScreenReader(`カラーパレットの生成が完了しました。${this.currentColors.length}色を抽出しました。`);
        }, 200);
    }

    displayResults() {
        document.getElementById('resultsSection').style.display = 'block';
        document.getElementById('toolbar').style.display = 'block';

        this.displayColorCards();
        this.displayChart();
        this.displayHarmonyColors();
        
        if (document.getElementById('portraitMode')?.checked) {
            this.displayPersonalityAnalysis();
        }

        // アニメーション付きで表示
        document.getElementById('resultsSection').classList.add('fade-in');
    }

    displayColorCards() {
        const grid = document.getElementById('colorsGrid');
        if (!grid) return;
        
        grid.innerHTML = '';

        this.currentColors.forEach((color, index) => {
            const card = document.createElement('div');
            card.className = 'color-card';
            card.tabIndex = 0;
            card.role = 'button';
            card.ariaLabel = `色 ${index + 1}: ${color.hex}, ${color.percentage}パーセント`;
            
            // アクセシビリティバッジ生成
            const accessibilityBadges = this.generateAccessibilityBadges(color.accessibility);
            
            // 色形式の生成
            const rgb = color.rgb;
            const hsl = this.rgbToHsl(rgb[0], rgb[1], rgb[2]);
            const hsv = this.rgbToHsv(rgb[0], rgb[1], rgb[2]);

            card.innerHTML = `
                <div class="color-preview" style="background-color: ${color.hex}"></div>
                <div class="color-info">
                    <div class="color-formats">
                        <div class="color-format" data-format="hex" title="HEXコードをコピー">
                            <span class="format-label">HEX</span>
                            ${color.hex}
                        </div>
                        <div class="color-format" data-format="rgb" title="RGBコードをコピー">
                            <span class="format-label">RGB</span>
                            ${rgb.join(', ')}
                        </div>
                        <div class="color-format" data-format="hsl" title="HSLコードをコピー">
                            <span class="format-label">HSL</span>
                            ${hsl[0]}, ${Math.round(hsl[1] * 100)}%, ${Math.round(hsl[2] * 100)}%
                        </div>
                        <div class="color-format" data-format="hsv" title="HSVコードをコピー">
                            <span class="format-label">HSV</span>
                            ${hsv[0]}, ${Math.round(hsv[1] * 100)}%, ${Math.round(hsv[2] * 100)}%
                        </div>
                    </div>
                    <div class="color-percentage">${color.percentage}%</div>
                    <div class="accessibility-indicator">
                        ${accessibilityBadges}
                    </div>
                </div>
            `;

            // イベントリスナー
            card.addEventListener('click', () => this.copyColorToClipboard(color));
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.copyColorToClipboard(color);
                }
            });

            // 個別フォーマットのコピー
            card.querySelectorAll('.color-format').forEach(format => {
                format.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const formatType = format.dataset.format;
                    this.copySpecificFormat(color, formatType);
                });
            });

            grid.appendChild(card);
        });
    }

    generateAccessibilityBadges(accessibility) {
        let badges = '';
        
        if (accessibility.normal) {
            badges += '<div class="accessibility-badge normal" title="通常視覚に問題なし">N</div>';
        }
        if (accessibility.protanopia) {
            badges += '<div class="accessibility-badge protanopia" title="プロタノピアで見づらい可能性">P</div>';
        }
        if (accessibility.deuteranopia) {
            badges += '<div class="accessibility-badge deuteranopia" title="デュータノピアで見づらい可能性">D</div>';
        }
        if (accessibility.tritanopia) {
            badges += '<div class="accessibility-badge tritanopia" title="トリタノピアで見づらい可能性">T</div>';
        }
        
        return badges;
    }

    displayChart() {
        const canvas = document.getElementById('colorChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        // 既存のチャートを破棄
        if (this.chart) {
            this.chart.destroy();
        }

        const data = {
            labels: this.currentColors.map((color, index) => `${color.hex} (${color.percentage}%)`),
            datasets: [{
                data: this.currentColors.map(color => color.percentage),
                backgroundColor: this.currentColors.map(color => color.hex),
                borderColor: this.currentColors.map(color => this.adjustBrightness(color.hex, -20)),
                borderWidth: 2,
                hoverBorderWidth: 4
            }]
        };

        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#ffffff',
                        font: {
                            size: 12
                        },
                        padding: 15,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#4ecdc4',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            const color = context.label.split(' ')[0];
                            const percentage = context.parsed;
                            return `${color}: ${percentage}%`;
                        }
                    }
                }
            },
            layout: {
                padding: 20
            }
        };

        this.chart = new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: options
        });
    }

    displayHarmonyColors() {
        const harmonyGrid = document.getElementById('harmonyGrid');
        if (!harmonyGrid) return;
        
        harmonyGrid.innerHTML = '';

        // メインカラーから調和色を生成
        const mainColors = this.currentColors.slice(0, 3);
        
        const harmonyTypes = [
            { name: '補色', icon: '🔄', fn: this.getComplementary },
            { name: '類似色', icon: '🌈', fn: this.getAnalogous },
            { name: 'トライアド', icon: '🔺', fn: this.getTriad },
            { name: 'テトラード', icon: '🟪', fn: this.getTetradic },
            { name: 'モノクロマティック', icon: '⬜', fn: this.getMonochromatic }
        ];

        mainColors.forEach((baseColor, colorIndex) => {
            harmonyTypes.forEach(type => {
                const container = document.createElement('div');
                container.className = 'harmony-container fade-in';
                
                const title = document.createElement('h4');
                title.className = 'harmony-title';
                title.innerHTML = `${type.icon} ${type.name} - ${baseColor.hex}`;
                container.appendChild(title);

                const colorsDiv = document.createElement('div');
                colorsDiv.className = 'harmony-colors';

                try {
                    const harmonyColors = type.fn.call(this, baseColor.rgb);
                    harmonyColors.forEach((harmonyColor, index) => {
                        const colorDiv = document.createElement('div');
                        colorDiv.className = 'harmony-color';
                        colorDiv.style.backgroundColor = this.rgbToHex(...harmonyColor);
                        colorDiv.title = this.rgbToHex(...harmonyColor);
                        colorDiv.tabIndex = 0;
                        colorDiv.role = 'button';
                        colorDiv.ariaLabel = `調和色: ${this.rgbToHex(...harmonyColor)}`;
                        
                        colorDiv.addEventListener('click', () => {
                            this.copyToClipboard(this.rgbToHex(...harmonyColor));
                        });
                        
                        colorDiv.addEventListener('keydown', (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                this.copyToClipboard(this.rgbToHex(...harmonyColor));
                            }
                        });
                        
                        colorsDiv.appendChild(colorDiv);
                    });
                } catch (error) {
                    console.error(`${type.name}の生成エラー:`, error);
                }

                container.appendChild(colorsDiv);
                harmonyGrid.appendChild(container);
            });
        });
    }

    displayPersonalityAnalysis() {
        if (this.currentColors.length === 0) return;
        
        const topColor = this.currentColors[0];
        const personalityDiv = document.createElement('div');
        personalityDiv.className = 'personality-section fade-in';
        personalityDiv.style.cssText = `
            margin-top: 40px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 20px;
            padding: 30px;
            text-align: center;
            backdrop-filter: blur(10px);
        `;
        
        const analysis = this.getColorPersonality(topColor.hex);
        
        personalityDiv.innerHTML = `
            <h3 class="section-title" style="margin-bottom: 25px;">
                <i class="fas fa-brain"></i>
                AI色彩心理診断
            </h3>
            <div style="display: flex; align-items: center; justify-content: center; gap: 20px; margin-bottom: 20px; flex-wrap: wrap;">
                <div style="width: 80px; height: 80px; border-radius: 50%; background-color: ${topColor.hex}; border: 4px solid rgba(255,255,255,0.3); box-shadow: 0 5px 15px rgba(0,0,0,0.3);"></div>
                <div style="text-align: left;">
                    <div style="font-size: 1.5rem; font-weight: 700; margin-bottom: 5px; color: var(--primary-color);">${analysis.name}</div>
                    <div style="color: #aaa; font-size: 1.1rem; font-family: 'Courier New', monospace;">${topColor.hex}</div>
                    <div style="color: #888; font-size: 0.9rem; margin-top: 5px;">支配率: ${topColor.percentage}%</div>
                </div>
            </div>
            <div style="background: rgba(255,255,255,0.05); border-radius: 15px; padding: 25px; margin-bottom: 20px;">
                <div style="font-size: 1.2rem; line-height: 1.7; margin-bottom: 20px; color: var(--text-secondary);">${analysis.description}</div>
                <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-bottom: 15px;">
                    ${analysis.traits.map(trait => `<span style="background: linear-gradient(45deg, var(--primary-color), var(--secondary-color)); padding: 8px 16px; border-radius: 25px; font-size: 0.95rem; color: white; font-weight: 500;">${trait}</span>`).join('')}
                </div>
                <div style="background: rgba(78, 205, 196, 0.1); border-radius: 10px; padding: 15px; margin-top: 15px;">
                    <div style="font-size: 1rem; color: var(--primary-color); font-weight: 600; margin-bottom: 8px;">💡 おすすめの組み合わせ色</div>
                    <div style="font-size: 0.95rem; color: var(--text-secondary);">${analysis.recommendations}</div>
                </div>
            </div>
            <div style="color: #888; font-size: 0.85rem; font-style: italic;">
                ※ AIが画像の色彩から推測した傾向です。エンターテイメント目的でお楽しみください。
            </div>
        `;
        
        const resultsSection = document.getElementById('resultsSection');
        if (resultsSection) {
            resultsSection.appendChild(personalityDiv);
        }
    }

    // カラーハーモニー生成メソッド
    getComplementary([r, g, b]) {
        return [[255 - r, 255 - g, 255 - b]];
    }

    getAnalogous([r, g, b]) {
        const hsl = this.rgbToHsl(r, g, b);
        return [
            this.hslToRgb((hsl[0] + 30) % 360, hsl[1], hsl[2]),
            this.hslToRgb((hsl[0] - 30 + 360) % 360, hsl[1], hsl[2])
        ];
    }

    getTriad([r, g, b]) {
        const hsl = this.rgbToHsl(r, g, b);
        return [
            this.hslToRgb((hsl[0] + 120) % 360, hsl[1], hsl[2]),
            this.hslToRgb((hsl[0] + 240) % 360, hsl[1], hsl[2])
        ];
    }

    getTetradic([r, g, b]) {
        const hsl = this.rgbToHsl(r, g, b);
        return [
            this.hslToRgb((hsl[0] + 90) % 360, hsl[1], hsl[2]),
            this.hslToRgb((hsl[0] + 180) % 360, hsl[1], hsl[2]),
            this.hslToRgb((hsl[0] + 270) % 360, hsl[1], hsl[2])
        ];
    }

    getMonochromatic([r, g, b]) {
        const hsl = this.rgbToHsl(r, g, b);
        return [
            this.hslToRgb(hsl[0], hsl[1] * 0.7, Math.min(1, hsl[2] * 1.3)),
            this.hslToRgb(hsl[0], hsl[1] * 1.2, hsl[2] * 0.7),
            this.hslToRgb(hsl[0], hsl[1] * 0.9, Math.min(1, hsl[2] * 1.1)),
            this.hslToRgb(hsl[0], hsl[1] * 0.5, hsl[2] * 0.9)
        ];
    }

    // エクスポート機能
    exportPalette() {
        if (this.currentColors.length === 0) {
            this.showNotification('まず画像をアップロードしてカラーパレットを生成してください', 'warning');
            return;
        }
        
        try {
            const style = document.querySelector('input[name="paletteStyle"]:checked')?.value || 'horizontal';
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            switch (style) {
                case 'horizontal':
                    this.drawHorizontalPalette(canvas, ctx);
                    break;
                case 'grid':
                    this.drawGridPalette(canvas, ctx);
                    break;
                case 'circle':
                    this.drawCirclePalette(canvas, ctx);
                    break;
                case 'artist':
                    this.drawArtistPalette(canvas, ctx);
                    break;
            }
            
            this.downloadCanvas(canvas, `colorful-pro-palette-${Date.now()}.png`);
            this.showNotification('パレット画像を保存しました', 'success');
            
        } catch (error) {
            console.error('Export error:', error);
            this.showNotification('パレットの保存に失敗しました: ' + error.message, 'error');
        }
    }

    exportCode() {
        if (this.currentColors.length === 0) {
            this.showNotification('まず画像をアップロードしてカラーパレットを生成してください', 'warning');
            return;
        }

        const format = document.querySelector('input[name="codeFormat"]:checked')?.value || 'css';
        let code = '';

        switch (format) {
            case 'css':
                code = this.generateCSSCode();
                break;
            case 'scss':
                code = this.generateSCSSCode();
                break;
            case 'json':
                code = this.generateJSONCode();
                break;
            case 'adobe':
                this.generateAdobeASE();
                return;
        }

        this.downloadText(code, `colorful-pro-palette.${format}`, `text/${format === 'json' ? 'json' : 'plain'}`);
        this.showNotification(`${format.toUpperCase()}形式でコードを書き出しました`, 'success');
    }

    generateCSSCode() {
        let css = `/* カラフラ Pro - 生成パレット */\n:root {\n`;
        this.currentColors.forEach((color, index) => {
            css += `  --color-${index + 1}: ${color.hex}; /* ${color.percentage}% */\n`;
        });
        css += `}\n\n`;
        
        this.currentColors.forEach((color, index) => {
            css += `.color-${index + 1} {\n  background-color: ${color.hex};\n  color: ${this.getContrastColor(color.hex)};\n}\n\n`;
        });
        
        return css;
    }

    generateSCSSCode() {
        let scss = `// カラフラ Pro - 生成パレット\n`;
        this.currentColors.forEach((color, index) => {
            scss += `$color-${index + 1}: ${color.hex}; // ${color.percentage}%\n`;
        });
        scss += `\n$palette: (\n`;
        this.currentColors.forEach((color, index) => {
            scss += `  'color-${index + 1}': ${color.hex},\n`;
        });
        scss += `);\n\n`;
        
        scss += `@function get-color($name) {\n  @return map-get($palette, $name);\n}\n\n`;
        
        this.currentColors.forEach((color, index) => {
            scss += `.color-${index + 1} {\n  background-color: $color-${index + 1};\n  color: ${this.getContrastColor(color.hex)};\n}\n\n`;
        });
        
        return scss;
    }

    generateJSONCode() {
        const palette = {
            name: 'カラフラ Pro パレット',
            generated: new Date().toISOString(),
            source: this.currentImage?.info?.name || 'sample',
            colors: this.currentColors.map((color, index) => ({
                id: index + 1,
                name: `color-${index + 1}`,
                hex: color.hex,
                rgb: color.rgb,
                hsl: this.rgbToHsl(color.rgb[0], color.rgb[1], color.rgb[2]),
                percentage: color.percentage,
                accessibility: color.accessibility
            }))
        };
        
        return JSON.stringify(palette, null, 2);
    }

    generateAdobeASE() {
        // Adobe ASE形式は複雑なバイナリ形式のため、簡易版として色情報をテキストで出力
        const aseText = `Adobe Swatch Exchange (簡易版)\nカラフラ Pro - 生成パレット\n\n` +
            this.currentColors.map((color, index) => {
                const [r, g, b] = color.rgb;
                return `Color ${index + 1}\nName: color-${index + 1}\nHex: ${color.hex}\nRGB: ${r}, ${g}, ${b}\nPercentage: ${color.percentage}%\n`;
            }).join('\n');
        
        this.downloadText(aseText, 'colorful-pro-palette.ase.txt', 'text/plain');
        this.showNotification('Adobe ASE情報を書き出しました', 'success');
    }

    // パレット描画メソッド（改良版）
    drawHorizontalPalette(canvas, ctx) {
        const colorCount = this.currentColors.length;
        const width = 1200;
        const height = 600;
        const colorWidth = width / colorCount;
        
        canvas.width = width;
        canvas.height = height;
        
        // グラデーション背景
        const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
        bgGradient.addColorStop(0, '#f8f9fa');
        bgGradient.addColorStop(1, '#e9ecef');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, width, height);
        
        // 色バー
        this.currentColors.forEach((color, index) => {
            ctx.fillStyle = color.hex;
            ctx.fillRect(index * colorWidth, 80, colorWidth, height * 0.6);
            
            // 影効果
            ctx.shadowColor = 'rgba(0,0,0,0.2)';
            ctx.shadowBlur = 5;
            ctx.shadowOffsetY = 3;
            ctx.fillRect(index * colorWidth, 80, colorWidth, height * 0.6);
            ctx.shadowColor = 'transparent';
        });
        
        // テキスト情報
        this.currentColors.forEach((color, index) => {
            const x = index * colorWidth + colorWidth / 2;
            
            // HEXコード
            ctx.fillStyle = '#2c3e50';
            ctx.font = 'bold 20px "Inter", Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(color.hex, x, height * 0.75);
            
            // RGB情報
            ctx.font = '16px "Inter", Arial, sans-serif';
            ctx.fillText(`rgb(${color.rgb.join(', ')})`, x, height * 0.8);
            
            // パーセンテージ
            ctx.font = 'bold 18px "Inter", Arial, sans-serif';
            ctx.fillStyle = color.hex;
            ctx.fillRect(x - 30, height * 0.85, 60, 25);
            ctx.fillStyle = this.getContrastColor(color.hex);
            ctx.fillText(`${color.percentage}%`, x, height * 0.88);
        });
        
        // タイトルとロゴ
        ctx.fillStyle = '#2c3e50';
        ctx.font = 'bold 32px "Inter", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Color Palette by カラフラ Pro', width / 2, 50);
        
        // 生成日時
        ctx.font = '14px "Inter", Arial, sans-serif';
        ctx.fillStyle = '#7f8c8d';
        ctx.fillText(new Date().toLocaleDateString('ja-JP'), width / 2, height - 20);
    }

    drawGridPalette(canvas, ctx) {
        const colorCount = this.currentColors.length;
        const cols = Math.ceil(Math.sqrt(colorCount));
        const rows = Math.ceil(colorCount / cols);
        const cellSize = 150;
        const margin = 25;
        const textHeight = 80;
        
        canvas.width = cols * cellSize + (cols + 1) * margin;
        canvas.height = rows * (cellSize + textHeight) + (rows + 1) * margin + 100;
        
        // 背景
        const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        bgGradient.addColorStop(0, '#ffffff');
        bgGradient.addColorStop(1, '#f5f5f5');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // タイトル
        ctx.fillStyle = '#2c3e50';
        ctx.font = 'bold 28px "Inter", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Color Palette by カラフラ Pro', canvas.width / 2, 40);
        
        // 色グリッド
        this.currentColors.forEach((color, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const x = col * cellSize + (col + 1) * margin;
            const y = row * (cellSize + textHeight) + (row + 1) * margin + 60;
            
            // 影
            ctx.shadowColor = 'rgba(0,0,0,0.15)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 4;
            
            // 色ブロック
            ctx.fillStyle = color.hex;
            ctx.fillRect(x, y, cellSize, cellSize);
            
            ctx.shadowColor = 'transparent';
            
            // 枠線
            ctx.strokeStyle = 'rgba(0,0,0,0.1)';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, cellSize, cellSize);
            
            // テキスト
            ctx.fillStyle = '#2c3e50';
            ctx.font = 'bold 16px "Inter", Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(color.hex, x + cellSize / 2, y + cellSize + 25);
            
            ctx.font = '14px "Inter", Arial, sans-serif';
            ctx.fillText(`rgb(${color.rgb.join(', ')})`, x + cellSize / 2, y + cellSize + 45);
            ctx.fillText(`${color.percentage}%`, x + cellSize / 2, y + cellSize + 65);
        });
    }

    drawCirclePalette(canvas, ctx) {
        const size = 800;
        canvas.width = size;
        canvas.height = size;
        
        const centerX = size / 2;
        const centerY = size / 2;
        const outerRadius = 300;
        const innerRadius = 150;
        
        // 背景
        const bgGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, size / 2);
        bgGradient.addColorStop(0, '#ffffff');
        bgGradient.addColorStop(1, '#f0f0f0');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, size, size);
        
        const angleStep = (2 * Math.PI) / this.currentColors.length;
        
        // 色セクション
        this.currentColors.forEach((color, index) => {
            const startAngle = index * angleStep - Math.PI / 2;
            const endAngle = (index + 1) * angleStep - Math.PI / 2;
            
            // 影
            ctx.shadowColor = 'rgba(0,0,0,0.2)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 5;
            
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = color.hex;
            ctx.fill();
            
            // 内側を切り抜き
            ctx.globalCompositeOperation = 'destination-out';
            ctx.beginPath();
            ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
            
            ctx.shadowColor = 'transparent';
            
            // セクション境界線
            ctx.strokeStyle = 'rgba(255,255,255,0.8)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(
                centerX + Math.cos(startAngle) * innerRadius,
                centerY + Math.sin(startAngle) * innerRadius
            );
            ctx.lineTo(
                centerX + Math.cos(startAngle) * outerRadius,
                centerY + Math.sin(startAngle) * outerRadius
            );
            ctx.stroke();
            
            // ラベル
            const textAngle = startAngle + angleStep / 2;
            const textRadius = outerRadius + 40;
            const textX = centerX + Math.cos(textAngle) * textRadius;
            const textY = centerY + Math.sin(textAngle) * textRadius;
            
            ctx.fillStyle = '#2c3e50';
            ctx.font = 'bold 14px "Inter", Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.save();
            ctx.translate(textX, textY);
            if (textAngle > Math.PI / 2 && textAngle < 3 * Math.PI / 2) {
                ctx.rotate(textAngle + Math.PI);
            } else {
                ctx.rotate(textAngle);
            }
            ctx.fillText(color.hex, 0, -5);
            ctx.fillText(`${color.percentage}%`, 0, 15);
            ctx.restore();
        });
        
        // 中央テキスト
        ctx.fillStyle = '#2c3e50';
        ctx.font = 'bold 24px "Inter", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('カラフラ Pro', centerX, centerY - 10);
        ctx.font = '16px "Inter", Arial, sans-serif';
        ctx.fillText('Color Palette', centerX, centerY + 15);
    }

    drawArtistPalette(canvas, ctx) {
        const width = 1400;
        const height = 800;
        canvas.width = width;
        canvas.height = height;
        
        // 背景テクスチャ
        const bgGradient = ctx.createLinearGradient(0, 0, width, height);
        bgGradient.addColorStop(0, '#fdfefe');
        bgGradient.addColorStop(0.5, '#f8f9fa');
        bgGradient.addColorStop(1, '#ecf0f1');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, width, height);
        
        // パレット描画
        const paletteWidth = 80;
        const paletteHeight = 300;
        const startX = 100;
        const startY = 200;
        
        // パレットベース
        ctx.fillStyle = '#34495e';
        ctx.fillRect(startX - 10, startY - 10, paletteWidth + 20, paletteHeight + 80);
        
        // 色塗り部分
        this.currentColors.forEach((color, index) => {
            const colorHeight = paletteHeight / this.currentColors.length;
            const y = startY + index * colorHeight;
            
            // 3D効果
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = 5;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            
            ctx.fillStyle = color.hex;
            ctx.fillRect(startX, y, paletteWidth, colorHeight);
            
            // ハイライト
            ctx.shadowColor = 'transparent';
            const highlight = ctx.createLinearGradient(startX, y, startX + paletteWidth, y);
            highlight.addColorStop(0, 'rgba(255,255,255,0.3)');
            highlight.addColorStop(0.5, 'rgba(255,255,255,0.1)');
            highlight.addColorStop(1, 'rgba(0,0,0,0.1)');
            ctx.fillStyle = highlight;
            ctx.fillRect(startX, y, paletteWidth, colorHeight);
        });
        
        // 詳細情報パネル
        const panelX = 250;
        const panelY = 150;
        const panelWidth = 600;
        const panelHeight = 500;
        
        // パネル背景
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
        ctx.strokeStyle = '#bdc3c7';
        ctx.lineWidth = 2;
        ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
        
        // タイトル
        ctx.fillStyle = '#2c3e50';
        ctx.font = 'bold 28px "Inter", Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Color Analysis Report', panelX + 30, panelY + 50);
        
        // 色詳細
        this.currentColors.forEach((color, index) => {
            const itemY = panelY + 100 + index * 45;
            const colorSize = 30;
            
            // 色サンプル
            ctx.fillStyle = color.hex;
            ctx.fillRect(panelX + 30, itemY - colorSize/2, colorSize, colorSize);
            ctx.strokeStyle = '#34495e';
            ctx.lineWidth = 1;
            ctx.strokeRect(panelX + 30, itemY - colorSize/2, colorSize, colorSize);
            
            // 色情報
            ctx.fillStyle = '#2c3e50';
            ctx.font = 'bold 16px "Courier New", monospace';
            ctx.fillText(color.hex, panelX + 80, itemY);
            
            ctx.font = '14px "Inter", Arial, sans-serif';
            ctx.fillText(`rgb(${color.rgb.join(', ')})`, panelX + 200, itemY);
            
            // パーセンテージバー
            const barWidth = 150;
            const barHeight = 12;
            const barX = panelX + 350;
            const barY = itemY - barHeight/2;
            
            ctx.fillStyle = '#ecf0f1';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            
            ctx.fillStyle = color.hex;
            ctx.fillRect(barX, barY, (color.percentage / 100) * barWidth, barHeight);
            
            ctx.fillStyle = '#2c3e50';
            ctx.font = 'bold 12px "Inter", Arial, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(`${color.percentage}%`, barX + barWidth + 30, itemY + 3);
            ctx.textAlign = 'left';
        });
        
        // フッター
        ctx.fillStyle = '#7f8c8d';
        ctx.font = '14px "Inter", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Generated by カラフラ Pro - ${new Date().toLocaleDateString('ja-JP')}`, width / 2, height - 30);
    }

    // ユーティリティメソッド
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    displayImageInfo(fileInfo) {
        document.getElementById('fileName').textContent = fileInfo.name;
        document.getElementById('fileSize').textContent = fileInfo.size > 0 ? this.formatFileSize(fileInfo.size) : 'サンプル';
        
        const previewImage = document.getElementById('previewImage');
        previewImage.onload = () => {
            document.getElementById('resolution').textContent = `${previewImage.naturalWidth} × ${previewImage.naturalHeight}`;
        };
    }

    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    }

    rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }

        return [Math.round(h * 360), s, l];
    }

    hslToRgb(h, s, l) {
        h /= 360;
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };

        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }

        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }

    rgbToHsv(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const diff = max - min;
        
        let h = 0;
        if (diff !== 0) {
            switch (max) {
                case r: h = ((g - b) / diff) % 6; break;
                case g: h = (b - r) / diff + 2; break;
                case b: h = (r - g) / diff + 4; break;
            }
        }
        h = Math.round(h * 60);
        if (h < 0) h += 360;
        
        return [h, diff === 0 ? 0 : diff / max, max];
    }

    adjustBrightness(hex, amount) {
        const rgb = this.hexToRgb(hex);
        const adjusted = {
            r: Math.max(0, Math.min(255, rgb.r + amount)),
            g: Math.max(0, Math.min(255, rgb.g + amount)),
            b: Math.max(0, Math.min(255, rgb.b + amount))
        };
        return this.rgbToHex(adjusted.r, adjusted.g, adjusted.b);
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    getContrastColor(hex) {
        const rgb = this.hexToRgb(hex);
        const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
        return brightness > 128 ? '#000000' : '#ffffff';
    }

    findNearestColor(targetRgb, colors) {
        let nearestColor = null;
        let minDistance = Infinity;
        
        colors.forEach(color => {
            const distance = this.calculateColorDistance(targetRgb, color);
            
            if (distance < minDistance && distance < 60) {
                minDistance = distance;
                nearestColor = color;
            }
        });
        
        return nearestColor;
    }

    isSkinColor(rgb) {
        const [r, g, b] = rgb;
        const hsv = this.rgbToHsv(r, g, b);
        const [h, s, v] = hsv;
        return (h >= 0 && h <= 50) && (s >= 0.1 && s <= 0.7) && (v >= 0.2 && v <= 0.95);
    }

    isSimilarColor(color1, color2, threshold = 30) {
        return this.calculateColorDistance(color1, color2) < threshold;
    }

    isBackgroundColor(rgb) {
        const [r, g, b] = rgb;
        
        // 白っぽい色
        if (r > 240 && g > 240 && b > 240) return true;
        
        // グレー系
        const avg = (r + g + b) / 3;
        const variance = Math.abs(r - avg) + Math.abs(g - avg) + Math.abs(b - avg);
        if (variance < 25 && avg > 200) return true;
        
        // 黒っぽい色
        if (r < 25 && g < 25 && b < 25) return true;
        
        return false;
    }

    getColorPersonality(hexColor) {
        const rgb = this.hexToRgb(hexColor);
        const hsv = this.rgbToHsv(rgb.r, rgb.g, rgb.b);
        const [h, s, v] = hsv;
        
        if (h >= 0 && h < 30) {
            return {
                name: "情熱の赤系",
                description: "エネルギッシュで行動力があり、リーダーシップを発揮するタイプ。情熱的で積極的な性格の持ち主です。困難な状況でも前向きに取り組み、周囲を牽引する力があります。",
                traits: ["情熱的", "積極的", "リーダー気質", "行動力抜群", "決断力"],
                recommendations: "オレンジ、イエロー、深いブルーとの組み合わせがおすすめです。"
            };
        } else if (h >= 30 && h < 60) {
            return {
                name: "陽気なオレンジ・イエロー系",
                description: "明るく社交的で、周りを元気にする太陽のような存在。クリエイティブで楽観的な性格です。新しいアイデアを生み出し、チームの雰囲気を盛り上げる才能があります。",
                traits: ["社交的", "明るい", "創造的", "楽観的", "コミュニケーション上手"],
                recommendations: "レッド、グリーン、パープルとの組み合わせで鮮やかな印象に。"
            };
        } else if (h >= 60 && h < 120) {
            return {
                name: "癒しのグリーン系",
                description: "穏やかで調和を大切にし、周りを癒す存在。自然体で心優しい性格の持ち主です。バランス感覚に優れ、平和な環境を作り出すのが得意です。",
                traits: ["穏やか", "癒し系", "協調性", "自然体", "バランス感覚"],
                recommendations: "ブルー、イエロー、アースカラーとの組み合わせが調和的です。"
            };
        } else if (h >= 120 && h < 180) {
            return {
                name: "知的なシアン・ティール系",
                description: "バランス感覚に優れ、冷静な判断力を持つタイプ。知的で洗練された印象を与えます。複雑な問題を整理し、的確な解決策を見つける能力があります。",
                traits: ["バランス感覚", "冷静", "知的", "洗練", "分析力"],
                recommendations: "オレンジ、レッド、ネイビーとの組み合わせでメリハリのある印象に。"
            };
        } else if (h >= 180 && h < 240) {
            return {
                name: "信頼のブルー系",
                description: "誠実で責任感が強く、信頼できるパートナー。論理的思考と深い洞察力を持っています。安定感があり、長期的な視点で物事を考える傾向があります。",
                traits: ["誠実", "責任感", "論理的", "信頼できる", "安定感"],
                recommendations: "オレンジ、イエロー、ホワイトとの組み合わせで清潔感のある印象に。"
            };
        } else if (h >= 240 && h < 300) {
            return {
                name: "神秘のパープル系",
                description: "独創的でアーティスティック、神秘的な魅力を持つタイプ。感性豊かで直感力に優れています。他とは違う独特の視点で世界を見つめ、新しい価値を創造します。",
                traits: ["独創的", "神秘的", "感性豊か", "直感力", "芸術的"],
                recommendations: "イエロー、グリーン、シルバーとの組み合わせで洗練された印象に。"
            };
        } else {
            return {
                name: "優しいピンク・マゼンタ系",
                description: "思いやりがあり、愛情深い性格。周りを包み込むような温かさと優しさを持っています。人の気持ちを理解するのが得意で、サポート力に優れています。",
                traits: ["思いやり", "愛情深い", "温かい", "優しい", "サポート力"],
                recommendations: "グリーン、ブルー、ゴールドとの組み合わせで上品な印象に。"
            };
        }
    }

    // コピー機能
    copyColorToClipboard(color) {
        this.copyToClipboard(color.hex);
    }

    copySpecificFormat(color, format) {
        let text = '';
        const [r, g, b] = color.rgb;
        const hsl = this.rgbToHsl(r, g, b);
        const hsv = this.rgbToHsv(r, g, b);
        
        switch (format) {
            case 'hex':
                text = color.hex;
                break;
            case 'rgb':
                text = `rgb(${r}, ${g}, ${b})`;
                break;
            case 'hsl':
                text = `hsl(${hsl[0]}, ${Math.round(hsl[1] * 100)}%, ${Math.round(hsl[2] * 100)}%)`;
                break;
            case 'hsv':
                text = `hsv(${hsv[0]}, ${Math.round(hsv[1] * 100)}%, ${Math.round(hsv[2] * 100)}%)`;
                break;
        }
        
        this.copyToClipboard(text);
    }

    copyToClipboard(text) {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(() => {
                this.showNotification(`カラーコード "${text}" をコピーしました`, 'success');
            }).catch(err => {
                console.error('コピー失敗:', err);
                this.fallbackCopy(text);
            });
        } else {
            this.fallbackCopy(text);
        }
    }

    fallbackCopy(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            this.showNotification(`カラーコード "${text}" をコピーしました`, 'success');
        } catch (err) {
            console.error('フォールバックコピー失敗:', err);
            this.showNotification('コピーに失敗しました', 'error');
        }
        
        document.body.removeChild(textArea);
    }

    downloadCanvas(canvas, filename) {
        try {
            const link = document.createElement('a');
            link.download = filename;
            link.href = canvas.toDataURL('image/png');
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Canvas download error:', error);
            throw new Error('画像の保存に失敗しました');
        }
    }

    downloadText(content, filename, mimeType) {
        try {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.download = filename;
            link.href = url;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Text download error:', error);
            throw new Error('ファイルの保存に失敗しました');
        }
    }

    // 履歴管理
    saveToHistory() {
        const historyItem = {
            id: Date.now(),
            colors: [...this.currentColors],
            image: this.currentImage?.info?.name || 'sample',
            timestamp: new Date().toISOString(),
            settings: {
                smartFilter: document.getElementById('smartFilter')?.checked,
                portraitMode: document.getElementById('portraitMode')?.checked,
                advancedMode: document.getElementById('advancedMode')?.checked,
                colorCount: parseInt(document.getElementById('colorCountSlider')?.value) || 8,
                extractionMode: document.querySelector('input[name="extractionMode"]:checked')?.value
            }
        };
        
        this.paletteHistory.unshift(historyItem);
        
        // 履歴を50件に制限
        if (this.paletteHistory.length > 50) {
            this.paletteHistory = this.paletteHistory.slice(0, 50);
        }
        
        this.saveHistoryToStorage();
        this.displayHistory();
    }

    loadHistory() {
        try {
            const saved = localStorage.getItem('colorfulpro_history');
            if (saved) {
                this.paletteHistory = JSON.parse(saved);
                this.displayHistory();
            }
        } catch (error) {
            console.error('履歴の読み込みに失敗:', error);
            this.paletteHistory = [];
        }
    }

    saveHistoryToStorage() {
        try {
            localStorage.setItem('colorfulpro_history', JSON.stringify(this.paletteHistory));
        } catch (error) {
            console.error('履歴の保存に失敗:', error);
        }
    }

    displayHistory() {
        const historySection = document.getElementById('historySection');
        const historyGrid = document.getElementById('historyGrid');
        
        if (!historySection || !historyGrid) return;
        
        if (this.paletteHistory.length === 0) {
            historySection.style.display = 'none';
            return;
        }
        
        historySection.style.display = 'block';
        historyGrid.innerHTML = '';
        
        this.paletteHistory.forEach(item => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.tabIndex = 0;
            historyItem.role = 'button';
            historyItem.ariaLabel = `履歴項目: ${item.image}, ${item.colors.length}色`;
            
            const paletteDiv = document.createElement('div');
            paletteDiv.className = 'history-palette';
            
            item.colors.forEach(color => {
                const colorDiv = document.createElement('div');
                colorDiv.style.backgroundColor = color.hex;
                colorDiv.style.flex = `${color.percentage}`;
                paletteDiv.appendChild(colorDiv);
            });
            
            const infoDiv = document.createElement('div');
            infoDiv.className = 'history-info';
            infoDiv.innerHTML = `
                <div style="font-weight: 600; margin-bottom: 2px;">${item.image}</div>
                <div>${item.colors.length}色 - ${new Date(item.timestamp).toLocaleString('ja-JP')}</div>
            `;
            
            historyItem.appendChild(paletteDiv);
            historyItem.appendChild(infoDiv);
            
            historyItem.addEventListener('click', () => this.loadFromHistory(item));
            historyItem.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.loadFromHistory(item);
                }
            });
            
            historyGrid.appendChild(historyItem);
        });
    }

    loadFromHistory(item) {
        this.currentColors = [...item.colors];
        
        // 設定を復元
        if (item.settings) {
            if (document.getElementById('smartFilter')) {
                document.getElementById('smartFilter').checked = item.settings.smartFilter;
            }
            if (document.getElementById('portraitMode')) {
                document.getElementById('portraitMode').checked = item.settings.portraitMode;
            }
            if (document.getElementById('advancedMode')) {
                document.getElementById('advancedMode').checked = item.settings.advancedMode;
            }
            if (document.getElementById('colorCountSlider')) {
                document.getElementById('colorCountSlider').value = item.settings.colorCount;
                document.getElementById('colorCountValue').textContent = item.settings.colorCount;
            }
            if (item.settings.extractionMode) {
                const modeInput = document.querySelector(`input[name="extractionMode"][value="${item.settings.extractionMode}"]`);
                if (modeInput) {
                    modeInput.checked = true;
                }
            }
        }
        
        this.displayResults();
        this.showNotification(`履歴から "${item.image}" のパレットを復元しました`, 'success');
        this.announceToScreenReader(`履歴から ${item.colors.length}色のパレットを復元しました`);
    }

    // UI制御メソッド
    showLoading(message = 'Processing...') {
        const loading = document.getElementById('loadingSection');
        const loadingText = document.getElementById('loadingText');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        if (loading) {
            loading.style.display = 'block';
        }
        if (loadingText) {
            loadingText.textContent = message;
        }
        if (progressFill) {
            progressFill.style.width = '0%';
        }
        if (progressText) {
            progressText.textContent = '0%';
        }
        
        // アップロードセクションを処理中状態に
        const uploadSection = document.getElementById('uploadSection');
        if (uploadSection) {
            uploadSection.classList.add('processing');
        }
    }

    hideLoading() {
        const loading = document.getElementById('loadingSection');
        const uploadSection = document.getElementById('uploadSection');
        
        if (loading) {
            loading.style.display = 'none';
        }
        if (uploadSection) {
            uploadSection.classList.remove('processing');
        }
    }

    updateProgress(percentage) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        if (progressFill) {
            progressFill.style.width = percentage + '%';
        }
        if (progressText) {
            progressText.textContent = Math.round(percentage) + '%';
        }
    }

    showError(title, message) {
        this.hideLoading();
        
        const errorSection = document.getElementById('errorSection');
        const errorTitle = document.getElementById('errorTitle');
        const errorMessage = document.getElementById('errorMessage');
        
        if (errorSection) errorSection.style.display = 'block';
        if (errorTitle) errorTitle.textContent = title;
        if (errorMessage) errorMessage.textContent = message;
        
        this.showNotification(title + ': ' + message, 'error');
        this.announceToScreenReader(`エラー: ${title}. ${message}`);
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        const notificationText = document.getElementById('notificationText');
        
        if (!notification || !notificationText) return;
        
        notification.className = `notification ${type}`;
        notificationText.textContent = message;
        
        // アイコンを更新
        const icon = notification.querySelector('i');
        if (icon) {
            icon.className = this.getNotificationIcon(type);
        }
        
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, type === 'error' ? 5000 : 3000);
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-triangle',
            warning: 'fas fa-exclamation-circle',
            info: 'fas fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    // イベントハンドラー
    onOptionsChange() {
        // オプションが変更された時の処理（必要に応じて再処理）
        if (this.currentColors.length > 0 && this.currentImage) {
            // リアルタイム更新は負荷が高いので、ボタン式にする
            // this.processImage(this.currentImage.src, this.currentImage.info);
        }
    }

    onWindowResize() {
        // チャートのリサイズ
        if (this.chart) {
            this.chart.resize();
        }
    }

    // ボタンアクション
    newProject() {
        if (confirm('新しいプロジェクトを開始しますか？現在の作業内容は失われます。')) {
            this.currentColors = [];
            this.currentImage = null;
            
            document.getElementById('previewSection').style.display = 'none';
            document.getElementById('resultsSection').style.display = 'none';
            document.getElementById('toolbar').style.display = 'none';
            document.getElementById('errorSection').style.display = 'none';
            
            // パーソナリティ分析セクションを削除
            const personalitySection = document.querySelector('.personality-section');
            if (personalitySection) {
                personalitySection.remove();
            }
            
            this.showNotification('新しいプロジェクトを開始しました', 'success');
        }
    }

    clearHistory() {
        if (confirm('履歴をすべて削除しますか？この操作は取り消せません。')) {
            this.paletteHistory = [];
            this.saveHistoryToStorage();
            this.displayHistory();
            this.showNotification('履歴を削除しました', 'success');
        }
    }

    sharepalette() {
        if (this.currentColors.length === 0) {
            this.showNotification('まず画像をアップロードしてカラーパレットを生成してください', 'warning');
            return;
        }
        
        const colors = this.currentColors.map(c => c.hex).join(',');
        const shareText = `カラフラ Proで生成したカラーパレット: ${colors}`;
        const shareUrl = `${window.location.origin}${window.location.pathname}?colors=${encodeURIComponent(colors)}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'カラフラ Pro - カラーパレット',
                text: shareText,
                url: shareUrl
            }).then(() => {
                this.showNotification('パレットを共有しました', 'success');
            }).catch(err => {
                console.error('共有エラー:', err);
                this.fallbackShare(shareUrl, shareText);
            });
        } else {
            this.fallbackShare(shareUrl, shareText);
        }
    }

    fallbackShare(url, text) {
        this.copyToClipboard(url);
        this.showNotification('パレットのURLをコピーしました', 'success');
    }

    showSettings() {
        // 設定モーダルの実装（簡易版）
        alert('設定機能は今後のバージョンで実装予定です。');
    }

    showHelp() {
        const helpText = `
カラフラ Pro - 使い方

1. 画像アップロード
   - 画像をドラッグ&ドロップまたはクリックして選択
   - 対応形式: JPEG, PNG, WebP, GIF
   - 最大ファイルサイズ: 10MB

2. 抽出設定
   - スマートフィルター: 背景色を自動除去
   - 人物モード: 肌色を除外
   - 高精度モード: AI色彩分析

3. カラー数設定
   - スライダーで3〜15色まで調整可能

4. エクスポート機能
   - 画像形式: 横並び、グリッド、円形、絵師向け
   - コード形式: CSS, SCSS, JSON, Adobe ASE

5. アクセシビリティ
   - 色覚異常シミュレーション
   - コントラスト比チェック

6. キーボード操作
   - Tab: フォーカス移動
   - Enter/Space: 選択・実行
   - Escape: キャンセル

詳しい使い方はオンラインヘルプをご確認ください。
        `;
        
        alert(helpText);
    }

    retryCurrentOperation() {
        if (this.currentImage) {
            this.processImage(this.currentImage.src, this.currentImage.info);
        } else {
            document.getElementById('errorSection').style.display = 'none';
        }
    }
}

// アプリケーション初期化
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new ColorfulProApp();
    
    // URL パラメータから色を復元
    const urlParams = new URLSearchParams(window.location.search);
    const sharedColors = urlParams.get('colors');
    if (sharedColors) {
        try {
            const colors = sharedColors.split(',').map(hex => {
                const rgb = app.hexToRgb(hex);
                return {
                    hex: hex,
                    rgb: [rgb.r, rgb.g, rgb.b],
                    percentage: Math.round(100 / sharedColors.split(',').length * 10) / 10,
                    accessibility: app.calculateAccessibility([rgb.r, rgb.g, rgb.b])
                };
            });
            
            app.currentColors = colors;
            app.displayResults();
            app.showNotification('共有されたパレットを読み込みました', 'success');
        } catch (error) {
            console.error('共有パレットの読み込みエラー:', error);
        }
    }
});

// サービスワーカー登録（PWA対応の準備）
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}