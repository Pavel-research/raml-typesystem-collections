import n=require("callables-rpc-views")
import model=require("raml1-domain-model")

export interface BasicCollection {

    range(): model.Type

    forEach(f: (v: any, i?: number) => void): Promise<any>

    map(f: (v: any, i?: number) => any): Promise<any[]>

}
export interface Page{
    value():Promise<any[]>

    next():Page

    previous():Page

    hasNext():boolean

    hasPrevious():boolean

    isLoaded():boolean
}

function clone(v:any):any{
    return JSON.parse(JSON.stringify(v));
}

interface OffsetOrPageBasedPagingSpec{

    pName:string

    zeroBased:boolean,

    results:string,

    _total:string,

    isByPage:boolean,

    _pageSize:number
}

class ParameterValueBasedPage implements Page{


    constructor(private parameters:{ [name:string]:any},private func:n.CallableFunction,private pName:string,private maxValue:number,
                private zeroBased:boolean,private results:string,private _total:string,private isByPage:boolean,private _pageSize:number){
    }
    isLoaded(){
        return this._cached!=null&&this._cached!==undefined;
    }

    cursor(){
        let val=this.parameters[this.pName];
        if (!val){
            val=this.zeroBased?0:1;
        }
        return val;
    }

    hasPrevious(){
        let cursor=this.cursor();
        if (this.zeroBased){
            return cursor>0;
        }
        else{
            return cursor>1;
        }
    }


    shift(){
        if (this.isByPage){
            return 1;
        }
        return this._pageSize;
    }

    hasNext(){
        if (!this.maxValue){
            return true;
        }
        let cursor=this.cursor();
        return cursor<this.maxValue;
    }

    next(){
        var ps=clone(this.parameters);
        ps[this.pName]=this.cursor()+this.shift();
        return new ParameterValueBasedPage(ps,this.func,this.pName,this.maxValue,this.zeroBased,this.results,this._total,this.isByPage,this._pageSize);
    }

    previous(){
        var ps=clone(this.parameters);
        ps[this.pName]=this.cursor()-this.shift();
        return new ParameterValueBasedPage(ps,this.func,this.pName,this.maxValue,this.zeroBased,this.results,this._total,this.isByPage,this._pageSize);
    }

    private _cached:any[]

    value(){
        if (this._cached){
            return Promise.resolve(this._cached);
        }
        return this.func.call(this.parameters).then(x=>{
            let result:any[]=x;
            if (this.results){
                result=x[this.results];
            }
            this._cached=result;
            this.updateInternals(x);

            return result;
        });
    }

    protected updateInternals(x:any) {
        if (this._total) {
            this.maxValue = x[this._total] / this.shift();
        }

    }
}
class OffsetOrPageBasedCollection implements BasicCollection{

    private _range:model.Type;

    constructor(private c:n.CallableFunction,private spec:OffsetOrPageBasedPagingSpec){
        if (spec.results){
            this._range= this.c.returnType().property(spec.results).range();
        }
        else{
            this._range=this.c.returnType().componentType();
        }
    }
    forEach(f: (v: any, i?: number) => void): Promise<any>{
        return allPages(this.page()).then(v=>{
            v.forEach(x=>{
                x.value().then(vals=>vals.forEach(x=>f(v)))
            })
        })
    }

    map(f: (v: any, i?: number) => any) {
        var mm=[];
        return this.forEach((x,i)=>{
            mm.push(f(x,i));
        }).then(x=>Promise.resolve(mm));
    }

    range(){
        return this._range;
    }

    private page(max?:number,pSize?:number){
        return new ParameterValueBasedPage({},this.c,this.spec.pName,max,this.spec.zeroBased,this.spec.results,this.spec._total,this.spec.isByPage,pSize);
    }
}
class LinkHeadersBasedCollection implements BasicCollection{

}

function allPages(p:ParameterValueBasedPage):Promise<Page[]>{
    if (!p.isLoaded()){
        return p.value().then(x=>{
            var allPages:Page[]=[];
            var cp=p;
            while (cp){
                allPages.push(cp);
                if (cp.hasNext()){
                    cp=cp.next();
                }
                else{
                    cp=null;
                }
            }
            return allPages;
        })
    }
}

function forEach(p:Promise<Page[]>){
    p.then(v=>{
        v.forEach(m=>{
            m.value().then(vals=>{

            })
        })
    })
}