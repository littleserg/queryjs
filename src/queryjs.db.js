(function () {
    if (!window.qjs) {
        console && (console.error ? console.error : console.log)('Add queryjs.core before using other modules');
    }

    var qjs = window.qjs;

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

        if (window && 'sqlitePlugin' in window) {
            qjs.db.implementation = 'sqliteplugin';
        } else if (window && window.openDatabase) {
            qjs.db.implementation = "websql";
        }

        qjs.db.sqliteplugin = {};

        qjs.db.sqliteplugin.connect = function (dbname, backgroundProcessing, iOSLocation) {
            var that = {};
            var conn = window.sqlitePlugin.openDatabase({
                name: dbname,
                bgType: backgroundProcessing,
                location: (iOSLocation || 0)
            });

            that.transaction = function (fn) {
                return conn.transaction(function (sqlt) {
                    return fn(qjs.db.sqliteplugin.transaction(sqlt));
                });
            };
            return that;
        };

        qjs.db.sqliteplugin.transaction = function (t) {
            var that = {};
            that.executeSql = function (query, args) {
                return new Promise(function (resolve, reject) {
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
            return that;
        };

        qjs.db.websql.transaction = function (t) {
            var that = {};
            that.executeSql = function (query, args, successFn, errorFn) {
                return new Promise(function (resolve, reject) {
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
    };

})();
