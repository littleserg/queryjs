(function () {
    if (!window.qjs) {
        console && (console.error ? console.error : console.log)('Add queryjs.core before using other modules');
    }

    var qjs = window.qjs;

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

})();