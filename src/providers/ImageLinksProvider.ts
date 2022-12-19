import * as vscode from 'vscode';
import * as fs from 'fs';

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


class ImageItem extends vscode.TreeItem{
    constructor(
        public readonly label: string,
        public url:string = "",
        public children:ImageItem[] = [],
        public readonly collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None
    ){
        super(label,collapsibleState);
        if(url){
            //叶子结点显示图片预览
            this.tooltip = new vscode.MarkdownString(`![${label}](${url}|width=240)`);
            this.resourceUri = vscode.Uri.parse(url);
            this.iconPath = vscode.ThemeIcon.File;
        }else{
            //非叶子结点显示孩子数目
            this.tooltip = `子项数:${children.length}`;
            this.iconPath = vscode.ThemeIcon.Folder;
        }
    }
}


export class ImageLinksProvider implements vscode.TreeDataProvider<ImageItem>{
    private _onDidChangeTreeData: vscode.EventEmitter<ImageItem | undefined | null | void> = new vscode.EventEmitter<ImageItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ImageItem | undefined | null | void> = this._onDidChangeTreeData.event;
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }



    parseJsonData(data:any):ImageItem[]{
        let result:ImageItem[] = [];
        if(data){
            if(typeof data === 'object'){
                Object.entries(data).forEach(([k,v])=>{
                    if(typeof v === 'object'){
                        //如果是对象，则为非叶结点
                        result.push(new ImageItem(k,"",this.parseJsonData(v),vscode.TreeItemCollapsibleState.Collapsed));
                    }else if(typeof v === "string"){
                        //如果是字符串，则为叶子结点
                        result.push(new ImageItem(k,v,[]));
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
        let children:ImageItem[] = [];
        if(!element){
            //获取根结点

            let editor = vscode.window.activeTextEditor;
            if(!editor) {return [];}
            let filepath = editor.document.uri.fsPath;
            
            children = this.parseJsonData(JSON.parse(fs.readFileSync(filepath,{encoding:'utf8', flag:'r'})));

        }else{
            //获取子结点
            children = element.children;
        }
        return children;
    }
}