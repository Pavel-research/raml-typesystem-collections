export interface Collection{

    page(): Promise<any[]>

    nextPage(): Promise<any[]>

    previousPage(): Promise<any[]>

    firstPage(): Promise<any[]>

    lastPage(): Promise<any[]>

    total(): Promise<any>
}
