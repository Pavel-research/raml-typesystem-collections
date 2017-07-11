import n=require("callables-rpc-views")
import model=require("raml1-domain-model")
import col=require("./collection");

import BasicCollection=col.BasicCollection;

export interface Collection  {

    parameters(): n.Parameter[];

    setParameterValue(n: string, value: any);

    parameterValues(): { [name:string]:any}

    page(): Promise<any[]>

    nextPage(): Promise<any[]>

    previousPage(): Promise<any[]>

    firstPage(): Promise<any[]>

    validate(): n.ValidationReport

    lastPage(): Promise<any[]>

    total(): Promise<any>

    range(): model.Type

    forEach(f: (v: any, i?: number) => void|boolean): Promise<any>

    map(f: (v: any, i?: number) => any): Promise<any[]>

    hasTotal(): boolean;
}

export interface PagingSpecification {
    offset?: string
    page?: string
    limit?: string
}

export interface FilterSpecification {

    property?: string

    valueMappings: {[name: string]: any}

    noFilterValue: string

    filterOp: "eq"|"lt"|"gt"|"like"|"ge"|"le"
}

export interface OrderingMapping {
    property: string
    descending?: boolean
}

export interface OrderingMappings {

    [name: string]: OrderingMapping| string

}
export enum CollectionKind{
    OFFSETBASED, PAGEBASED, LINKBASED
}

export interface CollectionInfo {
    paging: PagingSpecification

    kind: CollectionKind

    range: model.Type

    filters: {
        [name: string]: FilterSpecification
    }

    total?: string

    result?: string

    sortDirection?: string

    ordering?: string

    orderingMappings?: OrderingMappings
}

export function collectionInfo(n: n.CallableFunction): CollectionInfo {
    var range: n.Type = null;
    var kind: CollectionKind = CollectionKind.LINKBASED;
    var total: string = null;
    var ordering: string = null;
    var result: string = null;
    var filters: {[name: string]: FilterSpecification} = {};
    var sortDirection: string = null;
    var orderingMappings: OrderingMappings = null;
    var pspec: PagingSpecification = {};
    let returnType = n.returnType();
    if (!returnType){
        return null;
    }
    if (returnType.isArray()) {
        range = returnType.componentType();
    }

        returnType.properties().forEach(x => {
            let range = x.range();
            if (hasAnnotation(range, "result")) {
                range = x.range();
                result = x.name();
            }
            if (hasAnnotation(range, "total")) {
                total = x.name();
            }
            if (hasAnnotation(range, "offset")) {
                pspec.offset = x.name();
            }
            if (hasAnnotation(range, "page")) {
                pspec.page = x.name();
            }
            if (hasAnnotation(range, "ordering")) {
                ordering = x.name();
                orderingMappings = range.annotation("ordering")
            }
            if (hasAnnotation(range, "limit")) {
                pspec.limit = x.name();
            }
            if (hasAnnotation(range, "sortDirection")) {
                sortDirection = x.name();
            }
            var flt = n.annotation("filter");
            if (flt) {
                filters[x.name()] = flt;
            }
        })
        var ps = n.annotation("paging");
        if (ps) {
            var res = ps.result;
            if (res) {
                range = returnType.property(res).range();
            }
            pspec.offset = ps.offset;
            pspec.page = ps.page;
            pspec.limit = ps.limit;

            result = ps.result;
            total = ps.total;
        }

    if (!range) {
        return null;
    }
    if (pspec.offset) {
        kind = CollectionKind.OFFSETBASED;
    }
    if (pspec.page) {
        kind = CollectionKind.PAGEBASED;
    }
    let collectionInfo: CollectionInfo = {
        range: range,
        kind: kind,
        paging: pspec,
        filters: filters,
        result: result,
        total: total,
        sortDirection: sortDirection,
        ordering: ordering,
        orderingMappings: orderingMappings
    };
    return collectionInfo;
}

function hasAnnotation(t: model.Type, n: string) {
    var has = false;
    t.annotations().forEach(x => {
        if (x.name() == n || x.name().endsWith("." + n)) {
            has = true
        }
    })
    return has;
}
export function isCollection(n: n.CallableFunction): boolean {
    var rs = false;
    var info = collectionInfo(n);
    return info != null;
}

export class BasicPagedCollection implements Collection {

    private _col:BasicCollection
    private _collectionInfo:CollectionInfo;

    _parameters:n.Parameter[]=[];

    currentPage: col.Page;

    parameters(){
        return this._parameters;
    }

    hasTotal(){
        return this._collectionInfo.total!=null&&this._collectionInfo.total!=undefined;
    }
    private ps:{ [name:string]:any}={};

    setParameterValue(name:string,val:any){
        this._page().setParameter(name,val);
        this._col.setParameter(name,val);
        this.ps[name]=val;
        this.changed();
    }

    parameterValues(){
        return this.ps;
    }

    protected changed(){

    }
    validate(): n.ValidationReport{
        return this._n.validateParameters(this.ps);
    }

    _page():col.Page{
        if (this.currentPage!=null){
            return this.currentPage;
        }
        this.currentPage=this._col.page();
        return this.currentPage;
    }
    total(){
        if (this.hasTotal()){
            return (<col.ParameterValueBasedPage>this._page()).total();
        }
        return null;
    }

    lastPage(): Promise<any[]> {
        if (this.hasTotal()){
           (<col.ParameterValueBasedPage>this._page()).last().then(x=>{
               this.currentPage=x;
               return this.currentPage.value();
           });
        }
        return null;
    }

    forEach(f: (v: any, i?: number) => void): Promise<any> {
        return this._col.forEach(f);
    }

    map(f: (v: any, i?: number) => any): Promise<any[]> {
        return this._col.map(f);
    }

    nextPage(){
        this.currentPage=this._page().next();
        return this.currentPage.value();
    }
    previousPage(){
        this.currentPage=this._page().previous();
        return this.currentPage.value();
    }
    firstPage(){
        this.currentPage=this.currentPage.reset();
        return this.currentPage.value();
    }

    page(){
        return this._page().value();
    }

    range(){
        return this._col.range();
    }

    constructor(private _n: n.CallableFunction) {
        this._collectionInfo=collectionInfo(_n);
        if (this._collectionInfo.kind==CollectionKind.OFFSETBASED||this._collectionInfo.kind==CollectionKind.PAGEBASED){
            var ofs:col.OffsetOrPageBasedPagingSpec={
                pName:this._collectionInfo.paging.offset?this._collectionInfo.paging.offset:this._collectionInfo.paging.page,
                zeroBased:this._collectionInfo.paging.offset?true:false,
                results: this._collectionInfo.result,
                _total: this._collectionInfo.total,
                isByPage:this._collectionInfo.kind==CollectionKind.PAGEBASED,
                _pageSize: null,
            }
            this._col=new col.OffsetOrPageBasedCollection(_n,ofs);
        }
        else{
            this._col=new col.LinkBasedCollection(_n);
        }
        _n.parameters().forEach(x=>{
            if (this._collectionInfo.paging.offset!=x.name()&&this._collectionInfo.paging.page!=x.name()&&this._collectionInfo.paging.limit!=x.name()){
                this._parameters.push(x);
            }
        })
    }
}

export function toCollection(n: n.CallableFunction): Collection {
    if (!isCollection(n)){
        return null;
    }
    return new BasicPagedCollection(n);
}