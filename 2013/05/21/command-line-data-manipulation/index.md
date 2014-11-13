# Command-Line Data Manipulation

You can do quite a lot at the command line, even without `sed`, `awk`, or scripts. This vignette will explore some typical preliminary data tasks - many of which might often be done in an environment such as `R` - without leaving the shell prompt.

Prerequisites: You should know what `ls` is.

Commands used here: `export`, `cat`, `wc`, `time`, `head`, `tail`, `diff`, `mv`, `rm`, `man`, `tr`, `cut`, `sort`, `uniq`, `grep`, `echo`, `bc`, `paste`, `join`.

Begin!

Copy these two starting data sets into files called `data1.txt` and `data2.txt` in your working directory so that you can display them as follows with `cat` (con`cat`enate). Commands are shown after the prompt '`$ `'. (Use `export PS1='$ '` to make your terminal look just like this.)

```html
$ cat data1.txt
type,name,owner,legs,age
human,Bob,,,42
pet,Basil,Bob,4,
human,Charles,,,27
human,Aaron,,,30

$ cat data2.txt
type,name,owner,legs,age
pet,Billy,Bob,4,
pet,Arty,aaron,4,
pet,Chuck,Charles,2,
```

Our data will always be text. The command `wc` (word count) is super useful for checking out text files.

```html
$ wc *
       5       5      93 data1.txt
       4       4      81 data2.txt
       9       9     174 total
```

The first column is the number of lines. Really this just counts newline ('`\n`') characters. If your results don't match here, you're probably missing the final newline characters in the files. Always include those final newlines! (In an editor it will just look like a blank line at the bottom of the file.) To just get the number of lines, you can use `wc -l`.

The second column is the number of words. There aren't any spacing characters in the files, aside from the newlines, so right now every line is one 'word'. Word counts come from `wc -w` as you'd expect.

The third column is the number of characters, of any type, whether they print or not. You can get this count with `wc -c`.

An occasionally interesting thing when working with largish files is to see how long it takes your machine to read through a file, using the `time` command.

```html
$ time wc data1.txt
       5       5      93 data1.txt

real    0m0.005s
user    0m0.001s
sys     0m0.003s
```

With tiny files like this we can do whatever we please. If it took 20 minutes to go through the file, we might think more carefully about techniques to apply.

The commands `head` and `tail` show the top and bottom of files, respectively. They take an argument `-n X` where `X` is the number of lines to display, which (on Macs) can be shortened to `-X`. So we can write the headers from these files into new files like this:

```html
$ head -1 data1.txt &gt; header1.txt
$ head -1 data2.txt &gt; header2.txt
```

The `diff` command is useful for comparing things.

```html
$ diff header1.txt header2.txt
$
```

The lack of output here tells us that the two files are identical. We could have used `diff` on the original files:

```html
$ diff data1.txt data2.txt
2,5c2,4
&lt; human,Bob,,,42
&lt; pet,Basil,Bob,4,
&lt; human,Charles,,,27
&lt; human,Aaron,,,30
---
&gt; pet,Billy,Bob,4,
&gt; pet,Arty,aaron,4,
&gt; pet,Chuck,Charles,2,
```

This output shows that the first lines are identical, with lines 2-5 of the first file differing from lines 2-4 of the second file. Since they header rows are the same, we only need one copy.

```html
$ mv header1.txt header.txt
$ rm header2.txt
```

There's a handy way to get every line but the first:

```html
$ tail -n +2 data*
==&gt; data1.txt &lt;==
human,Bob,,,42
pet,Basil,Bob,4,
human,Charles,,,27
human,Aaron,,,30

==&gt; data2.txt &lt;==
pet,Billy,Bob,4,
pet,Arty,aaron,4,
pet,Chuck,Charles,2,
```

Again, the `-n` can be dropped on Macs. Check the help for `tail` to see how to sups those per-file headers.

```html
$ man tail
```

(Press `q` to get out of the manual.)

Now, let's combine our two files together, with just one header row.

```html
$ cat header.txt &gt; data.txt
$ tail +2 -q data[12].txt &gt;&gt; data.txt
$ wc data.txt
       8       8     149 data.txt
```

Of note: '`&gt;`' redirects standard output to a file, wiping out anything that was there before, while '`&gt;&gt;`' appends to a file if there's already one there. Also, `data[12].txt` behaves similarly to a regular expression, expanding to `data1.txt` and `data2.txt` but not `data.txt`, which is what we wanted. So now all the data is together in `data.txt`.

```html
$ cat data.txt
type,name,owner,legs,age
human,Bob,,,42
pet,Basil,Bob,4,
human,Charles,,,27
human,Aaron,,,30
pet,Billy,Bob,4,
pet,Arty,aaron,4,
pet,Chuck,Charles,2,
```

It's a little annoying to read comma-separated values (CSV), sometimes easier to read tab-separated values (TSV). We can pipe to the command `tr` (translate) to aid readability.

```html
$ cat data.txt | tr ',' '\t'
type	name	owner	legs	age
human	Bob			42
pet	Basil	Bob	4
human	Charles			27
human	Aaron			30
pet	Billy	Bob	4
pet	Arty	aaron	4
pet	Chuck	Charles	2
```

Note also that once we do this, `wc` will be able to count words in a more meaningful fashion.

```html
$ cat data.txt | tr ',' '\t' | wc
       8      30     149
```

Sometimes it can be worth thinking about missing values - in this case we have (possibly) an eight-by-five table with only 30 "words" in it. Of course we're also relying on the file being "nice enough" to be processed without worrying about, for example, commas and spaces within entries. Data will certainly not always be nice enough.

The `cut` command is useful. For example, `cut -c 1-80` will show just the first 80 characters of each line in a file with really long lines. We can also 'cut' by delimiters, which is what we'll do here. The default delimiter is tab, but we can specify commas and then get out the column of names - the second 'field'.

```html
$ cut -d , -f 2 data.txt
name
Bob
Basil
Charles
Aaron
Billy
Arty
Chuck
```

Combining something old with something new, we can get a sorted list of just the name values:

```html
$ tail +2 data.txt | cut -d , -f 2 | sort
Aaron
Arty
Basil
Billy
Bob
Charles
Chuck
```

Adding one more command, with field three (owners) we see only unique values:

```html
$ tail +2 data.txt | cut -d , -f 3 | sort | uniq

Bob
Charles
aaron
```

Note that the empty string (the blank) counts as a value. Note also that `uniq` will not perform as its name suggests if its input is not sorted. It only removes duplicates that are adjacent lines. Finally, note that the alphabetization is not necessarily what you'd expect, but makes sense in its way. (Capital and lower-case letters will sort separately, and numbers will sort by first digits, with '19' coming before '3' unless you add the `-n` flag.)

Let's lose the header row and split to a table of humans and a table of pets. We're very lucky that we can use these terms to `grep` for lines. Take the command apart if you aren't sure what `grep` is doing here.

```html
$ grep human data.txt | cut -d , -f 2- &gt; human.txt
$ grep pet data.txt | cut -d , -f 2- &gt; pet.txt
```

There is a command-line math engine, `bc`, which is very handy. It takes a string representing some mathematics, and does the calculation for you. The syntax is usually what you'd expect, though you do have to write the natural log as just '`l()`' and turn on such functionality as logs and floating-point arithmetic with '`-l`'.

```html
$ echo '2+3' | bc
5
$ echo 'l(2+3)' | bc -l
1.60943791243410037460
```

There's also an interactive mode; you probably want to start it as `bc -il`.

Using the `paste` command, we can generate a mathematical expression from a data file and pass it to `bc`. This adds up the total number of pet legs:

```html
$ cut -d , -f 3 pet.txt
4
4
4
2
$ cut -d , -f 3 pet.txt | paste -sd '+' -
4+4+4+2
$ cut -d , -f 3 pet.txt | paste -sd '+' - | bc
14
```

With `-s`, `paste` combines multiple lines onto one. Without `-s`, it combines corresponding lines from multiple files. This is like using `cbind` in R, combining columns together. We already saw that we have mis-matching capitalization, with '`Aaron`' vs. '`aaron`'. Let's add a fully capitalized owner name column to both tables.

```html
$ cut -d , -f 1 human.txt | tr [a-z] [A-Z] | paste -d , - human.txt | sort &gt; Hhuman.txt
$ cut -d , -f 2 pet.txt | tr [a-z] [A-Z] | paste -d , - pet.txt | sort &gt; Ppet.txt
```

Interesting! I've just <a href="http://apple.stackexchange.com/questions/22297/is-bash-in-osx-case-insensitive">discovered</a> that HFS+ (the Mac file system) will not let you have different files called `human.txt` and `Human.txt`, hence the new filenames have double their initial letters. You learn something new every day.

Finally, we're going to do an inner join to combine owners and pets together on the appropriate lines. Like in SAS, it's important at the command line that the data is sorted by the column to merge on, which is the first column by default. (You can have fun keeping track of big-O complexity at every step!) Confusingly, here `-t` is used to specify the delimiter instead of `-d`. We'll finish with some cleaning and labeling, for a nice final data set.

```html
$ join -t, Ppet.txt Hhuman.txt &gt; raw_join.txt
$ echo 'pet_name,owner_name,pet_legs,owner_age' &gt; final.txt
$ cut -d , -f 3,9,2,4 raw_join.txt &gt;&gt; final.txt
$ cat final.txt
pet_name,owner_name,pet_legs,owner_age
Arty,aaron,4,30
Basil,Bob,4,42
Billy,Bob,4,42
Chuck,Charles,2,27
```

(Using `cut` we don't have immediate control over the column ordering.)

There is certainly much more that can be done at the command line. Especially if you install one of the cute command-line data visualization projects, you can get a very large share of "statistical" functionality in the traditional unix style of small, focused tools. On the other hand, it can be very nice to step up to more comfortable environments such as R or Python.


*This post was originally hosted [elsewhere](https://planspacedotorg.wordpress.com/2013/05/21/command-line-data-manipulation/).*
