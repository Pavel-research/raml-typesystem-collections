# RAML TypeSystem Collections


```
The fundamental concept in any RESTful API is the resource. 
Resources can be grouped into collections. Each collection is homogeneous so 
that it contains only one type of resource, and unordered.
Resources can also exist outside any collection. 
In this case, we refer to these resources as singleton resources. 
Collections are themselves resources as well.
```
(This is taken from [Very nice guide to RESTFull API design](http://restful-api-design.readthedocs.io/en/latest/resources.html))


One most important property of collections is an ability of the client to iterate over them. Typical APIs split content of the collection into the pages, where each page can be obtained by performing
an HTTP request to particular url and contains collection members representations.


**The goal of this repository:**
is to provide a mechanism and tool to traverse a collections as well as an abstraction of top of collection methods. We base our work on top of [RPC Views](https://github.com/callables/callables-rpc-views) which allows us to abstract from a particular transport which is used to expose an API.

## Kinds of the collections:

We are separating following kinds of the collections:

* Random access page based - collections which allows you to jump to the page by it's number 
* Random access offset based - collections which allows you to jump to the element by it's number in the some ordering. 
* Link based collections - collections where you can only navigate to the neighbours of the current page.

Some collections, provide information about number of the the total members in the collection and some are not.

## Collection parameters

Sometimes collections have parameters, we split parameters in the following semantic categories 
 
 * Filter control  
 * Ordering control
 * Representation control
 * Unknown


## Specifying the collection:

We assume that any callable function without side effects (they are formed from GET methods of API) and which returns an array
or is annotated with a paging annotation is a collection.

```raml 
 paging:
   offset?: 
     type: string  
     description: name of the parameter containing offset from the start of the collection
   page?: 
     type: string
     description: name of the parameter containing number of the page
   limit?: 
      type: string
      description: name of the parameter containing number of elements which you would like to get in the one page
   result?: 
     type: string
     description: name of the response body property containing elements of the collection
   total?: 
     type: string  
     description: name of the response body property containing total number of  elements in the collection(with respect to current collection filters)
       
```

If collection does not contains paging annotation, we assume that collection is paged by `Link` headers
in the same way as it is implemented in the [Github API](https://developer.github.com/v3/guides/traversing-with-pagination/)


Usage:

```typescript

import modules=require("callables-rpc-views");
import collection=require("raml-typesystem-collections");
let module = main.module(api);
collections.toCollection(module.functions(0)).forEach(x=>console.log(x.title());

```
