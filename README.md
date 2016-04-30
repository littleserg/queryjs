queryjs
=======
Javascript promise-based library to work with relational database following query-dsl approach

Defining entities
-----------------

```
  var Types = queryjs.SqlTypes;
  var Order = queryjs.define('order', {
            id: Types.TEXT,
            creationDate: Types.DATE,
            processed: Types.BOOL,
            metadata: Types.JSON
        });
```

Select query
------------

```
  queryjs.from(Order)
      .where(Order.processed.eq(true))
      .list()
      .then(function (orders) {
        console.log('Found', orders.length, 'processed orders in the database')
      })
```
  
Insert query
------------
```
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
```
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
```
  queryjs
      .delete(Order)
      .where(Order.id.eq('1'))
      .execute()
      .then(function () {
        console.log('Entity "1" has been deleted');
      });
```
