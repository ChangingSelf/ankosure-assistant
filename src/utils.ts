import * as vscode from 'vscode';

export enum SaveMethod {
    replace = "替换当前文件内容",
    newFile = "写入新建文件",
}

export enum SabunFormat {
    dot = "点号",//角色名.差分名：发言内容
    parentheses = "圆括号",//角色名（差分名）：发言内容
}

export enum SabunAction {
    delete = "删除",//排版之后直接删除
    retain = "保留",//排版之后保留
}



export function loadSettings() {
    let configuration = vscode.workspace.getConfiguration();
    const settings = {
        imagesDataPath: configuration.get("ankosure-assistant.imagesDataPath") as string,
        diceLogDataPath: configuration.get("ankosure-assistant.diceLogDataPath") as string,

        typesetSaveMethod: configuration.get("ankosure-assistant.typeset.saveMethod") as SaveMethod,
        sabunFormat: configuration.get("ankosure-assistant.typeset.sabun.format") as SabunFormat,
        sabunAction: configuration.get("ankosure-assistant.typeset.sabun.action") as SabunAction,
    };
    return settings;
}