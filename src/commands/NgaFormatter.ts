import * as vscode from 'vscode';

/**
 * NGA论坛BBCode格式化工具类
 */
export class NgaFormatter {
    /**
     * 包装选中文本的通用方法
     * @param prefix 前缀标签
     * @param suffix 后缀标签
     * @param placeholder 当没有选中文本时的占位符
     */
    private static async wrapSelectedText(prefix: string, suffix: string, placeholder: string = '') {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('没有打开的编辑器');
            return;
        }

        const {selection} = editor;
        const selectedText = editor.document.getText(selection);
        
        let wrappedText: string;
        if (selectedText) {
            // 如果有选中文本，直接包装
            wrappedText = `${prefix}${selectedText}${suffix}`;
        } else {
            // 如果没有选中文本，使用占位符
            wrappedText = `${prefix}${placeholder}${suffix}`;
        }

        await editor.edit(editBuilder => {
            editBuilder.replace(selection, wrappedText);
        });

        // 如果使用了占位符，选中占位符文本方便用户输入
        if (!selectedText && placeholder) {
            const newSelection = new vscode.Selection(
                selection.start.line,
                selection.start.character + prefix.length,
                selection.start.line,
                selection.start.character + prefix.length + placeholder.length
            );
            editor.selection = newSelection;
        }
    }

    /**
     * 加粗格式化 - Ctrl+Alt+B
     */
    public static async bold() {
        await NgaFormatter.wrapSelectedText('[b]', '[/b]');
    }

    /**
     * 斜体格式化 - Ctrl+Alt+I
     */
    public static async italic() {
        await NgaFormatter.wrapSelectedText('[i]', '[/i]');
    }

    /**
     * 下划线格式化 - Ctrl+Alt+U
     */
    public static async underline() {
        await NgaFormatter.wrapSelectedText('[u]', '[/u]');
    }

    /**
     * 删除线格式化 - Ctrl+Shift+S
     */
    public static async strikethrough() {
        await NgaFormatter.wrapSelectedText('[del]', '[/del]');
    }

    /**
     * 链接格式化 - Ctrl+Shift+U
     */
    public static async link() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('没有打开的编辑器');
            return;
        }

        const {selection} = editor;
        const selectedText = editor.document.getText(selection);

        if (selectedText) {
            // 如果选中了文本，询问是作为链接文字还是链接地址
            const choice = await vscode.window.showQuickPick(
                ['作为链接地址', '作为链接文字'],
                { placeHolder: '选择如何处理选中的文本' }
            );

            if (choice === '作为链接地址') {
                await NgaFormatter.wrapSelectedText('[url]', '[/url]');
            } else if (choice === '作为链接文字') {
                const url = await vscode.window.showInputBox({
                    placeHolder: '请输入链接地址',
                    prompt: '输入要链接到的网址'
                });
                if (url) {
                    await editor.edit(editBuilder => {
                        editBuilder.replace(selection, `[url=${url}]${selectedText}[/url]`);
                    });
                }
            }
        } else {
            // 如果没有选中文本，创建空链接模板
            await NgaFormatter.wrapSelectedText('[url]', '[/url]');
        }
    }

    /**
     * 图片格式化 - Ctrl+Shift+I
     */
    public static async image() {
        await NgaFormatter.wrapSelectedText('[img]', '[/img]');
    }

    /**
     * 颜色格式化 - Ctrl+Shift+C
     */
    public static async color() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('没有打开的编辑器');
            return;
        }

        const colors = [
            // 蓝色系
            { label: '天蓝色 (skyblue)', value: 'skyblue' },
            { label: '皇家蓝 (royalblue)', value: 'royalblue' },
            { label: '蓝色 (blue)', value: 'blue' },
            { label: '深蓝色 (darkblue)', value: 'darkblue' },
            // 红色系
            { label: '橙色 (orange)', value: 'orange' },
            { label: '橙红色 (orangered)', value: 'orangered' },
            { label: '深红色 (crimson)', value: 'crimson' },
            { label: '红色 (red)', value: 'red' },
            { label: '火砖红 (firebrick)', value: 'firebrick' },
            { label: '暗红色 (darkred)', value: 'darkred' },
            // 绿色系
            { label: '绿色 (green)', value: 'green' },
            { label: '酸橙绿 (limegreen)', value: 'limegreen' },
            { label: '海绿色 (seagreen)', value: 'seagreen' },
            { label: '青色 (teal)', value: 'teal' },
            // 粉色系
            { label: '深粉色 (deeppink)', value: 'deeppink' },
            { label: '番茄色 (tomato)', value: 'tomato' },
            { label: '珊瑚色 (coral)', value: 'coral' },
            // 紫色系
            { label: '紫色 (purple)', value: 'purple' },
            { label: '靛蓝色 (indigo)', value: 'indigo' },
            // 棕色系
            { label: '实木色 (burlywood)', value: 'burlywood' },
            { label: '沙褐色 (sandybrown)', value: 'sandybrown' },
            { label: '赭色 (sienna)', value: 'sienna' },
            { label: '巧克力色 (chocolate)', value: 'chocolate' },
            // 其他
            { label: '银色 (silver)', value: 'silver' }
        ];

        const selectedColor = await vscode.window.showQuickPick(colors, {
            placeHolder: '选择文字颜色'
        });

        if (!selectedColor) {
          return;
        }

        await NgaFormatter.wrapSelectedText(`[color=${selectedColor.value}]`, '[/color]');
    }

    /**
     * 字体大小格式化 - Ctrl+Shift+Z
     */
    public static async size() {
        const sizes = [
            { label: '正常大小 (100%)', value: '100%' },
            { label: '稍大 (120%)', value: '120%' },
            { label: '中等大 (130%)', value: '130%' },
            { label: '大 (150%)', value: '150%' },
            { label: '自定义大小', value: 'custom' }
        ];

        const selectedSize = await vscode.window.showQuickPick(sizes, {
            placeHolder: '选择字体大小'
        });

        if (!selectedSize) {
          return;
        }

        let sizeValue = selectedSize.value;
        if (sizeValue === 'custom') {
            const customSize = await vscode.window.showInputBox({
                placeHolder: '请输入百分比（如：80%、200%）',
                prompt: '输入自定义字体大小百分比'
            });
            if (!customSize) {
              return;
            }
            // 确保输入的值包含百分号
            sizeValue = customSize.endsWith('%') ? customSize : `${customSize}%`;
        }

        await NgaFormatter.wrapSelectedText(`[size=${sizeValue}]`, '[/size]');
    }

    /**
     * 引用格式化 - Ctrl+Shift+Q
     */
    public static async quote() {
        await NgaFormatter.wrapSelectedText('[quote]', '[/quote]');
    }

    /**
     * 骰子格式化 - Ctrl+Shift+D
     */
    public static async dice() {
        await NgaFormatter.wrapSelectedText('[dice]', '[/dice]', 'D100');
    }

    /**
     * 剧透/折叠格式化 - Ctrl+Alt+Q
     */
    public static async collapse() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('没有打开的编辑器');
            return;
        }

        const collapseTitle = await vscode.window.showInputBox({
            placeHolder: '请输入折叠标题（可选）',
            prompt: '输入折叠块的标题，留空则使用默认标题'
        });

        const title = collapseTitle || '';
        if(title === ''){
            await NgaFormatter.wrapSelectedText(`[collapse]`, '[/collapse]');
        }else{
            await NgaFormatter.wrapSelectedText(`[collapse=${title}]`, '[/collapse]');
        }
    }

    /**
     * 文字对齐格式化 - Ctrl+Shift+A
     */
    public static async align() {
        const alignOptions = [
            { label: '居中对齐', value: 'center' },
            { label: '右对齐', value: 'right' },
            { label: '左对齐', value: 'left' }
        ];

        const selectedAlign = await vscode.window.showQuickPick(alignOptions, {
            placeHolder: '选择文字对齐方式'
        });

        if (!selectedAlign) {
            return;
        }

        await NgaFormatter.wrapSelectedText(`[align=${selectedAlign.value}]`, '[/align]');
    }
} 