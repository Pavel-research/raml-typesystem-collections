import n=require("callables-rpc-views")
import model=require("raml1-domain-model")

export interface BasicCollection {

    range(): model.Type

    forEach(f: (v: any, i?: number) => void): Promise<any>

    map(f: (v: any, i?: number) => any): Promise<any[]>

    page(): Page

    setParameter(name:string,value:any);
}
export interface Page {
    value(): Promise<any[]>

    next(): Page

    previous(): Page

    hasNext(): boolean

    hasPrevious(): boolean

    isLoaded(): boolean

    reset(): Page

    setParameter(name:string,value:any);
}

function clone(v: any): any {
    return JSON.parse(JSON.stringify(v));
}

export interface OffsetOrPageBasedPagingSpec {

    pName: string

    zeroBased: boolean,

    results: string,

    _total: string,

    isByPage: boolean,

    _pageSize: number
}

export class ParameterValueBasedPage implements Page {


    constructor(private parameters: {[name: string]: any}, private func: n.CallableFunction, private pName: string, private maxValue: number,
                private zeroBased: boolean, private results: string, private _total: string, private isByPage: boolean, private _pageSize: number) {
    }

    setParameter(name:string,value:any){
        this.parameters=clone(this.parameters);
        this.parameters[name]=value;
        this._cached=null;
    }

    isLoaded() {
        return this._cached != null && this._cached !== undefined;
    }

    cursor() {
        let val = this.parameters[this.pName];
        if (!val) {
            val = this.zeroBased ? 0 : 1;
        }
        return val;
    }

    reset() {
        var ps = clone(this.parameters);
        delete ps[this.pName]
        return new ParameterValueBasedPage(ps, this.func, this.pName, this.maxValue, this.zeroBased, this.results, this._total, this.isByPage, this._pageSize);
    }

    hasPrevious() {
        let cursor = this.cursor();
        if (this.zeroBased) {
            return cursor > 0;
        }
        else {
            return cursor > 1;
        }
    }


    shift() {
        if (this.isByPage) {
            return 1;
        }
        return this._pageSize;
    }

    hasNext() {
        if (!this.maxValue) {
            return true;
        }
        let cursor = this.cursor();
        return cursor < this.maxValue;
    }

    next() {
        var ps = clone(this.parameters);
        ps[this.pName] = this.cursor() + this.shift();
        return new ParameterValueBasedPage(ps, this.func, this.pName, this.maxValue, this.zeroBased, this.results, this._total, this.isByPage, this._pageSize);
    }

    previous() {
        var ps = clone(this.parameters);
        ps[this.pName] = this.cursor() - this.shift();
        return new ParameterValueBasedPage(ps, this.func, this.pName, this.maxValue, this.zeroBased, this.results, this._total, this.isByPage, this._pageSize);
    }

    private _cached: any[]

    value() {
        if (this._cached) {
            return Promise.resolve(this._cached);
        }
        return new Promise((r,err)=>{
            this.func.call(this.parameters).then(x => {
                let result: any[] = x;
                if (this.results) {
                    result = x[this.results];
                }
                this._cached = result;
                if (!this.isByPage && this.hasNext()) {
                    this._pageSize = result.length;
                }
                this.updateInternals(x);
                r(result);
                return result;
            },e=>{
                err(e)
            })
        });
    }

    private _totalNum: number;

    total(): Promise<number> {
        if (this._cached) {
            return Promise.resolve(this._totalNum)
        }
        return this.value().then(x => this._totalNum);
    }

    last(): Promise<Page> {
        this.total().then(x => {
            var ps = clone(this.parameters);
            ps[this.pName] = this.maxValue;
            return new ParameterValueBasedPage(ps, this.func, this.pName, this.maxValue, this.zeroBased, this.results, this._total, this.isByPage, this._pageSize);
        })
        return null;
    }

    protected updateInternals(x: any) {
        if (this._total) {
            this._totalNum = x[this._total];
            this.maxValue = this._totalNum / this.shift();
            if (this._totalNum % this.shift() != 0) {
                this.maxValue++;
            }
        }
    }
}
export class OffsetOrPageBasedCollection implements BasicCollection {

    private _range: model.Type;

    constructor(private c: n.CallableFunction, private spec: OffsetOrPageBasedPagingSpec) {
        if (spec.results) {
            this._range = this.c.returnType().property(spec.results).range();
        }
        else {
            this._range = this.c.returnType().componentType();
        }
    }

    parameters: any={}

    setParameter(name:string,value:any){
        this.parameters[name]=value;
    }

    forEach(f: (v: any, i?: number) => void): Promise<any> {
        var rs: Promise<any[]>[] = [];
        var completed = 0;
        var stopIteration=false;
        if (this.spec._total) {
            return new Promise((r, e) => {
                var ap = allPages(this.page());
                ap.then(v => {
                    v.forEach(x => {
                        if (stopIteration){
                            return;
                        }
                        var p = x.value();
                        p.then(vals => {
                            vals.forEach(x => {
                                if (stopIteration){
                                    return;
                                }
                                var res:any=f(x);
                                if (res===false){
                                    stopIteration=true;
                                    r(v.length);
                                }
                            })
                            completed++;
                            if (completed == v.length) {
                                r(v.length);
                            }
                        },error=>e(error))
                    })
                })
            })
        }
        else {
            return new Promise((r, e) => {
                var pf = this.page()
                const fnc = function (vals: any[]) {
                    if (stopIteration){
                        return;
                    }
                    vals.forEach(x => {
                        if (stopIteration){
                            return;
                        }
                        var res:any=f(x);
                        if (res===false){
                            stopIteration=true;
                            r(vals.length);
                        }
                    });
                    if (vals.length > 0 && pf.hasNext()) {
                        pf = pf.next();
                        pf.value().then(fnc,e);
                    }
                    else {
                        r();
                    }
                }
                pf.value().then(fnc,e)
            })
        }
    }


    map(f: (v: any, i?: number) => any) {
        var mm = [];
        return this.forEach((x, i) => {
            mm.push(f(x, i));
        }).then(x => Promise.resolve(mm));
    }

    range() {
        return this._range;
    }

    page(max?: number, pSize?: number) {
        return new ParameterValueBasedPage(clone(this.parameters), this.c, this.spec.pName, max, this.spec.zeroBased, this.spec.results, this.spec._total, this.spec.isByPage, pSize);
    }
}
export class LinkBasedCollection implements BasicCollection {

    private _range: model.Type;

    parameters: any={}

    setParameter(name:string,value:any){
        this.parameters[name]=value;
    }

    constructor(private c: n.CallableFunction) {
        this._range = this.c.returnType().componentType();
    }

    forEach(f: (v: any, i?: number) => void): Promise<any> {
        return allPages(this.page()).then(v => {
            v.forEach(x => {
                x.value().then(vals => vals.forEach(x => f(v)))
            })
        })
    }

    map(f: (v: any, i?: number) => any) {
        var mm = [];
        return this.forEach((x, i) => {
            mm.push(f(x, i));
        }).then(x => Promise.resolve(mm));
    }

    range() {
        return this._range;
    }

    page(max?: number, pSize?: number) {
        return null;
    }
}

function allPages(p: ParameterValueBasedPage): Promise<Page[]> {

    return p.value().then(x => {
        var allPages: Page[] = [];
        var cp = p;
        while (cp) {
            allPages.push(cp);
            if (cp.hasNext()) {
                cp = cp.next();
            }
            else {
                allPages.push(cp);
                cp = null;
            }
        }
        return allPages;
    })

}

function forEach(p: Promise<Page[]>) {
    p.then(v => {
        v.forEach(m => {
            m.value().then(vals => {

            })
        })
    })
}