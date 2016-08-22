(function () {
    'use strict';

    var root = this;

    var qjs;
    if (typeof exports !== 'undefined') {
        qjs = exports.qjs;
    } else {
        qjs = root.qjs ;
    }

    if (!qjs) {
        console && (console.error ? console.error : console.log)('Add queryjs.core before using other modules');
    }

    var _ = root._;

    qjs.Queries.DeleteQuery = DeleteQuery;

    function DeleteQuery(entity) {
        this.entity = entity;
        this.whereClauses = [];
    }

    DeleteQuery.prototype.where = function (condition) {
        this.whereClauses.push(condition);
        return this;
    };

    DeleteQuery.prototype.execute = function (tx) {
        var args = [];

        var sql = 'DELETE FROM ' + this.entity.metadata.table;

        if (this.whereClauses.length) {
            sql += '\nWHERE ';
            sql += _.map(this.whereClauses, function (clause) {
                return clause.toSql(args);
            }).join('\n AND ');
        }

        return qjs.promise(function (resolve, reject) {
            if (!tx) {
                qjs.transaction(function (tx) {
                    tx.executeSql(sql, args).then(resolve, reject);
                });
            } else {
                tx.executeSql(sql, args).then(resolve, reject);
            }
        });
    };

}).call(this);