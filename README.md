queryjs
=======
Javascript promise-based library to work with relational database following query-dsl approach

Why?
======
- Safe query-like syntax
- Easy-to-use promise based API
- Automatic entities mapping with one-to-one and many-to-many support
- Multiple database support (sqlite, websql)
- debuggable sql queries (pretty-printed sql queries with timing in milliseconds)

Install
--------
Install as a bower dependency
```
bower install sql-queryjs
```
Add to your index.html
``` html
<script src="bower_components/queryjs/dist/js/queryjs.min.js"></script>
```

Configuration
--------------
Current implementation designed and supports following databases:
- sqlite
- websql (as a fallback of sqlite)

``` javascript
  // qjs.store.cordovasql.config(dbname, dbversion, description, size, backgroundProcessing, iOSLocation);
  queryjs.store.cordovasql.config('track', '0.0.1', 'VesterTrack Database', 5 * 1024 * 1024, 0, 2);
```

Angularjs Integration
---------------------
Enable angular integration by adding queryjs.angular.js:
``` html
<script src="bower_components/queryjs/dist/js/queryjs.min.js"></script>
<script src="bower_components/queryjs/dist/js/queryjs.angular.js"></script>
```
or replace queryjs.min.js with the bundle:

``` html
<script src="bower_components/queryjs/dist/js/queryjs.bundle.min.js"></script>
```
Include angular module
``` javascript
  angular.module('app', ['queryjs']);
```

Defining entities
-----------------

``` javascript
  var Types = queryjs.SqlTypes;
  var Order = queryjs.define('order', {
            id: Types.TEXT,
            creationDate: Types.DATE,
            processed: Types.BOOL,
            authorId: Types.TEXT,
            metadata: Types.JSON
        });
```

Select query
------------

``` javascript
  queryjs.from(Order)
      .where(Order.processed.eq(true))
      .list()
      .then(function (orders) {
        console.log('Found', orders.length, 'processed orders in the database')
      })
```
Relationships
-------------
Current version of the queryjs supports 2 types of relationships
-one to one (many to one)
-one to many

####One to One
``` javascript
 var User = queryjs.define('user', {
            id: Types.TEXT,
            email: Types.TEXT
        });
      
  Order.hasOne(Order, 'author');

  queryjs.from(Order)
      .join(Author).on(Order.authorId.eq(Author.id))
      .first()
      .then(function onSccuess(order) {
        console.log(order);
      });

```
Example of produced output:

``` json
  {
    "id": "order1",
    "authorId": "user1",
    "author": {
      "id": "user1",
      "email": "john@johnson.com"
    }
  }
```

####One to Many
``` javascript
 var OrderItem = queryjs.define('order_item', {
            id: Types.TEXT,
            name: Types.TEXT,
            price: Types.INT,
            oderId: Type.TEXT
        });
      
  Order.hasMany(OrderItem, 'items');

  queryjs.from(Order)
      .leftJoin(OrderItem).on(Order.id.eq(OrderItem.orderId))
      .first()
      .then(function onSccuess(order) {
        console.log(order);
      });

```
Example of produced output:

``` json
  {
    "id": "order1",
    "processed": true,
    "items": [
      {
        "id": "1",
        "orderId": "order1",
        "name": "Item 1",
        "price": 111.2
      },
      {
        "id": "2",
        "orderId": "order1",
        "name": "Item 2",
        "price": 311.2
      }
    ]
  }
```

Insert query
------------
``` javascript
  var newOrder = new Order({
    id: '1',
    creationDate: new Date(),
    processed: false,
    metadata: { itemsNumber: 1 }
  });
  
  queryjs.insertInto(Order)
      .values(newOrder)
      .execute()
      .then(function () {
        console.log('Entity has been successfully inserted:', newOrder);
      });
```  
Update query
------------
``` javascript
  queryjs.update(Order)
        .set(Order.processed, true)
        .where(Order.id.eq('1'))
        .execute()
        .then(function () {
          console.log('Update-query has been successfully executed');
        });
```        
Delete query
------------
``` javascript
  queryjs
      .delete(Order)
      .where(Order.id.eq('1'))
      .execute()
      .then(function () {
        console.log('Entity "1" has been deleted');
      });
```
