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
                            resolve(transformer.transform(self.getRoot(), resultSet));
                        }, reject);
                });
            } else {
                tx.executeSql(sql, args)
                    .then(function (resultSet) {
                        logResultSet(resultSet);
                        resolve(transformer.transform(self.getRoot(), resultSet));
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