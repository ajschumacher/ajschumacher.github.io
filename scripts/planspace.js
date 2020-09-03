var pathName = window.location.pathname;
var dirName = pathName.substring(0, pathName.lastIndexOf('/')+1);
var edit_link = document.getElementById('edit_link');
if (pathName.endsWith('.html')) {
    var fileName = pathName.substring(pathName.lastIndexOf('/') + 1,
                                      pathName.lastIndexOf('.')) + '.md';
} else {
    var fileName = 'index.md';
}
if (edit_link) {
    edit_link.setAttribute('href','https://github.com/ajschumacher/ajschumacher.github.io/edit/master' + dirName + fileName);
}

if (pathName === "/") {
    back_link = document.getElementById('back_link');
    if (back_link) { back_link.parentNode.removeChild(back_link); }
    back_link2 = document.getElementById('back_link2');
    if (back_link2) { back_link2.outerHTML = 'This site'; }
}

if (pathName === "/aaron/") {
    aaron_link = document.getElementById('aaron_link');
    if (aaron_link) { aaron_link.outerHTML = 'Aaron'; }
    aaron_link2 = document.getElementById('aaron_link2');
    if (aaron_link2) { aaron_link2.outerHTML = 'me'; }
}

function send_email(event) {
    event.preventDefault();
    var data = new FormData(event.target);
    if (data.get("email") === "") {
        alert("Please enter your email address before submitting.");
        return;
    }
    data.set("path", pathName);
    var url = "https://formsubmit.co/ajax/ajschumacher@gmail.com";
    var request = new XMLHttpRequest();
    request.open('POST', url, true);
    request.onload = function() {
        alert("Email address received! Thanks!");
    };
    request.onerror = function() {
        alert("Sorry; something's not working. Let me know via " +
              "email to ajschumacher@gmail, if you like! Thanks!");
    };
    request.send(data);
}
var forms = document.getElementsByClassName("email_updates");
for (var i = 0; i < forms.length; i++) {
    forms[i].addEventListener("submit", send_email);
}
