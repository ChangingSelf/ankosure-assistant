import * as vscode from 'vscode';
import * as fs from 'fs';
import { DiceExpr } from '../commands/DiceMaid';
import { loadSettings } from '../utils';


export class DiceLogItem extends vscode.TreeItem {
    constructor(
        public diceExpr: DiceExpr,
    ) {
        let label = diceExpr.reason ? diceExpr.reason : diceExpr.resultText;
        super(label, vscode.TreeItemCollapsibleState.None);
        let timeStr = `${new Date(diceExpr.timestamp).toLocaleDateString()} ${new Date(diceExpr.timestamp).toLocaleTimeString()}`;
        this.tooltip = `[${timeStr}]\n${diceExpr.resultText}`;

        this.description = new Date(diceExpr.timestamp).toLocaleTimeString();
        this.id = diceExpr.timestamp.toString();
    }

}

export class DiceLogProvider implements vscode.TreeDataProvider<DiceLogItem>{

    private _onDidChangeTreeData: vscode.EventEmitter<DiceLogItem | undefined | null | void> = new vscode.EventEmitter<DiceLogItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<DiceLogItem | undefined | null | void> = this._onDidChangeTreeData.event;
    refresh(treeView?: vscode.TreeView<DiceLogItem>): void {
        this._onDidChangeTreeData.fire();
        let dataFilePath = this.getDataFilePath();
        if (dataFilePath && treeView) {
            treeView.message = `当前数据源:\n${dataFilePath}`;
        }
    }

    /**
     * 获取数据文件路径
     * @returns 数据文件路径
     */
    getDataFilePath() {
        return loadSettings().diceLogDataPath;
    }

    /**
     * 删除结点
     * @param node 
     */
    async delNode(node: DiceLogItem) {
        if (!node) { return; }

        let selection = await vscode.window.showInformationMessage(`你确定要删除「${node.diceExpr.resultText}」吗？`, "确定", "取消");
        if (selection !== "确定") { return; }

        let filePath = this.getDataFilePath();
        let jsonObj = JSON.parse(fs.readFileSync(filePath, { encoding: 'utf8', flag: 'r' }));
        if (!Array.isArray(jsonObj)) {
            return;
        }
        let index = jsonObj.findIndex(x => x.timestamp.toString() === node.id);
        if (index === -1) {
            return;
        }

        jsonObj.splice(index, 1);

        fs.writeFileSync(filePath, JSON.stringify(jsonObj, null, 4), { encoding: "utf8" });
        this.refresh();
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