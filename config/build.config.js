var pkg = require('../package.json');
var fs = require('fs');

module.exports = {
    dist: 'dist',
    banner:
    '/*!\n' +
    ' * Copyright 2016 Sergii Netesnyi.\n' +
    ' * Licensed under the Apache 2.0 license. Please see LICENSE for more information.\n'+
    ' *\n' +
    ' */\n',
    bundleBanner:
    '/*!\n' +
    ' * queryjs.bundle.js is a concatenation of:\n' +
    ' * queryjs.core.js, queryjs.query.select.js, queryjs.query.delete.js,\n'+
    ' * queryjs.query.insert.js, queryjs.query.update.js,\n'+
    ' * and queryjs.transformers.js\n'+
    ' */\n\n',
    closureStart: '(function() {\n',
    closureEnd: '\n})();',

    queryjsFiles: [
        'src/queryjs.core.js',
        'src/queryjs.query.select.js',
        'src/queryjs.query.update.js',
        'src/queryjs.query.insert.js',
        'src/queryjs.query.delete.js',
        'src/queryjs.transformers.js',
        'src/queryjs.db.js'
    ],

    queryjsBundleFiles: [
        'js/queryjs.angular.js',
        'js/queryjs.js'
    ],

    //Exclamation can be no longer than 14 chars
    exclamations: [
        "Aah","Ah","Aha","All right","Aw","Ay","Aye","Bah","Boy","By golly","Boom","Cheerio","Cheers","Come on","Crikey","Dear me","Egads","Fiddle-dee-dee","Gadzooks","Gangway","G'day","Gee whiz","Gesundheit","Get outta here","Gosh","Gracious","Great","Gulp","Ha","Ha-ha","Hah","Harrumph","Hey","Hooray","Hurray","Huzzah","I say","Look","Look here","Long time","Lordy","Most certainly","My my","My word","Oh","Oh-oh","Oh no","Okay","Okey-dokey","Ooh","Oye","Phew","Quite","Ready","Right on","Roger that","Rumble","Say","See ya","Snap","Sup","Ta-da","Take that","Tally ho","Thanks","Toodles","Touche","Tut-tut","Very nice","Very well","Voila","Vroom","Well done","Well, well","Whoa","Whoopee","Whew","Word up","Wow","Wuzzup","Ya","Yea","Yeah","Yippee","Yo","Yoo-hoo","You bet","You don't say","You know","Yow","Yum","Yummy","Zap","Zounds","Zowie"
    ]

};