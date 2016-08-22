/* jslint node: true */
/* global describe, it, expect */

"use strict";

var _ = require('../node_modules/lodash/lodash.js');
var Promise = require('../node_modules/bluebird/js/release/bluebird.js');
var qjs = require('../dist/js/queryjs.js');

describe("#queryjs", function () {
        qjs.Adapters.PromiseApi = {
            createPromise: function (fn) {
                return new Promise(fn);
            }
        };
        var Order = qjs.define('Order', {
            "id": qjs.SqlTypes.TEXT,
            "orderName": qjs.SqlTypes.TEXT
        });

        var OrderItem = qjs.define('OrderItem', {
            "id": qjs.SqlTypes.TEXT,
            "orderId": qjs.SqlTypes.TEXT
        });

        Order.hasMany(OrderItem, 'items');

        it("simple select", function () {
            qjs.from(Order).list(assertQuery('SELECT order.id as order_id, order.orderName as order_orderName FROM Order order'));
        });

        it("select with one left join", function () {
            qjs.from(Order)
                .leftJoin(OrderItem).on(OrderItem.orderId.eq(Order.id))
                .list(assertQuery('SELECT order.id as order_id, order.orderName as order_orderName, orderitem.id as orderitem_id, orderitem.orderId as orderitem_orderId FROM Order order '
            + 'LEFT JOIN OrderItem orderitem on orderitem.orderId = order.id'));
        });

        it("count total amount", function () {
            qjs.from(Order)
                .count(assertQuery('SELECT count(*) FROM Order order'))
        });

        it("insert query", function () {
            qjs.insertInto(Order)
                .values(new Order({
                    id: '1'
                }))
                .execute(assertQuery('INSERT INTO Order (id) VALUES(?)', ['1']))
        });

        it("delete query", function () {
            qjs.delete(Order)
                .where(Order.id.eq('1'))
                .execute(assertQuery('DELETE FROM Order WHERE order.id = ?', ['1']))
        });

        it("update query", function () {
            qjs.update(Order)
                .set(Order.orderName, 'New name')
                .where(Order.id.eq('1'))
                .execute(assertQuery('UPDATE Order SET orderName = ? WHERE order.id = ?', ['New name', '1']))
        });

        it("update query: update by entity", function () {
            qjs.update(Order)
                .values(new Order({
                    orderName: 'Order #1'
                }))
                .where(Order.id.eq('1'))
                .execute(assertQuery('UPDATE Order SET orderName = ? WHERE order.id = ?', ['Order #1', '1']))
        });

        function assertQuery(expectedSql, expectedArgs) {
            return {
                executeSql: function (sql, args) {
                    expect(sql.replace('\n', ' ').replace(/\s+/g, ' ').trim()).toBe(expectedSql);
                    if (expectedArgs) {
                        expect(args).toEqual(expectedArgs);
                    }
                }
            };
        }
    }
);