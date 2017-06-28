import n=require("callables-rpc-views")
import model=require("raml1-domain-model")


export interface BasicCollection{

    range(): model.Type

    forEach(f: (v: any, i?: number) => void): Promise<any>

    map(f: (v: any, i?: number) => any): Promise<any[]>
}


export interface Collection extends BasicCollection{

    parameters(): n.Parameter[];

    setParameterValue(n: string, value: any);

    page(): Promise<any[]>

    nextPage(): Promise<any[]>

    previousPage(): Promise<any[]>

    firstPage(): Promise<any[]>

    lastPage(): Promise<any[]>

    total(): Promise<any>

}

export interface PagingSpec{

    total?: string
    result?: string
    offset?: string
    page?: string
    limit?: string
    isPagedByLinkHeader?:boolean
}

export class BasicPagedCollection implements Collection {

    parameters(): n.Parameter[] {
        return this._parameters;
    }

    private _pValues = {};
    private _parameters:model.Parameter[];
    private _currentPage:any[];

    private hasTotal: boolean;
    private _total: number;

    private _elementsPerPage: number

    private _pagingSpec:PagingSpec;

    pagingSpec():PagingSpec{
        if (this._pagingSpec){
            return this._pagingSpec;
        }
        this._pagingSpec={};
        var ps:PagingSpec=this._n.annotation("paging");
        if(ps){
            this._pagingSpec=ps;
        }
        if (!this._pagingSpec.offset&&!this._pagingSpec.page){
            this._pagingSpec.isPagedByLinkHeader=true;
        }
        if (this._pagingSpec.result){
            var prop=this._n.returnType().property(this._pagingSpec.result);
            if (prop) {
                this._range = prop.range().componentType();
            }
            else{
                 throw new Error("Can not resolve collection type");
            }
        }
        return this._pagingSpec;
    }
    private _offset:number=0;

    buildCallParameters(){
        var pVals={};
        Object.keys(this._pValues).forEach(x=>{
            pVals[x]=this._pValues[x];
        })
        let pagingSpec = this.pagingSpec();
        if (pagingSpec.offset){
            pVals[pagingSpec.offset]=this._offset;
        }
        if (pagingSpec.page){
            pVals[pagingSpec.page]=this._offset;
        }
        return pVals;
    }

    setParameterValue(n: string, value: any) {
        this._pValues[n] = value;
    }
    _range: model.Type;

    constructor(private _n: n.CallableFunction) {
        var mm=this._n.annotation("collection");
        if (mm){
           this._range= this._n.returnType().registry().getType(<any>mm);
        }
        else{
            this._range=this._n.returnType().componentType();
        }
        var ps=this.pagingSpec();
        let filteredPars:model.Parameter[]=[];
        this._n.parameters().forEach(x => {
            let s = x.name();
            if(s==ps.offset||s==ps.page||s==ps.limit){
                return;
            }
            filteredPars.push(x);
        });
        this._parameters=filteredPars;;
    }

    page(): Promise<any[]> {
        if (this._currentPage){
            return Promise.resolve(this._currentPage);
        }
        return this._n.call(this.buildCallParameters()).then(x=>{
            let pagingSpec = this.pagingSpec();
            if (pagingSpec.total){
                this.hasTotal=true;
                this._total=x[pagingSpec.total];;
            }
            if (pagingSpec.result){
                this.hasTotal=true;
                this._currentPage=x[pagingSpec.result];
            }
            else{
                this._currentPage=x;
            }
            if (this.hasTotal){
                if (this._total>this._currentPage.length){
                    this._elementsPerPage=this._currentPage.length;
                }
            }
            return this._currentPage;
        })
    }

    nextPage(): Promise<any[]> {
        this._currentPage=null;
        this._offset++;
        return this.page();
    }

    hasNextPage() {

    }

    hasPrevPage() {
        if (this._offset>0){
            return true;
        }
    }

    previousPage(): Promise<any[]> {
        if (this._offset>0) {
            this._currentPage = null;
            this._offset--;
        }
        return this.page();
    }

    firstPage(): Promise<any[]> {
        if(this._offset!=0) {
            this._offset == 0;
            this._currentPage = null;
        }
        return this.page();
    }

    lastPage(): Promise<any[]> {
        if (this.hasTotal&&this._elementsPerPage){

        }
        return null;
    }

    total(): Promise<any> {
        if (this.hasTotal===false||this.hasTotal===true){
            return Promise.resolve(this._total);
        }
        return this.page().then(x=>{return this._total});
    }

    range(): model.Type {
        return this._range;
    }

    forEach(f: (v: any, i?: number) => void) {
        this.firstPage().then(x=>{
            if (this._elementsPerPage){

            }
        })
        return null;
    }

    map(f: (v: any, i?: number) => any) {
        var mm=[];
        return this.forEach((x,i)=>{
            mm.push(f(x,i));
        }).then(x=>Promise.resolve(mm));
    }
}

export function isCollection(n: n.CallableFunction): boolean {
    var rs=false;
    n.annotations().forEach(x=>{
        if (x.name()=="collection"||x.name().endsWith(".collection")){
            rs=true;
        }
    })
    return rs;
}

export function toCollection(n: n.CallableFunction): Collection {
    return new BasicPagedCollection(n);
}