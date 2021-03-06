/*!
 * Copyright 2016 Sergii Netesnyi.
 * Licensed under the Apache 2.0 license. Please see LICENSE for more information.
 *
 */
(function() { var root = this;
(function () {
    var root = this;
    
    if (root.qjs) {
        root.qjs.logError('queryjs has been included twice');
    }

    var qjs = {
        Order: {
            ASC: 'asc',
            DESC: 'desc'
        }
    };

    if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = qjs
        }
        exports.qjs = qjs
    } else {
        root.qjs = qjs;
    }

    var hasLodash = typeof _ !== 'undefined';

    var _ = root._;

    if (typeof _ === 'undefined') {
        if (!hasLodash) {
            root._ = _ = require('lodash')
        }
    }

    qjs.debug = false;

    qjs.SqlTypes = {
        TEXT: {
            'id': 'TEXT',
            toSql: function (value) {
                return value;
            },
            fromSql: function (sqlValue) {
                return sqlValue;
            }
        },
        INT: {
            'id': 'INT',
            toSql: function (value) {
                return value;
            },
            fromSql: function (sqlValue) {
                return sqlValue;
            }
        },
        BOOL: {
            'id': 'BOOL',
            toSql: function (value) {
                return _.isUndefined(value) || _.isNull(value)
                    ? null
                    : (value ? 1 : 0);
            },
            fromSql: function (sqlValue) {
                return _.isUndefined(sqlValue) || _.isNull(sqlValue)
                    ? null : !!sqlValue;
            }
        },
        DATE: {
            'id': 'DATE',
            toSql: function (value) {
                return _.isDate(value) ? value.getTime() : value;
            },
            fromSql: function (sqlValue) {
                return sqlValue ? new Date(sqlValue) : null;
            }
        },
        JSON: {
            'id': 'DATE',
            toSql: function (value) {
                return value ? JSON.stringify(value) : value;
            },
            fromSql: function (sqlValue) {
                return sqlValue ? JSON.parse(sqlValue) : sqlValue;
            }
        }
    };

    qjs.logDebug = function () {
        if (qjs.debug && root.console) {
            root.console.debug
                ? root.console.debug.apply(root.console, arguments)
                : root.console.log.apply(root.console, arguments);
        }

    };

    qjs.logError = function () {
        root.console && (
            root.console.error
                ? root.console.error.apply(root.console, arguments)
                : root.console.log.apply(root.console, arguments)
        );
    };

    qjs.from = function (entity) {
        return new qjs.Queries.SelectQuery(entity);
    };

    qjs.insertInto = function (entity) {
        return new qjs.Queries.InsertQuery(entity);
    };

    qjs.update = function (entity) {
        return new qjs.Queries.UpdateQuery(entity);
    };

    qjs.delete = function (entity) {
        return new qjs.Queries.DeleteQuery(entity);
    };

    qjs.define = function (table, fields, alias) {
        return createEntity(table, fields, alias);
    };

    qjs.defineAliased = function (entity, alias) {
        return qjs.define(entity.table, entity.fields, alias);
    };

    qjs.Transformers = qjs.Transformers || {};
    qjs.Queries = qjs.Queries || {};
    qjs.Predicates = qjs.Predicates || {};
    qjs.Predicates.BiPredicate = BiPredicate;
    qjs.Predicates.UniPredicate = UniPredicate;
    qjs.Adapters = {
        promiseApi: {
            createPromise: function (fn) {
                return new Promise(fn);
            }
        }
    };

    qjs.promise = function (fn) {
        return qjs.Adapters.promiseApi.createPromise(fn);
    };

    qjs.Transformers.ResultSetTransformer = ResultSetTransformer;

    function ResultSetTransformer() {
    }

    ResultSetTransformer.prototype.transform = function (rootQuery, resultSet) {
        throw new Error('Method "transform" must be implemented in ResultSetTransformer');
    };

    // Entity

    function createEntity(table, fields, alias) {
        var metadata = {};

        metadata.alias = alias || table.toLowerCase();
        metadata.table = table;
        metadata.hasOne = [];
        metadata.hasMany = [];

        function Entity(data) {
            _.extend(this, data);
        }

        Entity.prototype.entityClass = Entity;
        Entity.prototype.equals = function (that) {
            for (var i = 0; i < metadata.fields.length; i++) {
                var field = metadata.fields[i].name;
                if (!_.isEqual(this[field], that[field])) {
                    return false;
                }
            }

            return true;
        };

        Entity.prototype.clone = function () {
            return new Entity(_.clone(this));
        };

        Entity.get = function (name) {
            return _.find(this.metadata.fields, {name: name});
        };

        Entity.hasOne = function (entity, propertyHolderName, columnName, referencedColumnName) {
            metadata.hasOne.push({
                entity: entity,
                columnName: columnName,
                referencedColumnName: referencedColumnName || 'id',
                propertyHolderName: propertyHolderName
            });
        };

        Entity.hasMany = function (entity, propertyHolderName, columnName, referencedColumnName) {
            metadata.hasMany.push({
                entity: entity,
                columnName: columnName,
                referencedColumnName: referencedColumnName || 'id',
                propertyHolderName: propertyHolderName
            });
        };

        if (_.isArray(fields)) {
            metadata.fields = _.map(fields, function (f) {
                return new EntityField(Entity, f.name, f.type);
            });
        } else {
            metadata.fields = _.map(fields, function (type, name) {
                return new EntityField(Entity, name, type);
            });
        }

        _.forEach(metadata.fields, function (field) {
            Entity[field.name] = field;
        });

        Entity.metadata = metadata;

        return Entity;

    }

    function EntityField(entity, name, type) {
        if (!type) {
            throw new Error('No type defined for field "' + name + '" of entity "' + entity.metadata.table + '"')
        }
        this.entity = entity;
        this.name = name;
        this.type = type;
    }

    EntityField.prototype.getAlias = function () {
        return this.entity.metadata.alias + '_' + this.name;
    };

    EntityField.prototype.getFullPath = function () {
        return this.entity.metadata.alias + '.' + this.name;
    };

    EntityField.prototype.eq = function (field) {
        return new BiPredicate(this, field, '=');
    };

    EntityField.prototype.ne = function (field) {
        return new BiPredicate(this, field, '!=');
    };

    EntityField.prototype.gt = function (field) {
        return new BiPredicate(this, field, '>');
    };

    EntityField.prototype.ge = function (field) {
        return new BiPredicate(this, field, '>=');
    };

    EntityField.prototype.lt = function (field) {
        return new BiPredicate(this, field, '<');
    };

    EntityField.prototype.le = function (field) {
        return new BiPredicate(this, field, '<=');
    };

    EntityField.prototype.isNotNull = function () {
        return new UniPredicate(this, 'is not NULL');
    };

    EntityField.prototype.isNull = function () {
        return new UniPredicate(this, 'is NULL');
    };

    EntityField.prototype.in = function (field) {
        return new BiPredicate(this, field, 'in');
    };


    // Predicates

    function BiPredicate(left, right, operator, aggregator) {
        if (_.isUndefined(left)) {
            throw new Error('Check left operand to apply operator "' + operator + '"');
        }
        if (_.isUndefined(right)) {
            throw new Error('Check right operand to apply operator "' + operator + '"');
        }
        this.leftOperand = createOperand(left, right);
        this.rightOperand = createOperand(right, left);
        this.operator = operator;
        this.aggregator = aggregator;
    }

    function UniPredicate(operand, operator) {
        if (!operand) {
            throw new Error('Check operand to apply operator "' + operator + '"');
        }
        this.operand = createOperand(operand);
        this.operator = operator;
    }

    UniPredicate.prototype.toSql = function (paramsCollector) {
        return this.operand.toSql(paramsCollector) + ' ' + this.operator;
    };

    BiPredicate.prototype.toSql = function (paramsCollector) {
        var formatted = this.leftOperand.toSql(paramsCollector) +
            ' ' + this.operator + ' ' +
            this.rightOperand.toSql(paramsCollector);

        if (this.aggregator) {
            return '(' + formatted +')'
        }
        return formatted;
    };

    BiPredicate.prototype.or = function (operator) {
        return new BiPredicate(this, operator, 'or', true);
    };

    BiPredicate.prototype.and = function (operator) {
        return new BiPredicate(this, operator, 'and', true);
    };

    function Operand(value) {
        this.value = value;
    }

    Operand.prototype.toSql = function (params) {
        throw new Error('To sql is not implemented for operand ' + this);
    };

    function EntityFieldOperand(field) {
        Operand.call(this, field);
    }

    EntityFieldOperand.prototype = _.create(Operand.prototype, {
        'constructor': EntityFieldOperand
    });

    EntityFieldOperand.prototype.toSql = function () {
        return this.value.entity.metadata.alias + '.' + this.value.name;
    };

    function ValueOperand(field, dependendField) {
        Operand.call(this, field);
        this.field = dependendField;
    }

    ValueOperand.prototype = _.create(Operand.prototype, {
        'constructor': ValueOperand
    });

    ValueOperand.prototype.toSql = function (params) {
        params.push(this.field ? this.field.type.toSql(this.value) : this.value);
        return '?';
    };

    function ArrayOperand(field) {
        Operand.call(this, field);
    }

    ArrayOperand.prototype = _.create(Operand.prototype, {
        'constructor': ArrayOperand
    });

    ArrayOperand.prototype.toSql = function (params) {
        if (!this.value.length) {
            throw new Error('Empty array in the predicate');
        }
        _.forEach(this.value, function (val) {
            params.push(_.isDate(val) ? val.getTime() : val);
        });

        return '(?' + _.repeat(',?', this.value.length - 1) + ')';
    };

    function createOperand(value, dependent) {
        if (_.isString(value) || _.isNumber(value) || _.isDate(value) || _.isBoolean(value)) {
            return new ValueOperand(value, dependent instanceof EntityField ? dependent : undefined);
        } else if (value instanceof EntityField) {
            return new EntityFieldOperand(value);
        } else if (_.isArray(value)) {
            return new ArrayOperand(value);
        } else if (value instanceof BiPredicate || value instanceof UniPredicate) {
            return value;
        }
        throw new Error('Unmapped predicate ' + value);
    }

}).call(this);
(function () {
    'use strict';

    var root = this;

    var qjs;
    if (typeof exports !== 'undefined') {
        qjs = exports.qjs;
    } else {
        qjs = root.qjs;
    }

    if (!qjs) {
        console && (console.error ? console.error : console.log)('Add queryjs.core before using other modules');
        return;
    }

    var _ = root._;

    qjs.debugResultSet = false;

    qjs.Queries.SelectQuery = SelectQuery;

    qjs.Projections = qjs.Projections || {};
    qjs.Projections.Projection = Projection;
    qjs.Projections.DistinctProjection = DistinctProjection;

    function SelectQuery(entity) {
        this.entity = entity;
        this.joins = [];
        this.orderBys = [];
        this.whereClauses = [];
        this.projectionValue = null;
        this.limitValue = null;
        this.offsetValue = null;
    }

    SelectQuery.prototype.clone = function () {
        var cloned = new SelectQuery(this.entity);
        cloned.joins = _.map(this.joins, function (join) {
            var clonedJoin = new JoinBuilder(cloned, join.type, join.entity);
            clonedJoin.onClauses = _.clone(join.onClauses);
            return clonedJoin;
        });
        cloned.orderBys = _.cloneDeep(this.orderBys);
        cloned.whereClauses = _.map(this.whereClauses, function (clause) {
            return clause;
        });
        cloned.projectionValue = this.projectionValue ? this.projectionValue.clone() : this.projectionValue;
        cloned.limitValue = this.limitValue;
        cloned.offsetValue = this.offsetValue;
        return cloned;
    };

    SelectQuery.prototype.projection = function (projection) {
        this.getRoot().projectionValue = projection;
        return this;
    };

    SelectQuery.prototype.distinct = function (fields) {
        this.getRoot().projectionValue = new DistinctProjection(fields);
        return this;
    };

    SelectQuery.prototype.where = function (condition) {
        this.getRoot().whereClauses.push(condition);
        return this;
    };

    SelectQuery.prototype.leftJoin = function (entity) {
        var join = new JoinBuilder(this.getRoot(), 'LEFT', entity);
        this.getRoot().joins.push(join);
        return join;
    };

    SelectQuery.prototype.join = function (entity) {
        var join = new JoinBuilder(this.getRoot(), '', entity);
        this.getRoot().joins.push(join);
        return join;
    };

    SelectQuery.prototype.innerJoin = function (entity) {
        var join = new JoinBuilder(this.getRoot(), 'INNER', entity);
        this.getRoot().joins.push(join);
        return join;
    };

    SelectQuery.prototype.orderBy = function (field, direction) {
        this.getRoot().orderBys.push({
            field: field,
            direction: direction
        });
        return this;
    };

    SelectQuery.prototype.limit = function (limit) {
        this.getRoot().limitValue = limit;
        return this;
    };

    SelectQuery.prototype.offset = function (offset) {
        this.getRoot().offsetValue = offset;
        return this;
    };

    SelectQuery.prototype.getRoot = function () {
        return this;
    };

    SelectQuery.prototype.count = function (tx) {
        var countProjection = new CountProjection();
        this.projection(countProjection);
        return this.list(tx, new qjs.Transformers.SingleValueSetTransformer(countProjection.toSql()));
    };

    SelectQuery.prototype.unique = function (tx) {
        return this.list(tx, new qjs.Transformers.UniqueResultSetTransformer());
    };

    SelectQuery.prototype.first = function (tx) {
        return this.list(tx, new qjs.Transformers.FirstEntityResultSetTransformer());
    };

    SelectQuery.prototype.list = function (tx, resultSetTransformer) {
        var self = this;
        var args = [];

        if (self.root) {
            return self.root.list(tx, resultSetTransformer);
        }

        var transformer = resultSetTransformer || new qjs.Transformers.OneToManyListResultSetTransformer();

        var projection = this.projectionValue;

        if (!projection) {
            var participatedEntities = _.chain([]).concat(this.entity).concat(_.map(this.joins, 'joinEntity')).value();
            var projectionFields = collectFields({}, _.chain([]), this.entity).filter(function removeNotJoined(field) {
                return _.includes(participatedEntities, field.entity);
            }).value();
            projection = new Projection(projectionFields);
        }

        var sql = 'SELECT ' + projection.toSql();
        sql += '\nFROM ' + this.entity.metadata.table + ' ' + this.entity.metadata.alias;

        if (this.joins.length) {
            _.forEach(this.joins, function (join) {
                sql += '\n    ' + join.type + ' JOIN ' + join.joinEntity.metadata.table + ' ' + join.joinEntity.metadata.alias + ' on ';
                sql += _.map(join.onClauses, function (onOperator) {
                    return onOperator.toSql(args);
                }).join(' AND ');
            });
        }

        if (this.whereClauses.length) {
            sql += '\nWHERE ';
            sql += _.map(this.whereClauses, function (clause) {
                return clause.toSql(args);
            }).join('\n AND ');
        }

        if (this.orderBys.length) {
            sql += '\nORDER BY ';
            sql += _.map(this.orderBys, function (orderBy) {
                return orderBy.field.getFullPath() + ' ' + orderBy.direction || qjs.Order.ASC
            }).join(', ');
        }

        if (!(projection instanceof CountProjection)) {
            if (this.limitValue) {
                sql += '\nLIMIT ' + this.limitValue;
                if (this.offsetValue) {
                    sql += ' OFFSET ' + this.offsetValue;
                }
            } else if (this.offsetValue) {
                qjs.logError('Setting OFFSET without LIMIT!')
            }
        }

        return qjs.promise(function (resolve, reject) {
            if (!tx) {
                qjs.transaction(function (tx) {
                    tx.executeSql(sql, args)
                        .then(function (resultSet) {
                            logResultSet(resultSet);
                            try {
                                resolve(transformer.transform(self.getRoot(), resultSet));
                            } catch (err) {
                                reject({
                                    sql: sql,
                                    args: args,
                                    error: err
                                });
                            }
                        }, reject);
                });
            } else {
                tx.executeSql(sql, args)
                    .then(function (resultSet) {
                        logResultSet(resultSet);
                        try {
                            resolve(transformer.transform(self.getRoot(), resultSet));
                        } catch (err) {
                            reject({
                                sql: sql,
                                args: args,
                                error: err
                            });
                        }
                    }, reject);
            }
        });
    };

    function Projection() {
        this.fields = _.flatten(_.toArray(arguments));
    }

    Projection.prototype.toSql = function () {
        return this.fields.length
            ? _.chain(this.fields).map(function (f) {
            return f.getFullPath() + ' as ' + f.getAlias();
        }).join(', ').value()
            : '*';
    };

    Projection.prototype.clone = function () {
        return new Projection(this.fields);
    };

    CountProjection.prototype = _.create(Projection.prototype, {
        'constructor': CountProjection
    });

    function CountProjection() {
        Projection.call(this, arguments);
    }

    CountProjection.prototype.toSql = function () {
        return 'count(' + Projection.prototype.toSql.call(this) + ')';
    };

    CountProjection.prototype.clone = function () {
        return new CountProjection(this.fields);
    };

    function DistinctProjection() {
        Projection.call(this, arguments);
    }

    DistinctProjection.prototype = _.create(Projection.prototype, {
        'constructor': DistinctProjection
    });

    DistinctProjection.prototype.toSql = function () {
        return 'distinct ' + Projection.prototype.toSql.call(this);
    };

    DistinctProjection.prototype.clone = function () {
        return new DistinctProjection(this.fields);
    };


    function JoinBuilder(root, type, entity) {
        this.root = root;
        SelectQuery.call(this, entity);
        this.type = type;
        this.joinEntity = entity;
        this.onClauses = [];
        return this;
    }

    JoinBuilder.prototype = Object.create(SelectQuery.prototype);
    JoinBuilder.prototype.constructor = JoinBuilder;

    JoinBuilder.prototype.getRoot = function () {
        return this.root;
    };

    JoinBuilder.prototype.on = function (leftField, rightField) {
        if (leftField instanceof qjs.Predicates.BiPredicate ||
            leftField instanceof qjs.Predicates.UniPredicate) {
            this.onClauses.push(leftField);
        } else {
            if (_.isUndefined(leftField)) {
                throw new Error('Left operand of join clause is undefined. Joining table '
                    + this.joinEntity.metadata.table + '. The join column might be misspelled or not defined');
            }
            if (_.isUndefined(rightField)) {
                throw new Error('Right operand of join clause is undefined. Joining table '
                    + this.joinEntity.metadata.table + '. The join column might be misspelled or not defined');
            }
            this.onClauses.push(new qjs.Predicates.BiPredicate(leftField, rightField, '='));
        }
        return this;
    };

    JoinBuilder.prototype.clone = function () {
        var clonedJoin = new JoinBuilder(this.root.clone(), this.type, this.entity);
        clonedJoin.onClauses = _.clone(this.onClauses);
        return clonedJoin;
    };

    function collectFields(alreadyProcessed, chain, entity) {
        if (alreadyProcessed[entity.metadata.table]) {
            return chain;
        }

        alreadyProcessed[entity.metadata.table] = true;
        chain = chain.concat(entity.metadata.fields);
        _.forEach(entity.metadata.hasOne, function (one) {
            chain = collectFields(alreadyProcessed, chain, one.entity);
        });

        _.forEach(entity.metadata.hasMany, function (many) {
            chain = collectFields(alreadyProcessed, chain, many.entity);
        });


        return chain;
    }

    function logResultSet(rs) {
        if (qjs.debugResultSet) {
            qjs.logDebug('ResultSet (' + rs.length + ' rows):\n'
                + _.map(rs, function (row) {
                    return JSON.stringify(row);
                }).join('\n'));
        }
    }

}).call(this);
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

    qjs.Queries.InsertQuery = InsertQuery;

    function InsertQuery(entity) {
        this.entity = entity;
        this.setClauses = [];
        this.entityValue = null;
    }

    InsertQuery.prototype.set = function (field, value) {
        this.setClauses.push(new InsertItem(field, value));
        return this;
    };

    InsertQuery.prototype.values = function (value) {
        this.entityValue = value;
        return this;
    };

    InsertQuery.prototype.execute = function (tx) {
        var self = this;
        var args = [];

        var sql = 'INSERT INTO ' + this.entity.metadata.table;
        var entityClass = this.entityValue.entityClass || this.entity;

        if (this.entityValue) {
            _.forEach(entityClass.metadata.fields, function (field) {
                var value = self.entityValue[field.name];
                if (!_.isUndefined(value)) {
                    self.set(field, value);
                }
            });
        }

        if (this.setClauses.length) {
            sql += '\n(';
            sql += _.map(this.setClauses, function (clause) {
                clause.collectArgs(args);
                return clause.field.name;
            }).join(', ');

            sql += ') \nVALUES(?' + _.repeat(',?', this.setClauses.length - 1) + ')'
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


    function InsertItem(field, value) {
        this.field = field;
        this.value = value;
    }

    InsertItem.prototype.collectArgs = function (args) {
        args.push(this.field.type.toSql(this.value));
    };

}).call(this);
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

    qjs.Transformers.SimpleListResultSetTransformer = SimpleListResultSetTransformer;
    qjs.Transformers.OneToManyListResultSetTransformer = OneToManyListResultSetTransformer;
    qjs.Transformers.UniqueResultSetTransformer  = UniqueResultSetTransformer;
    qjs.Transformers.FirstEntityResultSetTransformer = FirstEntityResultSetTransformer;
    qjs.Transformers.SingleValueSetTransformer = SingleValueSetTransformer;


    function SimpleListResultSetTransformer() {
    }

    SimpleListResultSetTransformer.prototype = _.create(qjs.Transformers.ResultSetTransformer.prototype, {
        'constructor': SimpleListResultSetTransformer
    });

    SimpleListResultSetTransformer.prototype.transform = function (query, resultSet) {
        var mappedEntities = {};
        return _.map(resultSet, function(row) {
            return mapOne(mappedEntities, row, query.entity);
        });
    };

    function UniqueResultSetTransformer() {
    }

    UniqueResultSetTransformer.prototype = _.create(qjs.Transformers.ResultSetTransformer.prototype, {
        'constructor': UniqueResultSetTransformer
    });

    UniqueResultSetTransformer.prototype.transform = function (query, resultSet) {
        var entities = mapMany(query.entity, resultSet);
        if (entities.length !== 1) {
            throw new Error('Expected single result, but found: ' + resultSet.length);
        }
        return entities[0];
    };

    function FirstEntityResultSetTransformer() {
    }

    FirstEntityResultSetTransformer.prototype = _.create(qjs.Transformers.ResultSetTransformer.prototype, {
        'constructor': FirstEntityResultSetTransformer
    });

    FirstEntityResultSetTransformer.prototype.transform = function (query, resultSet) {
        var entities = mapMany(query.entity, resultSet);
        return entities.length ? entities[0] : null;
    };

    function SingleValueSetTransformer(columnName) {
        this.columnName = columnName;
    }

    SingleValueSetTransformer.prototype = _.create(qjs.Transformers.ResultSetTransformer.prototype, {
        'constructor': SingleValueSetTransformer
    });

    SingleValueSetTransformer.prototype.transform = function (query, resultSet) {
        return resultSet.length ? resultSet[0][this.columnName] : null;
    };

    function mapOne(mappedEntities, row, entityClass) {
        var entityRow = _.cloneDeep(row);
        var entityData = {};
        _.forEach(entityClass.metadata.fields, function (field) {
            var value = entityRow[field.getAlias()];
            entityData[field.name] = field.type.fromSql(value);
            delete entityRow[field.getAlias()];
        });

        if (entityData.id) {
            var alreadyMapped = mappedEntities[entityData.id];
            if (alreadyMapped) {
                return alreadyMapped;
            }
        }

        var isEmpty = true;
        _.forEach(entityData, function (d) {
            if (isEmpty) {
                isEmpty = _.isUndefined(d) || _.isNull(d) || d.entityClass || _.isArray(d) && !d.length;
            }
        });

        if (isEmpty) {
            return null;
        }

        var entity = new entityClass(entityData);
        
        mappedEntities[entityData.id] = entity;

        _.forEach(entityClass.metadata.hasOne, function (relMeta) {
            var rel = mapOne(mappedEntities, entityRow, relMeta.entity);
            entity[relMeta.propertyHolderName] = rel;
        });

        return entity;
    }

    function OneToManyListResultSetTransformer() {
    }

    OneToManyListResultSetTransformer.prototype = _.create(qjs.Transformers.ResultSetTransformer.prototype, {
        'constructor': OneToManyListResultSetTransformer
    });

    OneToManyListResultSetTransformer.prototype.transform = function (query, resultSet) {
        var results = mapMany(query.entity, resultSet);
        return results;
    };

    function mapMany(entityClass, rs) {
        var groupedRoot = _.groupBy(rs, entityClass.id.getAlias());
        var mappedEntities = {};
        return _.chain(groupedRoot).map(function (children) {
            var entityData = {};
            _.forEach(entityClass.metadata.hasMany, function (relMany) {
                var rel = mapMany(relMany.entity, children);
                entityData[relMany.propertyHolderName] = rel;
            });

            var entityRow = children[0];

            _.forEach(entityClass.metadata.fields, function (field) {
                var value = entityRow[field.getAlias()];
                if (!_.isUndefined(value)) {
                    entityData[field.name] = field.type.fromSql(value);
                }
            });

            var entity = new entityClass(entityData);
            mappedEntities[entityData.id] = entity;

            _.forEach(entityClass.metadata.hasOne, function (relMeta) {
                entity[relMeta.propertyHolderName] = mapOne(mappedEntities, entityRow, relMeta.entity);
            });


            var isEmpty = true;
            _.forEach(entity, function (d) {
                if (isEmpty) {
                    isEmpty = _.isUndefined(d) || _.isNull(d) || d.entityClass || _.isArray(d) && !d.length;
                }
            });


            if (isEmpty) {
                return null;
            } else {
                return entity;
            }
        }).compact().value();
    }

}).call(this);
(function () {
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

    qjs.store = qjs.store || {};
    qjs.store.cordovasql = {};

    qjs.store.cordovasql.config = function (dbname, dbversion, description, size, backgroundProcessing, iOSLocation) {
        var conn = null;

        qjs.transaction = function (callback) {
            if (!conn) {
                throw new Error("No ongoing database connection, please connect first.");
            } else {
                conn.transaction(callback);
            }
        };

        qjs.db = qjs.db || {};
        qjs.db.implementation = "unsupported";
        qjs.db.conn = null;

        if (root && 'sqlitePlugin' in root) {
            qjs.db.implementation = 'sqliteplugin';
        } else if (root && root.openDatabase) {
            qjs.db.implementation = "websql";
        }

        qjs.db.sqliteplugin = {};

        qjs.db.sqliteplugin.connect = function (dbname, backgroundProcessing, iOSLocation) {
            var that = {};
            var conn = root.sqlitePlugin.openDatabase({
                name: dbname,
                bgType: backgroundProcessing,
                location: (iOSLocation || 0)
            });

            that.transaction = function (fn) {
                return conn.transaction(function (sqlt) {
                    return fn(qjs.db.sqliteplugin.transaction(sqlt));
                });
            };

            that.getNativeConnection = function () {
                return conn;
            };

            return that;
        };

        qjs.db.sqliteplugin.transaction = function (t) {
            var that = {};
            that.executeSql = function (query, args) {
                return qjs.promise(function (resolve, reject) {
                    var start = new Date().getTime();
                    t.executeSql(query, args, function (_, result) {
                        qjs.logDebug(query, args, '\n{executed in', (new Date().getTime() - start), 'ms}');

                        var results = [];
                        for (var i = 0; i < result.rows.length; i++) {
                            results.push(result.rows.item(i));
                        }
                        resolve(results);
                    }, function (tx, err) {
                        qjs.logError('Error executing sql query. \nQuery:\n', query, '\nArgs:\n', args, '\nError:\n', err);
                        reject(err.message);
                    });
                });
            };
            return that;
        };

        qjs.db.websql = {};

        qjs.db.websql.connect = function (dbname, dbversion, description, size) {
            var that = {};
            var conn = openDatabase(dbname, dbversion, description, size);

            that.transaction = function (fn) {
                return conn.transaction(function (sqlt) {
                    return fn(qjs.db.websql.transaction(sqlt));
                });
            };

            that.getNativeConnection = function () {
                return conn;
            };

            return that;
        };

        qjs.db.websql.transaction = function (t) {
            var that = {};
            that.executeSql = function (query, args, successFn, errorFn) {
                return qjs.promise(function (resolve, reject) {
                    var start = new Date().getTime();
                    t.executeSql(query, args, function (_, result) {
                        qjs.logDebug(query, args, '\n{executed in', (new Date().getTime() - start), 'ms}');
                        var results = [];
                        for (var i = 0; i < result.rows.length; i++) {
                            results.push(result.rows.item(i));
                        }
                        resolve(results);
                    }, function (tx, err) {
                        qjs.logError('Error executing sql query. \nQuery:\n', query, '\nArgs:\n', args, '\nError:\n', err);
                        reject(err.message);
                    });
                });
            };
            return that;
        };

        qjs.db.connect = function (dbname, dbversion, description, size, backgroundProcessing, iOSLocation) {
            if (qjs.db.implementation === "sqliteplugin") {
                return qjs.db.sqliteplugin.connect(dbname, backgroundProcessing, iOSLocation);
            } else if (qjs.db.implementation === "websql") {
                return qjs.db.websql.connect(dbname, dbversion, description, size);
            }

            return null;
        };

        conn = qjs.db.connect(dbname, dbversion, description, size, backgroundProcessing, iOSLocation);
        if (!conn) {
            throw new Error("No supported database found in this browser.");
        }

        qjs.db.conn = conn;
    };

}).call(this);

}).call(this);