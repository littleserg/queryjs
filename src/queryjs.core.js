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
        if (!left) {
            throw new Error('Check left operand to apply operator "' + operator + '"');
        }
        if (!right) {
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