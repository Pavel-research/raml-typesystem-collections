# RAML TypeSystem Collections

This respository is devoted to building representation of resource collections, and providing an API on top of them.


```raml
collection:
   description: You may use it to mark that method returns a collection of resources.
   allowedTargets: [Method]
```



Usage:

```typescript

import modules=require("callables-rpc-views");
import collection=require("raml-typesystem-collections");
let module = main.module(api);
collections.toCollection(module.functions(0)).forEach(x=>console.log(x.title());

```
