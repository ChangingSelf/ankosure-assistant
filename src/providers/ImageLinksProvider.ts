import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
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
        this.id = this.getNodePathStr();
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

    /**
     * 返回存入json文件的object形式或者string
     */
    toObjOrString() {
        if (this.isImage()) {
            return this.url;
        }

        let result: { [key: string]: any } = {};
        for (let child of this.children) {
            result[child.label] = child.toObjOrString();
        }
        return result;
    }
}


export class ImageLinksProvider implements vscode.TreeDataProvider<ImageItem>, vscode.TreeDragAndDropController<ImageItem>{

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

    loadData() {
        return JSON.parse(fs.readFileSync(this.getDataFilePath(), { encoding: 'utf8', flag: 'r' }));
    }

    saveData(jsonObj: any) {
        fs.writeFileSync(this.getDataFilePath(), JSON.stringify(jsonObj, null, 4), { encoding: "utf8" });
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

            url = url.trim();

            //去除外层img标签
            let r = /^\[img\](.*)\[\/img\]$/m.exec(url);
            if (r) {
                url = r[1];
            }

            //将相对链接转化为绝对链接
            //https://img.nga.178.com/attachments/mon_202212/22/lsQ2r-baihZvT3cS1f6-u0.png
            if (url.startsWith("./")) {
                url = path.join("https://img.nga.178.com/attachments", url);
            }
        }

        let jsonObj = this.loadData();
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
            this.saveData(jsonObj);
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
        let jsonObj = this.loadData();

        let nodePath = node.nodePath.slice(0, -1);
        let obj = jsonObj;

        for (let key of nodePath) {
            obj = obj[key];
        }
        delete obj[node.label];
        this.saveData(jsonObj);
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
                children = this.parseJsonData(this.loadData());
            } catch (error) {
                console.log(error);
            }

        } else {
            //获取子结点
            children = element.children;
        }
        return children;
    }

    /**
     * 处理拖放的部分
     */
    dropMimeTypes: readonly string[] = ['application/vnd.code.tree.ankosure-images'];
    dragMimeTypes: readonly string[] = ['image/jpeg'];
    /**
     * 以下注释是个人理解
     * 大概是用来决定拖动TreeItem的时候，将哪些数据进行转移，将需要转移的数据存储进dataTransfer里面
     * @param source 选中的数据项
     * @param dataTransfer 像是一个Map，key是MIME类型，value是拖动的数据
     * @param token 取消令牌
     */
    handleDrag(source: readonly ImageItem[], dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): void | Thenable<void> {
        dataTransfer.set("application/vnd.code.tree.ankosure-images", new vscode.DataTransferItem(source));
    }
    handleDrop(target: ImageItem | undefined, dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): void | Thenable<void> {
        const transferItem = dataTransfer.get('application/vnd.code.tree.ankosure-images');
        if (!transferItem) {
            return;
        }

        const sources: ImageItem[] = transferItem.value;

        let root = this.loadData();

        //沿着目标结点的路径往下走，找到目标结点
        let targetObj = root;
        if (target) {
            if (target.isImage()) {
                return;
            }
            //前面已经确保了不是图片结点，所以可以一路走到底
            for (let key of target.nodePath) {
                targetObj = targetObj[key];
            }
        }

        sources.forEach(source => {
            if (source.id === target?.id) {
                return;//如果拖入自身，则跳过
            }
            //加入到该文件夹
            if (!(source.label in targetObj)) {
                //没有重名
                targetObj[source.label] = source.toObjOrString();
            } else {
                //重名
                vscode.window.showInformationMessage(`「${source.label}」存在重名，已跳过`);
                return;
            }
            //删除原有结点
            let sourceParentObj = root;
            for (let key of source.nodePath.slice(0, -1)) {
                sourceParentObj = sourceParentObj[key];
            }
            delete sourceParentObj[source.label];
        });

        this.saveData(root);
        this.refresh();
    }


}