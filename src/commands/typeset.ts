import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as MarkdownIt from 'markdown-it';
import { loadSettings, SabunAction, SabunFormat, SaveMethod } from '../utils';


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
    let settings = loadSettings();
    let saveMethod = settings.typesetSaveMethod;

    let optList = [
        {
            label: "$(comment-discussion) 展示角色头像的对话排版",
            description: '【可有可无的角色头衔】角色名：中文冒号后是单行角色发言内容',
            detail: '自动识别图片管理器中(放在最顶层的)“角色”文件夹下的图片(作为角色)和文件夹(作为角色)下第一个图片(作为默认角色差分)',
            converter: dialogConverter
        }
        , {
            label: "$(markdown) 将markdown转换为NGA论坛代码",
            description: '',
            detail: '除了常见的粗体斜体下划线链接图片等转换，还支持<details>标签转化成[collapse]标签，在里面用<summary>标签来指定[collapse]标签的概述',
            converter: markdownConverter
        }
        , {
            label: "$(bold) 加粗所有骰点表达式",
            description: `/(?<prefix>ROLL\\s*:\\s*)?(?<diceExpr>\\d*[Dd]\\d+(?<buff>\\s*[+-]\\s*\\d+)?\\s*(?<process>=.+?)?=(?<result>\\s*\\d+(\\/(?<check>\\d+))?))/gi`,
            detail: '以骰子(nDm形式)开头，可带一个调整值和计算过程，coc检定的正斜杠表检定值的形式也兼容',
            converter: (input: string) => input.replaceAll(/(?<prefix>ROLL\s*:\s*)?(?<diceExpr>\d*[Dd]\d+(?<buff>\s*[+-]\s*\d+)?\s*(?<process>=.+?)?=(?<result>\s*\d+(\/(?<check>\d+))?))/gi, "[b]$&[/b]")
        }
    ];

    vscode.window.showQuickPick(optList, {
        title: "选择需要进行的排版操作。可以在设置中修改保存方式。",
        placeHolder: saveMethod === SaveMethod.replace ? "当前保存方式：在原文件上修改，侧边栏的「时间线」视图能找到自动保存的上一个版本" : "当前保存方式：将在原文件旁边生成一个新的文件"
    }).then(async value => {
        if (!value) {
            return;
        }

        //调用对应的转换函数
        let item = optList.find(x => x.label === value.label);
        let newText = await item?.converter(text) ?? text;

        //如果新旧文本一致，就认为没有操作成功，不创建新文件
        if (newText === text) {
            vscode.window.showInformationMessage("操作取消或者操作前后无差别，可能是因为用了英文冒号，改成中文的试试。（不适配英文冒号是为了避免通常而言使用英文冒号的骰子被当做对话而误伤）");
            return;
        }

        if (saveMethod === SaveMethod.replace) {
            //写回当前文件
            editor!.edit(editorEdit => {
                let start = new vscode.Position(0, 0);
                let end = start.translate(doc.lineCount, doc.getText().length);
                let replaceRange = new vscode.Range(start, end);
                editorEdit.replace(replaceRange, newText);
            }).then(isSuccess => {
                if (isSuccess) {
                    vscode.window.showInformationMessage(`已完成操作。如果你已经保存文件无法撤销，可以从侧边栏的“资源管理器”的“时间线”视图找到vscode为你保存的上一个版本`);

                } else {
                    vscode.window.showErrorMessage("编辑失败！");
                }
            }, err => {
                console.error(err);
                vscode.window.showErrorMessage(err);
            });
        } else if (saveMethod === SaveMethod.newFile) {
            //写入新文件
            let newFileNamePath = path.join(path.dirname(doc.fileName), `${path.basename(doc.fileName, path.extname(doc.fileName))}_${new Date().getTime()}.${path.extname(doc.fileName)}`);

            fs.writeFileSync(newFileNamePath, newText);
            vscode.commands.executeCommand("vscode.diff", doc.uri, vscode.Uri.file(newFileNamePath));

        }
    });
}

/**
 * 对话形式的文本的排版
 */
function dialogConverter(input: string) {
    //读取角色数据
    let settings = loadSettings();
    let imagesDataPath = settings.imagesDataPath;
    let sabunFormat = settings.sabunFormat;
    let sabunAction = settings.sabunAction;


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
        vscode.window.showWarningMessage("当前数据文件中，不存在名为“角色”的顶层文件夹，需要新建这个文件夹，并在其中存放角色图片，才会给角色配头像");
    }

    let characters = jsonObj["角色"];

    let pcMap = new Map<string, { [sabun: string]: string }>();//角色名->{差分名:url}

    for (let pcName in characters) {
        if (typeof characters[pcName] === "string") {
            //是图片结点
            pcMap.set(pcName, { "default": characters[pcName] });
        } else if (typeof characters[pcName] === "object") {
            //是文件夹
            if (Object.keys(characters[pcName]).length === 0) {
                //不存在可以使用的图片
                pcMap.set(pcName, {});
            } else {
                let character = characters[pcName];//角色对象 = {差分名:差分url}
                pcMap.set(pcName, character);
            }
        } else {
            vscode.window.showErrorMessage("数据文件内容解析错误，可能被手动修改过");
            return input;
        }
    }


    //逐行遍历
    let output = "";
    // let regex = /^(【.+?】|\[.+?\])?(.+?)(\.(.+)|（(.+)）|\((.+)\))?：(.+?)$/m;
    let regexMix = /^(?<title>【.+?】|\[.+?\])?(?<name>.+?)(?<sabunStr>[\.。](?<sabunDot>.+)|（(?<sabunCnP>.+)）|\((?<sabunEnP>.+)\))?：(?<content>.+?)$/m;

    let regexDot = /^(?<title>【.+?】|\[.+?\])?(?<name>.+?)(?<sabunStr>[\.。](?<sabunDot>.+))?：(?<content>.+?)$/m;
    let regexP = /^(?<title>【.+?】|\[.+?\])?(?<name>.+?)(?<sabunStr>（(?<sabunCnP>.+)）|\((?<sabunEnP>.+)\))?：(?<content>.+?)$/m;

    //选择正则表达式
    let regex = regexMix;
    switch (sabunFormat) {
        case SabunFormat.dot:
            regex = regexDot;
            break;
        case SabunFormat.parentheses:
            regex = regexP;
            break;
        default:
            break;
    }

    let lineNum = 0;
    for (let line of input.split("\n")) {
        if (lineNum !== 0) {
            output += '\n';
        }
        let r = regex.exec(line);
        if (r) {
            const { title, name, sabunStr, sabunDot, sabunCnP, sabunEnP, content } = r.groups as { title: string, name: string, sabunStr: string, sabunDot: string, sabunCnP: string, sabunEnP: string, content: string };
            let sabunFilter = [sabunDot, sabunCnP, sabunEnP];

            let sabun = sabunFilter.find(x => !!x) ?? "default";


            if (!pcMap.get(name)) {
                vscode.window.showWarningMessage(`角色「${name}」不存在可以使用的图片，不会添加头像`);
            }

            let sabunMap = pcMap.get(name) ?? {};
            let url = "";
            if (sabun in sabunMap) {
                //差分存在
                url = sabunMap[sabun];
            }


            output += `[quote]${url ? `[l][img]${url}[/img][/l]` : ""}
[b]${title ?? ""}${name}${sabunAction === SabunAction.retain ? (sabunStr ?? "") : ""}[/b]
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

/**
 * markdown转换
 * 原理是先渲染为html，再将html标签正则替换为bbcode标签
 */
function markdownConverter(input: string) {
    let markdownIt = new MarkdownIt({ "html": true });
    let html = markdownIt.render(input);
    return html
        .replaceAll(/<blockquote>(.*?)<\/blockquote>/gs, "[quote]$1[/quote]")
        .replaceAll(/<img src="(.*?)".*?>/g, "[img]$1[/img]")
        .replaceAll(/<a href="(.*?)">(.*?)<\/a>/g, "[url=$1]$2[/url]")
        .replaceAll(/<strong>(.*?)<\/strong>/gs, "[b]$1[/b]")
        .replaceAll(/<u>(.*?)<\/u>/gs, "[u]$1[/u]")
        .replaceAll(/<s>(.*?)<\/s>/gs, "[del]$1[/del]")
        .replaceAll(/<ul>(.*?)<\/ul>/gs, "[list]$1[/list]")
        .replaceAll(/<ol>(.*?)<\/ol>/gs, "[list=1]$1[/list]")
        .replaceAll(/<li>(.*?)<\/li>/gs, "[*]$1")
        .replaceAll(/<h(\d)>(.*?)<\/h\1>/g, "[h]$2[/h]")
        .replaceAll(/<em>(.*?)<\/em>/gs, (m, content: string) => {
            // 到了第46个中文字符的时候NGA论坛就会报错：一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十一二三/* bbscode i too long */
            // 所以需要每40个字符就分一个[i]标签
            let limit = 40;
            if (content.length < limit) {
                return `[i]${content}[/i]`;
            }
            let result = "";
            for (let i = 0; i < content.length; i += limit) {
                result += `[i]${content.slice(i, i + limit)}[/i]`;
            }
            return result;
        })
        .replaceAll(/<details>(.*?)<\/details>/gs, (m, content) => {
            let summary = /<summary>(.*?)<\/summary>/.exec(content);
            let summaryStr = "";
            if (summary) {
                content = content.replaceAll(/<summary>(.*?)<\/summary>/gs, "");
                summaryStr = `=${summary[1]}`;
            }
            content = markdownConverter(content);

            return `[collapse${summaryStr}]${content}[/collapse]`;
        })
        .replaceAll(/<p>(.*?)<\/p>/gs, "$1");
}