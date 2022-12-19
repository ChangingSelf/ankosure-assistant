import * as vscode from 'vscode';

export function loadSettings(){
    let configuration = vscode.workspace.getConfiguration();
    const settings = {
        imagesDataPath:configuration.get("ankosure-assistant.imagesDataPath") as string
    };
    return settings;
}