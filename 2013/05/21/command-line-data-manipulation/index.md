# Command-Line Data Manipulation



You can do quite a lot at the command line, even without <code>sed</code>, <code>awk</code>, or scripts. This vignette will explore some typical preliminary data tasks - many of which might often be done in an environment such as R - without leaving the shell prompt.

Prerequisites: You should know what <code>ls</code> is.

Commands used here: <code>export</code>, <code>cat</code>, <code>wc</code>, <code>time</code>, <code>head</code>, <code>tail</code>, <code>diff</code>, <code>mv</code>, <code>rm</code>, <code>man</code>, <code>tr</code>, <code>cut</code>, <code>sort</code>, <code>uniq</code>, <code>grep</code>, <code>echo</code>, <code>bc</code>, <code>paste</code>, <code>join</code>.

Begin!

Copy these two starting data sets into files called <code>data1.txt</code> and <code>data2.txt</code> in your working directory so that you can display them as follows with <code>cat</code> (con<code>cat</code>enate). Commands are shown after the prompt '<code>$ </code>'. (Use&#160;<code>export PS1='$ '</code> to make your terminal look just like this.)

<pre>$ cat data1.txt 

type,name,owner,legs,age

human,Bob,,,42

pet,Basil,Bob,4,

human,Charles,,,27

human,Aaron,,,30

$ cat data2.txt

type,name,owner,legs,age

pet,Billy,Bob,4,

pet,Arty,aaron,4,

pet,Chuck,Charles,2,</pre>

Our data will always be text. The command <code>wc</code> (word count) is super useful for checking out text files.

<pre>$ wc *

       5       5      93 data1.txt

       4       4      81 data2.txt

       9       9     174 total</pre>

The first column is the number of lines. Really this just counts newline ('<code>\n</code>') characters. If your results don't match here, you're probably missing the final newline characters in the files. Always include those final newlines! (In an editor it will just look like a blank line at the bottom of the file.) To just get the number of lines, you can use <code>wc -l</code>.

The second column is the number of words. There aren't any spacing characters in the files, aside from the newlines, so right now every line is one 'word'. Word counts come from <code>wc -w</code> as you'd expect.

The third column is the number of characters, of any type, whether they print or not. You can get this count with <code>wc -c</code>.

An occasionally interesting thing when working with largish files is to see how long it takes your machine to read through a file, using the <code>time</code> command.

<pre>$ time wc data1.txt 

       5       5      93 data1.txt

real	0m0.005s

user	0m0.001s

sys	0m0.003s</pre>

With tiny files like this we can do whatever we please. If it took 20 minutes to go through the file, we might think more carefully about techniques to apply.

The commands <code>head</code> and <code>tail</code> show the top and bottom of files, respectively. They take an argument <code>-n X</code> where <code>X</code> is the number of lines to display, which (on Macs) can be shortened to <code>-X</code>. So we can write the headers from these files into new files like this:

<pre>$ head -1 data1.txt &gt; header1.txt

$ head -1 data2.txt &gt; header2.txt</pre>

The <code>diff</code> command is useful for comparing things.

<pre>$ diff header1.txt header2.txt

$</pre>

The lack of output here tells us that the two files are identical. We could have used <code>diff</code> on the original files:

<pre>$ diff data1.txt data2.txt 

2,5c2,4

&lt; human,Bob,,,42

&lt; pet,Basil,Bob,4,

&lt; human,Charles,,,27

&lt; human,Aaron,,,30

---

&gt; pet,Billy,Bob,4,

&gt; pet,Arty,aaron,4,

&gt; pet,Chuck,Charles,2,</pre>

This output shows that the first lines are identical, with lines 2-5 of the first file differing from lines 2-4 of the second file. Since they header rows are the same, we only need one copy.

<pre>$ mv header1.txt header.txt

$ rm header2.txt</pre>

There's a handy way to get every line but the first:

<pre>$ tail -n +2 data*

==&gt; data1.txt &lt;==

human,Bob,,,42

pet,Basil,Bob,4,

human,Charles,,,27

human,Aaron,,,30

==&gt; data2.txt &lt;==

pet,Billy,Bob,4,

pet,Arty,aaron,4,

pet,Chuck,Charles,2,</pre>

Again, the <code>-n</code> can be dropped on Macs. Check the help for <code>tail</code> to see how to suppress those per-file headers.

<pre>$ man tail</pre>

(Press <code>q</code> to get out of the manual.)

Now, let's combine our two files together, with just one header row.

<pre>$ cat header.txt &gt; data.txt

$ tail +2 -q data[12].txt &gt;&gt; data.txt

$ wc data.txt 

       8       8     149 data.txt</pre>

Of note: '<code>&gt;</code>' redirects standard output to a file, wiping out anything that was there before, while '<code>&gt;&gt;</code>' appends to a file if there's already one there. Also, <code>data[12].txt</code> behaves similarly to a regular expression, expanding to <code>data1.txt</code> and <code>data2.txt</code> but not <code>data.txt</code>, which is what we wanted. So now all the data is together in <code>data.txt</code>.

<pre>$ cat data.txt 

type,name,owner,legs,age

human,Bob,,,42

pet,Basil,Bob,4,

human,Charles,,,27

human,Aaron,,,30

pet,Billy,Bob,4,

pet,Arty,aaron,4,

pet,Chuck,Charles,2,</pre>

It's a little annoying to read comma-separated values (CSV), sometimes easier to read tab-separated values (TSV). We can pipe to the command <code>tr</code> (translate) to aid readability.

<pre>$ cat data.txt | tr ',' '\t'

type	name	owner	legs	age

human	Bob			42

pet	Basil	Bob	4	

human	Charles			27

human	Aaron			30

pet	Billy	Bob	4	

pet	Arty	aaron	4	

pet	Chuck	Charles	2</pre>

Note also that once we do this, <code>wc</code> will be able to count words in a more meaningful fashion.

<pre>$ cat data.txt | tr ',' '\t' | wc

       8      30     149</pre>

Sometimes it can be worth thinking about missing values - in this case we have (possibly) an eight-by-five table with only 30 "words" in it. Of course we're also relying on the file being "nice enough" to be processed without worrying about, for example, commas and spaces within entries. Data will certainly not always be nice enough.

The <code>cut</code> command is useful. For example, <code>cut -c 1-80</code> will show just the first 80 characters of each line in a file with really long lines. We can also 'cut' by delimiters, which is what we'll do here. The default delimiter is tab, but we can specify commas and then get out the column of names - the second 'field'.

<pre>$ cut -d , -f 2 data.txt 

name

Bob

Basil

Charles

Aaron

Billy

Arty

Chuck</pre>

Combining something old with something new, we can get a sorted list of just the name values:

<pre>$ tail +2 data.txt | cut -d , -f 2 | sort

Aaron

Arty

Basil

Billy

Bob

Charles

Chuck</pre>

Adding one more command, with field three (owners) we see only unique values:

<pre>$ tail +2 data.txt | cut -d , -f 3 | sort | uniq

Bob

Charles

aaron</pre>

Note that the empty string (the blank) counts as a value. Note also that <code>uniq</code> will not perform as its name suggests if its input is not sorted. It only removes duplicates that are adjacent lines. Finally, note that the alphabetization is not necessarily what you'd expect, but makes sense in its way. (Capital and lower-case letters will sort separately, and numbers will sort by first digits, with '19' coming before '3' unless you add the <code>-n</code> flag.)

Let's lose the header row and split to a table of humans and a table of pets. We're very lucky that we can use these terms to <code>grep</code> for lines. Take the command apart if you aren't sure what <code>grep</code> is doing here.

<pre>$ grep human data.txt | cut -d , -f 2- &gt; human.txt

$ grep pet data.txt | cut -d , -f 2- &gt; pet.txt</pre>

There is a command-line math engine, <code>bc</code>, which is very handy. It takes a string representing some mathematics, and does the calculation for you. The syntax is usually what you'd expect, though you do have to write the natural log as just '<code>l()</code>' and turn on such functionality as logs and floating-point arithmetic with '<code>-l</code>'.

<pre>$ echo '2+3' | bc

5

$ echo 'l(2+3)' | bc -l

1.60943791243410037460</pre>

There's also an interactive mode; you probably want to start it as <code>bc -il</code>.

Using the <code>paste</code> command, we can generate a mathematical expression from a data file and pass it to <code>bc</code>. This adds up the total number of pet legs:

<pre>$ cut -d , -f 3 pet.txt

4

4

4

2

$ cut -d , -f 3 pet.txt | paste -sd '+' -

4+4+4+2

$ cut -d , -f 3 pet.txt | paste -sd '+' - | bc

14</pre>

With <code>-s</code>, <code>paste</code> combines multiple lines onto one. Without <code>-s</code>, it combines corresponding lines from multiple files. This is like using <code>cbind</code> in R, combining columns together. We already saw that we have mis-matching capitalization, with '<code>Aaron</code>' vs. '<code>aaron</code>'. Let's add a fully capitalized owner name column to both tables.

<pre>$ cut -d , -f 1 human.txt | tr [a-z] [A-Z] | paste -d , - human.txt | sort &gt; Hhuman.txt

$ cut -d , -f 2 pet.txt | tr [a-z] [A-Z] | paste -d , - pet.txt | sort &gt; Ppet.txt</pre>

Interesting! I've just <a href="http://apple.stackexchange.com/questions/22297/is-bash-in-osx-case-insensitive">discovered</a> that HFS+ (the Mac file system) will not let you have different files called <code>human.txt</code> and <code>Human.txt</code>, hence the new filenames have double their initial letters. You learn something new every day.

Finally, we're going to do an inner join to combine owners and pets together on the appropriate lines. Like in SAS, it's important at the command line that the data is sorted by the column to merge on, which is the first column by default. (You can have fun keeping track of big-O complexity at every step!) Confusingly, here <code>-t</code> is used to specify the delimiter instead of <code>-d</code>. We'll finish with some cleaning and labeling, for a nice final data set.

<pre>$ join -t, Ppet.txt Hhuman.txt &gt; raw_join.txt

$ echo 'pet_name,owner_name,pet_legs,owner_age' &gt; final.txt

$ cut -d , -f 3,9,2,4 raw_join.txt &gt;&gt; final.txt 

$ cat final.txt 

pet_name,owner_name,pet_legs,owner_age

Arty,aaron,4,30

Basil,Bob,4,42

Billy,Bob,4,42

Chuck,Charles,2,27</pre>

(Using <code>cut</code> we don't have immediate control over the column ordering.)

There is certainly much more that can be done at the command line. Especially if you install one of the cute command-line data visualization projects, you can get a very large share of "statistical" functionality in the traditional unix style of small, focused tools. On the other hand, it can be very nice to step up to more comfortable environments such as R or Python.



*This post was originally hosted elsewhere.*
