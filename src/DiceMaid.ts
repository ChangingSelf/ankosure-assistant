import * as vscode from 'vscode';

/**
 * 骰子，出目范围：[1,面数]
 */
export class Dice {
    constructor(
        public face: number = 100,//骰子面数
        public value: number = -1,//出目
    ) {
        this.value = Math.floor(this.getRandomNum(1, this.face));//一创建就roll点
    }

    /**
     * 生成范围随机数，边界值可以取到
     * @min 最小值
     * @max 最大值
     */
    getRandomNum(min: number, max: number) {
        let range = max - min;
        let rand = Math.random();
        return (min + Math.round(rand * range));
    }

    /**
     * 返回形似"d100=1"的字符串
     */
    toBlockString() {
        return `d${this.face.toFixed(0)}=${this.value.toFixed(0)}`;
    }

    /**
     * 返回形似"d100(1)"的字符串
     */
    toString() {
        return `d${this.face.toFixed(0)}(${this.value.toFixed(0)})`;
    }

}

/**
 * 骰子组
 * 形似5d100
 */
export class DiceGroup {
    constructor(
        public count: number = 1,//骰子数目
        public face: number = 100,//骰子面数
        public group: Dice[] = [],//存储结果的骰子列表
        public value: number = 0,//总出目
    ) {
        for (let i = 0; i < count; ++i) {
            let dice = new Dice(face);
            this.value += dice.value;
            group.push(dice);
        }
    }

    /**
     * 形似"3d6=1+1+1=3"
     * @returns 
     */
    toBlockString() {
        return `${this.count}d${this.face}=${this.group.map(x => x.value).join("+")}=${this.value}`;
    }

    /**
     * 形似"3d6(1+1+1)"
     * @returns 
     */
    toString() {
        return `${this.count}d${this.face}(${this.group.map(x => x.value).join("+")})`;
    }
}

/**
 * 骰点表达式
 * 目前支持的操作数：骰子、整数
 */
export class DiceExpr {
    constructor(
        public expr: string,//骰点表达式
        public reason: string = "",//掷骰原因
        public elementList: (DiceGroup | number | string)[] = [],//组成表达式的元素的列表
        public value: number | null = null,//最终结果
    ) {
        let elements = this.expr.split(/([+\-])/g);//添加捕获分组，则会保留匹配到的分隔符
        elements.push("#");//加个符号作为结尾

        let numStack: number[] = [];
        let opStack: string[] = [];

        for (let element of elements) {
            element = element.trim();
            let r = /(\d*)[dD](\d*)/.exec(element);
            if (r) {
                //是骰子
                let count = Number(r[1]);
                if (count <= 0) {
                    count = 1;
                }
                let face = Number(r[2]);

                let diceGroup = new DiceGroup(count, face);
                this.elementList.push(diceGroup);
                numStack.push(diceGroup.value);//操作数入栈
                continue;
            }

            if (/\d+/.test(element)) {
                //是整数
                this.elementList.push(Number(element));
                numStack.push(Number(element));
                continue;
            }

            r = /([+\-#])/.exec(element);
            if (r) {
                //是运算符
                //当栈外运算符优先级低于栈顶时，出栈两个操作数和一个操作符进行运算
                //不过这里只有+和-，只要遇到运算符，就直接出栈运算
                if (opStack.length > 0) {
                    //栈不为空，则出栈运算
                    if (numStack.length >= 2) {
                        let b = numStack.pop() ?? 0;
                        let a = numStack.pop() ?? 0;
                        let op = opStack.pop() ?? "+";
                        numStack.push(this.calc(a, b, op));
                    } else {
                        this.value = null;
                    }
                }
                opStack.push(r[1]);
                if (element !== "#") {
                    this.elementList.push(r[1]);
                }
            }

        }

        if (numStack.length === 1) {
            this.value = numStack[0];
        } else {
            this.value = null;
        }
    }

    toString() {
        return `${this.expr}=${this.elementList.map(x => x.toString()).join("")}=${this.value}`;
    }

    /**
     * 判断某个字符串是否为数字
     * @param str 
     * @returns 
     */
    isNumber(str: string) {
        return str !== null && Number.isInteger(Number(str));
    }

    calc(a: number, b: number, op: string) {
        switch (op) {
            case "+":
                return a + b;
            case "-":
                return a - b;
            default:
                return 0;
        }
    }

}

/**
 * 骰娘
 * 接收指令并给出回应
 */
export class DiceMaid {

    /**
     * 与骰娘交谈
     * @param input 向骰娘说的话
     */
    static communicate(input: string): string {
        let expr = new DiceExpr(input);
        return `${expr}`;
    }
}