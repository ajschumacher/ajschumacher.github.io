var pathName = window.location.pathname;
var dirName = pathName.substring(0, pathName.lastIndexOf('/')+1);
var edit_link = document.getElementById('edit_link');
if (pathName.endsWith('.html')) {
    var fileName = pathName.substring(pathName.lastIndexOf('/') + 1,
                                      pathName.lastIndexOf('.')) + '.md';
} else {
    var fileName = 'index.md';
}
edit_link.setAttribute('href','https://github.com/ajschumacher/ajschumacher.github.io/edit/master' + dirName + fileName);

if (pathName === "/") {
    back_link = document.getElementById('back_link');
    back_link.parentNode.removeChild(back_link);
}

if (pathName === "/aaron/") {
    aaron_link = document.getElementById('aaron_link');
    aaron_link.outerHTML = 'Aaron';
}
