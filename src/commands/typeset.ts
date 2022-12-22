import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { loadSettings } from '../utils';


/**
 * 命令：排版
 * @returns void
 */
export function typeset() {
    //获取文本
    let editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showInformationMessage("请打开你要编辑的文件");
        return;
    }

    let doc = editor.document;
    let text = doc.getText();

    let optList = [
        {
            label: "展示角色头像的对话排版",
            description: '【可有可无的角色头衔】角色名：中文冒号后是单行角色发言内容',
            detail: '自动识别图片管理器中(放在最顶层的)“角色”文件夹下的图片(作为角色)和文件夹(作为角色)下第一个图片(作为默认角色差分)',
            converter: dialogConverter
        }
    ];

    vscode.window.showQuickPick(optList, {
        title: "选择需要进行的排版操作",
        placeHolder: "将在原文件旁边生成一个新的文件"
    }).then(async value => {
        if (!value) {
            return;
        }

        //调用对应的转换函数
        let item = optList.find(x => x.label === value.label);
        let newText = await item?.converter(text) ?? text;

        //如果新旧文本一致，就认为没有操作成功，不创建新文件
        if (newText === text) {
            vscode.window.showInformationMessage("操作取消或者操作前后无差别，未新建文件");
            return;
        }

        //写入文件
        let newFileNamePath = path.join(path.dirname(doc.fileName), `${path.basename(doc.fileName, path.extname(doc.fileName))}_${new Date().getTime()}.${path.extname(doc.fileName)}`);

        fs.writeFileSync(newFileNamePath, newText);
        vscode.commands.executeCommand("vscode.diff", doc.uri, vscode.Uri.file(newFileNamePath));
    });
}


function dialogConverter(input: string) {
    //读取角色数据
    let settings = loadSettings();
    let imagesDataPath = settings.imagesDataPath;
    if (!fs.existsSync(imagesDataPath)) {
        vscode.window.showErrorMessage("请配置正确的图片资源数据文件");
        return input;
    }

    let jsonObj = JSON.parse(fs.readFileSync(imagesDataPath, { encoding: "utf8" }));
    if (!(typeof jsonObj === "object")) {
        vscode.window.showErrorMessage("请使用正确格式的数据文件");
        return input;
    }

    if (!("角色" in jsonObj) || (typeof jsonObj["角色"] !== "object")) {
        vscode.window.showErrorMessage("当前数据文件中，不存在名为“角色”的顶层文件夹，需要新建这个文件夹，并在其中存放角色图片，才能使用该功能");
        return input;
    }

    let characters = jsonObj["角色"];

    let pcMap = new Map<string, string>();//角色名->url

    for (let key in characters) {
        if (typeof characters[key] === "string") {
            //是图片结点
            pcMap.set(key, characters[key]);
        } else if (typeof characters[key] === "object") {
            //是文件夹
            if (Object.keys(characters[key]).length === 0) {
                vscode.window.showErrorMessage(`角色「${key}」不存在可以使用的图片`);
                return input;
            }
            let subtypes = characters[key];

            pcMap.set(key, subtypes[Object.keys(subtypes)[0]]);
        } else {
            vscode.window.showErrorMessage("数据文件内容解析错误，可能被手动修改过");
            return input;
        }
    }


    //逐行遍历
    let output = "";
    let regex = /^(【.*?】)?(.*?)：(.*?)$/m;
    let lineNum = 0;
    for (let line of input.split("\n")) {
        if (lineNum !== 0) {
            output += '\n';
        }
        let r = regex.exec(line);
        if (r) {
            let title = r[1];
            let name = r[2];
            let content = r[3];
            output += `[quote]${pcMap.has(name) ? `[l][img]${pcMap.get(name)}[/img][/l]` : ""}
[b]${title + name}[/b]
${content}
======
[/quote]`;
        } else {
            output += line;
        }
        ++lineNum;
    }

    return output;
}