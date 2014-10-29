# Excel Two Thousand and Wat



There's no perfect tool. Things get done well when you know your tools inside and out. Because I enjoy complaining about Excel, and because I enjoy&#160;<a href="https://www.destroyallsoftware.com/talks/wat">Gary Bernhardt's "wat" talk</a> about typically unexpected behaviors in JavaScript and Ruby, I offer here "Excel Two Thousand and Wat", combining some personal pet peeves and a few other <a href="http://spreadsheetpage.com/index.php/oddities">Excel oddities</a>. (I'm using Excel 2011 for Mac; your mileage may vary.)

Let's talk about Excel.

Say we have a nice UTF-8 CSV file:

<pre>$ wc test.csv

       8       8      56 test.csv

$ cat test.csv

id,value

001,1

010,2

01a,3

100,4

101,&#54616;&#54616;

110,5

111,6

$ file test.csv

test.csv: UTF-8 Unicode text</pre>

It has eight lines: a header and seven rows of data. It has two columns: an ID column and a value column. The IDs are all three characters long. The values have some unicode: Korean characters for "ha ha". So of course Excel will have no problem opening this.

<a href="screen-shot-2013-12-31-at-12-17-50-pm.png"><img class="aligncenter size-large wp-image-649" alt="excel window" src="screen-shot-2013-12-31-at-12-17-50-pm.png"></a>

<a href="http://www.titaniumteddybear.net/wp-content/uploads/2010/05/wat-baby.jpg">wat</a>

Excel has kindly munched the leading zeros from our ID column. Why would we want the data that was in the file we opened, after all? And of course, it is totally appropriate for modern software to not understand UTF-8 encoded text.

Well, we can fix this! We can type the Korean into Excel by hand.

<a href="screen-shot-2013-12-31-at-12-24-07-pm.png"><img class="aligncenter size-large wp-image-650" alt="excel window" src="screen-shot-2013-12-31-at-12-24-07-pm.png"></a>

And we can fix the chomped IDs by typing them in with a leading apostrophe. Obviously.

<a href="screen-shot-2013-12-31-at-12-25-44-pm.png"><img class="aligncenter size-large wp-image-651" alt="excel window" src="screen-shot-2013-12-31-at-12-25-44-pm.png"></a>

Excel is so helpful, second-guessing the data type of every cell. This is a great feature! For example, Excel will render "<code>3+5</code>" as "3+5" but show "<code>=3+5</code>" as "8" - it uses that equal sign to know if it's supposed to evaluate an equation. Great! So something like "++++3", which is obviously not an equation, will be fine!

<a href="screen-shot-2013-12-31-at-12-30-40-pm.png"><img class="aligncenter size-large wp-image-652" alt="excel window" src="screen-shot-2013-12-31-at-12-30-40-pm.png"></a>

<a href="http://mybroadband.co.za/vb/attachment.php?attachmentid=71940&amp;d=1379691163">wat</a>

Excel took the entry of "++++3" and then: a) turned it into an equation, and b) ate one of the pluses. If you re-evaluate the cell (with Ctrl-u, Ctrl-Enter, for instance) Excel will keep eating pluses.

But enough confusion! Let's talk about Excel.

Since we've fixed the errors introduced by Excel, let's go ahead and save as a new CSV file, <code>tested.csv</code>. Nothing will have changed, of course, with the worksheet that we still have open.

<a href="screen-shot-2013-12-31-at-12-40-13-pm.png"><img class="aligncenter size-large wp-image-654" alt="excel window" src="screen-shot-2013-12-31-at-12-40-13-pm.png"></a>

Oh good - the Korean we typed in still appears in the sheet, but in the formula bar now it's two empty boxes.

<a href="http://img.pandawhale.com/42365-Wat-pigeon-jvWm.jpeg">wat</a>

Things will look fine in the file though, certainly.

<pre>$ wc tested.csv 

       0       8      51 tested.csv

$ cat tested.csv 

111,6$ e</pre>

Now our CSV has zero lines, and confuses the heck out of bash. Good. What if we re-open the file in Excel?

<a href="screen-shot-2013-12-31-at-12-48-59-pm.png"><img class="aligncenter size-large wp-image-655" alt="excel window" src="screen-shot-2013-12-31-at-12-48-59-pm.png"></a>

The leading zeros we took pains to put back in are cleaned out again, and the Korean has been helpfully simplified to two underscores.

But enough about failures to get the basics right. Let's talk about Excel.

Excel famously does a great job of handling missing values. If you type in "TRUE" it's the boolean truth value, and "FALSE" is false. We can check with an "if" statement in an equation. What should an empty cell be?

<a href="screen-shot-2013-12-31-at-12-53-15-pm.png"><img class="aligncenter size-large wp-image-656" alt="excel window" src="screen-shot-2013-12-31-at-12-53-15-pm.png"></a>

An empty cell is false, naturally. We can check it with "and" in an equation as well. "True and false" is false, as we all know.

<a href="screen-shot-2013-12-31-at-12-56-23-pm.png"><img class="aligncenter size-large wp-image-657" alt="excel window" src="screen-shot-2013-12-31-at-12-56-23-pm.png"></a>

Ah - "True and blank" is true, so... blank is also true. Got it?

<a href="http://i2.kym-cdn.com/photos/images/newsfeed/000/588/695/e16.jpg">wat</a>

That's enough! (Of course there are also my gripes with how Excel's <a href="http://planspace.blogspot.com/2012/03/excel-2007-percentrank-is-trash.html">PERCENTRANK</a> works.) Have fun, and use your tools well!



*This post was originally hosted elsewhere.*
