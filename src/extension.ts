// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import { ImageItem, ImageLinksProvider } from './providers/ImageLinksProvider';
import { loadSettings } from './utils';
import { DiceMaid } from './DiceMaid';
import { DiceLogItem, DiceLogProvider } from './providers/DiceLogProvider';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {



    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand('ankosure-assistant.helloWorld', () => {
        // The code you place here will be executed every time your command is executed
        // Display a message box to the user
        vscode.window.showInformationMessage('Hello World from ankosure assistant!');
    });

    context.subscriptions.push(disposable);

    //骰娘
    context.subscriptions.push(vscode.commands.registerCommand('ankosure-assistant.diceMaid', async () => {
        let input = await vscode.window.showInputBox({ "placeHolder": "输入掷骰表达式" });
        if (!input) { return; }
        let output = DiceMaid.communicate(input);
        vscode.window.showInformationMessage(output);
    }));


    //侧边栏自定义资源管理器
    let imageLinksProvider = new ImageLinksProvider();
    let imageLinksTreeView = vscode.window.createTreeView('ankosure-images', {
        treeDataProvider: imageLinksProvider,
        showCollapseAll: true,
    });


    //侧边栏骰子历史
    let diceLogProvider = new DiceLogProvider();
    let dicelogTreeView = vscode.window.createTreeView('ankosure-dice-log', {
        treeDataProvider: diceLogProvider,
        showCollapseAll: true
    });

    //刷新视图
    context.subscriptions.push(vscode.commands.registerCommand('ankosure-assistant.refreshTreeView', () => {
        imageLinksProvider.refresh(imageLinksTreeView);
        diceLogProvider.refresh();
    }));

    //新建图片数据文件
    context.subscriptions.push(vscode.commands.registerCommand("ankosure-assistant.newImageDataFile", async () => {
        let uri = await vscode.window.showSaveDialog({
            filters: { "json": ["json"] },
            title: "选择保存位置",
            defaultUri: vscode.workspace.workspaceFolders?.at(0)?.uri
        });
        if (!uri) { return; }
        //创建文件
        fs.writeFileSync(uri.fsPath, "{}", { encoding: "utf8" });
        //写入设置
        vscode.workspace.getConfiguration().update("ankosure-assistant.imagesDataPath", uri.fsPath, true);
    }));
    //选择图片数据文件
    context.subscriptions.push(vscode.commands.registerCommand("ankosure-assistant.selectImageDataFile", async () => {
        let uris = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            openLabel: "选择数据文件",
            filters: { "json": ["json"] },
            title: "选择数据文件",
            defaultUri: vscode.Uri.file(loadSettings().imagesDataPath)
        });
        if (!uris) { return; }
        //写入设置
        vscode.workspace.getConfiguration().update("ankosure-assistant.imagesDataPath", uris[0].fsPath, true);
    }));

    //复制链接的命令
    context.subscriptions.push(vscode.commands.registerCommand("ankosure-assistant.copyImageLink", (imageItem: ImageItem) => {
        vscode.env.clipboard.writeText(imageItem.url);
        vscode.window.showInformationMessage(`已将「${imageItem.nodePath.join("/")}」的纯链接复制到剪贴板：${imageItem.url}`);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("ankosure-assistant.copyImageLinkCode", (imageItem: ImageItem) => {
        vscode.env.clipboard.writeText(`[img]${imageItem.url}[/img]`);
        vscode.window.showInformationMessage(`已将「${imageItem.nodePath.join("/")}」论坛代码链接复制到剪贴板：[img]${imageItem.url}[/img]`);
    }));

    //复制骰子历史项的命令
    context.subscriptions.push(vscode.commands.registerCommand("ankosure-assistant.copyDiceLog", (diceLogItem: DiceLogItem) => {
        vscode.env.clipboard.writeText(diceLogItem.diceExpr.resultText);
        vscode.window.showInformationMessage(`已将骰点记录复制到剪贴板：${diceLogItem.diceExpr.resultText}`);
    }));

    //新建文件夹
    context.subscriptions.push(vscode.commands.registerCommand("ankosure-assistant.newImageFolder", () => {
        imageLinksProvider.addNode.bind(imageLinksProvider)(imageLinksTreeView.selection[0]);
    }));
    //新建图片结点
    context.subscriptions.push(vscode.commands.registerCommand("ankosure-assistant.newImageLink", () => {
        imageLinksProvider.addNode.bind(imageLinksProvider)(imageLinksTreeView.selection[0], true);
    }));
    //删除结点
    context.subscriptions.push(vscode.commands.registerCommand("ankosure-assistant.delImageNode", (node: ImageItem) => {
        imageLinksProvider.delNode.bind(imageLinksProvider)(node);
    }));



    //事件
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((event) => {
        imageLinksProvider.refresh(imageLinksTreeView);
        diceLogProvider.refresh();
    }));
    context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection((event) => {
        imageLinksProvider.refresh(imageLinksTreeView);
        diceLogProvider.refresh();
    }));
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((event) => {
        imageLinksProvider.refresh(imageLinksTreeView);
        diceLogProvider.refresh();
    }));
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(() => {
        imageLinksProvider.refresh(imageLinksTreeView);
        diceLogProvider.refresh();
    }));
}

// this method is called when your extension is deactivated
export function deactivate() { }
