import * as vscode from 'vscode';
import * as fs from 'fs';
import { DiceExpr } from '../DiceMaid';
import { loadSettings } from '../utils';


export class DiceLogItem extends vscode.TreeItem {
    constructor(
        public diceExpr: DiceExpr,
    ) {
        let label = diceExpr.reason ? diceExpr.reason : diceExpr.resultText;
        super(label, vscode.TreeItemCollapsibleState.None);
        this.tooltip = `[${new Date(diceExpr.timestamp).toLocaleDateString()} ${new Date(diceExpr.timestamp).toLocaleTimeString()}]\n${diceExpr.resultText}`
    }

}

export class DiceLogProvider implements vscode.TreeDataProvider<DiceLogItem>{

    private _onDidChangeTreeData: vscode.EventEmitter<DiceLogItem | undefined | null | void> = new vscode.EventEmitter<ImageItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<DiceLogItem | undefined | null | void> = this._onDidChangeTreeData.event;
    refresh(imageLinksTreeView?: vscode.TreeView<DiceLogItem>): void {
        this._onDidChangeTreeData.fire();
    }

    /**
     * 获取数据文件路径
     * @returns 数据文件路径
     */
    getDataFilePath() {
        return loadSettings().diceLogDataPath;
    }

    /**
     * 解析JSON对象
     * @param data JSON对象
     * @returns 对应的图片结点
     */
    parseJsonData(data: any, nodePath: string[] = []): DiceLogItem[] {
        let result: DiceLogItem[] = [];
        if (data && Array.isArray(data)) {
            for (let item of data) {
                result.push(new DiceLogItem(item));
            }
        }
        return result;
    }



    getTreeItem(element: DiceLogItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }
    getChildren(element?: DiceLogItem | undefined): vscode.ProviderResult<DiceLogItem[]> {
        let children: DiceLogItem[] = [];
        if (!element) {
            //获取根结点
            try {
                children = this.parseJsonData(JSON.parse(fs.readFileSync(this.getDataFilePath(), { encoding: 'utf8', flag: 'r' })));
            } catch (error) {
                console.log(error);
            }

        } else {
            //无子结点
        }
        return children;
    }
}