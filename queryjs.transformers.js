(function () {
    if (!window.qjs) {
        console && (console.error ? console.error : console.log)('Add queryjs.core before using other modules');
    }

    var qjs = window.qjs;

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
        return _.map(resultSet, function(row) {
            return mapOne(row, query.entity)
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

    function mapOne(row, entity) {
        var entityRow = _.cloneDeep(row);
        var entityData = {};
        _.forEach(entity.metadata.fields, function (field) {
            var value = entityRow[field.getAlias()];
            entityData[field.name] = field.type.fromSql(value);
            delete entityRow[field.getAlias()];
        });

        _.forEach(entity.metadata.hasOne, function (relMeta) {
            var rel = mapOne(entityRow, relMeta.entity);
            entityData[relMeta.propertyHolderName] = rel;
        });

        return new entity(entityData);
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

    function mapMany(entity, rs) {
        var groupedRoot = _.groupBy(rs, entity.id.getAlias());
        return _.chain(groupedRoot).map(function (children) {
            var entityData = {};
            _.forEach(entity.metadata.hasMany, function (relMany) {
                var rel = mapMany(relMany.entity, children);
                entityData[relMany.propertyHolderName] = rel;
            });

            var entityRow = children[0];

            _.forEach(entity.metadata.fields, function (field) {
                var value = entityRow[field.getAlias()];
                if (!_.isUndefined(value)) {
                    entityData[field.name] = field.type.fromSql(value);
                }
            });

            _.forEach(entity.metadata.hasOne, function (relMeta) {
                entityData[relMeta.propertyHolderName] = mapOne(entityRow, relMeta.entity);
            });


            var isEmpty = true;
            _.forEach(entityData, function (d) {
                if (isEmpty) {
                    isEmpty = _.isUndefined(d) || _.isNull(d) || d.entityClass || _.isArray(d) && !d.length;
                }
            });
            return isEmpty ? null : new entity(entityData);

        }).compact().value();
    }

})();