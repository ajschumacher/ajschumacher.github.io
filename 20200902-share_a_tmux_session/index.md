# Share a tmux session

Multiple people can connect to the same [tmux][] session, with all
participants able to control the session. Combined with a voice
connection (phone, etc.) this can be used for remote pair programming
in an editor like [Emacs][], for example.

[tmux]: https://github.com/tmux/tmux/wiki
[Emacs]: https://www.gnu.org/software/emacs/

```bash
# originating:
tmux -S /tmp/party_socket new -s party_session
chgrp shared_group /tmp/party_socket
# joining:
tmux -S /tmp/party_socket attach -t party_session
```


---

All participants need to be logged in to the same machine, likely
using [ssh][]. If everyone's logged in as the same user, you're
already done: just make a session and have everyone join it. If people
have separate user accounts, you need to think about sockets.

[ssh]: https://www.ssh.com/ssh/

tmux uses a [socket][] for communication. Joining will require access
to that socket.

[socket]: https://en.wikipedia.org/wiki/Unix_domain_socket

```bash
tmux -S /tmp/party_socket new -s party_session
```

That line names the socket and the session explicitly, which is
convenient. In an existing tmux session, you can find your current
socket with "`echo $TMUX`", and you can check your session name with
"`tmux display-message -p '#S'`".

Let's grant access at the [group][] level, assuming everyone is in a
group called `shared_group`. You can check using [groups][] and use an
existing shared group (`user` is common) which is convenient but will
allow anyone in that group to join. Or you could create a new group
for the purpose and add only the intended participants.

[group]: https://en.wikipedia.org/wiki/Group_identifier
[groups]: https://www.gnu.org/software/coreutils/manual/html_node/groups-invocation.html#groups-invocation

```bash
chgrp shared_group /tmp/party_socket
```

Now the group has access to the socket, and can join the tmux session.

```bash
tmux -S /tmp/party_socket attach -t party_session
```

If people don't need to control the session, they can add "`-r`" to
that line to join read-only.

This is a simple way to check who's connected to the session:

```bash
ps -eo user:16,cmd | grep party_session
```

That could be made fancier (as in [wemux][], for example) but should
generally do the job.

[wemux]: https://github.com/zolrath/wemux


---

Thanks to [HowtoForge][], from which I adapted the core of this.

[HowtoForge]: https://www.howtoforge.com/sharing-terminal-sessions-with-tmux-and-screen
