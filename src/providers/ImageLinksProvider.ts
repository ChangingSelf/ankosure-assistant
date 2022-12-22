import * as vscode from 'vscode';
import * as fs from 'fs';
import { loadSettings } from '../utils';

/** 图片数据的格式
{
    "角色":{
        "姬由蘖": {
            "笑": "https://img.nga.178.com/attachments/mon_202109/13/lsQ177-eoyaZiT3cSgo-go.png",
            "皱眉": "https://img.nga.178.com/attachments/mon_202109/13/lsQ177-d4t5ZiT3cSgo-go.png.thumb.jpg"
        },
        "姬伦辉":{
            "笑": "https://img.nga.178.com/attachments/mon_202109/11/lsQ177-cqlZ10T3cSgo-go.png.thumb.jpg",
            "惊讶":"https://img.nga.178.com/attachments/mon_202109/13/lsQ177-jnsvZ10T3cSgo-go.png.thumb.jpg"
        }
    }
}
 */

/**
 * 图片结点
 */
export class ImageItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public url: string = "",
        public children: ImageItem[] = [],
        public nodePath: string[] = [],
        public readonly collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None
    ) {
        super(label, collapsibleState);
        if (url) {
            //叶子结点显示图片预览
            this.tooltip = new vscode.MarkdownString(`${this.getNodePathStr()}\n\n![${label}](${url}|width=240)\n\n[查看原图](${url})`);
            this.resourceUri = vscode.Uri.parse(url);
            this.iconPath = vscode.ThemeIcon.File;
            this.contextValue = "image";
        } else {
            //非叶子结点显示孩子数目
            this.tooltip = `子项数:${children.length}`;
            this.iconPath = vscode.ThemeIcon.Folder;
        }
    }

    /**
     * 
     * @returns 返回是否为图片结点
     */
    isImage(): boolean {
        return !!this.url;
    }

    /**
     * 
     * @returns 结点路径字符串
     */
    getNodePathStr(): string {
        return this.nodePath.join("/");
    }
}


export class ImageLinksProvider implements vscode.TreeDataProvider<ImageItem>{

    private _onDidChangeTreeData: vscode.EventEmitter<ImageItem | undefined | null | void> = new vscode.EventEmitter<ImageItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ImageItem | undefined | null | void> = this._onDidChangeTreeData.event;
    refresh(imageLinksTreeView?: vscode.TreeView<ImageItem>): void {
        this._onDidChangeTreeData.fire();
        let dataFilePath = this.getDataFilePath();
        if (dataFilePath && imageLinksTreeView) {
            imageLinksTreeView.message = `当前数据源:\n${dataFilePath}`;
        }
    }

    /**
     * 获取数据文件路径
     * @returns 数据文件路径
     */
    getDataFilePath() {
        return loadSettings().imagesDataPath;
    }

    /**
     * 添加图片结点
     * @param parent 给parent添加结点
     */
    async addNode(parent?: ImageItem, isImage: boolean = false) {
        let name = await vscode.window.showInputBox({ placeHolder: `请输入${isImage ? "图片" : "文件夹"}名称`, prompt: `${isImage ? "图片" : "文件夹"}名称`, ignoreFocusOut: true });
        if (!name) { return; }

        let url: string | undefined;
        if (isImage) {
            url = await vscode.window.showInputBox({ placeHolder: "请输入图片的网络链接", prompt: "图片链接", ignoreFocusOut: true });
            if (!url) { return; }
        }

        let filePath = this.getDataFilePath();
        let jsonObj = JSON.parse(fs.readFileSync(filePath, { encoding: 'utf8', flag: 'r' }));
        if (typeof jsonObj === "object") {
            //重名检查
            if (name in jsonObj) {
                vscode.window.showInformationMessage(`「${name}」在该层级下已经存在，请换个名字`);
                return;
            }
            //插入
            if (!parent) {
                if (isImage) {
                    jsonObj[name] = url;
                } else {
                    jsonObj[name] = {};
                }
            } else {
                let nodePath = parent.nodePath;
                let obj = jsonObj;
                if (parent.isImage()) {
                    //如果是叶子结点，就在其同级插入
                    nodePath = nodePath.slice(0, -1);
                }
                for (let key of nodePath) {
                    //沿着路径一直走
                    obj = obj[key];
                }

                if (isImage) {
                    obj[name] = url;
                } else {
                    obj[name] = {};
                }
            }
            fs.writeFileSync(filePath, JSON.stringify(jsonObj, null, 4), { encoding: "utf8" });
            this.refresh();
        }
    }

    /**
     * 删除结点
     * @param node 
     */
    async delNode(node: ImageItem) {
        if (!node) { return; }

        let selection = await vscode.window.showInformationMessage(`你确定要删除「${node.getNodePathStr()}」吗？`, "确定", "取消");
        if (selection !== "确定") { return; }

        let filePath = this.getDataFilePath();
        let jsonObj = JSON.parse(fs.readFileSync(filePath, { encoding: 'utf8', flag: 'r' }));

        let nodePath = node.nodePath.slice(0, -1);
        let obj = jsonObj;

        for (let key of nodePath) {
            obj = obj[key];
        }
        delete obj[node.label];
        fs.writeFileSync(filePath, JSON.stringify(jsonObj, null, 4), { encoding: "utf8" });
        this.refresh();
    }

    /**
     * 解析JSON对象
     * @param data JSON对象
     * @returns 对应的图片结点
     */
    parseJsonData(data: any, nodePath: string[] = []): ImageItem[] {
        let result: ImageItem[] = [];
        if (data) {
            if (typeof data === 'object') {
                Object.entries(data).forEach(([k, v]) => {
                    //将当前结点的key加入路径
                    if (typeof v === 'object') {
                        //如果是对象，则为非叶结点
                        result.push(new ImageItem(k, "", this.parseJsonData(v, [...nodePath, k]), [...nodePath, k], vscode.TreeItemCollapsibleState.Collapsed));
                    } else if (typeof v === "string") {
                        //如果是字符串，则为叶子结点
                        result.push(new ImageItem(k, v, [], [...nodePath, k]));
                    }
                });
            }
        }
        return result;
    }

    getTreeItem(element: ImageItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }
    getChildren(element?: ImageItem | undefined): vscode.ProviderResult<ImageItem[]> {
        let children: ImageItem[] = [];
        if (!element) {
            //获取根结点
            try {
                children = this.parseJsonData(JSON.parse(fs.readFileSync(this.getDataFilePath(), { encoding: 'utf8', flag: 'r' })));
            } catch (error) {
                console.log(error);
            }

        } else {
            //获取子结点
            children = element.children;
        }
        return children;
    }
}