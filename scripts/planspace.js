var pathName = window.location.pathname;
var dirName = pathName.substring(0, pathName.lastIndexOf('/')+1);
var edit_link = document.getElementById('edit_link');
edit_link.setAttribute('href','https://github.com/ajschumacher/ajschumacher.github.io/tree/master' + dirName);
if (pathName === "/") {
    back_link = document.getElementById('back_link')
    back_link.parentNode.removeChild(back_link)
}
var article = document.getElementsByTagName('article')[0];
var content_height = article.scrollHeight;
var view_height = window.innerHeight;
if (content_height <= view_height) {
    up_link = document.getElementById('up_link')
    up_link.parentNode.removeChild(up_link)
}