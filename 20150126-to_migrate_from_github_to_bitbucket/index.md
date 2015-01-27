# To Migrate from GitHub to BitBucket

[GitHub](https://github.com/) has great design and unlimited collaborators but no free private repos. [BitBucket](https://bitbucket.org/) has unlimited free private repos but a limit of five collaborators on them. Assuming you want your repos private so that very few people have access to them, BitBucket is perfect.

BitBucket makes migrating from GitHub ridiculously easy. They have a [one-click integration](https://blog.bitbucket.org/2013/04/02/finnovation-brings-you-a-heap-of-new-features/) and everything. But it's harder to migrate issues.

Joe Workman [made](http://joeworkman.tumblr.com/post/40133335482/migrating-from-github-to-bitbucket) [git2bit](http://www.bytebucket.org/joeworkman/git2bit), which magically puts issues from a GitHub repository into a BitBucket repository. The systems aren't exactly the same, but it makes mostly intelligent choices for how to convert.

You already have Ruby installed, so it should be this easy to install `git2bit`:

```bash
gem install git2bit
```

Alas, `git2bit` depends on both [bitbucket_rest_api](https://rubygems.org/gems/bitbucket_rest_api) and [github_api](https://rubygems.org/gems/github_api), taking their most recent versions by default, and these two gems now require conflicting versions of [hashie](https://rubygems.org/gems/hashie).

This is what I did:

```bash
gem install hashie -v 2.0.5
gem install github_api -v 0.11.3
gem install bitbucket_rest_api -v 0.1.5
gem install git2bit -v 1.0.2
```

At last! Use `git2bit --help` to see the fairly clear options.

It seems the default is to migrate only open issues, but if you use the `--closed` flag it will migrate both open and closed issues, which is what I wanted. Be aware that there's no checking for duplication, so if you run `git2bit` twice you will get double the issues on the BitBucket side. It's easy to make an empty repo to test that things are working as intended.

Other minutiae:

If you want to have a different identity for some repos (the ones on BitBucket, say) this is easy to set on a per-repo basis. These commands will alter a repo's `.git/config`:

```bash
git config user.name "Your Name Here"
git config user.email your@email.com
```

On BitBucket you'll want to [Add an SSH key to an account](https://confluence.atlassian.com/display/BITBUCKET/Add+an+SSH+key+to+an+account) and [Use the SSH protocol with Bitbucket](https://confluence.atlassian.com/display/BITBUCKET/Use+the+SSH+protocol+with+Bitbucket).

To point a current local repo up to BitBucket:

```bash
git remote remove origin
git remote add origin git@bitbucket.org:accountname/reponame.git
```

And if you didn't use the one-click migration but are instead doing your initial push to BitBucket from your local repo:

```bash
git push -u origin --all
git push -u origin --tags
```

That's just copied from BitBucket's directions when you create a new repo, which I like for being more complete than GitHub's.
