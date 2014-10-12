var pathName = window.location.pathname;
var dirName = pathName.substring(0, pathName.lastIndexOf('/')+1);
var editLink = document.getElementById('edit');
editLink.setAttribute('href', 'https://github.com/ajschumacher/ajschumacher.github.io/tree/master' + dirName)
