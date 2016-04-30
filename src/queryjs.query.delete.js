(function () {
    if (!window.qjs) {
        console && (console.error ? console.error : console.log)('Add queryjs.core before using other modules');
    }

    var qjs = window.qjs;

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

        return new Promise(function (resolve, reject) {
            if (!tx) {
                qjs.transaction(function (tx) {
                    tx.executeSql(sql, args).then(resolve, reject);
                });
            } else {
                tx.executeSql(sql, args).then(resolve, reject);
            }
        });
    };

})();
