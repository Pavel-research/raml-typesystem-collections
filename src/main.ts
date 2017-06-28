import n=require("callables-rpc-views")
import model=require("raml1-domain-model")
import col=require("./collection");

export import BasicCollection=col.BasicCollection;

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

export interface PagingSpecification{
    offset?: string
    page?: string
    limit?: string
}
export interface FilterSpecification{

    property?: string
    valueMappings:{ [name:string]:any}

    noFilterValue: string

    filterOp: "eq"|"lt"|"gt"|"like"|"ge"|"le"
}
export interface OrderingMapping{
    property:string
    descending?: boolean
}

export interface OrderingMappings{

    [name:string]:OrderingMapping| string

}
export enum CollectionKind{
    OFFSETBASED, PAGEBASED, LINKBASED
}

export interface CollectionInfo{
    paging?:PagingSpecification

    total?: string

    result?: string

    filters?: {
        [name:string]:FilterSpecification
    }

    ordering?: string

    orderingMappings?: OrderingMappings

    sortDirection?: string

    kind:CollectionKind

    range: model.Type
}

export function buildCollectionInfo(n:n.CallableFunction):CollectionInfo{
    let range:n.Type=null;
    let kind: CollectionKind.LINKBASED;

    var pspec:PagingSpecification={};
    if (n.returnType().isArray()){
        range=n.returnType().componentType();
    }
    else{
        n.returnType().properties().forEach(x=>{
            let range = x.range();
            if (hasAnnotation(range,"result")){
                range=range;
            }
            if (hasAnnotation(range,"offset")){
                pspec.offset=x.name();
            }
            if (hasAnnotation(range,"page")){
                pspec.page=x.name();
            }
            if (hasAnnotation(range,"limit")){
                pspec.limit=x.name();
            }
        })
        var ps=n.annotation("paging");
        if (ps){
            var res=ps.result;
            if (res){
                range=n.returnType().property(res).range();
            }
            pspec.offset=ps.offset;
            pspec.page=ps.page;
            pspec.limit=ps.limit;
        }
    }
    if (!range){
        return null;
    }
    let collectionInfo:CollectionInfo={ range:range, kind:CollectionKind.OFFSETBASED};
    return collectionInfo;
}

function hasAnnotation(t:model.Type,n:string){
    var has=false;
    t.annotations().forEach(x=>{if (x.name()==n||x.name().endsWith("."+n)){has=true}})
    return has;
}
export function isCollection(n: n.CallableFunction): boolean {
    var rs=false;
    if (n.returnType().isArray()&&n.isSafe()){
        return true;
    }
    if (n.hasAnnotation("paging")){
        return true;
    }
    n.parameters().forEach(x=>{

    })
    return rs;
}

export function toCollection(n: n.CallableFunction): Collection {
    return new BasicPagedCollection(n);
}