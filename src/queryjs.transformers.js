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