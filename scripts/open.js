var exec = require('child_process').exec;
// Hexo 2.x 用户复制这段
hexo.on('new', function(path) {
    exec('open -a "/Applications/Visual Studio Code.app" ' + path);
});
// Hexo 3 用户复制这段
hexo.on('new', function(data) {
    exec('open -a "/Applications/Visual Studio Code.app" ' + data.path);
});