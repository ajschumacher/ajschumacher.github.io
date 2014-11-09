# Set up git/hub on Ubuntu



This is an abbreviated version of the official help (e.g., <a href="https://help.github.com/articles/generating-ssh-keys">github's</a>) that will work on Ubuntu.

Git will want to know who you are. It'll tell you to do this if you try to commit and haven't, so just go ahead and do it:

<pre>git config --global user.email "you@example.com"
git config --global user.name "Your Name"</pre>
To easily work with github, you need to have a key and put the public one into github so it knows you.
<pre>ssh-keygen -t rsa -C "you@example.com"
cat ~/.ssh/id_rsa.pub</pre>
Copy the output from that last command and then paste it as a new key in the <a href="https://github.com/settings/ssh">github SSH settings section</a>. You should be good to go!



*This post was originally hosted [elsewhere](https://planspacedotorg.wordpress.com/2014/02/16/set-up-github-on-ubuntu/).*
