# Excel 2007 PERCENTRANK is trash.

<div>
<br>People and software do not always mean the same thing when they talk about&#160;percentiles, percent rank, and so on. Do not expect different software to give the same&#160;values. In particular, Excel uses a method that is probably not what you expect and&#160;does not correspond to methods implemented in&#160;scientific&#160;software.<br><br>For Excel 2007, in the case of getting a PERCENTRANK for a value that appears in the range, you will actually get (the number of items strictly less than the value) / (the total number of items minus one). This has the nice feature of (at least for distinct values) giving percent ranks that range from zero to one inclusive. It has the nasty feature of almost certainly not being what you thought it was going to be, and not being what you'll get from SAS, R, SPSS, <a href="http://docs.scipy.org/doc/scipy-0.7.x/reference/generated/scipy.stats.percentileofscore.html">SciPy</a>, etc. (It is, however, mimicked fairly well in other spreadsheet software.)<br><br>It isn't immediately obvious how Excel works out the PERCENTRANK for values that don't appear in the range. Some sort of interpolation, certainly - but not one that was easy for me to guess quickly. I'd love to know what the heck it is.<br><br>And it isn't just that Excel is non-standard - it also appears to be buggy. Here's one bizarre example I came across of Excel 2007 at work, in which PERCENTRANK is not stable when values are multiplied (or divided) by 100, sometimes giving the same percent rank for different values, sometimes giving different percent rank for the same values. Check out the rows in bold. You should be able to replicate this in Excel 2007 if you like (with nine digits of precision requested from PERCENTRANK).<br><br><br><table border="0" cellpadding="0" cellspacing="0"> <colgroup>
<col width="65"> <col width="110"> <col width="73"> <col width="110"> </colgroup>
<tbody>
<tr height="17">  <td height="17" width="65"><b>value</b></td>  <td width="110"><b>PERCENTRANK</b></td>  <td width="73"><b>value/100</b></td>  <td width="110"><b>PERCENTRANK</b></td> </tr>
<tr height="17">  <td align="right" height="17">96.775</td>  <td align="right">1</td>  <td align="right">0.96775</td>  <td align="right">1</td> </tr>
<tr height="17">  <td align="right" height="17">93.6625</td>  <td align="right">0.954545454</td>  <td align="right">0.936625</td>  <td align="right">0.954545454</td> </tr>
<tr height="17">  <td align="right" height="17">93.3</td>  <td align="right">0.909090909</td>  <td align="right">0.933</td>  <td align="right">0.909090909</td> </tr>
<tr height="17">  <td align="right" height="17">93.0125</td>  <td align="right">0.863636363</td>  <td align="right">0.930125</td>  <td align="right">0.863636363</td> </tr>
<tr height="17">  <td align="right" class="xl67" height="17"><b>92.7875</b></td>  <td align="right" class="xl67"><b>0.772727272</b></td>  <td align="right" class="xl67"><b>0.927875</b></td>  <td align="right" class="xl67"><b>0.818181818</b></td> </tr>
<tr height="17">  <td align="right" class="xl67" height="17"><b>92.7875</b></td>  <td align="right" class="xl67"><b>0.772727272</b></td>  <td align="right" class="xl67"><b>0.927875</b></td>  <td align="right" class="xl67"><b>0.772727272</b></td> </tr>
<tr height="17">  <td align="right" class="xl67" height="17"><b>92.475</b></td>  <td align="right" class="xl67"><b>0.727272727</b></td>  <td align="right" class="xl67"><b>0.92475</b></td>  <td align="right" class="xl67"><b>0.727272727</b></td> </tr>
<tr height="17">  <td align="right" height="17">92.0625</td>  <td align="right">0.681818181</td>  <td align="right">0.920625</td>  <td align="right">0.681818181</td> </tr>
<tr height="17">  <td align="right" height="17">91.5</td>  <td align="right">0.636363636</td>  <td align="right">0.915</td>  <td align="right">0.636363636</td> </tr>
<tr height="17">  <td align="right" height="17">91.275</td>  <td align="right">0.59090909</td>  <td align="right">0.91275</td>  <td align="right">0.59090909</td> </tr>
<tr height="17">  <td align="right" height="17">91.0875</td>  <td align="right">0.545454545</td>  <td align="right">0.910875</td>  <td align="right">0.545454545</td> </tr>
<tr height="17">  <td align="right" height="17">90.9125</td>  <td align="right">0.5</td>  <td align="right">0.909125</td>  <td align="right">0.5</td> </tr>
<tr height="17">  <td align="right" height="17">90.9</td>  <td align="right">0.454545454</td>  <td align="right">0.909</td>  <td align="right">0.454545454</td> </tr>
<tr height="17">  <td align="right" height="17">90.8375</td>  <td align="right">0.409090909</td>  <td align="right">0.908375</td>  <td align="right">0.409090909</td> </tr>
<tr height="17">  <td align="right" height="17">90.2625</td>  <td align="right">0.363636363</td>  <td align="right">0.902625</td>  <td align="right">0.363636363</td> </tr>
<tr height="17">  <td align="right" height="17">89.425</td>  <td align="right">0.318181818</td>  <td align="right">0.89425</td>  <td align="right">0.318181818</td> </tr>
<tr height="17">  <td align="right" height="17">89.0625</td>  <td align="right">0.272727272</td>  <td align="right">0.890625</td>  <td align="right">0.272727272</td> </tr>
<tr height="17">  <td align="right" height="17">88.4375</td>  <td align="right">0.227272727</td>  <td align="right">0.884375</td>  <td align="right">0.227272727</td> </tr>
<tr height="17">  <td align="right" height="17">88.1</td>  <td align="right">0.181818181</td>  <td align="right">0.881</td>  <td align="right">0.181818181</td> </tr>
<tr height="17">  <td align="right" height="17">83.325</td>  <td align="right">0.136363636</td>  <td align="right">0.83325</td>  <td align="right">0.136363636</td> </tr>
<tr height="17">  <td align="right" height="17">82.3375</td>  <td align="right">0.09090909</td>  <td align="right">0.823375</td>  <td align="right">0.09090909</td> </tr>
<tr height="17">  <td align="right" height="17">78.15</td>  <td align="right">0.045454545</td>  <td align="right">0.7815</td>  <td align="right">0.045454545</td> </tr>
<tr height="17">  <td align="right" height="17">71.5125</td>  <td align="right">0</td>  <td align="right">0.715125</td>  <td align="right">0</td> </tr>
</tbody>
</table>
<br><br>The moral of the story? DON'T USE EXCEL FOR ANYTHING, BUT ESPECIALLY NOT MATH.<br>
</div>


*This post was originally hosted [elsewhere](http://planspace.blogspot.com/2012/03/excel-2007-percentrank-is-trash.html).*
