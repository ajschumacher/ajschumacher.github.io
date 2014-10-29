# A shared playground on Ubuntu



After <a href="http://planspace.org/2014/01/25/easy-aws-ec2-ubuntu-quick-start/">setting up a machine</a>, I'd like to set up a bunch of users who can log in and give them a common space in which to do some work. The goal is convenience for demonstration and education.

Assume usernames are in a file called&#160;<code>names.txt</code>, one per line. This will create users with those names, put them in the <code>users</code> group, and make their passwords "<code>none</code>". As root:

<pre>cat names.txt | while read line
 do
  adduser --gecos "" --disabled-password $line
  adduser $line users
  echo $line:none | chpasswd
 done</pre>
Now those users should really log in and change their passwords with <code>passwd</code>. Up next, we make a <code>shared</code> directory that everybody has access to.
<pre>mkdir /home/shared
chgrp users /home/shared
chmod g+w /home/shared
chmod g+s /home/shared</pre>
That makes the directory, sets the group to <code>users</code>, gives group members write access, and sets the "sticky" bit so that files created in the directory will have the <code>users</code> group.



*This post was originally hosted elsewhere.*
