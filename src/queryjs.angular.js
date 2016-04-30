(function () {
    angular.module('queryjs', [])
        .provider("queryjs", [function queryJsProvider() {
            var queryjs = window.qjs;
            if (!queryjs) {
                throw new Error('No "qjs" found in global scope. Check dependencies');
            }

            this.debug = false;

            var self = this;
            this.$get = function () {
                queryjs.debug = self.debug;
                return queryjs;
            }
        }])
        .factory('SqlTypes', ['queryjs', function (queryjs) {
            return queryjs.SqlTypes;
        }]);
})();