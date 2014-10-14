# plan <span class="shake shake-slow">➔</span> space

I'm setting up a new blog.

text
[unvisited link](http://nothing.com)
more text
[visited link](http://slashdot.org)
yet more text

In Schlitz typewriter eiusmod quis kitsch, Pitchfork Kickstarter
flexitarian. Consectetur chia Portland, sartorial literally fanny pack
single-origin coffee ethical selfies id adipisicing Banksy
Intelligentsia cardigan. Tilde adipisicing blog lo-fi, nostrud veniam
Tumblr qui you probably haven't heard of them officia elit. Magna
street art organic, banh mi High Life paleo laborum swag. Elit yr DIY,
sartorial American Apparel aliquip et direct trade before they sold
out vero voluptate normcore viral. Readymade pork belly drinking
vinegar, consequat duis deserunt tempor heirloom sartorial skateboard
kale chips ex keytar chia. Ut organic selfies raw denim cardigan sint.

```python
def retries_on_exceptions(fail_delay=72, max_errors=12):
    def decorator(func):
        @functools.wraps(func)
        def newfunc(*args, **kwargs):
            error_count = 0
            while True:
                try:
                    return func(*args, **kwargs)
                except:
                    error_count += 1
                    if error_count == max_errors:
                        raise
                    else:
                        time.sleep(fail_delay)
        return newfunc
    return decorator
```
