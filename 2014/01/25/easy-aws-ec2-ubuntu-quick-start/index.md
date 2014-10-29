# Easy AWS EC2 Ubuntu Quick Start



These are my notes on quickly setting up an Ubuntu Linux instance on Amazon EC2, in this case specifically to create a short-term collaborative shared environment. This has become ridiculously easy, but things done only occasionally are quickly forgotten, so I'm recording them here.

You'll need to already have an Amazon account set up for AWS, which probably includes putting in some billing information. Go to your <a href="https://console.aws.amazon.com/">AWS Management Console</a>&#160;and click&#160;EC2 and then the big blue "Launch Instance" button. The quick start AMIs are probably fine; at the time of this writing I chose the free tier eligible Ubuntu Server 13.10 64-bit option.

There are some options to adjust or not. Micros are free. At least port 22 needs to be open for SSH. Storage can be tweaked or not. At some point you'll be asked to choose or create a key pair. On a Mac it'll likely be easy to save the <code>something.pem</code> file to <code>~/Downloads/</code>.

<pre># Optionally first move the key to a natural place, e.g.,

mv ~/Downloads/something.pem ~/.ssh/

# Make the key file "safer" to satisfy ssh

chmod 400 ~/.ssh/something.pem</pre>

By now your instance should be running and you can find its IP address in the Running Instances section of the AWS Management Console for EC2. You could also set up an Elastic IP address through the EC2 Management Console at this time. It's nice to add a line to your <code>/etc/hosts</code> file like <code>myEC2box EC2.IP.ADD.RES</code>&#160;(tab separated) so you don't have to type the IP address all the time, but this can be skipped too. Now you can connect to the instance via SSH:

<pre>ssh -i ~/.ssh/something.pem ubuntu@myEC2box

# or

ssh -i ~/.ssh/something.pem ubuntu@EC2.IP.ADD.RES</pre>

Now you should be logged in to the remote machine. Subsequent steps would almost all require <code>sudo</code>, which is annoying, so let's live dangerously and get to business:

<pre>sudo su -                      # not generally recommended

apt-get update

apt-get install emacs24 git    # and/or whatever you want installed</pre>

And now we undermine the default security options a bit for convenience.

<pre>emacs /etc/ssh/sshd_config

# Edit so that it has "PasswordAuthentication yes"

reload ssh</pre>

Now we'll be able to ssh in without having key files all over the place. We can add some user accounts like this:

<pre>adduser --gecos "" aaron    # avoiding GECOS prompts

# At least one user should be a sudoer

adduser aaron sudo</pre>

At this point you should log out and log in as one of the new users with <code>sudo</code> privileges.

<pre># SSH in as one of the new users

ssh aaron@myEC2box

# Change password if desired:

passwd

# Delete the default account:

deluser ubuntu</pre>

Totally optional, but the Ubuntu MOTD is annoying:

<pre>rm /etc/update-motd.d/10-help-text /etc/update-motd.d/51-cloudguest

emacs /etc/update-motd.d/50-landscape-sysinfo

# Add "--exclude-sysinfo-plugins=LandscapeLink" to appropriate line</pre>

Within ten minutes the MOTD should be less annoying. The machine is ready for action! Make accounts for your friends and have an EC2 party!



*This post was originally hosted elsewhere.*
