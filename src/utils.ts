import * as vscode from 'vscode';

export function loadSettings() {
    let configuration = vscode.workspace.getConfiguration();
    const settings = {
        imagesDataPath: configuration.get("ankosure-assistant.imagesDataPath") as string,
        diceLogDataPath: configuration.get("ankosure-assistant.diceLogDataPath") as string,
    };
    return settings;
}