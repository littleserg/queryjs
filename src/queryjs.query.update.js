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
        return;
    }

    var _ = root._;

    qjs.Queries.UpdateQuery = UpdateQuery;

    function UpdateQuery(entity) {
        this.entity = entity;
        this.whereClauses = [];
        this.setClauses = [];
        this.entityValue = null;
    }

    UpdateQuery.prototype.set = function (field, value) {
        this.setClauses.push(new SetClause(field, value));
        return this;
    };

    UpdateQuery.prototype.values = function (value) {
        this.entityValue = value;
        return this;
    };

    UpdateQuery.prototype.where = function (condition) {
        this.whereClauses.push(condition);
        return this;
    };

    UpdateQuery.prototype.execute = function (tx) {
        var self = this;
        var args = [];

        var sql = 'UPDATE ' + this.entity.metadata.table;

        if (this.entityValue) {
            _.forEach(this.entityValue.entityClass.metadata.fields, function (field) {
                var value = self.entityValue[field.name];
                if (!_.isUndefined(value)) {
                    self.set(field, value);
                }
            });
        }

        if (this.setClauses.length) {
            sql += '\nSET ';
            sql += _.map(this.setClauses, function (clause) {
                return clause.toSql(args);
            }).join(', ');
        }

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


    function SetClause(field, value) {
        this.field = field;
        this.value = value;
    }

    SetClause.prototype.toSql = function (args) {
        args.push(this.field.type.toSql(this.value));
        return this.field.name + ' = ?';
    };

}).call(this);